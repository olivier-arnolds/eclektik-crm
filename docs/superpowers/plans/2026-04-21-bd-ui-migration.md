# Eclectik BD UI Migration Plan

> **For agentic workers:** This plan migrates the frontend from the current ad-hoc React structure to Marco's new 3-lane BD design, wired to the existing Supabase backend. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current CRM frontend with Marco's new "Eclectik BD application" design (3-lane workspace: Calendar/Funnel | Comms | Accounts 360°) while keeping the Supabase backend, Microsoft OAuth, Graph API, Unipile, plus preserving Playbooks, Lead conversion/disqualify, and Surfe enrichment features.

**Architecture:** Keep Vite+React+Supabase. Create a parallel `src/bd/` module tree that mirrors Marco's structure (`atoms.jsx`, `lane-*.jsx`, `compose.jsx`, `app.jsx`). Convert Marco's IIFE/window-based modules to ES imports. Port his `styles.css` to a `src/bd/styles.css` and import it from a new root `BDApp` component. Replace `window.BD_DATA` reads with our `usePipelineData()` hook + adapter functions. Gate the new app behind a feature flag (`VITE_NEW_UI=true` or `/bd` route) so we can ship iteratively without breaking the current app.

**Tech Stack:** React 19, Vite, Supabase JS, Microsoft Graph API, Unipile API, existing hooks (`usePipelineData`, `useAuth`), DOMPurify.

**Stage mapping (Marco → CRM):** Keep our 6 existing columns (Qualify/Develop/Proposal/Close/Onboarding/Active) rather than Marco's 6 (lead/qualified/proposal/negotiation/won/lost). Both are 6-column kanban — we keep our internal data model and just use Marco's layout/design.

---

## File Structure

