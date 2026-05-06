# Marketing Phase B — View skeleton + bulk tagging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5th top-bar item "Marketing" that opens a full-width view with Contacts and Campaigns tabs. Contacts tab supports filters + multi-select + bulk tag/untag actions. Campaigns tab is a placeholder until Phase C. Manage-tags mini-UI lives in the Marketing view header.

**Architecture:** New full-width view component `marketing-view.jsx` mounted by `BDApp.jsx` when `view === 'marketing'`. Two tab subcomponents (`marketing-contacts.jsx`, `marketing-campaigns.jsx`) plus two modals (`marketing-bulk-tag-modal.jsx`, `marketing-tag-manager.jsx`). All data flows in via props from `BDApp` → `MarketingView` → tabs/modals; no new hooks.

**Tech stack:** React 19, Supabase JS client, existing BD-app patterns (CSS-in-JS + classes from `styles.css`).

**Reference spec:** [docs/superpowers/specs/2026-05-06-marketing-tags-campaigns-design.md](../specs/2026-05-06-marketing-tags-campaigns-design.md) §4.1, §4.2, §4.7, §7 Phase B.

**Note on testing:** No React unit-test setup; verification via `npm run build` per task and a final browser smoke-test on production.

---

## File structure

| Action | Path | Purpose |
|---|---|---|
| Modify | `src/bd/topbar.jsx` | Add 5th nav button "Marketing" |
| Modify | `src/bd/BDApp.jsx` | Route `view === 'marketing'` to MarketingView |
| Create | `src/bd/marketing-view.jsx` | Top-level Marketing view with tab bar |
| Create | `src/bd/marketing-contacts.jsx` | Contacts tab: filter sidebar + list + bulk action bar |
| Create | `src/bd/marketing-campaigns.jsx` | Campaigns tab: placeholder for Phase C |
| Create | `src/bd/marketing-bulk-tag-modal.jsx` | Multi-select modal for adding/removing tags on N contacts |
| Create | `src/bd/marketing-tag-manager.jsx` | Modal for renaming + recoloring tag definitions |

Total: 5 new files, 2 modifications.

---

### Task B.1 — Add "Marketing" nav button to topbar

**Files:**
- Modify: `src/bd/topbar.jsx`

- [ ] **Step 1: Find the existing nav block**

In `src/bd/topbar.jsx`, locate the `<div className="topbar-nav">` containing buttons for Workspace/Funnel/Playbooks/Tasks (around lines 26–41).

- [ ] **Step 2: Add the Marketing button**

Insert this button as the LAST child inside `<div className="topbar-nav">`, after the Tasks button:

```jsx
<button className={view === 'marketing' ? 'on' : ''}
  onClick={() => setView('marketing')} title="Marketing — segment & campaign">
  <I.send /> Marketing
</button>
```

The `I.send` icon is already exported from `src/bd/atoms.jsx` (used elsewhere as a paper-plane glyph).

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: built without errors.

- [ ] **Step 4: Commit**

```bash
git add src/bd/topbar.jsx
git commit -m "Add Marketing nav button to topbar"
```

---

### Task B.2 — Route `view === 'marketing'` in BDApp

**Files:**
- Modify: `src/bd/BDApp.jsx`

- [ ] **Step 1: Add the import for MarketingView**

Near the existing imports for FunnelLane / CalendarLane / etc. (around line 11–22), add:

```js
import MarketingView from './marketing-view';
```

(MarketingView itself is created in Task B.3; this import will resolve once that file exists.)

- [ ] **Step 2: Add a new branch for view === 'marketing'**

In `src/bd/BDApp.jsx`, find the existing `if (view === 'tasks') {` block (around line 208). Just BEFORE that block, add a new branch:

