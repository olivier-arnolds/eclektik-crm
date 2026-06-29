# Organogram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een nieuwe "Organogram"-view (tussen Meetings en Comms) waarin je per account contactpersonen visueel ordent in een React Flow-canvas — met hiërarchie, peers en losstaande groepjes — en deals als visuele chips aan contacten koppelt.

**Architecture:** Volgt de bestaande Playbooks-feature (`src/components/playbooks/`). Een React Flow-canvas met een custom node-type voor contactpersonen, een sleep-palette links, en een per-account graph (nodes/edges) die via autosave in twee nieuwe Supabase-tabellen wordt bewaard. Pure transform-helpers (DB-rij ↔ React Flow shape) worden los van Supabase-calls gehouden zodat ze met vitest te testen zijn. De accountkeuze synct met de globale account-selectie van `BDApp` (de rechter Account 360-tab).

**Tech Stack:** React 19, `@xyflow/react` (React Flow, al aanwezig), Supabase, Vite, Vitest.

**Verificatie-opmerking:** De app zit lokaal achter Microsoft-login, dus UI is niet headless te klikken. Alleen de pure transform-laag krijgt vitest-tests (Task 2). UI-taken worden geverifieerd met een sandbox-build (`npx vite build --outDir "dist_v$(date +%s)"`, daarna `rm -rf dist_v*`) en uiteindelijk op de live Vercel-deploy. Bash-commando's draaien vanuit de hoofd-repo: begin elke `git`/`vite`/`vitest`-stap met `cd /Users/olivierarnolds/Desktop/eclektik-crm`.

---

## File Structure

**Aanmaken:**
- `sql/schema_organogram_2026-06-29.sql` — DB-migratie (twee tabellen).
- `src/components/organogram/lib/organogramIO.js` — pure transforms + async load/save.
- `src/components/organogram/lib/organogramIO.test.js` — vitest-tests voor de transforms.
- `src/components/organogram/OrganogramContext.js` — React context met lookups + node-callbacks.
- `src/components/organogram/ContactNode.jsx` — custom React Flow node (avatar, naam, badges, deal-chips, drop-target voor deals).
- `src/components/organogram/OrgPalette.jsx` — linker sleep-palette (contacten + "koppel deal").
- `src/components/organogram/DealPicker.jsx` — popover-dropdown om een deal te kiezen na drop.
- `src/components/organogram/OrganogramView.jsx` — top-level: account-kiezer + palette + canvas + autosave.

**Wijzigen:**
- `src/bd/topbar.jsx` — nav-knop "Organogram" tussen Meetings en Comms.
- `src/bd/BDApp.jsx` — import, `NAV_VIEWS`, `currentAccountId`, left-pane render.
- `VERSION`, `package.json`, `src/bd/changelog.js` — versiebump in lockstep.

---

## Datamodel & shapes (referentie voor alle taken)

**DB tabel `organogram_nodes`:** `id (uuid)`, `company_id (uuid)`, `contact_id (uuid)`, `pos_x (numeric)`, `pos_y (numeric)`, `deal_refs (jsonb, default '[]')`, `created_at`, `updated_at`.
- `deal_refs` = array van `{ "table": "opportunities"|"leads", "id": "<uuid>" }`.

**DB tabel `organogram_edges`:** `id (uuid)`, `company_id (uuid)`, `source_node_id (uuid)`, `target_node_id (uuid)`, `rel_type (text, default 'reports_to')`, `created_at`.
- `rel_type` ∈ `{ 'reports_to', 'peer' }`.

**React Flow node:** `{ id, type: 'contactNode', position: { x, y }, data: { contactId, dealRefs } }`.

**React Flow edge:** `{ id, source, target, data: { relType }, style, animated }` (style/animated afgeleid van relType via `edgeStyleFor`).

**Drag-payloads (HTML5 DnD `dataTransfer`):**
- Contact: type `application/organogram-contact`, value = `contactId`.
- Deal-koppeling: type `application/organogram-deal`, value = `'1'` (alleen een trigger; de keuze gebeurt in de DealPicker).

---

### Task 1: DB-migratie (twee tabellen)

**Files:**
- Create: `sql/schema_organogram_2026-06-29.sql`

- [ ] **Step 1: Schrijf het migratie-SQL-bestand**

Maak `sql/schema_organogram_2026-06-29.sql` met exact deze inhoud:

```sql
-- Organogram: per-account org-charts met contactpersonen.
-- Twee tabellen, gekoppeld via company_id. Nodes verwijzen naar een contact;
-- edges leggen relaties (reports_to = hiërarchie, peer = gelijk niveau).
-- Deal-koppelingen leven puur visueel in deal_refs (jsonb), geen FK naar deals.
--
-- Additief en niet-destructief. RLS wordt automatisch aangezet door de
-- bestaande rls_auto_enable event trigger (uniforme auth-users-full-access policy).
-- Toegepast via Supabase MCP apply_migration op 2026-06-29.

create table if not exists public.organogram_nodes (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  contact_id   uuid not null references public.contacts(id) on delete cascade,
  pos_x        numeric not null default 0,
  pos_y        numeric not null default 0,
  deal_refs    jsonb   not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.organogram_edges (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  source_node_id uuid not null references public.organogram_nodes(id) on delete cascade,
  target_node_id uuid not null references public.organogram_nodes(id) on delete cascade,
  rel_type       text not null default 'reports_to',
  created_at     timestamptz not null default now()
);

create index if not exists organogram_nodes_company_idx on public.organogram_nodes (company_id);
create index if not exists organogram_edges_company_idx on public.organogram_edges (company_id);
```