**New files (src/bd/):**
- `src/bd/styles.css` — port of Marco's design system (oklch colors, dark/light, SF Pro)
- `src/bd/BDApp.jsx` — root of the new UI (equivalent to Marco's app.jsx)
- `src/bd/atoms.jsx` — ChannelIcon, OwnerDot, OwnerChip, Avatar, AccountMark, StaleDot, icon set, format helpers
- `src/bd/hooks.js` — useResizableLanes, useLocal, useTheme
- `src/bd/adapters.js` — adapter functions: supabase rows → BD UI shape (with stage mapping)
- `src/bd/lane-funnel.jsx` — funnel kanban with drag-drop
- `src/bd/lane-comms.jsx` — unified inbox (email+LinkedIn+Teams)
- `src/bd/lane-calendar.jsx` — week calendar with tasks + colleague overlay
- `src/bd/lane-accounts.jsx` — right-panel 360° account view
- `src/bd/compose.jsx` — AI-assisted compose modal
- `src/bd/topbar.jsx` — top navigation bar
- `src/bd/statusbar.jsx` — bottom status bar
- `src/bd/new-deal-modal.jsx` — new deal creation modal
- `src/bd/convert-lead-modal.jsx` — convert lead → opportunity (ported from current ItemDetail)
- `src/bd/disqualify-modal.jsx` — disqualify lead workflow
- `src/bd/playbook-enroll-modal.jsx` — enroll contact in playbook
- `src/bd/surfe-enrich-modal.jsx` — trigger Surfe enrichment

**Modified files:**
- `src/main.jsx` — add `/bd` route or feature flag toggle
- `src/App.jsx` — keep current app as fallback until migration complete
- `.env.local` / Vercel env — `VITE_NEW_UI` flag

**SQL migrations needed:**
- `alter table leads add column if not exists product_line text;` (fix the bug found earlier)

---

## Phase 1: Foundation & Scaffolding

### Task 1: Database fix — add product_line to leads

**Files:**
- Manual: Supabase SQL editor

- [ ] **Step 1: Run SQL migration**

In Supabase SQL editor:
```sql
alter table public.leads add column if not exists product_line text;
```

- [ ] **Step 2: Verify by testing product_line save on a lead in current app**

Open a lead, edit Type/Product Line, save. Should persist on refresh.

---

### Task 2: Create `src/bd/` directory structure and feature flag

**Files:**
- Create: `src/bd/BDApp.jsx` (stub)
- Create: `src/bd/styles.css` (stub)
- Modify: `src/main.jsx` — route `/bd` to BDApp

- [ ] **Step 1: Create stub BDApp.jsx**

```jsx
import './styles.css';

export default function BDApp() {
  return <div className="app theme-light">BD App placeholder</div>;
}
```

- [ ] **Step 2: Create stub styles.css**

```css
.app { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui; min-height: 100vh; }
```

- [ ] **Step 3: Add `/bd` route**

In `src/main.jsx`, wrap App with a simple path check:
```jsx
const isBD = window.location.pathname.startsWith('/bd');
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isBD ? <BDApp /> : <App />}
  </StrictMode>
);
```

- [ ] **Step 4: Update vercel.json to rewrite /bd/* to index.html**

Check current vercel.json SPA fallback already handles this (wildcard rewrite).

- [ ] **Step 5: Verify in browser**

Visit `http://localhost:5173/bd` → should see "BD App placeholder". Visit `/` → current app still works.

- [ ] **Step 6: Commit**

```bash
git add src/bd src/main.jsx && git commit -m "Scaffold /bd route for new UI migration"
```

---

### Task 3: Port Marco's styles.css

**Files:**
- Modify: `src/bd/styles.css` — full port

- [ ] **Step 1: Copy Marco's full styles.css content**

Read `/Users/olivierarnolds/Desktop/eclektik-crm/Eclectik BD application/src/styles.css` and write it entirely to `src/bd/styles.css`. Keep all design tokens, keyframes, and classes as-is.

- [ ] **Step 2: Verify in browser**

Visit `/bd` → the placeholder should now render with SF Pro font, light theme background.

- [ ] **Step 3: Commit**

---

## Phase 2: Atoms & Utilities

### Task 4: Port atoms.jsx to ES modules

**Files:**
- Create: `src/bd/atoms.jsx`

- [ ] **Step 1: Read Marco's atoms.jsx**

Read `/Users/olivierarnolds/Desktop/eclektik-crm/Eclectik BD application/src/atoms.jsx`

- [ ] **Step 2: Convert IIFE pattern to ES exports**

Replace `Object.assign(window, {...})` with `export { ... }`. Replace any internal `window.X` references with direct imports. Split hooks to `src/bd/hooks.js` if file gets too big.

Export: `ChannelIcon`, `OwnerDot`, `OwnerChip`, `Avatar`, `AccountMark`, `StaleDot`, `fmtRelative`, `fmtFull`, `fmtMoney`, `STAGE_TINT`, `I` (icon set), `useResizableLanes`, `useLocal`.

- [ ] **Step 3: Replace Marco's fake timestamp format with real Date**

Marco uses `{days, hour, minute}` objects. Rewrite `fmtRelative` and `fmtFull` to accept ISO strings or Date objects (matching `comms.sent_at`, `calendar_events.start_at`).

```js
export function fmtRelative(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
}
```

- [ ] **Step 4: Render a smoke test in BDApp**

```jsx
import { ChannelIcon, OwnerDot, Avatar, fmtMoney } from './atoms';
// ...
<div style={{padding:20, display:'flex', gap:10}}>
  <ChannelIcon ch="email" />
  <ChannelIcon ch="linkedin" />
  <OwnerDot id="MVG" />
  <Avatar name="Olivier Arnolds" color="#378ADD" />
  <span>{fmtMoney(125000)}</span>
</div>
```

- [ ] **Step 5: Verify in browser**

Atoms should render (colored squares with letters, initials circle, €125k).

- [ ] **Step 6: Commit**

---

### Task 5: Create adapter functions (Supabase → BD shape)

**Files:**
- Create: `src/bd/adapters.js`

- [ ] **Step 1: Write adapters**

```js
// src/bd/adapters.js
// Map Supabase rows to the shape BD lane components expect.

// Owner mapping: Supabase stores owner as name string, BD uses id (MVG/OA/YK)
const OWNER_ID = { 'Marco van Gelder': 'MVG', 'Olivier Arnolds': 'OA', 'Yasmine Karkach': 'YK' };
export const ownerIdFromName = (name) => OWNER_ID[name] || name?.split(' ').map(w=>w[0]).join('').slice(0,3).toUpperCase() || '';

export function adaptDeal(item, accounts, contacts) {
  const acc = accounts.find(a => a.id === item.accountId);
  const contact = contacts.find(c => item.contactIds?.includes(c.id));
  // Use our 6-column model directly; BD stages = Qualify/Develop/Proposal/Close/Onboarding/Active
  let stage;
  if (['onboarding','active'].includes(item.funnelStage)) stage = item.funnelStage;
  else stage = item.subStatus || 'qualify';
  return {
    id: item.id,
    title: item.title,
    account: acc?.name || '',
    accountId: acc?.id,
    contact: contact?.name || '',
    contactId: contact?.id,
    value: item.value || 0,
    stage,
    funnelStage: item.funnelStage,
    owner: ownerIdFromName(item.owner),
    staleDays: item.sortDate ? Math.floor((Date.now() - new Date(item.sortDate).getTime()) / 86400000) : 0,
    dealType: item.productLine || '',
    closeDate: item.closeDate || '',
    description: item.notes || '',
    probability: item.probability || 0,
    table: item.funnelStage === 'lead' ? 'leads' : 'opportunities',
  };
}

export function adaptAccount(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type || 'Customer',
    tier: row.tier || '',
    region: row.country || '',
    arr: row.annual_revenue || row.size || '',
    owner: ownerIdFromName(row.owner),
    logoHue: Math.abs([...(row.name||'')].reduce((s,c)=>s+c.charCodeAt(0),0)) % 360,
    industry: row.industry || '',
    website: row.website || '',
    city: row.city || '',
  };
}

export function adaptContact(row, accounts) {
  const acc = accounts.find(a => a.id === row.accountId);
  return {
    id: row.id,
    name: row.name,
    role: row.role || '',
    account: acc?.name || '',
    accountId: row.accountId,
    email: row.email || '',
    phone: row.phone || '',
  };
}

export function adaptComm(row, contacts, accounts, allItems) {
  const item = allItems.find(i => row.itemIds?.includes(i.id));
  const acc = item ? accounts.find(a => a.id === item.accountId) : null;
  return {
    id: row.id,
    channel: row.icon === '◈' ? 'linkedin' : row.icon === '◎' ? 'teams' : 'email',
    dir: row.dir || 'in',
    from: row.from || '',
    subject: row.sub || '',
    preview: row.preview || '',
    unread: row.unread,
    ts: row.date,
    account: acc?.name || '',
    accountId: acc?.id,
    deal: item?.id,
    hasAttach: row.hasAttach || false,
    flagged: row.flagged || false,
  };
}

export function adaptCalEvent(row, allItems, accounts) {
  const item = allItems.find(i => row.itemIds?.includes(i.id));
  const acc = item ? accounts.find(a => a.id === item.accountId) : null;
  const start = row.date ? new Date(row.date + 'T' + (row.time?.split(' – ')[0] || '09:00')) : null;
  return {
    id: row.id,
    kind: 'meeting',
    date: row.date,
    startISO: start?.toISOString(),
    title: row.title,
    deal: item?.id,
    accountId: acc?.id,
    attendees: row.who,
    owner: ownerIdFromName(row.who?.split(',')[0]),
    channel: row.title?.toLowerCase().includes('teams') ? 'teams' : null,
  };
}

export function adaptTask(row, allItems, accounts) {
  const item = allItems.find(i => row.itemIds?.includes(i.id));
  const acc = item ? accounts.find(a => a.id === item.accountId) : null;
  return {
    id: row.id,
    title: row.text,
    dueDate: row.dueDate,
    overdue: row.overdue,
    done: row.done,
    deal: item?.id,
    accountId: acc?.id,
    owner: ownerIdFromName(item?.owner),
  };
}

export const STAGES = [
  { id: 'qualify', label: 'Qualify' },
  { id: 'develop', label: 'Develop' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'close', label: 'Close' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'active', label: 'Active' },
];
```

- [ ] **Step 2: Commit**

---

## Phase 3: Layout Shell

### Task 6: Topbar with theme toggle, user switch, global search

**Files:**
- Create: `src/bd/topbar.jsx`
- Modify: `src/bd/BDApp.jsx`

- [ ] **Step 1: Port Marco's topbar structure**

Copy the Topbar section from Marco's `app.jsx` into `src/bd/topbar.jsx`. Remove fake user switch, wire to real `useAuth()`:

```jsx
import { useAuth } from '../lib/auth';
import { I, OwnerDot } from './atoms';

export default function Topbar({ theme, setTheme, view, setView, layout, setLayout, search, setSearch }) {
  const { session, logout, reconnectMicrosoft, hasGraphToken } = useAuth();
  const userName = session?.user?.user_metadata?.full_name || session?.user?.email || '';
  // ... rest of topbar JSX from Marco's app.jsx
}
```

Keep: brand mark, Calendar/Funnel nav toggle, Focus mode toggle, global search input, theme toggle, logout button. Add: "⚠ Reconnect Microsoft" button if `!hasGraphToken`.

- [ ] **Step 2: Wire into BDApp**

```jsx
import { useState } from 'react';
import Topbar from './topbar';
import { useLocal } from './hooks';

export default function BDApp() {
  const [theme, setTheme] = useLocal('bd_theme', 'light');
  const [view, setView] = useLocal('bd_view', 'workspace');
  const [layout, setLayout] = useLocal('bd_layout', 'fixed');
  const [search, setSearch] = useState('');

  return (
    <div className={`app theme-${theme}`} data-layout={layout}>
      <Topbar theme={theme} setTheme={setTheme} view={view} setView={setView}
              layout={layout} setLayout={setLayout} search={search} setSearch={setSearch} />
      <div className="lanes" style={{padding:40, color:'var(--text-primary)'}}>Lanes placeholder</div>
      <div className="statusbar">Eclectik BD</div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Visit `/bd` → see topbar with toggles. Toggle theme → dark/light switch works.

- [ ] **Step 4: Commit**

---

### Task 7: Statusbar

**Files:**
- Create: `src/bd/statusbar.jsx`
- Modify: `src/bd/BDApp.jsx`

- [ ] **Step 1: Create statusbar**

```jsx
import { fmtMoney } from './atoms';
export default function Statusbar({ unreadCount, openDeals, totalValue, userName }) {
  return (
    <div className="statusbar">
      <span>Eclectik BD</span>
      <span className="statusbar-sep">·</span>
      <span>{userName}</span>
      <span className="statusbar-sep">·</span>
      <span>{unreadCount} unread</span>
      <span className="statusbar-sep">·</span>
      <span>{openDeals} open · {fmtMoney(totalValue)}</span>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

---

## Phase 4: Data Layer

### Task 8: BD data provider hook

**Files:**
- Create: `src/bd/useBDData.js`

- [ ] **Step 1: Create unified data hook**

```js
import { usePipelineData } from '../hooks/usePipelineData';
import { adaptDeal, adaptAccount, adaptContact, adaptComm, adaptCalEvent, adaptTask } from './adapters';

export function useBDData() {
  const raw = usePipelineData();
  const accounts = (raw.accounts || []).map(adaptAccount);
  const contacts = (raw.contacts || []).map(c => adaptContact(c, accounts));
  const deals = (raw.allItems || []).map(d => adaptDeal(d, raw.accounts || [], raw.contacts || []));
  const comms = (raw.comms || []).map(c => adaptComm(c, raw.contacts || [], raw.accounts || [], raw.allItems || []));
  const events = (raw.calEvents || []).map(e => adaptCalEvent(e, raw.allItems || [], raw.accounts || []));
  const tasks = (raw.tasks || []).map(t => adaptTask(t, raw.allItems || [], raw.accounts || []));
  return { accounts, contacts, deals, comms, events, tasks, loading: raw.loading, refetch: raw.refetch };
}
```

- [ ] **Step 2: Render loading state in BDApp**

```jsx
const { loading, deals, accounts } = useBDData();
if (loading) return <div className="app">Loading…</div>;
// show counts
<div>Deals: {deals.length} · Accounts: {accounts.length}</div>
```

- [ ] **Step 3: Verify in browser**

Data should load (numbers shown). Open React DevTools to confirm shapes.

- [ ] **Step 4: Commit**

---

## Phase 5: Funnel Lane

### Task 9: Port funnel lane with drag-drop

**Files:**
- Create: `src/bd/lane-funnel.jsx`

- [ ] **Step 1: Port Marco's lane-funnel.jsx**

Read source, convert to ES modules. Replace `BD_DATA.DEALS` with `deals` prop (from useBDData). Replace stage keys with our 6 (qualify/develop/proposal/close/onboarding/active). Use `STAGES` from adapters.

- [ ] **Step 2: Wire drag-drop to updateRow**

On drop:
```js
const dealToUpdate = deals.find(d => d.id === draggedId);
const updates = {};
if (['onboarding', 'active'].includes(newStage)) {
  updates.stage = newStage;
  updates.sub_status = null;
} else {
  updates.sub_status = newStage;
  if (dealToUpdate.table === 'opportunities') updates.stage = 'opportunity';
}
await updateRow(dealToUpdate.table, draggedId, updates);
refetch();
```

- [ ] **Step 3: Wire filter chips to real owner IDs**

Owner chips: MVG/OA/YK. Filter deals by `d.owner === filterOwner`.
Type chips: use real product lines from our data (Glint, People Science, AI Transformation, ROI, Technical, Other).

- [ ] **Step 4: Verify in browser**

Visit `/bd` → see funnel with 6 columns + real deals. Drag a deal → moves column, persists after refresh.

- [ ] **Step 5: Commit**

---

### Task 10: New Deal modal

**Files:**
- Create: `src/bd/new-deal-modal.jsx`

- [ ] **Step 1: Port Marco's NewDealModal**

Wire "Create" button to `supabase.from('leads').insert({...})` with proper field mapping (full_name, company_id, topic, est_revenue, sub_status).

- [ ] **Step 2: Verify by creating a test lead + commit**

---

## Phase 6: Calendar Lane

### Task 11: Port calendar week view

**Files:**
- Create: `src/bd/lane-calendar.jsx`

- [ ] **Step 1: Port Marco's calendar**

Replace `BD_DATA.WEEK` with `events` prop. Convert ISO timestamps to day-index + decimal hour:
```js
function eventPosition(ev) {
  const d = new Date(ev.startISO);
  const dayIdx = (d.getDay() + 6) % 7; // Mon=0
  if (dayIdx > 4) return null; // skip weekends
  const start = d.getHours() + d.getMinutes()/60;
  return { dayIdx, start, end: start + 1 }; // default 1h if no endISO
}
```

- [ ] **Step 2: Wire Graph calendar fetch**

On mount, call `getCalendarEvents()` from `src/lib/graph.js` for current week. Merge with Supabase events.

- [ ] **Step 3: Verify in browser**

Week calendar shows events from both Graph API and Supabase. Current time line visible.

- [ ] **Step 4: Wire "Add task" modal**

Ported from Marco's. On save, `supabase.from('tasks').insert(...)`.

- [ ] **Step 5: Commit**

---

## Phase 7: Comms Lane

### Task 12: Port unified inbox with reading pane

**Files:**
- Create: `src/bd/lane-comms.jsx`

- [ ] **Step 1: Port Marco's comms lane**

Replace data source with `comms` prop from useBDData. Channel filter chips: email/linkedin/teams.

- [ ] **Step 2: Wire reading pane to fetch real email body**

On message select, if channel===email, call `graphGet('/me/messages/'+id)` to get body. Render with DOMPurify.

- [ ] **Step 3: Wire Reply/Reply-All/Forward buttons**

Open `ComposeModal` with pre-filled `to`, `subject` (Re: / Fwd:), and `inReplyTo` ID.

- [ ] **Step 4: Wire Archive button**

Add `archived` column migration: `alter table comms add column if not exists archived boolean default false;`
On archive: `updateRow('comms', id, { archived: true })`.

- [ ] **Step 5: Verify + commit**

---

## Phase 8: Accounts Lane

### Task 13: Port 360° account panel

**Files:**
- Create: `src/bd/lane-accounts.jsx`

- [ ] **Step 1: Port Marco's accounts lane**

Replace data source. Wire cross-lane context:
- Select comm → show that comm's account with "Reply" highlight
- Select event → show that event's account with "Open meeting" highlight
- Select deal from funnel → show that deal's account with "Open deal" highlight

- [ ] **Step 2: Wire sections**

- Contacts section → list from our `contacts` filtered by accountId
- Deals section → list from `deals` filtered by accountId
- Meetings section → events for this account
- Recent comms → last 6 comms
- Tasks section → tasks for this account

- [ ] **Step 3: Verify + commit**

---

## Phase 9: Compose Modal

### Task 14: Port AI compose + wire send

**Files:**
- Create: `src/bd/compose.jsx`

- [ ] **Step 1: Port Marco's compose modal**

Keep tone/template chips, streaming draft UI.

- [ ] **Step 2: Wire AI draft to Anthropic API**

Replace Marco's template-based draft with a real call to `/api/ai-compose` (create this endpoint; use existing `company-insights.js` pattern with Anthropic API).

- [ ] **Step 3: Wire Send button by channel**

- Email → `sendEmail()` from `src/lib/graph.js`
- LinkedIn → `fetch('/api/unipile', {action:'send-message', ...})`
- Teams → open Teams link (no automation — fallback to URL)

- [ ] **Step 4: Verify by sending a test message + commit**

---

## Phase 10: Preserved Features

### Task 15: Convert Lead → Opportunity modal

**Files:**
- Create: `src/bd/convert-lead-modal.jsx`

- [ ] **Step 1: Port logic from current `src/components/detail/ItemDetail.jsx`**

Find the "Convert to Opportunity" button handler (search for `convertToOpportunity`). Port the entire flow:
- Form: est_revenue, probability, close_date, product_line (multiselect)
- Auto-create company if missing
- Auto-create contact if missing
- Insert opportunity with contact_id + company_id
- Delete lead

- [ ] **Step 2: Wire into BD funnel "Convert" action**

Add "Convert to Opp" button on lead-stage deal cards.

- [ ] **Step 3: Verify + commit**

---

### Task 16: Disqualify Lead modal

**Files:**
- Create: `src/bd/disqualify-modal.jsx`

- [ ] **Step 1: Port disqualify logic**

From current ItemDetail. Sets lead status to 'Disqualified' with reason.

- [ ] **Step 2: Add "Disqualify" action to lead cards + commit**

---

### Task 17: Playbook enrollment

**Files:**
- Create: `src/bd/playbook-enroll-modal.jsx`
- Create: `src/bd/playbooks-view.jsx` (ported from `src/components/playbooks/`)

- [ ] **Step 1: Port PlaybooksList + PlaybookDetail from current codebase**

Reuse as-is, wrapped in BD styling (className, not inline styles).

- [ ] **Step 2: Add "Enroll in Playbook" action to contact cards + deal cards**

- [ ] **Step 3: Add Playbooks nav item to topbar**

- [ ] **Step 4: Verify enrollment works + commit**

---

### Task 18: Surfe Enrichment modal

**Files:**
- Create: `src/bd/surfe-enrich-modal.jsx`

- [ ] **Step 1: Port EnrichModal from current `src/components/forms/EnrichModal.jsx`**

- [ ] **Step 2: Add "Enrich contacts" button to topbar**

- [ ] **Step 3: Verify enrichment still works end-to-end (trigger → webhook → data in DB) + commit**

---

## Phase 11: Cross-lane Coordination

### Task 19: Wire cross-lane selection state

**Files:**
- Modify: `src/bd/BDApp.jsx`

- [ ] **Step 1: Add shared state**

```js
const [selectedComm, setSelectedComm] = useState(null);
const [rightContext, setRightContext] = useState(null);
const [focusLane, setFocusLane] = useState(null);
```

- [ ] **Step 2: Pass handlers to lanes**

When comms lane selects a message → `setRightContext({type:'comm', id})`. Accounts lane reads `rightContext` and shows that account with highlight strip.

- [ ] **Step 3: Test all cross-lane interactions + commit**

---

## Phase 12: Systematic Browser Testing

### Task 20: Test matrix execution

**Files:**
- Create: `docs/superpowers/test-results/2026-04-21-bd-ui-test.md`

- [ ] **Step 1: Start Claude in Chrome, navigate to `/bd`**

Use `mcp__Claude_in_Chrome__navigate`.

- [ ] **Step 2: Execute test matrix**

For each of the following, click through and verify:

**Topbar:**
- [ ] Theme toggle: light ↔ dark persists on refresh
- [ ] Layout toggle: fixed ↔ focused changes lane sizes
- [ ] View toggle: workspace ↔ funnel-only
- [ ] Global search: typing filters across lanes
- [ ] Reconnect Microsoft (if token expired)
- [ ] Logout

**Funnel lane:**
- [ ] 6 columns visible with correct counts
- [ ] Drag deal from Qualify → Develop → persists
- [ ] Click deal → opens right-panel account
- [ ] Filter by owner chip → only that owner's deals
- [ ] Filter by product line chip → filtered
- [ ] "+ New Deal" opens modal, creates lead, appears in Qualify

**Calendar lane:**
- [ ] Week view renders Mon-Fri
- [ ] Current time line visible
- [ ] Events from Graph API show
- [ ] Events from Supabase show
- [ ] Click event → right panel shows account
- [ ] "Add task" modal works, task appears

**Comms lane:**
- [ ] Inbox/Sent/Archived folders switch
- [ ] Channel filter chips work (email/linkedin/teams)
- [ ] Click message → reading pane shows body
- [ ] Reply button opens compose with prefilled fields
- [ ] Archive button moves to archived folder
- [ ] Search filters messages

**Accounts 360° lane:**
- [ ] Account list → searchable, clickable
- [ ] Detail view: contacts expandable with email/deals
- [ ] Deals section shows open deals
- [ ] Meetings section shows upcoming
- [ ] Recent comms clickable
- [ ] Tasks section toggles done state

**Compose:**
- [ ] Tone chips change draft
- [ ] Template chips change draft
- [ ] Channel switch (email/teams/linkedin)
- [ ] "Send" actually sends via correct channel
- [ ] Copy to clipboard works

**Preserved features:**
- [ ] Convert lead to opportunity: form → creates opp, removes lead
- [ ] Disqualify lead: sets status, reason, archives
- [ ] Enroll contact in playbook → creates enrollment row
- [ ] Surfe enrich: select contacts → triggers → webhook updates DB

**Cross-lane:**
- [ ] Click comm → account panel updates
- [ ] Click event → account panel updates
- [ ] Click deal → account panel updates

- [ ] **Step 3: Document results**

Write findings to `docs/superpowers/test-results/2026-04-21-bd-ui-test.md` with pass/fail per item and screenshots for failures.

- [ ] **Step 4: Fix issues and re-test until all pass**

- [ ] **Step 5: Final commit**

```bash
git commit -m "Complete BD UI migration with all features verified"
```

---

### Task 21: Flip the default route

**Files:**
- Modify: `src/main.jsx`

- [ ] **Step 1: Once all tests pass, swap default**

```jsx
const isOld = window.location.pathname.startsWith('/old');
// Default to BDApp now
{isOld ? <App /> : <BDApp />}
```

- [ ] **Step 2: Deploy + verify on production URL**

- [ ] **Step 3: Commit + push**

---

## Notes

- Each task commits after verification
- The `/old` route keeps the current app accessible as fallback until we're confident
- Stage mapping: we keep our 6-column model; no Marco-style "lead/qualified/proposal/negotiation/won/lost" translation needed
- Database migration needed before Task 2: `alter table leads add column if not exists product_line text;`
- Comms archive column needed in Task 12