```jsx
  if (view === 'marketing') {
    return (
      <div className={`app theme-${theme}`} data-layout={layout}>
        <Topbar theme={theme} setTheme={setTheme} view={view} setView={setView}
                leftLane={leftLane} setLeftLane={setLeftLane}
                layout={layout} setLayout={setLayout} search={search} setSearch={setSearch}
                onEnrich={() => setShowEnrich(true)}
                onRefreshGraph={fetchGraphData} graphLoading={graphLoading} />
        <div className="lanes" style={{ display: 'block', overflow: 'auto' }}>
          <MarketingView
            contacts={contacts}
            accounts={accounts}
            deals={deals}
            allTags={allTags}
            refetch={refetch}
          />
        </div>
        <Statusbar userName={userName} unreadCount={unreadCount} openDeals={openDealsCount} totalValue={totalValue} />
      </div>
    );
  }
```

This mirrors the existing `tasks` view shape (Topbar + lanes container + Statusbar) but renders MarketingView full-width via `display: block` on the lanes container.

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: a build error referencing `marketing-view` (the file doesn't exist yet) — this is expected; B.3 creates it. If you want to defer this commit until B.3 is done, skip step 4 and combine the commits. Otherwise leave the broken import for now and proceed to B.3 immediately.

- [ ] **Step 4: Commit (combined with B.3 — see note)**

Skip this commit and let B.3 land both files in one commit. The plan splits B.2 and B.3 conceptually but they ship together because the import would otherwise break the build.

---

### Task B.3 — Marketing view skeleton with tabs

**Files:**
- Create: `src/bd/marketing-view.jsx`

- [ ] **Step 1: Write the skeleton**

```jsx
import { useState } from 'react';
import { I } from './atoms';
import MarketingContacts from './marketing-contacts';
import MarketingCampaigns from './marketing-campaigns';
import TagManager from './marketing-tag-manager';

export default function MarketingView({ contacts, accounts, deals, allTags, refetch }) {
  const [tab, setTab] = useState('contacts');
  const [showTagManager, setShowTagManager] = useState(false);

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, borderBottom: '0.5px solid var(--sep)', paddingBottom: 8 }}>
        <button
          className={tab === 'contacts' ? 'btn-primary tiny' : 'btn-ghost tiny'}
          onClick={() => setTab('contacts')}>
          Contacts
        </button>
        <button
          className={tab === 'campaigns' ? 'btn-primary tiny' : 'btn-ghost tiny'}
          onClick={() => setTab('campaigns')}>
          Campaigns
        </button>
        <button
          className="btn-ghost tiny"
          style={{ marginLeft: 'auto' }}
          onClick={() => setShowTagManager(true)}>
          Manage tags
        </button>
      </div>

      {tab === 'contacts' && (
        <MarketingContacts
          contacts={contacts}
          accounts={accounts}
          deals={deals}
          allTags={allTags}
          refetch={refetch}
        />
      )}
      {tab === 'campaigns' && <MarketingCampaigns />}

      {showTagManager && (
        <TagManager
          allTags={allTags}
          onClose={() => setShowTagManager(false)}
          onChange={refetch}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create stub files for the imports so the build passes**

The skeleton imports three components that don't exist yet. Create them as stubs that we'll flesh out in later tasks:

`src/bd/marketing-contacts.jsx`:
```jsx
export default function MarketingContacts() {
  return <div style={{ padding: 24, color: 'var(--text-3)' }}>Contacts tab — coming in Task B.4</div>;
}
```

`src/bd/marketing-campaigns.jsx`:
```jsx
export default function MarketingCampaigns() {
  return <div style={{ padding: 24, color: 'var(--text-3)' }}>Campaigns tab — coming in Phase C</div>;
}
```

`src/bd/marketing-tag-manager.jsx`:
```jsx
export default function TagManager({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-1)', padding: 24, borderRadius: 8, minWidth: 400 }}>
        <div>Manage tags — coming in Task B.8</div>
        <button onClick={onClose} style={{ marginTop: 12 }} className="btn-ghost tiny">Close</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: built without errors.

- [ ] **Step 4: Commit (combined with B.1, B.2)**

```bash
git add src/bd/topbar.jsx src/bd/BDApp.jsx src/bd/marketing-view.jsx src/bd/marketing-contacts.jsx src/bd/marketing-campaigns.jsx src/bd/marketing-tag-manager.jsx
git commit -m "Marketing view skeleton: nav button, route, tabs"
```

DO NOT push. Verification by clicking the new "Marketing" tab will happen at the end via smoke test.

---

### Task B.4 — Contacts tab: filter sidebar + list (no actions yet)

**Files:**
- Modify: `src/bd/marketing-contacts.jsx`

- [ ] **Step 1: Replace the stub with the full Contacts-tab content**

Replace the entire content of `src/bd/marketing-contacts.jsx` with:

```jsx
import { useState, useMemo } from 'react';
import TagChip from './tag-chip';

// Marketing → Contacts tab
// Props: contacts, accounts, deals, allTags, refetch
// Layout: filter sidebar (left, ~260px) + list (right, fills)
export default function MarketingContacts({ contacts, accounts, deals, allTags, refetch }) {
  const [selectedTagIds, setSelectedTagIds] = useState(new Set());
  const [hasGlintDeal, setHasGlintDeal] = useState(false);
  const [hasAnyDeal, setHasAnyDeal] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);

  // Per-tag count: how many contacts carry tag X
  const tagCounts = useMemo(() => {
    const counts = new Map();
    for (const c of contacts) {
      for (const t of (c.tags || [])) counts.set(t.id, (counts.get(t.id) || 0) + 1);
    }
    return counts;
  }, [contacts]);

  // accountIds with at least one Glint deal (for the "has Glint deal" filter)
  const accountsWithGlintDeal = useMemo(() => {
    const set = new Set();
    for (const d of deals) if (d.dealType === 'Glint' && d.accountId) set.add(d.accountId);
    return set;
  }, [deals]);
  const accountsWithAnyDeal = useMemo(() => {
    const set = new Set();
    for (const d of deals) if (d.accountId) set.add(d.accountId);
    return set;
  }, [deals]);

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      if (activeOnly && c.isFormer) return false;
      if (hasEmail && !c.email) return false;
      if (hasGlintDeal && !accountsWithGlintDeal.has(c.accountId)) return false;
      if (hasAnyDeal && !accountsWithAnyDeal.has(c.accountId)) return false;
      if (selectedTagIds.size > 0) {
        const ids = (c.tags || []).map(t => t.id);
        if (!ids.some(id => selectedTagIds.has(id))) return false;
      }
      return true;
    });
  }, [contacts, activeOnly, hasEmail, hasGlintDeal, hasAnyDeal, accountsWithGlintDeal, accountsWithAnyDeal, selectedTagIds]);

  const toggleTagFilter = (tagId) => {
    const next = new Set(selectedTagIds);
    if (next.has(tagId)) next.delete(tagId); else next.add(tagId);
    setSelectedTagIds(next);
  };

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Filter sidebar */}
      <aside style={{ flex: '0 0 240px', background: 'var(--bg-1)', padding: 12, border: '0.5px solid var(--sep)', borderRadius: 8, alignSelf: 'flex-start' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Tags</div>
        {(allTags || []).map(t => (
          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
            <input type="checkbox" checked={selectedTagIds.has(t.id)} onChange={() => toggleTagFilter(t.id)} />
            <TagChip tag={t} small />
            <span style={{ color: 'var(--text-3)', marginLeft: 'auto', fontSize: 10 }}>({tagCounts.get(t.id) || 0})</span>
          </label>
        ))}

        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 6px' }}>Deals</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={hasGlintDeal} onChange={() => setHasGlintDeal(v => !v)} />
          Has Glint deal
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={hasAnyDeal} onChange={() => setHasAnyDeal(v => !v)} />
          Has any deal
        </label>

        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 6px' }}>Status</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={hasEmail} onChange={() => setHasEmail(v => !v)} />
          Has email
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={activeOnly} onChange={() => setActiveOnly(v => !v)} />
          Active only
        </label>
      </aside>

      {/* Contact list */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
          {filtered.length} of {contacts.length} contacts
        </div>
        <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '0.5px solid var(--sep)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.role}{c.account ? ` · ${c.account}` : ''}</div>
              </div>
              {(c.tags || []).length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(c.tags || []).map(t => <TagChip key={t.id} tag={t} small />)}
                </div>
              )}
              <span style={{ fontSize: 10, color: c.email ? 'var(--good)' : 'var(--text-4)', minWidth: 18, textAlign: 'center' }}>
                {c.email ? '✉' : '—'}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
              No contacts match the current filters.
            </div>
          )}
        </div>
      </div>
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
git add src/bd/marketing-contacts.jsx
git commit -m "Marketing Contacts tab: filter sidebar + list"
```

---

### Task B.5 — Multi-select (checkboxes) on contact rows

**Files:**
- Modify: `src/bd/marketing-contacts.jsx`

- [ ] **Step 1: Add selection state**

At the top of `MarketingContacts`, add state next to the other useState calls:

```js
const [selected, setSelected] = useState(new Set());
```

- [ ] **Step 2: Add toggle helpers**

Below the `toggleTagFilter` function, add:

```js
const toggleRow = (id) => {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id); else next.add(id);
  setSelected(next);
};
const toggleAll = () => {
  if (selected.size === filtered.length && filtered.length > 0) {
    setSelected(new Set());
  } else {
    setSelected(new Set(filtered.map(c => c.id)));
  }
};
```

- [ ] **Step 3: Add select-all + counter row above the list**

Replace this line:
```jsx
<div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
  {filtered.length} of {contacts.length} contacts
</div>
```
with:
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)', cursor: 'pointer' }}>
    <input type="checkbox"
      checked={selected.size > 0 && selected.size === filtered.length}
      ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < filtered.length; }}
      onChange={toggleAll} />
    Select all
  </label>
  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
    {filtered.length} of {contacts.length} contacts
    {selected.size > 0 && ` · ${selected.size} selected`}
  </span>