- [ ] **Step 2: Pas de migratie toe op Supabase**

Gebruik de Supabase MCP `apply_migration` (project_id `jdzaypckluncdwsoxurs`, name `create_organogram_tables`) met dezelfde `create table ...`-inhoud als hierboven. Additief, dus geen backup nodig.

- [ ] **Step 3: Verifieer dat de tabellen bestaan**

Via Supabase MCP `execute_sql` (project_id `jdzaypckluncdwsoxurs`):

```sql
select table_name from information_schema.tables
where table_schema='public' and table_name in ('organogram_nodes','organogram_edges')
order by table_name;
```
Verwacht: twee rijen (`organogram_edges`, `organogram_nodes`).

- [ ] **Step 4: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
git add sql/schema_organogram_2026-06-29.sql
git commit -m "feat(organogram): db-migratie voor organogram_nodes + organogram_edges"
```

---

### Task 2: Pure transforms + tests (TDD)

**Files:**
- Create: `src/components/organogram/lib/organogramIO.js`
- Test: `src/components/organogram/lib/organogramIO.test.js`

- [ ] **Step 1: Schrijf de falende test**

Maak `src/components/organogram/lib/organogramIO.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { rowsToFlow, flowToRows, edgeStyleFor } from './organogramIO';

describe('edgeStyleFor', () => {
  it('reports_to is een doorgetrokken lijn (geen dash)', () => {
    const s = edgeStyleFor('reports_to');
    expect(s.style.strokeDasharray).toBeUndefined();
  });
  it('peer is gestippeld', () => {
    const s = edgeStyleFor('peer');
    expect(s.style.strokeDasharray).toBe('6 4');
  });
  it('onbekend/leeg valt terug op reports_to-stijl', () => {
    expect(edgeStyleFor(undefined).style.strokeDasharray).toBeUndefined();
  });
});

describe('rowsToFlow', () => {
  it('mapt node-rijen naar React Flow nodes', () => {
    const { nodes } = rowsToFlow({
      nodeRows: [{ id: 'n1', contact_id: 'c1', pos_x: 10, pos_y: 20, deal_refs: [{ table: 'leads', id: 'd1' }] }],
      edgeRows: [],
    });
    expect(nodes).toEqual([{
      id: 'n1', type: 'contactNode', position: { x: 10, y: 20 },
      data: { contactId: 'c1', dealRefs: [{ table: 'leads', id: 'd1' }] },
    }]);
  });

  it('mapt edge-rijen met relType en stijl', () => {
    const { edges } = rowsToFlow({
      nodeRows: [],
      edgeRows: [{ id: 'e1', source_node_id: 'n1', target_node_id: 'n2', rel_type: 'peer' }],
    });
    expect(edges[0].id).toBe('e1');
    expect(edges[0].source).toBe('n1');
    expect(edges[0].target).toBe('n2');
    expect(edges[0].data.relType).toBe('peer');
    expect(edges[0].style.strokeDasharray).toBe('6 4');
  });

  it('vult ontbrekende deal_refs aan tot lege array en pos tot 0', () => {
    const { nodes } = rowsToFlow({ nodeRows: [{ id: 'n1', contact_id: 'c1' }], edgeRows: [] });
    expect(nodes[0].data.dealRefs).toEqual([]);
    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
  });
});

describe('flowToRows', () => {
  it('mapt React Flow nodes/edges terug naar DB-rijen met company_id', () => {
    const { nodeRows, edgeRows } = flowToRows('comp1', {
      nodes: [{ id: 'n1', position: { x: 5, y: 6 }, data: { contactId: 'c1', dealRefs: [{ table: 'opportunities', id: 'd9' }] } }],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', data: { relType: 'peer' } }],
    });
    expect(nodeRows).toEqual([{
      id: 'n1', company_id: 'comp1', contact_id: 'c1',
      pos_x: 5, pos_y: 6, deal_refs: [{ table: 'opportunities', id: 'd9' }],
    }]);
    expect(edgeRows).toEqual([{
      id: 'e1', company_id: 'comp1', source_node_id: 'n1', target_node_id: 'n2', rel_type: 'peer',
    }]);
  });

  it('default rel_type is reports_to wanneer data.relType ontbreekt', () => {
    const { edgeRows } = flowToRows('comp1', {
      nodes: [], edges: [{ id: 'e1', source: 'n1', target: 'n2', data: {} }],
    });
    expect(edgeRows[0].rel_type).toBe('reports_to');
  });

  it('round-trip rowsToFlow → flowToRows behoudt kernvelden', () => {
    const nodeRows = [{ id: 'n1', contact_id: 'c1', pos_x: 1, pos_y: 2, deal_refs: [] }];
    const edgeRows = [{ id: 'e1', source_node_id: 'n1', target_node_id: 'n2', rel_type: 'reports_to' }];
    const flow = rowsToFlow({ nodeRows, edgeRows });
    const back = flowToRows('comp1', flow);
    expect(back.nodeRows[0]).toMatchObject({ id: 'n1', contact_id: 'c1', pos_x: 1, pos_y: 2 });
    expect(back.edgeRows[0]).toMatchObject({ id: 'e1', source_node_id: 'n1', target_node_id: 'n2', rel_type: 'reports_to' });
  });
});
```

- [ ] **Step 2: Run de test — verwacht FAIL**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
npx vitest run src/components/organogram/lib/organogramIO.test.js
```
Verwacht: FAIL ("Failed to resolve import './organogramIO'" of "edgeStyleFor is not a function").

