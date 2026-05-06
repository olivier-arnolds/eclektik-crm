# Marketing Phase A — Tag foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tag data-model in Supabase, surface tags as coloured chips on contact rows in the BD-app, and let users add/remove tags from a contact-detail popover.

**Architecture:** Two new Supabase tables (`tags`, `contact_tags`) with four seeded system tags. The existing `usePipelineData` hook fetches tags and joins them onto contacts in-memory; the BD adapter passes the array through; small new React components (`TagChip`, `TagPopover`) render and edit the tag set.

**Tech stack:** React 19, Supabase JS client, Postgres. No new external dependencies.

**Note on testing:** this codebase has no React unit-test setup. Verification happens via build + push + browser smoke-test on production (matches the project's existing working style: commit each step, verify in browser, ask before push).

**Reference spec:** [docs/superpowers/specs/2026-05-06-marketing-tags-campaigns-design.md](../specs/2026-05-06-marketing-tags-campaigns-design.md) §3 (data model), §4.5 (tag display in BD-app), §7 Phase A.

---

## File structure

| Action | Path | Purpose |
|---|---|---|
| Create | `src/bd/tag-chip.jsx` | Small coloured chip rendering one tag (used in lists + popover) |
| Create | `src/bd/tag-popover.jsx` | Multi-select popover for adding/removing tags on a contact |
| Modify | `src/hooks/usePipelineData.js` | Fetch `tags` + `contact_tags`; attach tags array to each contact |
| Modify | `src/bd/adapters.js` | Pass `tags` array through `adaptContact` |
| Modify | `src/bd/lane-accounts.jsx` | Render tag chips on contact rows |
| Modify | `src/bd/inline-details.jsx` | Render tag chips + tag-popover trigger on inline contact-detail |

DB migration is a one-shot script run in Supabase SQL editor (Task A.1) — not committed as a file because the project has no migrations directory.

---

### Task A.1 — Database migration

**Files:**
- Run in Supabase SQL editor (no repo file)

- [ ] **Step 1: Open the Supabase SQL editor**

Go to [supabase.com](https://supabase.com) → project → **SQL Editor** → **+ New query**.

- [ ] **Step 2: Paste and run the migration SQL**

```sql
-- 1. tags table
CREATE TABLE tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  color       text NOT NULL DEFAULT '#888780',
  type        text NOT NULL DEFAULT 'custom' CHECK (type IN ('system','custom')),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text
);

-- 2. contact_tags join table
CREATE TABLE contact_tags (
  contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  tagged_at   timestamptz NOT NULL DEFAULT now(),
  tagged_by   text,
  PRIMARY KEY (contact_id, tag_id)
);

CREATE INDEX idx_contact_tags_tag_id ON contact_tags(tag_id);

-- 3. Seed system tags (Glint / ROI / ROE / Other)
INSERT INTO tags (name, color, type, description) VALUES
  ('Glint', '#DC6B3C', 'system', 'Viva Glint product line'),
  ('ROI',   '#2A6F4D', 'system', 'Return on investment product line'),
  ('ROE',   '#4A6FA5', 'system', 'Return on engagement product line'),
  ('Other', '#888780', 'system', 'Anything outside the main product lines');
```

- [ ] **Step 3: Verify**

Run in the SQL editor:
```sql
SELECT name, color, type FROM tags ORDER BY name;
```
Expected: 4 rows — Glint (orange), Other (grey), ROE (blue), ROI (green), all `type='system'`.

- [ ] **Step 4: Verify the join table**

Run:
```sql
SELECT count(*) FROM contact_tags;
```
Expected: 0.

- [ ] **Step 5: Add RLS policies (Supabase enables RLS by default on new tables, deny-all without policies)**

Run in the SQL editor:
```sql
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users full access on tags" ON tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth users full access on contact_tags" ON contact_tags
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

This grants any logged-in CRM user full CRUD on both tables — matching how the rest of this internal tool treats authenticated access. Without this step the front-end queries return zero rows silently and tag chips never appear.

- [ ] **Step 6: Verify policies are in effect**

Run:
```sql
SELECT count(*) FROM tags;
```
Expected: 4. If 0, policies didn't apply — check that you ran the ALTER + CREATE POLICY block above as a logged-in user via the SQL editor.

---

### Task A.2 — Fetch tags + contact_tags in `usePipelineData`

**Files:**
- Modify: `src/hooks/usePipelineData.js`

- [ ] **Step 1: Add the two new Supabase queries to `Promise.all`**

In `src/hooks/usePipelineData.js`, find the `Promise.all([...])` block in `fetchAll` (around line 210). Replace it with:

```js
    const [
      { data: companiesRaw },
      { data: contactsRaw },
      { data: leadsRaw },
      { data: oppsRaw },
      { data: followUpsRaw },
      { data: tasksRaw },
      { data: commsRaw },
      { data: calRaw },
      { data: tagsRaw },
      { data: contactTagsRaw },
    ] = await Promise.all([
      supabase.from('companies').select('*').limit(1000),
      supabase.from('contacts').select('*').limit(1000),
      supabase.from('leads').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('opportunities').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('follow_ups').select('*').order('due_date', { ascending: false }).limit(500),
      supabase.from('tasks').select('*').order('due_date', { ascending: false }).limit(500),
      supabase.from('comms').select('*').order('sent_at', { ascending: false }).limit(1000),
      supabase.from('calendar_events').select('*').order('start_at', { ascending: false }).limit(500),
      supabase.from('tags').select('*'),
      supabase.from('contact_tags').select('contact_id, tag_id'),
    ])
```

- [ ] **Step 2: Build a per-contact tag-array before adapting contacts**

Just below the `Promise.all` block (after the destructure, before `const adaptedAccounts`), add:

```js
    // Map contact_id → array of full tag objects
    const tagsById = new Map((tagsRaw || []).map(t => [t.id, t]))
    const tagsByContactId = new Map()
    for (const link of (contactTagsRaw || [])) {
      const tag = tagsById.get(link.tag_id)
      if (!tag) continue
      const arr = tagsByContactId.get(link.contact_id) || []
      arr.push(tag)
      tagsByContactId.set(link.contact_id, arr)
    }
```

- [ ] **Step 3: Inject the tags array into each raw contact before `adaptContact`**

Replace this line:
```js
    const adaptedContacts = (contactsRaw || []).map(c => adaptContact(c, adaptedAccounts))
```
with:
```js
    const adaptedContacts = (contactsRaw || []).map(c => {
      const withTags = { ...c, tags: tagsByContactId.get(c.id) || [] }
      return adaptContact(withTags, adaptedAccounts)
    })
```

- [ ] **Step 4: Expose `allTags` from the hook**

Find the existing `setAccounts(adaptedAccounts)` block and add a new state setter alongside the others. First add the state declaration near the other `useState` calls (search for `const [contacts, setContacts]` in the file and add this right below it):

```js
  const [allTags, setAllTags] = useState([])
```

Then, in the `fetchAll` function below the existing `setComms(...)` line, add:
```js
    setAllTags(tagsRaw || [])
```

Finally, in the `return` block, add `allTags` alongside the other returned values.

- [ ] **Step 5: Verify the build still passes**

Run:
```bash
npm run build 2>&1 | tail -3
```
Expected: `✓ built in <ms>` and no errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/usePipelineData.js
git commit -m "Fetch tags + contact_tags and attach per-contact tag array"
```

---

### Task A.3 — Pass `tags` through the BD contact adapter

**Files:**
- Modify: `src/bd/adapters.js`

- [ ] **Step 1: Add `tags` to the adaptContact return**

In `src/bd/adapters.js`, find the `adaptContact` function (around line 76). The function currently ends with `linkedin_url: row.linkedin_url || ''`. Add a tags line above the closing brace:

```js
export function adaptContact(row, adaptedAccounts) {
  const acc = (adaptedAccounts || []).find(a => a.id === row.accountId);
  return {
    id: row.id,
    name: row.name || '',
    role: row.role || '',
    account: acc?.name || '',
    accountId: row.accountId,
    email: row.email || '',
    phone: row.phone || '',
    avatarBg: row.avatarBg,
    avatarColor: row.avatarColor,
    initials: row.initials,
    isPrimary: !!row.isPrimary,
    isFormer: !!row.isFormer,
    linkedin_url: row.linkedin_url || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: built without errors.

- [ ] **Step 3: Commit**

```bash
git add src/bd/adapters.js
git commit -m "BD adaptContact: pass tags array through"
```

---

### Task A.4 — TagChip component

**Files:**
- Create: `src/bd/tag-chip.jsx`

- [ ] **Step 1: Write the component**

```jsx
// Small coloured chip representing one tag.
// `tag` shape: { id, name, color, type }
// Optional `onRemove` shows an × button.
export default function TagChip({ tag, onRemove, small }) {
  if (!tag) return null;
  const padding = small ? '1px 6px' : '2px 8px';
  const fontSize = small ? 9 : 10;
  return (
    <span
      title={tag.description || tag.name}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding,
        borderRadius: 10,
        fontSize,
        fontWeight: 500,
        background: tag.color + '22', // 13% opacity tint of the tag color
        color: tag.color,
        border: `0.5px solid ${tag.color}66`, // 40% opacity border
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}>
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(tag); }}
          title={`Remove ${tag.name}`}
          style={{
            background: 'transparent',
            border: 'none',
            color: tag.color,
            cursor: 'pointer',
            padding: 0,
            fontSize: fontSize + 2,
            lineHeight: 1,
            opacity: 0.6,
          }}>
          ×
        </button>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Verify the file is syntactically valid**

```bash
npm run build 2>&1 | tail -3
```
Expected: built without errors. (The component is unused yet, but it must still compile.)

- [ ] **Step 3: Commit**

```bash
git add src/bd/tag-chip.jsx
git commit -m "Add TagChip component"
```

---

### Task A.5 — Render tag chips on contact rows in lane-accounts

**Files:**
- Modify: `src/bd/lane-accounts.jsx`

- [ ] **Step 1: Import TagChip**

At the top of `src/bd/lane-accounts.jsx`, near the other imports, add:
```js
import TagChip from './tag-chip';
```

- [ ] **Step 2: Render chips on the contact-row**

Find the `contact-card` block inside the `Section label="Contacts"` mapping (around line 838 — look for `<div className="contact-name">`). The current structure inside `<div style={{ flex: 1, minWidth: 0 }}>` looks like:

```jsx
<div style={{ flex: 1, minWidth: 0 }}>
  <div className="contact-name">
    <span style={...}>{c.name}</span>
    {c.isPrimary && <span ...>★</span>}
    {c.isFormer && (<span ...>former</span>)}
  </div>
  {c.role && <div className="contact-role" ...>{c.role}</div>}
</div>
```

Add a tags row just below the role:

```jsx
<div style={{ flex: 1, minWidth: 0 }}>
  <div className="contact-name">
    <span style={...}>{c.name}</span>
    {c.isPrimary && <span ...>★</span>}
    {c.isFormer && (<span ...>former</span>)}
  </div>
  {c.role && <div className="contact-role" ...>{c.role}</div>}
  {Array.isArray(c.tags) && c.tags.length > 0 && (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
      {c.tags.map(t => <TagChip key={t.id} tag={t} small />)}
    </div>
  )}
</div>
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: built without errors.

- [ ] **Step 4: Commit**

```bash
git add src/bd/lane-accounts.jsx
git commit -m "Render tag chips on contact rows in account-lane"
```

---

### Task A.6 — TagPopover component (multi-select add/remove)

**Files:**
- Create: `src/bd/tag-popover.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import TagChip from './tag-chip';

// Popover for adding/removing tags on a contact.
// Props:
//   contactId: uuid of the contact being edited
//   currentTags: array of tag objects currently on this contact
//   allTags: array of all available tag objects
//   userEmail: string (used as tagged_by)
//   onClose: () => void
//   onChange: () => void  — called after a successful add/remove so caller can refetch
export default function TagPopover({ contactId, currentTags, allTags, userEmail, onClose, onChange }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const currentIds = new Set(currentTags.map(t => t.id));

  const toggle = async (tag) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (currentIds.has(tag.id)) {
        const { error } = await supabase
          .from('contact_tags')
          .delete()
          .eq('contact_id', contactId)
          .eq('tag_id', tag.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contact_tags')
          .insert({ contact_id: contactId, tag_id: tag.id, tagged_by: userEmail });
        if (error) throw error;
      }
      if (onChange) onChange();
    } catch (e) {
      setError(e.message || 'Failed');
    }
    setBusy(false);
  };

  return (
    <div ref={ref}
      style={{
        position: 'absolute',
        zIndex: 100,
        background: 'var(--bg-1)',
        border: '0.5px solid var(--sep)',
        borderRadius: 8,
        padding: 10,
        minWidth: 200,
        boxShadow: 'var(--shadow-modal, 0 4px 16px rgba(0,0,0,0.15))',
      }}
      onClick={(e) => e.stopPropagation()}>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Tag this contact
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {(allTags || []).map(tag => {
          const selected = currentIds.has(tag.id);
          return (
            <button key={tag.id}
              onClick={() => toggle(tag)}
              disabled={busy}
              style={{
                background: selected ? tag.color + '33' : 'transparent',
                color: tag.color,
                border: `0.5px solid ${tag.color}${selected ? 'aa' : '44'}`,
                borderRadius: 10,
                padding: '3px 9px',
                fontSize: 11,
                fontWeight: selected ? 600 : 400,
                cursor: busy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}>
              {selected ? '✓ ' : ''}{tag.name}
            </button>
          );
        })}
      </div>
      {error && <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 6 }}>{error}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: built without errors.

- [ ] **Step 3: Commit**

```bash
git add src/bd/tag-popover.jsx
git commit -m "Add TagPopover component for adding/removing tags"
```

---

### Task A.7 — Thread `allTags` through props

**Files:**
- Modify: `src/bd/BDApp.jsx`
- Modify: `src/bd/lane-accounts.jsx`

`allTags` is returned by `usePipelineData` (Task A.2) and must reach `InlineContactDetail` (Task A.8) via two intermediate components.

- [ ] **Step 1: Destructure `allTags` from the hook in BDApp.jsx**

In `src/bd/BDApp.jsx`, find the line that destructures `usePipelineData()` (search for `const { accounts,`). Add `allTags` to the destructure:
```js
const { accounts, contacts, allItems, followUps, tasks, comms, calEvents, allTags, refetch, loading } = usePipelineData();
```
(Existing names may already include some of these — keep them all and add `allTags`.)

- [ ] **Step 2: Pass `allTags` to both `<AccountsLane>` invocations**

`grep -n "<AccountsLane" src/bd/BDApp.jsx` returns 2 lines (originally line 244 and 334). For each, add `allTags={allTags}` alongside the existing `accounts={accounts}` prop.

For example, the first invocation:
```jsx
<AccountsLane
  context={rightContext}
  accounts={accounts}
  allTags={allTags}
  contacts={contacts}
  deals={deals}
  ...
```
Apply the same change at the second invocation.

- [ ] **Step 3: Accept `allTags` in `AccountsLane` and forward to `AccountDetail`**

In `src/bd/lane-accounts.jsx`, find the `AccountsLane` export signature (around line 180). Add `allTags` to the props list:
```js
export default function AccountsLane({ context, accounts, allTags, contacts, deals, rawItems, comms, graphEmails, events, graphEvents, tasks, onPickAccount, onCompose, onOpenDeal, onSelectComm, search, refetch, refetchGraph }) {
```

Then in the same file find the `<AccountDetail` render call (around line 207) and pass `allTags`:
```jsx
return <AccountDetail {...resolved} accounts={accounts} allTags={allTags} contacts={contacts} deals={deals} rawItems={rawItems} comms={comms} graphEmails={graphEmails} events={allEvents} tasks={tasks}
```

- [ ] **Step 4: Accept `allTags` in `AccountDetail`**

Find the `AccountDetail` function signature (around line 584) and add `allTags` to the destructured props:
```js
function AccountDetail({ account, highlight, accounts, allTags, contacts, deals, rawItems, comms, graphEmails, events, tasks, onPickAccount, onCompose, onOpenDeal, onSelectComm, refetch }) {
```

- [ ] **Step 5: Forward `allTags` to `<InlineContactDetail>`**

Within `AccountDetail`, find where `<InlineContactDetail` is rendered (around line 885). Add `allTags={allTags}` and `onTagsChange={refetch}`:
```jsx
expanded={() => (
  <InlineContactDetail contactId={c.id} onCompose={onCompose} refetch={refetch} allTags={allTags} onTagsChange={refetch} />
)}
```

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: built without errors.

- [ ] **Step 7: Commit**

```bash
git add src/bd/BDApp.jsx src/bd/lane-accounts.jsx
git commit -m "Thread allTags from usePipelineData down to InlineContactDetail"
```

---

### Task A.8 — Tags row + popover in InlineContactDetail

**Files:**
- Modify: `src/bd/inline-details.jsx`

- [ ] **Step 1: Add imports + extend the function signature**

At the top of `src/bd/inline-details.jsx`, near the other imports, add:
```js
import { useAuth } from '../lib/auth';
import TagChip from './tag-chip';
import TagPopover from './tag-popover';
```

Find the `InlineContactDetail` export (line 89). Change the signature to accept `allTags` and `onTagsChange`:
```js
export function InlineContactDetail({ contactId, onCompose, refetch, allTags, onTagsChange }) {
```

- [ ] **Step 2: Add tag-related state + auth hook**

Near the existing `useState` calls inside `InlineContactDetail`, add:
```js
const [showTagPopover, setShowTagPopover] = useState(false);
const [contactTagIds, setContactTagIds] = useState([]);
const { session } = useAuth();
const userEmail = session?.user?.email || '';
```

- [ ] **Step 3: Add a useEffect to fetch the contact's tag IDs**

Below the existing `useEffect` that fetches the contact row, add:
```js
useEffect(() => {
  if (!contactId) return;
  supabase.from('contact_tags').select('tag_id').eq('contact_id', contactId)
    .then(({ data }) => setContactTagIds((data || []).map(r => r.tag_id)));
}, [contactId]);

const refreshContactTags = () => {
  if (!contactId) return;
  supabase.from('contact_tags').select('tag_id').eq('contact_id', contactId)
    .then(({ data }) => setContactTagIds((data || []).map(r => r.tag_id)));
  if (onTagsChange) onTagsChange();
};

const contactTags = (allTags || []).filter(t => contactTagIds.includes(t.id));
```

- [ ] **Step 4: Add the tags-row JSX block after the LinkedIn field**

Find the line `<InlineField label="" value={row.linkedin_url} type="url" onSave={v => saveField('linkedin_url', v)} />` (around line 167). Add this block immediately after that `InlineField`:

```jsx
<div style={{ position: 'relative', marginTop: 8 }}>
  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
    Tags
  </div>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
    {contactTags.map(t => <TagChip key={t.id} tag={t} />)}
    <button onClick={() => setShowTagPopover(v => !v)}
      style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 10,
        border: '0.5px dashed var(--text-3)', background: 'transparent',
        color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit',
      }}>
      + Tag
    </button>
  </div>
  {showTagPopover && (
    <TagPopover
      contactId={contactId}
      currentTags={contactTags}
      allTags={allTags}
      userEmail={userEmail}
      onClose={() => setShowTagPopover(false)}
      onChange={refreshContactTags}
    />
  )}
</div>
```

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -5
```
Expected: built without errors.

- [ ] **Step 6: Commit**

```bash
git add src/bd/inline-details.jsx
git commit -m "Render tags row + popover trigger on inline contact detail"
```

---

### Task A.9 — Smoke-test on production

**Files:**
- None (verification only)

- [ ] **Step 1: Push the phase**

```bash
git push origin main
```

- [ ] **Step 2: Wait for Vercel deploy**

Run a poll-loop (foreground or background, however the executor prefers):
```bash
CURRENT=$(curl -s https://crm.eclectik-insights.co/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1)
until NEW=$(curl -s https://crm.eclectik-insights.co/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1); [ -n "$NEW" ] && [ "$NEW" != "$CURRENT" ]; do sleep 5; done
echo "deploy live"
```

- [ ] **Step 3: Manual browser smoke-test**

Open `https://crm.eclectik-insights.co`, hard refresh (Cmd+Shift+R), then:

1. Open any account that has contacts → contact rows should still render normally (no errors). Most contacts will show no tag chips (none assigned yet), which is the expected starting state.
2. Open a contact's inline detail → a "Tags" row appears with "+ Tag" button. No tags listed yet.
3. Click "+ Tag" → popover opens with four buttons: Glint / ROI / ROE / Other.
4. Click "Glint" → button gets ✓ styling, popover stays open. Close it (click outside).
5. Refresh the page → the Glint chip should appear inline AND on the contact-row in the account-lane.
6. Re-open popover, click "Glint" again → ✓ disappears, contact loses the tag (refresh to confirm).

- [ ] **Step 4: Verify DB state**

In Supabase SQL editor:
```sql
SELECT c.full_name, t.name, ct.tagged_by, ct.tagged_at
FROM contact_tags ct
JOIN contacts c ON c.id = ct.contact_id
JOIN tags t ON t.id = ct.tag_id
ORDER BY ct.tagged_at DESC LIMIT 10;
```
Expected: rows that match what you tagged in the smoke test.

- [ ] **Step 5: Done**

If all six smoke-test steps pass and the DB query shows the expected rows, Phase A is complete. Inform the user and ask whether to proceed with the Phase B plan.

---

## Out of scope for this plan

- The "Manage tags" mini-UI (rename / colour edit) — that ships in Phase B alongside the Marketing top-bar item.
- Bulk tag-actions across many contacts — also Phase B.
- Marketing top-bar item itself — Phase B.
- Resend integration, campaign composer, send/tracking flow — Phase C.
- Per-contact campaign-history section, retry-failed action, richer engagement timeline — Phase C/D.

A separate plan document will be written for each subsequent phase after this one is verified live.