</div>
```

- [ ] **Step 4: Add a checkbox to each row**

In the row map, replace the existing row JSX with this version that adds a leading checkbox:

```jsx
{filtered.map(c => (
  <div key={c.id}
    onClick={() => toggleRow(c.id)}
    style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
      borderBottom: '0.5px solid var(--sep)',
      cursor: 'pointer',
      background: selected.has(c.id) ? 'var(--accent-tint)' : 'transparent',
    }}>
    <input
      type="checkbox"
      checked={selected.has(c.id)}
      onChange={() => toggleRow(c.id)}
      onClick={e => e.stopPropagation()}
      style={{ flexShrink: 0 }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.role}{c.account ? ` · ${c.account}` : ''}</div>
    </div>
    {(c.tags || []).length > 0 && (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {(c.tags || []).map(t => <TagChip key={t.id} tag={t} small />)}
      </div>
    )}
    <span style={{ fontSize: 10, color: c.email ? 'var(--good)' : 'var(--text-4)', minWidth: 18, textAlign: 'center' }}>
      {c.email ? '✉' : '—'}
    </span>
  </div>
))}
```

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -3
```

- [ ] **Step 6: Commit**

```bash
git add src/bd/marketing-contacts.jsx
git commit -m "Marketing Contacts tab: multi-select rows"
```