- [ ] **Step 3: Schrijf de implementatie**

Maak `src/components/organogram/lib/organogramIO.js`:

```js
// Load/save + pure transforms voor het organogram (per account).
//
// React Flow shape:
//   node: { id, type:'contactNode', position:{x,y}, data:{ contactId, dealRefs } }
//   edge: { id, source, target, data:{ relType }, style, animated }
// Supabase shape:
//   organogram_nodes: { id, company_id, contact_id, pos_x, pos_y, deal_refs }
//   organogram_edges: { id, company_id, source_node_id, target_node_id, rel_type }

import { supabase } from '../../../supabase';

// Edge-stijl per relatie-type. reports_to = doorgetrokken (hiërarchie),
// peer = gestippeld (gelijk niveau, bv. 2 partners).
export function edgeStyleFor(relType) {
  if (relType === 'peer') {
    return { style: { stroke: 'var(--accent)', strokeDasharray: '6 4', strokeWidth: 1.5 }, animated: false };
  }
  return { style: { stroke: 'var(--text-3)', strokeWidth: 1.5 }, animated: false };
}

function rowToFlowNode(row) {
  return {
    id: row.id,
    type: 'contactNode',
    position: { x: row.pos_x ?? 0, y: row.pos_y ?? 0 },
    data: { contactId: row.contact_id, dealRefs: Array.isArray(row.deal_refs) ? row.deal_refs : [] },
  };
}

function rowToFlowEdge(row) {
  const relType = row.rel_type || 'reports_to';
  return {
    id: row.id,
    source: row.source_node_id,
    target: row.target_node_id,
    data: { relType },
    ...edgeStyleFor(relType),
  };
}

export function rowsToFlow({ nodeRows, edgeRows }) {
  return {
    nodes: (nodeRows || []).map(rowToFlowNode),
    edges: (edgeRows || []).map(rowToFlowEdge),
  };
}

export function flowToRows(companyId, { nodes, edges }) {
  const nodeRows = (nodes || []).map(n => ({
    id: n.id,
    company_id: companyId,
    contact_id: n.data.contactId,
    pos_x: n.position.x,
    pos_y: n.position.y,
    deal_refs: Array.isArray(n.data.dealRefs) ? n.data.dealRefs : [],
  }));
  const edgeRows = (edges || []).map(e => ({
    id: e.id,
    company_id: companyId,
    source_node_id: e.source,
    target_node_id: e.target,
    rel_type: e.data?.relType || 'reports_to',
  }));
  return { nodeRows, edgeRows };
}

export async function loadOrganogram(companyId) {
  if (!companyId) return { nodes: [], edges: [] };
  const [nodesRes, edgesRes] = await Promise.all([
    supabase.from('organogram_nodes').select('*').eq('company_id', companyId),
    supabase.from('organogram_edges').select('*').eq('company_id', companyId),
  ]);
  if (nodesRes.error) throw new Error(`Failed to load organogram nodes: ${nodesRes.error.message}`);
  if (edgesRes.error) throw new Error(`Failed to load organogram edges: ${edgesRes.error.message}`);
  return rowsToFlow({ nodeRows: nodesRes.data, edgeRows: edgesRes.data });
}

export async function saveOrganogram(companyId, { nodes, edges }) {
  if (!companyId) throw new Error('saveOrganogram requires companyId');
  // delete-all-then-insert per account. Simpel en correct voor org-chart-grootte.
  const { nodeRows, edgeRows } = flowToRows(companyId, { nodes, edges });

  await supabase.from('organogram_edges').delete().eq('company_id', companyId);
  await supabase.from('organogram_nodes').delete().eq('company_id', companyId);

  if (nodeRows.length > 0) {
    const { error } = await supabase.from('organogram_nodes').insert(nodeRows);
    if (error) throw new Error(`Failed to save organogram nodes: ${error.message}`);
  }
  if (edgeRows.length > 0) {
    const { error } = await supabase.from('organogram_edges').insert(edgeRows);
    if (error) throw new Error(`Failed to save organogram edges: ${error.message}`);
  }
}
```

- [ ] **Step 4: Run de test — verwacht PASS**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
npx vitest run src/components/organogram/lib/organogramIO.test.js
```
Verwacht: PASS (alle tests groen).

- [ ] **Step 5: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
git add src/components/organogram/lib/organogramIO.js src/components/organogram/lib/organogramIO.test.js
git commit -m "feat(organogram): graph IO transforms + tests"
```

---

### Task 3: OrganogramContext

**Files:**
- Create: `src/components/organogram/OrganogramContext.js`

- [ ] **Step 1: Maak de context**

`ContactNode` heeft lookups (contact + deal) en node-callbacks nodig zonder die in `node.data` te stoppen (data blijft puur voor opslaan). Maak `src/components/organogram/OrganogramContext.js`:

```js
import { createContext, useContext } from 'react';

// Lookups + node-callbacks voor ContactNode, los van node.data zodat de
// opgeslagen graph puur blijft (alleen contactId + dealRefs).
export const OrganogramContext = createContext({
  contactsById: {},        // { [contactId]: adaptedContact }
  dealsById: {},           // { [dealId]: adaptedDeal }
  onRequestAttachDeal: () => {},  // (nodeId) => void  — opent DealPicker
  onRemoveDeal: () => {},         // (nodeId, dealRef) => void
  onOpenDeal: () => {},           // (deal) => void
});

export function useOrganogram() {
  return useContext(OrganogramContext);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
git add src/components/organogram/OrganogramContext.js
git commit -m "feat(organogram): React context voor node-lookups en callbacks"
```

