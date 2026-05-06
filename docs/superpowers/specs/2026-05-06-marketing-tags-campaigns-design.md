# Marketing tags & campaigns — design

**Status:** approved (2026-05-06), ready for implementation planning.
**Author:** Olivier Arnolds + Claude (brainstorming session).
**Scope:** v1 of an in-app marketing/segmentation feature for the Eclectik BD CRM.

## 1. Problem & goal

Today the CRM serves Marco's BD-flow (pipeline, deals, comms, calendar). Olivier
needs an additional workflow to:

1. Segment contacts based on tags and deal-data (e.g. "all contacts with a Glint
   deal").
2. Tag relevant contacts manually for marketing-purposes (e.g. "Glint
   audience").
3. Send personalised newsletters to a tagged segment with open/click tracking,
   using HTML emails Olivier generates externally (via Claude chat).

The newsletter source-of-truth is HTML pasted into the CRM — no in-app
WYSIWYG/template builder is required. Tracking happens via Resend's built-in
open/click events.

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ BD-app (React, on crm.eclectik-insights.co)                     │
│                                                                 │
│  Top-bar: Workspace · Funnel · Playbooks · Tasks · Marketing    │
│                                                            ↑    │
│                                                          NEW    │
│  Marketing view (full-width, two tabs):                         │
│   • Contacts — filter sidebar + list + bulk-tag/send actions    │
│   • Campaigns — history + new-campaign composer                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Vercel API endpoints                                            │
│  /api/marketing-send       NEW — sends a campaign via Resend    │
│  /api/marketing-webhook    NEW — receives Resend events         │
└─────────────┬───────────────────────────────────┬───────────────┘
              ▼                                   ▼
   ┌──────────────────┐                 ┌──────────────────────┐
   │ Supabase (4 new  │                 │ Resend API           │
   │ tables)          │                 │ - send (batch)       │
   │ - tags           │                 │ - webhook events     │
   │ - contact_tags   │                 │                      │
   │ - campaigns      │                 │                      │
   │ - campaign_sends │                 │                      │
   └──────────────────┘                 └──────────────────────┘
```

**Three new components, three unchanged.** Marco's existing BD-flow is not
modified beyond a small visual addition (tag-chips on contact-rows).

## 3. Data model

Four new tables. All `uuid` primary keys default `gen_random_uuid()`.

### `tags`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL UNIQUE | "Glint", "Newsletter mei 2026" |
| color | text NOT NULL DEFAULT '#888780' | hex string for chip colour |
| type | text NOT NULL DEFAULT 'custom' | `'system'` or `'custom'` |
| description | text | optional |
| created_at | timestamptz DEFAULT now() | |
| created_by | text | user email |

**Seed in v1:** four system tags — Glint, ROI, ROE, Other — with brand colours.
System tags cannot be deleted from the UI; custom tags can (v2 feature, see §7).

### `contact_tags` — join

| Column | Type | Notes |
|---|---|---|
| contact_id | uuid REFERENCES contacts(id) ON DELETE CASCADE | |
| tag_id | uuid REFERENCES tags(id) ON DELETE CASCADE | |
| tagged_at | timestamptz DEFAULT now() | |
| tagged_by | text | user email |
| **PK** | (contact_id, tag_id) | |

Cascade behaviour: deleting a contact or a tag automatically clears its links.

### `campaigns` — one row per "send to audience" event

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | internal label, e.g. "Glint newsletter mei 2026" |
| subject | text NOT NULL | |
| preheader | text | inbox preview snippet |
| html_body | text NOT NULL | the pasted HTML, with `{{...}}` placeholders |
| from_name | text NOT NULL | "Marketing" |
| from_email | text NOT NULL | "marketing@eclectik.co" |
| reply_to | text | optional |
| audience_filter | jsonb | snapshot of filter, e.g. `{"tags":["Glint"]}` |
| recipient_count | int | snapshot count at send time |
| status | text | `'draft'`, `'sending'`, `'sent'`, `'failed'` |
| sent_at | timestamptz | |
| sent_by | text | user email |
| created_at | timestamptz DEFAULT now() | |

**Audience is a snapshot.** Sending today to "all Glint-tagged contacts" does
not pick up a 48th contact tagged tomorrow — that's intentional for v1
(predictable, no surprises).

### `campaign_sends` — one row per (campaign × recipient)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| campaign_id | uuid REFERENCES campaigns(id) ON DELETE CASCADE | |
| contact_id | uuid REFERENCES contacts(id) ON DELETE SET NULL | |
| recipient_email | text NOT NULL | |
| resend_message_id | text UNIQUE | for webhook lookup |
| status | text | `'queued'`, `'sent'`, `'delivered'`, `'bounced'`, `'failed'` |
| sent_at | timestamptz | |
| delivered_at | timestamptz | |
| bounced_at | timestamptz | |
| bounce_reason | text | |
| first_opened_at | timestamptz | |
| open_count | int DEFAULT 0 | |
| first_clicked_at | timestamptz | |
| click_count | int DEFAULT 0 | |
| complained_at | timestamptz | spam complaint |
| unsubscribed_at | timestamptz | clicked unsub link |

This is the tracking-unit for engagement.

**Indexes:** `contact_tags(tag_id)`, `campaign_sends(campaign_id)`,
`campaign_sends(resend_message_id)`, `campaign_sends(contact_id)`.

**Volume:** 642 contacts × ~10 tags ≈ 6.5k join rows; 12 newsletters/year × 50
recipients = 600 send rows/year. No performance concerns.

## 4. UI

### 4.1 Marketing top-bar item

5th item next to Tasks. Renders a new route `/marketing` inside the existing
BD-app (no separate deploy). Two tabs: **Contacts** and **Campaigns**.

### 4.2 Contacts tab

Filter sidebar (left) + list (right).

```
┌─ Marketing ─────────────────────────────────────────────────────┐
│ [Contacts]  Campaigns                            Manage tags →  │
├─────────────────────┬───────────────────────────────────────────┤
│ TAGS                │ ☐ Marco van Gelder · Eclectik · ●Glint    │
│ ☐ Glint    (47)     │ ☐ Yarmilla Koenders · Eclectik · ●Glint   │
│ ☐ ROI      (23)     │ ☐ Anna Petrova · Acme · ●ROI ●ROE         │
│ ☐ ROE      (18)     │                                           │
│ ☐ Other    (5)      │ Filtered: 47 of 642  ·  3 selected        │
│                     │                                           │
│ DEALS               │ [+ Add tag to 3]   [Send campaign to 3]   │
│ ☐ Has Glint deal    │                                           │
│ ☐ Has any deal      │                                           │
│                     │                                           │
│ STATUS              │                                           │
│ ☐ Has email         │                                           │
│ ☐ Active            │                                           │
└─────────────────────┴───────────────────────────────────────────┘
```

**Filter logic:** filters AND across blocks; multi-select within a block is OR
(e.g. tag = Glint OR ROI). The `Has Glint deal` filter uses `deals.product_line`
— deal-data acts as the account-level hint, no separate account-tag layer.

**Tagging:** clicking `[+ Add tag to 3]` opens a popover with the available tags
(multi-select). A separate "Remove tag from N" mode covers the inverse.

### 4.3 Campaigns tab

```
┌─ Marketing ────────────────────────────────────────────────────┐
│ Contacts  [Campaigns]                          [+ New campaign] │
├────────────────────────────────────────────────────────────────┤
│ Glint newsletter mei 2026                                      │
│ Sent 6 may 2026 · 47 recipients · 68% opened · 22% clicked     │
│ ─────                                                          │
│ ROI Q1 update                                                  │
│ Sent 14 apr 2026 · 23 recipients · 72% opened · 18% clicked    │
└────────────────────────────────────────────────────────────────┘
```

Clicking a campaign opens a **detail view**: aggregate stats + per-recipient
table (name, sent, delivered, opened (count), clicked (count), bounced /
unsubscribed status).

### 4.4 New campaign composer

```
┌─ New campaign ─────────────────────────────────────────────────┐
│ Name      [Glint newsletter mei 2026          ]                │
│ Audience  47 contacts with tag 'Glint'    [← Edit audience]    │
│                                                                │
│ FROM      Marketing <marketing@eclectik.co>                    │
│ REPLY-TO  [olivier@eclectik.co               ]                 │
│ SUBJECT   [Viva Glint & Pulse — May update    ]                │
│ PREHEADER [Copilot highlights, admin change… ]                 │
│                                                                │
│ HTML BODY                                                      │
│ ┌────────────────────────┬──────────────────────────────┐      │
│ │ <textarea>             │ <iframe live preview>        │      │
│ │                        │                              │      │
│ └────────────────────────┴──────────────────────────────┘      │
│ Variables available: {{first_name}}, {{last_name}},            │
│ {{full_name}}, {{company_name}}, {{role}}                      │
│                                                                │
│ [Save draft]  [Test send → me]  [Send to 47 contacts]          │
└────────────────────────────────────────────────────────────────┘
```

**Three send buttons:**
- *Save draft* — persists `campaigns` row with status `'draft'`.
- *Test send* — sends one rendered email to the current user's address (Olivier
  Arnolds), using the user's own contact-record for variable rendering. Does not
  create `campaign_sends` rows.
- *Send to N contacts* — opens confirm dialog → triggers the batch send flow
  (see §5).

**Edit audience** jumps back to the Contacts tab with the current filter
preserved; clicking *Use this audience* returns to the composer with the
updated recipient list.

### 4.5 Tag display in BD-app

Tag-chips appear on contact rows in [src/bd/lane-accounts.jsx](src/bd/lane-accounts.jsx)
alongside existing chips (`role`, `account`, `source`), coloured per
`tags.color`. The contact-detail inline view shows a `Tags: ●Glint ●ROI [+]`
row — the `[+]` opens a small popover for adding tags from BD context (no need
to switch to Marketing).

### 4.6 Manage tags mini-UI

`Manage tags →` button (top-right of Marketing view) opens a modal with:

- All tags listed (system on top, custom below).
- Per tag: rename, change colour (colour-picker), edit description.
- Usage count: "Glint — used by 47 contacts".
- System tags cannot be deleted; custom tags can (custom tags arrive in v2).

## 5. Send flow & tracking

### 5.1 Send flow (frontend → API → Resend)

```
1. Frontend: confirm dialog "Send 'Glint newsletter' to 47 recipients?"
2. Frontend: POST /api/marketing-send
   { campaign_id, html, subject, preheader, from, reply_to, recipients }
3. API endpoint:
   a. UPDATE campaigns SET status='sending' WHERE id=campaign_id
   b. For each recipient:
      i.   Render HTML by replacing {{...}} placeholders with the contact's
           values (empty string for missing).
      ii.  Resend.send(...) → returns resend_message_id
      iii. INSERT campaign_sends (status='sent', sent_at=now())
      iv.  Sleep 200ms (be gentle on Resend's burst limit)
   c. UPDATE campaigns SET status='sent', sent_at=now(),
                            recipient_count=N
4. Frontend: "✓ 47 sent · 0 failed"
```

### 5.2 Webhook flow (Resend → API)

Resend POSTs events to `/api/marketing-webhook` (signed with HMAC, validated):

| Resend event | Effect on `campaign_sends` |
|---|---|
| `email.sent` | status='sent' |
| `email.delivered` | delivered_at=event_time |
| `email.opened` | first_opened_at if null; open_count++ |
| `email.clicked` | first_clicked_at if null; click_count++ |
| `email.bounced` | status='bounced', bounce_reason, bounced_at |
| `email.complained` | complained_at=event_time |
| `email.unsubscribed` | unsubscribed_at=event_time |

Lookup is by `resend_message_id` (unique). Unknown IDs → log + 200 OK (otherwise
Resend retries indefinitely).

### 5.3 Error handling

| Scenario | Action |
|---|---|
| Single recipient: 4xx (invalid email, blocked) | Mark that one row `failed`, continue with the rest. |
| Single recipient: 5xx / network timeout | Wait 2s, continue with next. One failure does not stop the batch. |
| Two consecutive 5xx | Stop the batch — Resend is unreachable. Mark campaign `failed`. UI: "12 sent · 35 not sent — Resend unreachable, try again later". |
| 401/403 (auth) | Stop immediately — every send will fail. UI: "API key invalid". |
| HTML parse error / Resend content reject | Stop immediately — same reason; every recipient would fail identically. |

Campaign-detail UI offers a *Retry failed* action that re-sends only the
recipients with `status='failed'` for that campaign.

## 6. Setup checklist (one-time)

| # | What | Where | Who |
|---|---|---|---|
| 1 | Resend account (free tier 3000/month) | resend.com | Olivier |
| 2 | Generate API key | Resend dashboard | Olivier |
| 3 | Verify domain `eclectik.co` | Resend → Domains | Olivier |
| 4 | Add DNS records (DKIM, SPF, return-path) at registrar | TransIP (or wherever) | Olivier + Claude wrap together |
| 5 | Register webhook URL `https://crm.eclectik-insights.co/api/marketing-webhook` | Resend dashboard | Olivier |
| 6 | Vercel env vars: `RESEND_API_KEY`, `RESEND_WEBHOOK_SIGNING_KEY` | Vercel project settings | Olivier |
| 7 | Shared mailbox `marketing@eclectik.co` | M365 admin centre | Olivier (in progress) |
| 8 | Run migration SQL (4 tables + system-tag seed) | Supabase SQL editor | Olivier — Claude provides SQL |

**Important on SPF:** the existing Microsoft SPF
(`v=spf1 include:spf.protection.outlook.com -all`) must be merged with Resend's
include — both in one record:
`v=spf1 include:_spf.resend.com include:spf.protection.outlook.com -all`.
Adding a second SPF record breaks Microsoft email delivery.

## 7. Phasing

Each phase is independently committable and deployable. A→B→C→D, sequential.

### Phase A — Tag foundation (no sending)

- Migrations: `tags` + `contact_tags` + system seed.
- BD-app: tag-chips on contact rows + contact-detail.
- BD-app: tag-add/remove from contact-detail.
- Manage tags mini-UI (rename + colour for v1).

**Value:** Marco can categorise contacts visually without any email being sent.

### Phase B — Marketing-view skeleton

- 5th top-bar item Marketing.
- Contacts tab with filters + bulk tag/untag actions.
- Empty Campaigns tab placeholder.

**Value:** Olivier can efficiently tag large groups (e.g. all Glint-deal
contacts in one click).

### Phase C — Resend integration

- DNS + Resend setup (one-time).
- Composer with HTML paste + live preview iframe.
- Variable substitution (`{{first_name}}` etc.) per recipient.
- `marketing-send` API endpoint.
- `marketing-webhook` API endpoint with HMAC validation.
- Campaigns history + per-campaign engagement detail.
- Test send + Send-to-audience flows.

**Value:** first real newsletter can ship.

### Phase D — Polish

- Retry failed recipients action.
- Edit audience round-trip.
- Per-contact email-history section in BD contact-detail
  ("Marco opened Glint newsletter 3× on 6 May").

**Value:** comfortable day-to-day usage.

## 8. Out of scope (v1)

Explicitly not built in v1, to keep scope tight:

- ❌ Custom (free-form) tags — only system tags. v2 will add a `+ New tag`
  flow and wire `tags.type='custom'` records.
- ❌ Live audiences — only snapshot at send time.
- ❌ A/B testing.
- ❌ Drip campaigns / sequences — the existing playbook system covers this.
- ❌ Template library inside the CRM — Claude chat is the template designer.
- ❌ Account-level tags — deal-data (`product_line`) serves as the account
  hint instead.
- ❌ Custom open/click tracking pixels — Resend's built-in tracking is
  sufficient.

## 9. In scope but worth noting

- ✅ Personalisation via `{{first_name}}`, `{{last_name}}`, `{{full_name}}`,
  `{{company_name}}`, `{{role}}` — implemented as simple string-replace before
  sending, so we don't lock to Resend's specific variable syntax.
- ✅ HTML body comes from outside the CRM (Claude chat); the composer is just
  a textarea + live preview, not a builder.
- ✅ Tag-chips visible in BD-app (not only in Marketing) so Marco sees
  categorisation context.

## 10. Open questions / future considerations

- *Unsubscribe footer*: Resend can auto-inject an unsubscribe link required
  for AVG/CAN-SPAM compliance. This will be enabled by default in Phase C.
- *Email history per contact*: planned for Phase D, but if Olivier needs a
  faster signal earlier, Resend's dashboard provides it externally.
- *Bounced-email cleanup*: hard bounces should eventually trigger a contact
  flag (e.g. `email_invalid=true`) to keep audiences clean. Not in v1; revisit
  after the first few real campaigns.