---

### Task B.6 — Bulk-tag modal component

**Files:**
- Create: `src/bd/marketing-bulk-tag-modal.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useState } from 'react';
import { supabase } from '../supabase';
import TagChip from './tag-chip';

// Modal for adding or removing tags on a batch of selected contacts.
// Props:
//   contactIds: Set<uuid> — the selected contacts
//   allTags: array of tag objects
//   userEmail: string (for tagged_by audit field)
//   onClose: () => void
//   onComplete: () => void  — called after the batch operation finishes
export default function BulkTagModal({ contactIds, allTags, userEmail, onClose, onComplete }) {
  const [mode, setMode] = useState('add'); // 'add' | 'remove'
  const [selectedTagIds, setSelectedTagIds] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const ids = [...contactIds];

  const toggleTag = (tagId) => {
    const next = new Set(selectedTagIds);
    if (next.has(tagId)) next.delete(tagId); else next.add(tagId);
    setSelectedTagIds(next);
  };

  const apply = async () => {
    if (selectedTagIds.size === 0 || ids.length === 0) return;
    setBusy(true);
    setResult(null);

    try {
      if (mode === 'add') {
        // Build all (contact_id, tag_id) rows; rely on PK conflict to skip duplicates
        const rows = [];
        for (const cid of ids) {
          for (const tid of selectedTagIds) rows.push({ contact_id: cid, tag_id: tid, tagged_by: userEmail });
        }
        // Use upsert to avoid PK violations on already-tagged contacts
        const { error } = await supabase.from('contact_tags').upsert(rows, { onConflict: 'contact_id,tag_id', ignoreDuplicates: true });
        if (error) throw error;
      } else {
        // Remove: one delete per tag (Supabase doesn't support multi-key delete in a single call)
        for (const tid of selectedTagIds) {
          const { error } = await supabase.from('contact_tags').delete().in('contact_id', ids).eq('tag_id', tid);
          if (error) throw error;
        }
      }
      setResult({ ok: true, count: ids.length, tagCount: selectedTagIds.size });
      if (onComplete) onComplete();
    } catch (e) {
      setResult({ ok: false, error: e.message || 'Failed' });
    }
    setBusy(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', borderRadius: 10, padding: 20, width: 460, boxShadow: 'var(--shadow-modal, 0 8px 24px rgba(0,0,0,0.2))' }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
          Tag {ids.length} contact{ids.length !== 1 ? 's' : ''}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            className={mode === 'add' ? 'btn-primary tiny' : 'btn-ghost tiny'}
            onClick={() => setMode('add')}>
            + Add tags
          </button>
          <button
            className={mode === 'remove' ? 'btn-primary tiny' : 'btn-ghost tiny'}
            onClick={() => setMode('remove')}>
            − Remove tags
          </button>
        </div>

        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Pick tag(s)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {(allTags || []).map(tag => {
            const selected = selectedTagIds.has(tag.id);
            return (
              <button key={tag.id} onClick={() => toggleTag(tag.id)} disabled={busy}
                style={{
                  background: selected ? tag.color + '33' : 'transparent',
                  color: tag.color,
                  border: `0.5px solid ${tag.color}${selected ? 'aa' : '44'}`,
                  borderRadius: 10,
                  padding: '4px 10px',
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

        {result && (
          <div style={{ fontSize: 12, color: result.ok ? 'var(--good)' : 'var(--danger)', marginBottom: 12 }}>
            {result.ok
              ? `✓ ${mode === 'add' ? 'Tagged' : 'Untagged'} ${result.count} contact${result.count !== 1 ? 's' : ''} with ${result.tagCount} tag${result.tagCount !== 1 ? 's' : ''}.`
              : `✗ ${result.error}`}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-ghost tiny" onClick={onClose}>{result?.ok ? 'Done' : 'Cancel'}</button>
          {!result?.ok && (
            <button className="btn-primary tiny" onClick={apply} disabled={busy || selectedTagIds.size === 0}>
              {busy ? 'Applying…' : `${mode === 'add' ? 'Add' : 'Remove'} tag${selectedTagIds.size !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

Note: `TagChip` is imported but not used in the JSX. Remove the `import TagChip from './tag-chip';` line — leftover from drafting. Final imports must be only `useState` from react and `supabase`.

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add src/bd/marketing-bulk-tag-modal.jsx
git commit -m "Add bulk-tag modal component"
```

---

### Task B.7 — Wire bulk-tag modal into Contacts tab

**Files:**
- Modify: `src/bd/marketing-contacts.jsx`

- [ ] **Step 1: Add the imports + auth hook**

At the top of `src/bd/marketing-contacts.jsx`, add these imports below the existing ones:

```js
import BulkTagModal from './marketing-bulk-tag-modal';
import { useAuth } from '../lib/auth';
```

Inside `MarketingContacts`, near the other state:
```js
const [showBulkTag, setShowBulkTag] = useState(false);
const { session } = useAuth();
const userEmail = session?.user?.email || '';
```

- [ ] **Step 2: Add the bulk-action bar above the list (only visible when ≥1 selected)**

Inside the right-hand pane (after the `Select all` row, before the list container), add:

```jsx
{selected.size > 0 && (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--accent-tint)', borderRadius: 8, marginBottom: 8 }}>
    <span style={{ fontSize: 12, fontWeight: 500 }}>{selected.size} selected</span>
    <button className="btn-primary tiny" onClick={() => setShowBulkTag(true)}>
      Tag selected
    </button>
    <button className="btn-ghost tiny" onClick={() => setSelected(new Set())}>
      Clear
    </button>
  </div>
)}
```

- [ ] **Step 3: Render the modal at the bottom of the component**

Just before the closing `</div>` of the outer `display:flex` container (the very last line of the return), add:

```jsx
{showBulkTag && (
  <BulkTagModal
    contactIds={selected}
    allTags={allTags}
    userEmail={userEmail}
    onClose={() => setShowBulkTag(false)}
    onComplete={() => { setSelected(new Set()); if (refetch) refetch(); }}
  />
)}
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -3
```

- [ ] **Step 5: Commit**

```bash
git add src/bd/marketing-contacts.jsx
git commit -m "Wire bulk-tag modal into Contacts tab"
```

---

### Task B.8 — Manage-tags mini-UI

**Files:**
- Modify: `src/bd/marketing-tag-manager.jsx`

- [ ] **Step 1: Replace the stub with the full Tag Manager**

Replace the entire content of `src/bd/marketing-tag-manager.jsx` with:

```jsx
import { useState } from 'react';
import { supabase } from '../supabase';