---

### Task 4: ContactNode (custom React Flow node)

**Files:**
- Create: `src/components/organogram/ContactNode.jsx`

- [ ] **Step 1: Schrijf de component**

Avatar/badge-styling spiegelt `lane-accounts.jsx` (★ groen primary, $ blauw financieel, dubbele ring bij beide). Het blokje is zelf de drop-target voor deal-koppelingen. Maak `src/components/organogram/ContactNode.jsx`:

```jsx
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { STAGE_TINT } from '../../bd/atoms';
import { useOrganogram } from './OrganogramContext';

function ringShadow(c) {
  if (c?.isPrimary && c?.isFinancial) return '0 0 0 2px var(--good), 0 0 0 4px var(--accent)';
  if (c?.isPrimary) return '0 0 0 2px var(--good)';
  if (c?.isFinancial) return '0 0 0 2px var(--accent)';
  return 'none';
}

export default function ContactNode({ id, data, selected }) {
  const { contactsById, dealsById, onRequestAttachDeal, onRemoveDeal, onOpenDeal } = useOrganogram();
  const c = contactsById[data.contactId];
  const dealRefs = Array.isArray(data.dealRefs) ? data.dealRefs : [];

  const onDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/organogram-deal')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'link';
    }
  };
  const onDrop = (e) => {
    if (!e.dataTransfer.types.includes('application/organogram-deal')) return;
    e.preventDefault();
    e.stopPropagation();
    onRequestAttachDeal(id);
  };

  if (!c) {
    return (
      <div style={{ background: 'var(--warn-tint)', padding: 8, borderRadius: 6, fontSize: 11, color: 'var(--warn)' }}>
        Onbekend contact
        <Handle type="target" position={Position.Top} />
        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }

  return (
    <div onDragOver={onDragOver} onDrop={onDrop}
      style={{
        background: 'var(--bg-1)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--sep)'}`,
        borderRadius: 8, padding: '8px 10px', minWidth: 180,
        boxShadow: selected ? '0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent)' : '0 1px 2px rgba(0,0,0,0.05)',
        opacity: c.isFormer ? 0.6 : 1,
      }}>
      <Handle type="target" position={Position.Top} style={{ background: 'var(--text-3)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 13,
          background: c.avatarBg || '#F1EFE8', color: c.avatarColor || '#888',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 600, flexShrink: 0,
          boxShadow: ringShadow(c),
        }}>
          {c.initials || (c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.name}
            {c.isPrimary && <span title="Primary contact" style={{ color: 'var(--good)', marginLeft: 5, fontSize: 10, fontFamily: 'var(--font-mono)' }}>★</span>}
            {c.isFinancial && <span title="Financial contact" style={{ color: 'var(--accent)', marginLeft: 3, fontSize: 10, fontFamily: 'var(--font-mono)' }}>$</span>}
          </div>
          {c.role && <div style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.role}</div>}
        </div>
      </div>

      {dealRefs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {dealRefs.map((ref) => {
            const deal = dealsById[ref.id];
            const hue = deal ? (STAGE_TINT[deal.stage]?.hue ?? 220) : 220;
            return (
              <span key={ref.id}
                title={deal ? `${deal.title} (${deal.stage})` : 'Onbekende deal'}
                onClick={(e) => { e.stopPropagation(); if (deal) onOpenDeal(deal); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 9, fontFamily: 'var(--font-mono)',
                  padding: '1px 5px', borderRadius: 3, cursor: deal ? 'pointer' : 'default',
                  background: `hsl(${hue} 60% 92%)`, color: `hsl(${hue} 50% 30%)`,
                }}>
                {deal ? `${deal.dealNo || 'deal'} · ${deal.title}`.slice(0, 28) : 'deal?'}
                <button onClick={(e) => { e.stopPropagation(); onRemoveDeal(id, ref); }}
                  title="Koppeling verwijderen"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 10, lineHeight: 1 }}>×</button>
              </span>
            );
          })}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--text-3)' }} />
    </div>
  );
}
```

- [ ] **Step 2: Sandbox-build om syntax/imports te checken**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
npx vite build --outDir "dist_v$(date +%s)" 2>&1 | grep -iE "built in|error|✗" | head; rm -rf dist_v*
```
Verwacht: `✓ built in ...`. (De component wordt nog niet geïmporteerd; de build controleert alleen dat het bestand parseert. Als de build de file niet meeneemt omdat hij ongebruikt is, is dat ook OK — geen errors.)

- [ ] **Step 3: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
git add src/components/organogram/ContactNode.jsx
git commit -m "feat(organogram): ContactNode met badges en deal-chips"
```

---

### Task 5: OrgPalette (sleep-palette links)

**Files:**
- Create: `src/components/organogram/OrgPalette.jsx`

- [ ] **Step 1: Schrijf de component**

Toont de contactpersonen van het account (sleepbaar; al-geplaatste gedimd) en één sleepbaar "Koppel deal"-item. Maak `src/components/organogram/OrgPalette.jsx`:

```jsx
import React from 'react';