// Modal for editing tag definitions (rename + recolor).
// System tags can be edited but not deleted; custom tags will be deletable in v2.
// Props: allTags, onClose, onChange
export default function TagManager({ allTags, onClose, onChange }) {
  const [editing, setEditing] = useState(null); // tag id being edited
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const startEdit = (tag) => {
    setEditing(tag.id);
    setDraftName(tag.name);
    setDraftColor(tag.color);
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraftName('');
    setDraftColor('');
  };

  const save = async (tag) => {
    if (!draftName.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('tags')
        .update({ name: draftName.trim(), color: draftColor })
        .eq('id', tag.id);
      if (error) throw error;
      cancelEdit();
      if (onChange) onChange();
    } catch (e) {
      setError(e.message || 'Save failed');
    }
    setBusy(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', borderRadius: 10, padding: 20, width: 480, maxHeight: '80vh', overflowY: 'auto', boxShadow: 'var(--shadow-modal, 0 8px 24px rgba(0,0,0,0.2))' }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Manage tags</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(allTags || []).map(tag => {
            const isEditing = editing === tag.id;
            return (
              <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '0.5px solid var(--sep)', borderRadius: 6 }}>
                {isEditing ? (
                  <>
                    <input type="color" value={draftColor} onChange={e => setDraftColor(e.target.value)}
                      style={{ width: 32, height: 22, border: 'none', cursor: 'pointer', padding: 0 }} />
                    <input value={draftName} onChange={e => setDraftName(e.target.value)}
                      autoFocus
                      style={{ flex: 1, padding: '3px 6px', borderRadius: 4, border: '0.5px solid var(--sep)', fontSize: 12 }} />
                    <button className="btn-primary tiny" onClick={() => save(tag)} disabled={busy}>Save</button>
                    <button className="btn-ghost tiny" onClick={cancelEdit} disabled={busy}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: tag.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{tag.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tag.type}</span>
                    <button className="btn-ghost tiny" onClick={() => startEdit(tag)}>Edit</button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {error && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 8 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn-ghost tiny" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add src/bd/marketing-tag-manager.jsx
git commit -m "Marketing tag-manager: rename + recolor tag definitions"
```

---

### Task B.9 — Campaigns tab placeholder

**Files:**
- Modify: `src/bd/marketing-campaigns.jsx`

- [ ] **Step 1: Replace the stub with a friendlier placeholder**

```jsx
export default function MarketingCampaigns() {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.5 }}>✉</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
        Campaigns coming soon
      </div>
      <div style={{ fontSize: 12, maxWidth: 380, margin: '0 auto', lineHeight: 1.5 }}>
        Send personalised newsletters to your tagged contacts via Resend, with open / click tracking per recipient.
        Lands in Phase C.
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add src/bd/marketing-campaigns.jsx
git commit -m "Marketing Campaigns tab: placeholder for Phase C"
```

---

### Task B.10 — Smoke-test on production

**Files:**
- None (verification only)

- [ ] **Step 1: Push the phase**

```bash
git push origin main
```

- [ ] **Step 2: Wait for the new bundle**

```bash
CURRENT=$(curl -s https://crm.eclectik-insights.co/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1)
until NEW=$(curl -s https://crm.eclectik-insights.co/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1); [ -n "$NEW" ] && [ "$NEW" != "$CURRENT" ]; do sleep 5; done
echo "deploy live"
```

- [ ] **Step 3: Manual browser smoke-test**

Hard refresh `https://crm.eclectik-insights.co/`. Then:

1. Top-bar shows the new **Marketing** button between **Tasks** and the "MS" pill. Click it.
2. Marketing view loads with two tabs: **Contacts** (active) and **Campaigns**, plus **Manage tags** on the right.
3. Filter sidebar shows tag checkboxes (with counts), Deals filters, and Status filters.
4. Contact list is full-width on the right with `N of 642 contacts` counter.
5. Tick a tag filter (e.g. Glint) → list shrinks to only Glint-tagged contacts.
6. Click "Has Glint deal" → list shrinks further.
7. Tick the checkbox on 3 contacts → bulk-action bar appears with "3 selected" + Tag selected + Clear.
8. Click **Tag selected** → bulk-tag modal opens. Pick "Add tags" + Glint, click Add tags → modal shows "✓ Tagged 3 contacts" + the rows in the list now show a Glint chip.
9. Click **Clear** → selection clears, bulk-action bar disappears.
10. Click **Manage tags** → modal opens with all 4 tags. Click Edit on Other → name + colour become editable. Cancel.
11. Click **Campaigns** tab → placeholder shows "Campaigns coming soon — coming in Phase C".
12. Switch to Workspace view → existing BD-flow still works (no regression).

- [ ] **Step 4: Verify DB state of bulk action**

In Supabase SQL editor:
```sql
SELECT count(*) FROM contact_tags WHERE tag_id = (SELECT id FROM tags WHERE name = 'Glint');
```
Expected: count went up by the number of contacts you tagged in step 8.

- [ ] **Step 5: Done**

If all 12 smoke-test steps pass, Phase B is complete. Inform the user and ask whether to proceed to the Phase C plan (Resend integration + composer + send/tracking).

---

## Out of scope for this plan

- Resend account setup, DNS, env vars — Phase C.
- Campaign composer with HTML-paste + live preview iframe — Phase C.
- Send-to-audience flow + per-contact campaign-history on contact-detail — Phase C.
- Test-send-to-self flow, Resend webhook for tracking — Phase C.
- Custom (free-form) tags — out of v1 scope (v2).
- Bulk audience export to CSV — not requested; can be added later.