export default function OrgPalette({ contacts, placedContactIds, dealCount }) {
  function onDragContact(e, contactId) {
    e.dataTransfer.setData('application/organogram-contact', contactId);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragDeal(e) {
    e.dataTransfer.setData('application/organogram-deal', '1');
    e.dataTransfer.effectAllowed = 'link';
  }

  return (
    <div style={{ width: 210, borderRight: '0.5px solid var(--sep)', background: 'var(--bg-2)', padding: 10, overflowY: 'auto' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>
        Contactpersonen
      </div>
      {contacts.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>Geen contacten voor dit account.</div>}
      {contacts.map(c => {
        const placed = placedContactIds.has(c.id);
        return (
          <div key={c.id}
            draggable={!placed}
            onDragStart={(e) => onDragContact(e, c.id)}
            title={placed ? 'Staat al op het canvas' : 'Sleep naar canvas'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 4,
              padding: '5px 7px', marginBottom: 4, fontSize: 11,
              cursor: placed ? 'default' : 'grab', opacity: placed ? 0.45 : 1,
            }}>
            <span style={{
              width: 18, height: 18, borderRadius: 9, flexShrink: 0,
              background: c.avatarBg || '#F1EFE8', color: c.avatarColor || '#888',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600,
            }}>{c.initials || (c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
            <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
            {placed && <span style={{ fontSize: 9, color: 'var(--good)' }}>✓</span>}
          </div>
        );
      })}

      <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', margin: '14px 0 6px' }}>
        Deals
      </div>
      <div draggable onDragStart={onDragDeal}
        title="Sleep op een contactpersoon om een deal te koppelen"
        style={{
          background: 'var(--bg-1)', border: '0.5px dashed var(--accent)', borderRadius: 4,
          padding: '7px 8px', fontSize: 11, cursor: 'grab', color: 'var(--accent)',
        }}>
        ＋ Koppel deal aan contact
        <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{dealCount} deal(s) op dit account</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
git add src/components/organogram/OrgPalette.jsx
git commit -m "feat(organogram): sleep-palette met contacten en deal-koppeling"
```

---

### Task 6: DealPicker (popover-dropdown)

**Files:**
- Create: `src/components/organogram/DealPicker.jsx`

- [ ] **Step 1: Schrijf de component**

Verschijnt na het droppen van "Koppel deal" op een contact; toont een dropdown met de deals van het account. Maak `src/components/organogram/DealPicker.jsx`:

```jsx
import React, { useState } from 'react';

// Eenvoudige gecentreerde popover met een <select> van de account-deals.
// onPick(dealId) koppelt; onClose annuleert.
export default function DealPicker({ deals, onPick, onClose }) {
  const [sel, setSel] = useState(deals[0]?.id || '');

  return (
    <div className="modal-backdrop"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8, padding: 16, width: 340, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-1)' }}>Deal koppelen</div>
        {deals.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Geen deals op dit account.</div>
        ) : (
          <select value={sel} onChange={(e) => setSel(e.target.value)}
            style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: 12, fontFamily: 'inherit' }}>
            {deals.map(d => (
              <option key={d.id} value={d.id}>
                {(d.dealNo ? d.dealNo + ' · ' : '') + d.title + ' (' + d.stage + ')'}
              </option>
            ))}
          </select>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button className="btn-ghost tiny" onClick={onClose}>Annuleren</button>
          <button className="btn-primary tiny" disabled={!sel} onClick={() => onPick(sel)}>Koppelen</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
git add src/components/organogram/DealPicker.jsx
git commit -m "feat(organogram): DealPicker popover voor deal-koppeling"
```

---

### Task 7: OrganogramView (canvas + autosave + account-kiezer)

**Files:**
- Create: `src/components/organogram/OrganogramView.jsx`

- [ ] **Step 1: Schrijf de component**

Top-level view: account-dropdown (synct via `onPickAccount`), palette, React Flow canvas, autosave (gedebounced). Maak `src/components/organogram/OrganogramView.jsx`:

```jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ReactFlow, ReactFlowProvider, useNodesState, useEdgesState, Background, Controls, MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ContactNode from './ContactNode';
import OrgPalette from './OrgPalette';
import DealPicker from './DealPicker';
import { OrganogramContext } from './OrganogramContext';
import { loadOrganogram, saveOrganogram, edgeStyleFor } from './lib/organogramIO';

const nodeTypes = { contactNode: ContactNode };

export default function OrganogramView(props) {
  return (
    <ReactFlowProvider>
      <OrganogramCanvas {...props} />
    </ReactFlowProvider>
  );
}

function OrganogramCanvas({ accountId, accounts, contacts, deals, onPickAccount, onOpenDeal, expanded, onToggleExpand }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dealPickerNodeId, setDealPickerNodeId] = useState(null);

  // Voorkomt autosave tijdens/direct na het laden van een account.
  const loadedAccountRef = useRef(null);
  const saveTimerRef = useRef(null);

  const account = useMemo(() => accounts.find(a => a.id === accountId) || null, [accounts, accountId]);
  const accContacts = useMemo(
    () => (accountId ? contacts.filter(c => c.accountId === accountId && !c.isInactive) : []),
    [contacts, accountId]
  );
  const accDeals = useMemo(
    () => (accountId ? deals.filter(d => d.accountId === accountId) : []),
    [deals, accountId]
  );

  const contactsById = useMemo(() => Object.fromEntries(contacts.map(c => [c.id, c])), [contacts]);
  const dealsById = useMemo(() => Object.fromEntries(deals.map(d => [d.id, d])), [deals]);
  const placedContactIds = useMemo(() => new Set(nodes.map(n => n.data.contactId)), [nodes]);

  // Laad de graph wanneer het account wijzigt.
  useEffect(() => {
    if (!accountId) { setNodes([]); setEdges([]); loadedAccountRef.current = null; return; }
    setLoading(true);
    loadedAccountRef.current = null; // markeer "nog niet geladen" zodat autosave wacht
    loadOrganogram(accountId)
      .then(({ nodes, edges }) => { setNodes(nodes); setEdges(edges); loadedAccountRef.current = accountId; })
      .catch(err => { alert('Laden mislukt: ' + err.message); })
      .finally(() => setLoading(false));
  }, [accountId, setNodes, setEdges]);

  // Autosave (gedebounced) bij elke wijziging, behalve tijdens laden.
  useEffect(() => {
    if (!accountId || loadedAccountRef.current !== accountId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveOrganogram(accountId, { nodes, edges }).catch(err => console.error('Organogram autosave faalde:', err));
    }, 600);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [nodes, edges, accountId]);

  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const contactId = e.dataTransfer.getData('application/organogram-contact');
    if (!contactId || !rfInstance) return;
    if (placedContactIds.has(contactId)) return; // geen dubbele
    const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setNodes(nds => nds.concat({
      id: crypto.randomUUID(), type: 'contactNode', position, data: { contactId, dealRefs: [] },
    }));
  }, [rfInstance, setNodes, placedContactIds]);

  const onConnect = useCallback((params) => {
    setEdges(eds => eds.concat({
      id: crypto.randomUUID(), source: params.source, target: params.target,
      data: { relType: 'reports_to' }, ...edgeStyleFor('reports_to'),
    }));
  }, [setEdges]);

  // Dubbelklik op een edge wisselt tussen reports_to en peer.
  const onEdgeDoubleClick = useCallback((e, edge) => {
    const next = (edge.data?.relType === 'peer') ? 'reports_to' : 'peer';
    setEdges(eds => eds.map(x => x.id === edge.id ? { ...x, data: { relType: next }, ...edgeStyleFor(next) } : x));
  }, [setEdges]);

  // Context-callbacks voor ContactNode.
  const onRequestAttachDeal = useCallback((nodeId) => setDealPickerNodeId(nodeId), []);
  const onRemoveDeal = useCallback((nodeId, ref) => {
    setNodes(nds => nds.map(n => n.id === nodeId
      ? { ...n, data: { ...n.data, dealRefs: n.data.dealRefs.filter(r => r.id !== ref.id) } }
      : n));
  }, [setNodes]);

  const handlePickDeal = useCallback((dealId) => {
    const deal = dealsById[dealId];
    if (!deal) { setDealPickerNodeId(null); return; }
    const ref = { table: deal.table, id: deal.id };
    setNodes(nds => nds.map(n => {
      if (n.id !== dealPickerNodeId) return n;
      if (n.data.dealRefs.some(r => r.id === ref.id)) return n; // al gekoppeld
      return { ...n, data: { ...n.data, dealRefs: n.data.dealRefs.concat(ref) } };
    }));
    setDealPickerNodeId(null);
  }, [dealsById, dealPickerNodeId, setNodes]);

  const ctxValue = useMemo(() => ({
    contactsById, dealsById, onRequestAttachDeal, onRemoveDeal, onOpenDeal: onOpenDeal || (() => {}),
  }), [contactsById, dealsById, onRequestAttachDeal, onRemoveDeal, onOpenDeal]);

  return (
    <div className="lane" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Kop met account-kiezer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '0.5px solid var(--sep)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>Organogram</span>
        <select value={accountId || ''}
          onChange={(e) => { const a = accounts.find(x => x.id === e.target.value); onPickAccount(a || null); }}
          style={{ flex: 1, maxWidth: 320, padding: '5px 8px', borderRadius: 4, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: 12, fontFamily: 'inherit' }}>
          <option value="">— Kies een account —</option>
          {[...accounts].sort((a, b) => a.name.localeCompare(b.name)).map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {onToggleExpand && (
          <button className="btn-ghost tiny" onClick={onToggleExpand} title={expanded ? 'Toon accountpaneel' : 'Volledig scherm'}>
            {expanded ? '⇥ Paneel' : '⇤ Breed'}
          </button>
        )}
      </div>

      {!accountId ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          Kies een account om het organogram te bouwen.
        </div>
      ) : (
        <OrganogramContext.Provider value={ctxValue}>
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <OrgPalette contacts={accContacts} placedContactIds={placedContactIds} dealCount={accDeals.length} />
            <div style={{ flex: 1, position: 'relative' }}>
              {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', zIndex: 5 }}>Laden…</div>}
              <ReactFlow
                nodes={nodes} edges={edges}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                onConnect={onConnect} onEdgeDoubleClick={onEdgeDoubleClick}
                nodeTypes={nodeTypes} onInit={setRfInstance}
                onDrop={onDrop} onDragOver={onDragOver} fitView>
                <Background />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>
          </div>
        </OrganogramContext.Provider>
      )}

      {dealPickerNodeId && (
        <DealPicker deals={accDeals} onPick={handlePickDeal} onClose={() => setDealPickerNodeId(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Sandbox-build**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
npx vite build --outDir "dist_v$(date +%s)" 2>&1 | grep -iE "built in|error|✗" | head; rm -rf dist_v*
```
Verwacht: `✓ built in ...` (nog niet geïmporteerd in BDApp; build moet schoon parseren).

- [ ] **Step 3: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
git add src/components/organogram/OrganogramView.jsx
git commit -m "feat(organogram): OrganogramView met canvas, autosave en account-kiezer"
```

---

### Task 8: Topbar-nav-knop

**Files:**
- Modify: `src/bd/topbar.jsx:47-54`

- [ ] **Step 1: Voeg de knop toe tussen Meetings en Comms**

In `src/bd/topbar.jsx`, voeg een nieuwe knop in NA de Meetings-knop (eindigt op regel 50, `</button>`) en VÓÓR de Comms-knop (begint op regel 51). Plak dit blok tussen die twee:

```jsx
        <button className={view === 'organogram' ? 'on' : ''}
          onClick={() => setView('organogram')} title="Organogram — org-charts per account">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="6" y="1.5" width="4" height="3" rx="0.5" />
            <rect x="1.5" y="11.5" width="4" height="3" rx="0.5" />
            <rect x="10.5" y="11.5" width="4" height="3" rx="0.5" />
            <path d="M8 4.5v3M8 7.5H3.5v4M8 7.5h4.5v4" strokeLinecap="round" />
          </svg> Organogram
        </button>
```

- [ ] **Step 2: Sandbox-build**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
npx vite build --outDir "dist_v$(date +%s)" 2>&1 | grep -iE "built in|error|✗" | head; rm -rf dist_v*
```
Verwacht: `✓ built in ...`.

- [ ] **Step 3: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
git add src/bd/topbar.jsx
git commit -m "feat(organogram): nav-knop tussen Meetings en Comms"
```

---

### Task 9: BDApp-bedrading

**Files:**
- Modify: `src/bd/BDApp.jsx` (import bij regel 22-28; `NAV_VIEWS` regel 31; `currentAccountId` na regel 211; left-pane render rond regel 303)

- [ ] **Step 1: Importeer OrganogramView**

Voeg na regel 22 (`import PlaybooksHub ...`) toe:

```jsx
import OrganogramView from '../components/organogram/OrganogramView';
```

- [ ] **Step 2: Voeg 'organogram' toe aan NAV_VIEWS**

Vervang regel 31:

```jsx
const NAV_VIEWS = ['reporting', 'funnel', 'warroom', 'tasks', 'meetings', 'comms', 'marketing', 'playbooks', 'admin', 'log'];
```
door:

```jsx
const NAV_VIEWS = ['reporting', 'funnel', 'warroom', 'tasks', 'meetings', 'organogram', 'comms', 'marketing', 'playbooks', 'admin', 'log'];
```

- [ ] **Step 3: Bereken het huidige account-id (twee-weg sync met Account 360)**

Voeg direct NA de `pickAccount`-functie (eindigt regel 211 met `};`) toe:

```jsx
  // Huidig account voor o.a. het Organogram: type 'account' is direct, andere
  // contexten (deal/task/comm) zetten accountScope op het bijbehorende account.
  const currentAccountId = rightContext?.type === 'account' ? rightContext.id : (accountScope || null);
```

- [ ] **Step 4: Render de left pane voor organogram**

Voeg in de left-pane if/else-keten een tak toe. Plaats deze NA het `meetings`-blok (eindigt rond regel 278 met `);` gevolgd door `}`) en VÓÓR `} else if (activeView === 'tasks')`:

```jsx
  } else if (activeView === 'organogram') {
    leftPane = (
      <OrganogramView
        accountId={currentAccountId}
        accounts={accounts}
        contacts={contacts}
        deals={deals}
        onPickAccount={pickAccount}
        onOpenDeal={(d) => {
          setSelectedDeal(d);
          setRightContext({ type: 'deal', id: d.id });
          setAccountScope(d.accountId || null);
          setOpenDeal(d);
        }}
        {...expandToggleProps}
      />
    );
```

- [ ] **Step 5: Sandbox-build**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
npx vite build --outDir "dist_v$(date +%s)" 2>&1 | grep -iE "built in|error|✗" | head; rm -rf dist_v*
```
Verwacht: `✓ built in ...`.

- [ ] **Step 6: Draai de bestaande adapter-tests (regressiecheck)**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
npx vitest run src/bd/adapters.test.js src/components/organogram/lib/organogramIO.test.js
```
Verwacht: alle tests PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
git add src/bd/BDApp.jsx
git commit -m "feat(organogram): view bedraad in BDApp shell met account-sync"
```

---

### Task 10: Versiebump + changelog + finale verificatie

**Files:**
- Modify: `VERSION`, `package.json`, `src/bd/changelog.js`

- [ ] **Step 1: Bepaal de nieuwe versie**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
cat VERSION
```
Huidig is `1.45.0`. Nieuwe minor: `1.46.0` (gebruik dit als VERSION niet gewijzigd is; anders de volgende minor).

- [ ] **Step 2: Bump VERSION en package.json**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
printf '1.46.0' > VERSION
sed -i '' 's/"version": "1.45.0"/"version": "1.46.0"/' package.json
grep '"version"' package.json
```
Verwacht: `"version": "1.46.0",`.

- [ ] **Step 3: Voeg changelog-entry toe**

In `src/bd/changelog.js`: wijzig `CURRENT_VERSION` naar `'1.46.0'` en voeg bovenaan de `CHANGELOG`-array (direct na `export const CHANGELOG = [`) deze entry toe (gebruik de echte timestamp uit `date -u +%Y-%m-%dT%H:%M:%SZ`):

```js
  {
    version: '1.46.0',
    date: '<VUL IN: output van `date -u +%Y-%m-%dT%H:%M:%SZ`>',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feature',
    title: 'Organogram - org-charts per account',
    summary:
      'Nieuwe view "Organogram" tussen Meetings en Comms. Per account bouw je ' +
      'een organogram door contactpersonen vanuit de linkerbalk op een canvas te ' +
      'slepen (React Flow, zoals Playbooks). Je legt hiërarchie (rapporteert aan) ' +
      'en peer-relaties (gelijk niveau, bv. 2 partners) met onderscheiden lijnen; ' +
      'losstaande groepjes blijven gewoon onverbonden. Deals koppel je visueel aan ' +
      'een contact door "Koppel deal" op een blokje te slepen en in de dropdown een ' +
      'deal te kiezen (chip op het blokje). De accountkeuze synct met de rechter ' +
      'Account 360-tab. Alles wordt automatisch opgeslagen.',
    changes: [
      'Twee nieuwe tabellen: organogram_nodes + organogram_edges (per account).',
      'React Flow-canvas met custom ContactNode (avatar, ★/$ badges, deal-chips).',
      'Sleep-palette met contactpersonen (al-geplaatste gedimd) en deal-koppeling.',
      'Twee lijnsoorten: reports_to (doorgetrokken) en peer (gestippeld); dubbelklik wisselt.',
      'Deal-koppeling puur visueel via deal_refs (jsonb); chip klikt door naar de deal.',
      'Autosave (gedebounced); accountkeuze gesynct met BDApp/Account 360.',
    ],
    files: [
      'sql/schema_organogram_2026-06-29.sql',
      'src/components/organogram/OrganogramView.jsx',
      'src/components/organogram/ContactNode.jsx',
      'src/components/organogram/OrgPalette.jsx',
      'src/components/organogram/DealPicker.jsx',
      'src/components/organogram/OrganogramContext.js',
      'src/components/organogram/lib/organogramIO.js',
      'src/components/organogram/lib/organogramIO.test.js',
      'src/bd/topbar.jsx',
      'src/bd/BDApp.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.46.0',
  },
```

- [ ] **Step 4: Finale build + tests**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
npx vitest run src/bd/adapters.test.js src/components/organogram/lib/organogramIO.test.js
npx vite build --outDir "dist_v$(date +%s)" 2>&1 | grep -iE "built in|error|✗" | head; rm -rf dist_v*
```
Verwacht: tests PASS, `✓ built in ...`.

- [ ] **Step 5: Commit + tag**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm
git add VERSION package.json src/bd/changelog.js
git commit -m "chore(organogram): bump naar v1.46.0 + changelog"
git tag v1.46.0
```

- [ ] **Step 6: Live verificatie (na push, met toestemming gebruiker)**

Push is een aparte stap die de gebruiker expliciet moet goedkeuren (CLAUDE.md). Na `git push origin main` + `git push origin v1.46.0`: hard refresh (Cmd+Shift+R), open de Organogram-tab, kies een account, sleep contacten, leg een hiërarchie- en een peer-relatie, dubbelklik een edge om te wisselen, en sleep "Koppel deal" op een contact om een deal te koppelen. Controleer dat na herladen de graph bewaard is.

---

## Self-Review (uitgevoerd)

**Spec-dekking:**
- Nav tussen Meetings en Comms → Task 8 + Task 9 (NAV_VIEWS volgorde). ✓
- Look/feel als Playbooks (React Flow) → Tasks 4-7. ✓
- Contactpersonen links i.p.v. actiepunten → Task 5 (OrgPalette). ✓
- Peers op gelijk niveau + medewerkers onder contact + losstaande groepjes → Task 7 (`onConnect` reports_to default, `onEdgeDoubleClick` toggle naar peer; losstaand = niet verbinden) + Task 2 (`edgeStyleFor`). ✓
- Deal/opportunity/lead/offerte koppelen via slepen → dropdown → kiezen → Tasks 5/6/7 (palette "Koppel deal" → DealPicker → `handlePickDeal` → chip). ✓
- Per account + leeg starten → Task 7 (`accContacts`, leeg canvas tot je sleept). ✓
- Deal-koppeling alleen visueel → `deal_refs` jsonb, geen terugschrijven. ✓
- Alle deals van het account koppelbaar → `accDeals` filtert alleen op `accountId` (geen stage-filter). ✓
- Accountkeuze synct met rechter Account 360 → Task 9 (`currentAccountId` + `onPickAccount`). ✓
- Autosave → Task 7 (gedebounced effect). ✓
- Versioning/changelog/tag → Task 10. ✓

**Placeholder-scan:** Eén bewuste invul-plek: de changelog-`date` (echte timestamp via `date -u`). Verder geen TBD's.

**Type-consistentie:** `edgeStyleFor`, `rowsToFlow`, `flowToRows`, `loadOrganogram`, `saveOrganogram` consistent gebruikt tussen Task 2 en Task 7. Node-type-string `'contactNode'` consistent in IO, ContactNode-registratie (`nodeTypes`) en node-creatie. Drag-MIME-types (`application/organogram-contact`, `application/organogram-deal`) consistent tussen OrgPalette (set) en OrganogramView/ContactNode (get). Context-shape (`contactsById`, `dealsById`, `onRequestAttachDeal`, `onRemoveDeal`, `onOpenDeal`) consistent tussen OrganogramContext, ContactNode en OrganogramView.
