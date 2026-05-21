# Playbooks v2 — Plan 2: Visual Builder

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Bouw een visuele drag-drop builder voor playbooks op basis van React Flow. Eindstand: gebruiker kan playbooks visueel ontwerpen via een 3-koloms-layout (palette · canvas · property panel), validatie en versionering werken, en draft/publish-flow is functioneel. Geen execution engine in dit plan — alleen het ontwerp-deel.

**Architecture:** React Flow (`@xyflow/react`) als foundation. PlaybooksHub als parent-component met tabs; alleen "Builder"-tab is functioneel in dit plan (andere tabs als placeholder voor Plan 3/4). Custom node-types per categorie (Triggers/Actions/Logic). Property panel dynamisch o.b.v. geselecteerde node. Versionering via snapshots in `playbook_versions` tabel. Verticale layout voor canvas zoals besloten in design (n8n / Zapier-stijl).

**Tech Stack:** React 19, Vite, React Flow (`@xyflow/react` v12+), Supabase, bestaande projectstijl (geen TypeScript, geen test-framework — verifiëren in browser per stap).

---

## File Structure

**Nieuwe files (10):**
- `src/components/playbooks/PlaybooksHub.jsx` — tab-navigation + Builder-tab landing
- `src/components/playbooks/PlaybookFlowBuilder.jsx` — full-screen React Flow canvas + toolbar
- `src/components/playbooks/nodes/NodeTypes.js` — registry van 14 node-types (config-schemas + display)
- `src/components/playbooks/nodes/NodeCard.jsx` — base custom node component
- `src/components/playbooks/panels/NodePalette.jsx` — left sidebar met drag-source items
- `src/components/playbooks/panels/PropertyPanel.jsx` — right sidebar met dynamische config
- `src/components/playbooks/panels/BuilderToolbar.jsx` — top toolbar (save/publish/undo)
- `src/components/playbooks/lib/playbookGraphIO.js` — load/save graph van/naar Supabase
- `src/components/playbooks/lib/playbookValidation.js` — validatie-regels
- `src/components/playbooks/lib/playbookVersioning.js` — snapshot-publishing logic

**Aangepaste files (2):**
- `src/bd/BDApp.jsx` — `view === 'playbooks'` route naar nieuwe `PlaybooksHub`
- `package.json` — `@xyflow/react` toevoegen

**Verwijderde files (2, in laatste taak):**
- `src/components/playbooks/PlaybooksList.jsx`
- `src/components/playbooks/PlaybookDetail.jsx`

Out-of-scope voor Plan 2:
- Execution engine + cron logic → Plan 3
- Drafts UI (review/send) → Plan 3
- Suggestions (topbar badge, card-pill) → Plan 4
- Signals (Unipile poll, AI-scoring) → Plan 4
- Sleeping Reactivation seed playbook → Plan 5

---

## Task 1: Install React Flow

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Installeer `@xyflow/react`**

```bash
npm install @xyflow/react
```

- [ ] **Step 2: Verifieer dev-build werkt nog**

```bash
npm run dev
```
Open `http://localhost:5173` — bestaande UI moet laden zonder errors. Stop met Ctrl+C.

- [ ] **Step 3: Verifieer production-build werkt nog**

```bash
npm run build
```
Expected: build slaagt zonder errors. Output `dist/` directory.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): install @xyflow/react for visual builder

Foundation voor Plan 2 — React Flow library voor drag-drop workflow canvas.
MIT-licentie, ~50KB gzipped, gebruikt door n8n / Linear / ClickUp.

Plan 2, Task 1.
EOF
)"
```

---

## Task 2: PlaybooksHub component scaffold

**Files:**
- Create: `src/components/playbooks/PlaybooksHub.jsx`

- [ ] **Step 1: Maak PlaybooksHub.jsx met dit content:**

```jsx
import React, { useState } from 'react';
import PlaybookFlowBuilder from './PlaybookFlowBuilder';

const TABS = [
  { key: 'suggestions', label: 'Suggesties', placeholder: true },
  { key: 'drafts',      label: 'Drafts',     placeholder: true },
  { key: 'running',     label: 'Lopend',     placeholder: true },
  { key: 'completed',   label: 'Completed',  placeholder: true },
  { key: 'builder',     label: 'Builder',    placeholder: false },
];

export default function PlaybooksHub() {
  const [activeTab, setActiveTab] = useState('builder');
  const [editingPlaybookId, setEditingPlaybookId] = useState(null);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <div style={{ display:'flex', borderBottom:'0.5px solid #D3D1C7', padding:'0 24px', background:'#fff' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            disabled={t.placeholder}
            style={{
              padding:'12px 18px',
              fontSize:12,
              fontFamily:'inherit',
              background:'transparent',
              border:'none',
              borderBottom: activeTab===t.key ? '2px solid #378ADD' : '2px solid transparent',
              color: activeTab===t.key ? '#2C2C2A' : (t.placeholder ? '#C0BDB2' : '#888780'),
              fontWeight: activeTab===t.key ? 500 : 400,
              cursor: t.placeholder ? 'not-allowed' : 'pointer',
            }}
          >
            {t.label}{t.placeholder ? ' (Plan 3/4)' : ''}
          </button>
        ))}
      </div>
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        {activeTab === 'builder' && (
          <PlaybookFlowBuilder
            playbookId={editingPlaybookId}
            onClose={() => setEditingPlaybookId(null)}
            onOpenPlaybook={setEditingPlaybookId}
          />
        )}
        {activeTab !== 'builder' && (
          <div style={{ padding:40, textAlign:'center', color:'#888780', fontSize:13 }}>
            <p>Deze tab komt beschikbaar in een volgend plan:</p>
            <ul style={{ listStyle:'none', padding:0, marginTop:8 }}>
              <li>📨 Drafts + Lopend + Completed → Plan 3 (execution engine)</li>
              <li>▶ Suggesties → Plan 4 (signal-system)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Maak PlaybookFlowBuilder.jsx stub** (wordt in volgende tasks ingevuld):

```jsx
import React from 'react';

export default function PlaybookFlowBuilder({ playbookId, onClose, onOpenPlaybook }) {
  return (
    <div style={{ padding:24 }}>
      <h2 style={{ fontSize:14, marginBottom:8 }}>Playbook Builder</h2>
      <p style={{ fontSize:12, color:'#888780' }}>
        Canvas-component wordt ingevuld in Task 4-15.
        Selected playbookId: {playbookId || '(geen)'}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/playbooks/PlaybooksHub.jsx src/components/playbooks/PlaybookFlowBuilder.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): PlaybooksHub component met tab-navigation

5-tab hub: Suggesties, Drafts, Lopend, Completed, Builder.
Alleen Builder-tab functioneel in Plan 2; rest zijn placeholders
gemarkeerd met "(Plan 3/4)" voor duidelijkheid.

Plan 2, Task 2.
EOF
)"
```

---

## Task 3: Route BDApp naar PlaybooksHub

**Files:**
- Modify: `src/bd/BDApp.jsx`

- [ ] **Step 1: Lees `src/bd/BDApp.jsx` en zoek de huidige `view === 'playbooks'` block**

Run: `grep -n "playbooks" src/bd/BDApp.jsx`

Verwacht: lines die `view === 'playbooks'` renderen, momenteel waarschijnlijk via `PlaybooksList` en `PlaybookDetail`.

- [ ] **Step 2: Vervang huidige imports**

Zoek de imports voor `PlaybooksList` en `PlaybookDetail`. Vervang door:

```jsx
import PlaybooksHub from '../components/playbooks/PlaybooksHub';
```

- [ ] **Step 3: Vervang de view-routing block**

Vind het `if (view === 'playbooks') { ... }` block (rond lines 191-215 op basis van eerdere code-research).

Vervang door:

```jsx
if (view === 'playbooks') {
  return (
    <div>
      <Topbar /* zelfde props als bestaande Topbar render */ />
      <PlaybooksHub />
    </div>
  );
}
```

**Belangrijk**: behoud alle Topbar-props die in de bestaande block stonden. Modals (FeedbackModal, etc.) moeten ook blijven staan.

- [ ] **Step 4: Smoke-test in browser**

```bash
npm run dev
```
- Open `http://localhost:5173`
- Klik op **Playbooks** in topbar
- Verwacht: 5 tabs zichtbaar, "Builder" actief by default
- 4 andere tabs grijs / disabled met "(Plan 3/4)" suffix
- Builder-tab toont stub: "Canvas-component wordt ingevuld..."

- [ ] **Step 5: Commit**

```bash
git add src/bd/BDApp.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): route BDApp playbooks view → PlaybooksHub

Vervangt PlaybooksList/PlaybookDetail imports door nieuwe Hub.
Oude files blijven nog bestaan tot Task 14 (cleanup) — voorlopig
ongebruikt maar safe.

Plan 2, Task 3.
EOF
)"
```

---

## Task 4: Node-type catalog (NodeTypes.js)

**Files:**
- Create: `src/components/playbooks/nodes/NodeTypes.js`

- [ ] **Step 1: Maak NodeTypes.js met catalog van 14 node-types:**

```js
// Catalog van alle node-types voor Playbooks v2 builder.
// Per type: display info + config schema + welke uitgaande edges zijn toegestaan.

export const NODE_CATEGORIES = {
  TRIGGER: { label: 'Triggers',  color: '#6366f1', bg: '#c7d2fe' },
  ACTION:  { label: 'Actions',   color: '#14b8a6', bg: '#ccfbf1' },
  LOGIC:   { label: 'Logic',     color: '#ec4899', bg: '#fbcfe8' },
  WAIT:    { label: 'Wait',      color: '#f59e0b', bg: '#fde68a' },
};

// fields: array van { key, label, type, required, options? }
// type: 'text' | 'textarea' | 'number' | 'select' | 'days'

export const NODE_TYPES = {
  // ===== Triggers =====
  trigger_stage_change: {
    category: 'TRIGGER',
    icon: '⚡',
    label: 'Stage change',
    description: 'Start wanneer een deal/lead naar een stage gaat',
    maxOutgoing: 1,
    maxIncoming: 0,
    fields: [
      { key: 'to_stage', label: 'Naar stage', type: 'select', required: true,
        options: ['qualify','develop','proposal','close','onboarding','active','sleeping'] },
    ],
  },
  trigger_manual: {
    category: 'TRIGGER',
    icon: '▶',
    label: 'Manual start',
    description: 'Alleen handmatig te starten',
    maxOutgoing: 1,
    maxIncoming: 0,
    fields: [],
  },
  trigger_linkedin_user_post: {
    category: 'TRIGGER',
    icon: 'in',
    label: 'LinkedIn user post',
    description: 'Start bij nieuwe LinkedIn-post van contact',
    maxOutgoing: 1,
    maxIncoming: 0,
    fields: [
      { key: 'min_relevance', label: 'Min. relevance score', type: 'number', required: false },
    ],
  },
  trigger_linkedin_company_post: {
    category: 'TRIGGER',
    icon: '🏢',
    label: 'LinkedIn company post',
    description: 'Start bij nieuwe LinkedIn-post van company',
    maxOutgoing: 1,
    maxIncoming: 0,
    fields: [
      { key: 'min_relevance', label: 'Min. relevance score', type: 'number', required: false },
    ],
  },

  // ===== Actions =====
  action_email_draft: {
    category: 'ACTION',
    icon: '✉️',
    label: 'Email-draft',
    description: 'Genereer email voor review',
    maxOutgoing: 1,
    maxIncoming: 1,
    fields: [
      { key: 'subject', label: 'Onderwerp', type: 'text', required: true },
      { key: 'body', label: 'Body', type: 'textarea', required: true },
    ],
  },
  action_linkedin_draft: {
    category: 'ACTION',
    icon: 'in',
    label: 'LinkedIn-draft',
    description: 'Genereer LinkedIn-bericht voor review',
    maxOutgoing: 1,
    maxIncoming: 1,
    fields: [
      { key: 'body', label: 'Body', type: 'textarea', required: true },
    ],
  },
  action_whatsapp_draft: {
    category: 'ACTION',
    icon: '📱',
    label: 'WhatsApp-draft',
    description: 'Genereer WhatsApp-bericht voor review',
    maxOutgoing: 1,
    maxIncoming: 1,
    fields: [
      { key: 'body', label: 'Body', type: 'textarea', required: true },
    ],
  },
  action_instagram_draft: {
    category: 'ACTION',
    icon: '📷',
    label: 'Instagram-draft',
    description: 'Genereer Instagram-bericht voor review',
    maxOutgoing: 1,
    maxIncoming: 1,
    fields: [
      { key: 'body', label: 'Body', type: 'textarea', required: true },
    ],
  },
  action_internal_task: {
    category: 'ACTION',
    icon: '✓',
    label: 'Internal task',
    description: 'Maak intern task aan voor owner',
    maxOutgoing: 1,
    maxIncoming: 1,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'days_due', label: 'Dagen tot due', type: 'number', required: false },
    ],
  },
  action_stage_update: {
    category: 'ACTION',
    icon: '↦',
    label: 'Stage update',
    description: 'Update stage van gerelateerde deal',
    maxOutgoing: 1,
    maxIncoming: 1,
    fields: [
      { key: 'new_stage', label: 'Nieuwe stage', type: 'select', required: true,
        options: ['qualify','develop','proposal','close','onboarding','active','sleeping'] },
    ],
  },

  // ===== Logic =====
  logic_wait: {
    category: 'WAIT',
    icon: '⏱',
    label: 'Wait',
    description: 'Vaste pauze van N dagen',
    maxOutgoing: 1,
    maxIncoming: 1,
    fields: [
      { key: 'days', label: 'Aantal dagen', type: 'number', required: true },
    ],
  },
  logic_wait_until_or: {
    category: 'WAIT',
    icon: '⏳',
    label: 'Wait-until / -or',
    description: 'Max N dagen of tot event',
    maxOutgoing: 2, // event + timeout paden
    maxIncoming: 1,
    fields: [
      { key: 'max_days', label: 'Max dagen', type: 'number', required: true },
      { key: 'event_type', label: 'Event-type', type: 'select', required: true,
        options: ['reply_received','email_opened','linkedin_reply','any_inbound'] },
    ],
  },
  logic_branch: {
    category: 'LOGIC',
    icon: '◆',
    label: 'Branch (if/else)',
    description: 'Splits paden op basis van conditie',
    maxOutgoing: null, // veel paden mogelijk
    maxIncoming: 1,
    fields: [
      { key: 'condition_type', label: 'Conditie-type', type: 'select', required: true,
        options: ['field_compare','event_check','time_check'] },
      { key: 'condition_field', label: 'Veld (bv. deal.value)', type: 'text', required: false },
      { key: 'condition_operator', label: 'Operator', type: 'select', required: false,
        options: ['eq','neq','gt','lt','gte','lte','contains'] },
      { key: 'condition_value', label: 'Waarde', type: 'text', required: false },
    ],
  },
  logic_end: {
    category: 'LOGIC',
    icon: '⊗',
    label: 'End',
    description: 'Eindigt huidig pad',
    maxOutgoing: 0,
    maxIncoming: null, // meerdere edges kunnen in End komen
    fields: [],
  },
};

// Hulper voor palette: gegroepeerd per categorie
export function getNodesByCategory() {
  const grouped = {};
  for (const [type, def] of Object.entries(NODE_TYPES)) {
    const cat = def.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ type, ...def });
  }
  return grouped;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/playbooks/nodes/NodeTypes.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): node-type catalog met 14 types + config-schemas

4 triggers, 6 actions, 4 logic. Per type: icon, label, description,
maxIn/Out constraints, field-schema voor property panel.

Plan 2, Task 4.
EOF
)"
```

---

## Task 5: Custom NodeCard component

**Files:**
- Create: `src/components/playbooks/nodes/NodeCard.jsx`

- [ ] **Step 1: Maak NodeCard.jsx met dit content:**

```jsx
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { NODE_TYPES, NODE_CATEGORIES } from './NodeTypes';

export default function NodeCard({ data, selected }) {
  const nodeType = NODE_TYPES[data.nodeType];
  if (!nodeType) {
    return (
      <div style={{ background:'#fee', padding:8, border:'1px solid #c33', borderRadius:6, fontSize:11 }}>
        Onbekend node-type: {data.nodeType}
      </div>
    );
  }
  const cat = NODE_CATEGORIES[nodeType.category];
  const config = data.config || {};
  const summary = getSummary(nodeType, config);

  return (
    <div style={{
      background:'#fff',
      border: `1px solid ${selected ? '#14b8a6' : '#d0d5dd'}`,
      borderLeft: `3px solid ${cat.color}`,
      borderRadius:6,
      padding:'8px 12px',
      minWidth: 200,
      fontSize:11,
      boxShadow: selected ? '0 0 0 2px rgba(20,184,166,0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
      cursor:'pointer',
    }}>
      {nodeType.maxIncoming !== 0 && (
        <Handle type="target" position={Position.Top} style={{ background:'#94a3b8' }} />
      )}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{
          width:22, height:22, borderRadius:4,
          background: cat.bg,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, flexShrink:0,
        }}>{nodeType.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, color:'#1f2937', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {nodeType.label}
          </div>
          {summary && (
            <div style={{ fontSize:10, color:'#6b7280', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {summary}
            </div>
          )}
        </div>
      </div>
      {nodeType.maxOutgoing !== 0 && (
        <Handle type="source" position={Position.Bottom} style={{ background:'#94a3b8' }} />
      )}
    </div>
  );
}

function getSummary(nodeType, config) {
  // Per type: pak het meest informatieve field als 1-liner
  if (nodeType.label === 'Stage change' && config.to_stage) return `→ ${config.to_stage}`;
  if (nodeType.label === 'Wait' && config.days) return `${config.days} dagen`;
  if (nodeType.label === 'Wait-until / -or' && config.max_days) return `≤ ${config.max_days}d OR ${config.event_type || '?'}`;
  if (nodeType.label === 'Email-draft' && config.subject) return config.subject;
  if (nodeType.label === 'Branch (if/else)' && config.condition_field) return `${config.condition_field} ${config.condition_operator || ''} ${config.condition_value || ''}`;
  if (nodeType.label === 'Stage update' && config.new_stage) return `→ ${config.new_stage}`;
  if (nodeType.label === 'Internal task' && config.title) return config.title;
  return '';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/playbooks/nodes/NodeCard.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): NodeCard component voor React Flow canvas

Custom node-renderer met category-coded border-color, icon-square,
labels, en 1-line config-summary. Handles voor in/out edges respecting
node-type's maxIncoming/maxOutgoing.

Plan 2, Task 5.
EOF
)"
```

---

## Task 6: Graph IO library (load/save Supabase ↔ React Flow)

**Files:**
- Create: `src/components/playbooks/lib/playbookGraphIO.js`

- [ ] **Step 1: Maak playbookGraphIO.js met dit content:**

```js
// Load/save helpers voor playbook graph data tussen Supabase en React Flow state.
//
// React Flow state shape:
//   nodes: [{ id, type:'custom', position:{x,y}, data:{ nodeType, config, label } }]
//   edges: [{ id, source, target, label?, data?:{ condition_expr } }]
//
// Supabase shape:
//   playbook_nodes: { id, playbook_id, node_type, config, pos_x, pos_y }
//   playbook_edges: { id, playbook_id, source_node_id, target_node_id, condition_label, condition_expr }

import { supabase } from '../../../supabaseClient';

export async function loadPlaybookGraph(playbookId) {
  if (!playbookId) return { nodes: [], edges: [] };

  const [nodesRes, edgesRes] = await Promise.all([
    supabase.from('playbook_nodes').select('*').eq('playbook_id', playbookId),
    supabase.from('playbook_edges').select('*').eq('playbook_id', playbookId),
  ]);

  if (nodesRes.error) throw new Error(`Failed to load nodes: ${nodesRes.error.message}`);
  if (edgesRes.error) throw new Error(`Failed to load edges: ${edgesRes.error.message}`);

  const nodes = (nodesRes.data || []).map(row => ({
    id: row.id,
    type: 'custom',
    position: { x: row.pos_x ?? 0, y: row.pos_y ?? 0 },
    data: { nodeType: row.node_type, config: row.config || {} },
  }));

  const edges = (edgesRes.data || []).map(row => ({
    id: row.id,
    source: row.source_node_id,
    target: row.target_node_id,
    label: row.condition_label || undefined,
    data: { condition_expr: row.condition_expr },
  }));

  return { nodes, edges };
}

export async function savePlaybookGraph(playbookId, { nodes, edges }) {
  if (!playbookId) throw new Error('savePlaybookGraph requires playbookId');

  // Strategy: delete-all-then-insert. Simple, correct, OK voor builder-size graphs (<100 nodes).
  // Voor grotere graphs zou diff-based update efficienter zijn, maar dat is YAGNI nu.

  await supabase.from('playbook_edges').delete().eq('playbook_id', playbookId);
  await supabase.from('playbook_nodes').delete().eq('playbook_id', playbookId);

  if (nodes.length > 0) {
    const nodeRows = nodes.map(n => ({
      id: n.id,
      playbook_id: playbookId,
      node_type: n.data.nodeType,
      config: n.data.config || {},
      pos_x: n.position.x,
      pos_y: n.position.y,
    }));
    const { error } = await supabase.from('playbook_nodes').insert(nodeRows);
    if (error) throw new Error(`Failed to save nodes: ${error.message}`);
  }

  if (edges.length > 0) {
    const edgeRows = edges.map(e => ({
      id: e.id,
      playbook_id: playbookId,
      source_node_id: e.source,
      target_node_id: e.target,
      condition_label: e.label || null,
      condition_expr: e.data?.condition_expr || null,
    }));
    const { error } = await supabase.from('playbook_edges').insert(edgeRows);
    if (error) throw new Error(`Failed to save edges: ${error.message}`);
  }
}

export async function listPlaybooks() {
  const { data, error } = await supabase
    .from('playbooks')
    .select('id, name, status, version, trigger_type, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to list playbooks: ${error.message}`);
  return data || [];
}

export async function createPlaybook(name) {
  const { data, error } = await supabase
    .from('playbooks')
    .insert({ name, status: 'draft', version: 1, trigger_type: 'manual' })
    .select()
    .single();
  if (error) throw new Error(`Failed to create playbook: ${error.message}`);
  return data;
}

export async function getPlaybook(playbookId) {
  const { data, error } = await supabase
    .from('playbooks')
    .select('*')
    .eq('id', playbookId)
    .single();
  if (error) throw new Error(`Failed to get playbook: ${error.message}`);
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/playbooks/lib/playbookGraphIO.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): playbookGraphIO library

Load/save helpers tussen Supabase (playbook_nodes/edges tables) en
React Flow state-shape. Delete-all-then-insert strategy voor saves
(YAGNI voor diff-based bij <100 nodes).

Plus list/create/get playbook-meta helpers voor de hub-landing page.

Plan 2, Task 6.
EOF
)"
```

---

## Task 7: PlaybookFlowBuilder canvas — render graph from DB

**Files:**
- Modify: `src/components/playbooks/PlaybookFlowBuilder.jsx`

- [ ] **Step 1: Vervang inhoud van PlaybookFlowBuilder.jsx met:**

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import NodeCard from './nodes/NodeCard';
import { loadPlaybookGraph } from './lib/playbookGraphIO';

const nodeTypes = { custom: NodeCard };

export default function PlaybookFlowBuilder({ playbookId, onClose, onOpenPlaybook }) {
  if (!playbookId) {
    return <PlaybookListing onOpenPlaybook={onOpenPlaybook} />;
  }
  return (
    <ReactFlowProvider>
      <FlowCanvas playbookId={playbookId} onClose={onClose} />
    </ReactFlowProvider>
  );
}

function FlowCanvas({ playbookId, onClose }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    loadPlaybookGraph(playbookId)
      .then(({ nodes, edges }) => {
        setNodes(nodes);
        setEdges(edges);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [playbookId, setNodes, setEdges]);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#888780' }}>Loading playbook...</div>;
  if (error) return <div style={{ padding:40, color:'#dc2626' }}>Error: {error}</div>;

  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      <button
        onClick={onClose}
        style={{ position:'absolute', top:12, left:12, zIndex:10, padding:'6px 10px', fontSize:11,
                 background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:6, cursor:'pointer' }}>
        ← Terug naar lijst
      </button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

function PlaybookListing({ onOpenPlaybook }) {
  // Stub voor Task 8 — wordt daar volledig ingevuld
  return (
    <div style={{ padding:24 }}>
      <h2 style={{ fontSize:14, marginBottom:8 }}>Playbooks</h2>
      <p style={{ fontSize:12, color:'#888780' }}>Lijst-component wordt ingevuld in Task 8.</p>
    </div>
  );
}
```

- [ ] **Step 2: Smoke-test in browser**

```bash
npm run dev
```
- Open Playbooks-tab → Builder
- Toont nu "Lijst-component wordt ingevuld in Task 8" (geen errors)
- React Flow CSS moet zonder errors importeren

- [ ] **Step 3: Commit**

```bash
git add src/components/playbooks/PlaybookFlowBuilder.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): FlowCanvas — render graph from DB met React Flow

Conditional rendering: zonder playbookId toont stub-lijst (Task 8),
met playbookId toont React Flow canvas met Background/Controls/MiniMap.
Custom node-type 'custom' geregistreerd → NodeCard component.

Plan 2, Task 7.
EOF
)"
```

---

## Task 8: PlaybookListing component (Builder-tab landing)

**Files:**
- Modify: `src/components/playbooks/PlaybookFlowBuilder.jsx`

- [ ] **Step 1: Vervang de `PlaybookListing` stub onderin PlaybookFlowBuilder.jsx door:**

```jsx
function PlaybookListing({ onOpenPlaybook }) {
  const [playbooks, setPlaybooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    listPlaybooks()
      .then(rows => { setPlaybooks(rows); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const pb = await createPlaybook(newName.trim());
      setNewName('');
      onOpenPlaybook(pb.id);
    } catch (err) {
      alert('Kan playbook niet aanmaken: ' + err.message);
    }
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#888780' }}>Loading...</div>;
  if (error) return <div style={{ padding:40, color:'#dc2626' }}>Error: {error}</div>;

  return (
    <div style={{ padding:24, maxWidth:800, margin:'0 auto' }}>
      <h2 style={{ fontSize:14, marginBottom:16 }}>Playbooks</h2>

      <div style={{ background:'#F1EFE8', padding:12, borderRadius:6, marginBottom:20, display:'flex', gap:8 }}>
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Nieuwe playbook naam..."
          style={{ flex:1, padding:'6px 10px', border:'0.5px solid #D3D1C7', borderRadius:4, fontSize:12, fontFamily:'inherit' }}
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim()}
          style={{ padding:'6px 14px', background:'#378ADD', color:'#fff', border:'none', borderRadius:4, fontSize:12, cursor: newName.trim() ? 'pointer' : 'not-allowed', opacity: newName.trim() ? 1 : 0.5 }}>
          + Nieuwe playbook
        </button>
      </div>

      {playbooks.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'#888780', fontSize:12 }}>
          Nog geen playbooks. Maak je eerste hierboven aan.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {playbooks.map(pb => (
            <div
              key={pb.id}
              onClick={() => onOpenPlaybook(pb.id)}
              style={{ background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:6, padding:12, cursor:'pointer',
                       display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:500, fontSize:13 }}>{pb.name}</div>
                <div style={{ fontSize:10, color:'#888780', marginTop:2 }}>
                  {pb.status} · v{pb.version} · trigger: {pb.trigger_type || '(geen)'}
                </div>
              </div>
              <div style={{ fontSize:11, color:'#888780' }}>{new Date(pb.created_at).toLocaleDateString('nl-NL')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Voeg de imports bovenin PlaybookFlowBuilder.jsx toe**

```jsx
import { listPlaybooks, createPlaybook, loadPlaybookGraph } from './lib/playbookGraphIO';
```

(vervang de bestaande `import { loadPlaybookGraph } from ...`).

- [ ] **Step 3: Smoke-test**

- Open Playbooks tab → Builder
- Toont lege lijst (of playbooks die je in Supabase hebt gemaakt) + create-input
- Maak een test-playbook aan met naam "Test 1" → opent direct in canvas
- Canvas toont leeg (geen nodes nog — komt in Task 10)
- Klik "← Terug naar lijst" → terug naar landing
- Klik op de zojuist aangemaakte playbook → opent canvas opnieuw

- [ ] **Step 4: Commit**

```bash
git add src/components/playbooks/PlaybookFlowBuilder.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): PlaybookListing — Builder-tab landing met lijst + create

Lijst van bestaande playbooks (alle statussen), inline create-input
voor nieuwe playbooks. Klik op een playbook opent 'm in canvas.
Klik op create voert direct naar canvas voor de nieuwe playbook.

Plan 2, Task 8.
EOF
)"
```

---

## Task 9: NodePalette (left sidebar) met drag-to-canvas

**Files:**
- Create: `src/components/playbooks/panels/NodePalette.jsx`
- Modify: `src/components/playbooks/PlaybookFlowBuilder.jsx`

- [ ] **Step 1: Maak NodePalette.jsx:**

```jsx
import React from 'react';
import { NODE_TYPES, NODE_CATEGORIES, getNodesByCategory } from '../nodes/NodeTypes';

export default function NodePalette() {
  const grouped = getNodesByCategory();

  function onDragStart(event, nodeType) {
    event.dataTransfer.setData('application/playbook-node-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div style={{ width:180, background:'#fafafa', borderRight:'0.5px solid #D3D1C7', padding:10, overflowY:'auto' }}>
      {Object.entries(grouped).map(([catKey, items]) => {
        const cat = NODE_CATEGORIES[catKey];
        return (
          <div key={catKey} style={{ marginBottom:14 }}>
            <div style={{ fontSize:9, textTransform:'uppercase', color:'#6b7280', fontWeight:700, marginBottom:6, letterSpacing:0.5 }}>
              {cat.label}
            </div>
            {items.map(item => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => onDragStart(e, item.type)}
                title={item.description}
                style={{
                  background:'#fff',
                  border:'0.5px solid #D3D1C7',
                  borderLeft:`2px solid ${cat.color}`,
                  borderRadius:4,
                  padding:'6px 8px',
                  marginBottom:4,
                  fontSize:10,
                  display:'flex',
                  alignItems:'center',
                  gap:6,
                  cursor:'grab',
                }}>
                <span style={{
                  width:18, height:18, borderRadius:3,
                  background: cat.bg,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:10, flexShrink:0,
                }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Update PlaybookFlowBuilder.jsx — voeg drop-handler toe en NodePalette in layout**

Pas de `FlowCanvas` functie aan zodat:
1. NodePalette aan de linkerkant rendert
2. ReactFlow heeft `onDrop` en `onDragOver` handlers

Vervang de FlowCanvas-component door:

```jsx
function FlowCanvas({ playbookId, onClose }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  useEffect(() => {
    setLoading(true);
    loadPlaybookGraph(playbookId)
      .then(({ nodes, edges }) => {
        setNodes(nodes);
        setEdges(edges);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [playbookId, setNodes, setEdges]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const nodeType = event.dataTransfer.getData('application/playbook-node-type');
    if (!nodeType || !reactFlowInstance) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode = {
      id: crypto.randomUUID(),
      type: 'custom',
      position,
      data: { nodeType, config: {} },
    };
    setNodes(nds => nds.concat(newNode));
  }, [reactFlowInstance, setNodes]);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#888780' }}>Loading playbook...</div>;
  if (error) return <div style={{ padding:40, color:'#dc2626' }}>Error: {error}</div>;

  return (
    <div style={{ display:'flex', width:'100%', height:'100%' }}>
      <NodePalette />
      <div style={{ flex:1, position:'relative' }}>
        <button
          onClick={onClose}
          style={{ position:'absolute', top:12, left:12, zIndex:10, padding:'6px 10px', fontSize:11,
                   background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:6, cursor:'pointer' }}>
          ← Terug naar lijst
        </button>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Voeg import toe bovenin PlaybookFlowBuilder.jsx**

```jsx
import NodePalette from './panels/NodePalette';
```

- [ ] **Step 4: Smoke-test**

- Open een playbook → canvas + palette zichtbaar
- Drag "Manual start" uit palette naar canvas → node verschijnt op drop-locatie
- Drag een Email-draft erbij → tweede node
- Nodes zijn nog niet aan elkaar verbonden (komt Task 10)

- [ ] **Step 5: Commit**

```bash
git add src/components/playbooks/panels/NodePalette.jsx src/components/playbooks/PlaybookFlowBuilder.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): NodePalette + drag-to-canvas creation

Left sidebar met 14 node-types gegroepeerd per categorie (Triggers/Actions/Logic/Wait).
HTML5 drag-and-drop API → onDrop op canvas → creates new node op screen-coords
geconverteerd naar flow-coords via screenToFlowPosition.

Plan 2, Task 9.
EOF
)"
```

---

## Task 10: Edge creation + edge labels

**Files:**
- Modify: `src/components/playbooks/PlaybookFlowBuilder.jsx`

- [ ] **Step 1: Update FlowCanvas — voeg `onConnect` handler toe**

In FlowCanvas, voeg toe vóór de return-statement:

```jsx
const onConnect = useCallback((params) => {
  const newEdge = {
    id: crypto.randomUUID(),
    source: params.source,
    target: params.target,
    label: '',
    data: {},
  };
  setEdges(eds => eds.concat(newEdge));
}, [setEdges]);
```

En voeg `onConnect={onConnect}` toe aan de ReactFlow component-props.

- [ ] **Step 2: Update FlowCanvas — voeg edge-label edit toe via double-click**

Voeg toe:

```jsx
const onEdgeDoubleClick = useCallback((event, edge) => {
  const newLabel = prompt('Edge label (bv. "ja", "nee", "deal > 50k"):', edge.label || '');
  if (newLabel !== null) {
    setEdges(eds => eds.map(e => e.id === edge.id ? { ...e, label: newLabel } : e));
  }
}, [setEdges]);
```

En voeg `onEdgeDoubleClick={onEdgeDoubleClick}` toe aan de ReactFlow component-props.

- [ ] **Step 3: Smoke-test**

- Open een playbook met 2+ nodes
- Sleep van onderkant van node A naar bovenkant van node B → edge verschijnt
- Double-click op de edge → prompt voor label
- Typ "ja" en bevestig → edge toont label

- [ ] **Step 4: Commit**

```bash
git add src/components/playbooks/PlaybookFlowBuilder.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): edge creation + edge-label editing

onConnect handler creates edges via drag-from-handle.
Double-click op edge opent prompt voor label (voor branch-paden:
"ja" / "nee" / "deal > 50k" etc.).

Plan 2, Task 10.
EOF
)"
```

---

## Task 11: PropertyPanel (right sidebar, dynamisch per node-type)

**Files:**
- Create: `src/components/playbooks/panels/PropertyPanel.jsx`
- Modify: `src/components/playbooks/PlaybookFlowBuilder.jsx`

- [ ] **Step 1: Maak PropertyPanel.jsx:**

```jsx
import React from 'react';
import { NODE_TYPES } from '../nodes/NodeTypes';

export default function PropertyPanel({ selectedNode, onChangeConfig, onDeleteNode }) {
  if (!selectedNode) {
    return (
      <div style={{ width:240, background:'#fff', borderLeft:'0.5px solid #D3D1C7', padding:14, color:'#888780', fontSize:11 }}>
        <p>Selecteer een node om properties te bewerken.</p>
      </div>
    );
  }

  const nodeType = NODE_TYPES[selectedNode.data.nodeType];
  if (!nodeType) {
    return (
      <div style={{ width:240, background:'#fff', borderLeft:'0.5px solid #D3D1C7', padding:14, color:'#dc2626', fontSize:11 }}>
        Onbekend node-type: {selectedNode.data.nodeType}
      </div>
    );
  }

  const config = selectedNode.data.config || {};

  function updateField(key, value) {
    onChangeConfig({ ...config, [key]: value });
  }

  return (
    <div style={{ width:240, background:'#fff', borderLeft:'0.5px solid #D3D1C7', padding:14, overflowY:'auto' }}>
      <div style={{ fontSize:11, fontWeight:700, paddingBottom:8, borderBottom:'0.5px solid #D3D1C7', marginBottom:10 }}>
        {nodeType.label} properties
      </div>

      {nodeType.fields.length === 0 && (
        <p style={{ fontSize:11, color:'#888780' }}>Dit node-type heeft geen configureerbare properties.</p>
      )}

      {nodeType.fields.map(field => (
        <div key={field.key} style={{ marginBottom:10 }}>
          <div style={{ fontSize:9, textTransform:'uppercase', color:'#6b7280', fontWeight:600, marginBottom:3 }}>
            {field.label}{field.required && <span style={{ color:'#dc2626' }}> *</span>}
          </div>
          {field.type === 'text' && (
            <input
              type="text"
              value={config[field.key] || ''}
              onChange={e => updateField(field.key, e.target.value)}
              style={{ width:'100%', padding:'4px 6px', fontSize:11, border:'0.5px solid #D3D1C7', borderRadius:4, fontFamily:'inherit' }}
            />
          )}
          {field.type === 'textarea' && (
            <textarea
              value={config[field.key] || ''}
              onChange={e => updateField(field.key, e.target.value)}
              rows={5}
              style={{ width:'100%', padding:'4px 6px', fontSize:11, border:'0.5px solid #D3D1C7', borderRadius:4, fontFamily:'inherit', resize:'vertical' }}
            />
          )}
          {field.type === 'number' && (
            <input
              type="number"
              value={config[field.key] || ''}
              onChange={e => updateField(field.key, e.target.value === '' ? null : Number(e.target.value))}
              style={{ width:'100%', padding:'4px 6px', fontSize:11, border:'0.5px solid #D3D1C7', borderRadius:4, fontFamily:'inherit' }}
            />
          )}
          {field.type === 'select' && (
            <select
              value={config[field.key] || ''}
              onChange={e => updateField(field.key, e.target.value)}
              style={{ width:'100%', padding:'4px 6px', fontSize:11, border:'0.5px solid #D3D1C7', borderRadius:4, fontFamily:'inherit' }}>
              <option value="">— kies —</option>
              {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}
        </div>
      ))}

      <div style={{ marginTop:18, borderTop:'0.5px solid #D3D1C7', paddingTop:10 }}>
        <button
          onClick={onDeleteNode}
          style={{ width:'100%', padding:'6px 10px', fontSize:11, background:'#fff', color:'#dc2626', border:'0.5px solid #dc2626', borderRadius:4, cursor:'pointer' }}>
          Delete node
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update FlowCanvas — voeg selection-state + PropertyPanel toe**

Voeg state toe in FlowCanvas:

```jsx
const [selectedNodeId, setSelectedNodeId] = useState(null);
const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;
```

Voeg handlers toe:

```jsx
const onNodeClick = useCallback((event, node) => {
  setSelectedNodeId(node.id);
}, []);

const onPaneClick = useCallback(() => {
  setSelectedNodeId(null);
}, []);

const handleChangeConfig = useCallback((newConfig) => {
  setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, config: newConfig } } : n));
}, [selectedNodeId, setNodes]);

const handleDeleteNode = useCallback(() => {
  if (!selectedNodeId) return;
  setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
  setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
  setSelectedNodeId(null);
}, [selectedNodeId, setNodes, setEdges]);
```

Pas de layout aan zodat PropertyPanel aan de rechterkant rendert. Vervang het outer div in FlowCanvas:

```jsx
return (
  <div style={{ display:'flex', width:'100%', height:'100%' }}>
    <NodePalette />
    <div style={{ flex:1, position:'relative' }}>
      <button onClick={onClose} /* zelfde als eerder */>← Terug naar lijst</button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
    <PropertyPanel
      selectedNode={selectedNode}
      onChangeConfig={handleChangeConfig}
      onDeleteNode={handleDeleteNode}
    />
  </div>
);
```

- [ ] **Step 3: Voeg import toe bovenin PlaybookFlowBuilder.jsx**

```jsx
import PropertyPanel from './panels/PropertyPanel';
```

- [ ] **Step 4: Smoke-test**

- Open playbook → 3 kolommen zichtbaar: palette · canvas · property-panel
- Klik op een node → property panel toont type-specifieke fields
- Bewerk een field (bv. Email subject) → node-card op canvas update z'n summary live
- Klik buiten een node → property-panel toont weer "Selecteer een node"
- Klik Delete node → node + bijbehorende edges verdwijnen

- [ ] **Step 5: Commit**

```bash
git add src/components/playbooks/panels/PropertyPanel.jsx src/components/playbooks/PlaybookFlowBuilder.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): PropertyPanel + node selection/edit/delete

Right-sidebar property panel met dynamische fields per node-type
(text/textarea/number/select). Edit triggert config-update,
NodeCard's summary update live. Delete-knop verwijdert node + alle
gekoppelde edges.

Plan 2, Task 11.
EOF
)"
```

---

## Task 12: Validation library

**Files:**
- Create: `src/components/playbooks/lib/playbookValidation.js`

- [ ] **Step 1: Maak playbookValidation.js:**

```js
// Validation rules voor playbook graph.
// Returns array van issues: { severity: 'error'|'warning', nodeId?, message }

import { NODE_TYPES } from '../nodes/NodeTypes';

export function validatePlaybook({ nodes, edges }) {
  const issues = [];

  if (nodes.length === 0) {
    issues.push({ severity: 'error', message: 'Playbook heeft geen nodes.' });
    return issues;
  }

  // Build adjacency
  const incoming = new Map(); // nodeId -> count
  const outgoing = new Map();
  for (const n of nodes) {
    incoming.set(n.id, 0);
    outgoing.set(n.id, 0);
  }
  for (const e of edges) {
    incoming.set(e.target, (incoming.get(e.target) || 0) + 1);
    outgoing.set(e.source, (outgoing.get(e.source) || 0) + 1);
  }

  // Rule 1: exactly one trigger node
  const triggers = nodes.filter(n => {
    const t = NODE_TYPES[n.data.nodeType];
    return t?.category === 'TRIGGER';
  });
  if (triggers.length === 0) {
    issues.push({ severity: 'error', message: 'Geen trigger-node aanwezig. Een playbook moet beginnen met een trigger.' });
  } else if (triggers.length > 1) {
    issues.push({ severity: 'error', message: `${triggers.length} trigger-nodes gevonden — slechts één trigger per playbook is toegestaan.` });
  }

  // Rule 2: trigger heeft geen incoming edges
  for (const t of triggers) {
    if (incoming.get(t.id) > 0) {
      issues.push({ severity: 'error', nodeId: t.id, message: 'Trigger-node mag geen inkomende edges hebben.' });
    }
  }

  // Rule 3: required config fields ingevuld
  for (const n of nodes) {
    const def = NODE_TYPES[n.data.nodeType];
    if (!def) {
      issues.push({ severity: 'error', nodeId: n.id, message: `Onbekend node-type: ${n.data.nodeType}` });
      continue;
    }
    const config = n.data.config || {};
    for (const field of def.fields) {
      if (field.required && (config[field.key] === undefined || config[field.key] === null || config[field.key] === '')) {
        issues.push({ severity: 'error', nodeId: n.id, message: `${def.label}: '${field.label}' is verplicht maar leeg.` });
      }
    }
  }

  // Rule 4: orphan nodes (geen incoming en geen trigger)
  for (const n of nodes) {
    const def = NODE_TYPES[n.data.nodeType];
    if (def?.category === 'TRIGGER') continue;
    if (incoming.get(n.id) === 0) {
      issues.push({ severity: 'warning', nodeId: n.id, message: `${def?.label || 'Node'}: niet bereikbaar (geen inkomende edge).` });
    }
  }

  // Rule 5: dead-ends (non-End nodes zonder outgoing)
  for (const n of nodes) {
    const def = NODE_TYPES[n.data.nodeType];
    if (!def) continue;
    if (def.maxOutgoing === 0) continue; // End-node OK
    if (outgoing.get(n.id) === 0) {
      issues.push({ severity: 'warning', nodeId: n.id, message: `${def.label}: dead-end (geen uitgaande edge).` });
    }
  }

  // Rule 6: maxOutgoing violations
  for (const n of nodes) {
    const def = NODE_TYPES[n.data.nodeType];
    if (!def) continue;
    if (def.maxOutgoing !== null && outgoing.get(n.id) > def.maxOutgoing) {
      issues.push({ severity: 'error', nodeId: n.id, message: `${def.label}: te veel uitgaande edges (${outgoing.get(n.id)}/${def.maxOutgoing} max).` });
    }
  }

  return issues;
}

export function hasErrors(issues) {
  return issues.some(i => i.severity === 'error');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/playbooks/lib/playbookValidation.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): playbookValidation library

6 validatie-regels:
1. Exact 1 trigger-node
2. Trigger heeft geen inkomende edges
3. Required config-fields ingevuld
4. Geen orphan nodes (warning)
5. Geen dead-ends (warning)
6. maxOutgoing respected per node-type

Returns issues[] met severity (error/warning) en optionele nodeId.

Plan 2, Task 12.
EOF
)"
```

---

## Task 13: BuilderToolbar + Save Draft + Publish

**Files:**
- Create: `src/components/playbooks/panels/BuilderToolbar.jsx`
- Create: `src/components/playbooks/lib/playbookVersioning.js`
- Modify: `src/components/playbooks/PlaybookFlowBuilder.jsx`

- [ ] **Step 1: Maak playbookVersioning.js:**

```js
// Publishing-logic: snapshot huidige graph naar playbook_versions tabel.

import { supabase } from '../../../supabaseClient';

export async function publishPlaybookVersion(playbookId, { nodes, edges }, publishedBy) {
  // Get current version + increment
  const { data: pb, error: getErr } = await supabase
    .from('playbooks')
    .select('version')
    .eq('id', playbookId)
    .single();
  if (getErr) throw new Error(`Failed to load playbook for publish: ${getErr.message}`);

  const newVersion = (pb.version || 1) + 1;

  // Snapshot graph as jsonb
  const snapshot = {
    version: newVersion,
    nodes: nodes.map(n => ({
      id: n.id,
      node_type: n.data.nodeType,
      config: n.data.config,
      pos_x: n.position.x,
      pos_y: n.position.y,
    })),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      condition_label: e.label || null,
      condition_expr: e.data?.condition_expr || null,
    })),
  };

  // Insert version snapshot
  const { error: insertErr } = await supabase
    .from('playbook_versions')
    .insert({
      playbook_id: playbookId,
      version: newVersion,
      graph_snapshot: snapshot,
      published_by: publishedBy || null,
    });
  if (insertErr) throw new Error(`Failed to insert version: ${insertErr.message}`);

  // Update playbook version + status='active'
  const { error: updateErr } = await supabase
    .from('playbooks')
    .update({ version: newVersion, status: 'active' })
    .eq('id', playbookId);
  if (updateErr) throw new Error(`Failed to update playbook: ${updateErr.message}`);

  return newVersion;
}
```

- [ ] **Step 2: Maak BuilderToolbar.jsx:**

```jsx
import React from 'react';

export default function BuilderToolbar({ playbookName, version, status, saving, publishing, issues, onSaveDraft, onPublish, onClose }) {
  const hasErrors = issues.some(i => i.severity === 'error');
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      background:'#fafafa', borderBottom:'0.5px solid #D3D1C7',
      padding:'8px 14px', fontSize:11,
    }}>
      <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#888780', fontSize:14 }}>‹</button>
      <span style={{ fontWeight:700, fontSize:12 }}>{playbookName || 'Playbook'}</span>
      <span style={{ background:'#e0e7ff', color:'#4338ca', padding:'1px 6px', borderRadius:3, fontSize:10, fontWeight:600 }}>
        v{version} · {status}
      </span>

      {(errorCount > 0 || warningCount > 0) && (
        <span style={{ fontSize:10, color: hasErrors ? '#dc2626' : '#92400e' }}>
          {errorCount > 0 && `${errorCount} error${errorCount>1?'s':''}`}
          {errorCount > 0 && warningCount > 0 && ' · '}
          {warningCount > 0 && `${warningCount} warning${warningCount>1?'s':''}`}
        </span>
      )}

      <div style={{ flex:1 }} />

      <button
        onClick={onSaveDraft}
        disabled={saving || publishing}
        style={{ padding:'4px 10px', fontSize:11, background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:4, cursor: (saving || publishing) ? 'not-allowed' : 'pointer' }}>
        {saving ? 'Saving...' : 'Save draft'}
      </button>

      <button
        onClick={onPublish}
        disabled={hasErrors || saving || publishing}
        title={hasErrors ? 'Fix errors voor publish' : ''}
        style={{
          padding:'4px 12px', fontSize:11,
          background: hasErrors ? '#94a3b8' : '#14b8a6',
          color:'#fff', border:'none', borderRadius:4,
          cursor: (hasErrors || saving || publishing) ? 'not-allowed' : 'pointer',
          fontWeight:600,
        }}>
        {publishing ? 'Publishing...' : `▶ Publish v${(version || 1) + 1}`}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Update FlowCanvas — wire BuilderToolbar in**

Voeg state toe:

```jsx
const [playbookMeta, setPlaybookMeta] = useState(null);
const [saving, setSaving] = useState(false);
const [publishing, setPublishing] = useState(false);

// Update load-effect — ook playbook meta laden:
useEffect(() => {
  setLoading(true);
  Promise.all([
    loadPlaybookGraph(playbookId),
    getPlaybook(playbookId),
  ])
    .then(([{ nodes, edges }, meta]) => {
      setNodes(nodes);
      setEdges(edges);
      setPlaybookMeta(meta);
      setLoading(false);
    })
    .catch(err => { setError(err.message); setLoading(false); });
}, [playbookId, setNodes, setEdges]);

// Validatie continu uitvoeren:
const issues = useMemo(() => validatePlaybook({ nodes, edges }), [nodes, edges]);

// Save Draft handler
const handleSaveDraft = async () => {
  setSaving(true);
  try {
    await savePlaybookGraph(playbookId, { nodes, edges });
  } catch (err) {
    alert('Save failed: ' + err.message);
  } finally {
    setSaving(false);
  }
};

// Publish handler
const handlePublish = async () => {
  if (hasErrors(issues)) {
    alert('Fix errors voor publish.');
    return;
  }
  setPublishing(true);
  try {
    await savePlaybookGraph(playbookId, { nodes, edges });
    const newVersion = await publishPlaybookVersion(playbookId, { nodes, edges }, null);
    setPlaybookMeta(m => ({ ...m, version: newVersion, status: 'active' }));
    alert(`Gepubliceerd als v${newVersion}.`);
  } catch (err) {
    alert('Publish failed: ' + err.message);
  } finally {
    setPublishing(false);
  }
};
```

Render BuilderToolbar bovenaan canvas (vóór de ReactFlow). Vervang de outer JSX:

```jsx
return (
  <div style={{ display:'flex', flexDirection:'column', width:'100%', height:'100%' }}>
    <BuilderToolbar
      playbookName={playbookMeta?.name}
      version={playbookMeta?.version}
      status={playbookMeta?.status}
      saving={saving}
      publishing={publishing}
      issues={issues}
      onSaveDraft={handleSaveDraft}
      onPublish={handlePublish}
      onClose={onClose}
    />
    <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
      <NodePalette />
      <div style={{ flex:1, position:'relative' }}>
        <ReactFlow /* zelfde props als eerder */>
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      <PropertyPanel
        selectedNode={selectedNode}
        onChangeConfig={handleChangeConfig}
        onDeleteNode={handleDeleteNode}
      />
    </div>
  </div>
);
```

Verwijder de losse `← Terug naar lijst`-button — die zit nu in de BuilderToolbar.

- [ ] **Step 4: Voeg imports toe**

```jsx
import { useMemo } from 'react';
import BuilderToolbar from './panels/BuilderToolbar';
import { savePlaybookGraph, listPlaybooks, createPlaybook, loadPlaybookGraph, getPlaybook } from './lib/playbookGraphIO';
import { validatePlaybook, hasErrors } from './lib/playbookValidation';
import { publishPlaybookVersion } from './lib/playbookVersioning';
```

- [ ] **Step 5: Smoke-test**

- Open playbook → toolbar bovenaan zichtbaar met naam + version badge + Save/Publish
- Maak een playbook zonder trigger → toolbar toont "1 error", Publish disabled
- Voeg Manual start node toe → error verdwijnt → Publish enabled
- Klik Save draft → "Saving..." → terug naar "Save draft"
- Refresh browser → graph is nog steeds er
- Klik Publish v2 → "Publishing..." → alert "Gepubliceerd als v2"
- Version badge update naar v2
- Check in Supabase: `select * from playbook_versions` → 1 rij met snapshot

- [ ] **Step 6: Commit**

```bash
git add src/components/playbooks/panels/BuilderToolbar.jsx src/components/playbooks/lib/playbookVersioning.js src/components/playbooks/PlaybookFlowBuilder.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): BuilderToolbar + Save Draft + Publish + versionering

Top toolbar met naam, version-badge, validation-counter, Save Draft,
en Publish-knop (disabled bij errors). Publish creëert snapshot in
playbook_versions, incrementeert playbooks.version, zet status='active'.

Real-time validatie via useMemo op nodes/edges changes.

Plan 2, Task 13.
EOF
)"
```

---

## Task 14: Remove oude PlaybooksList + PlaybookDetail

**Files:**
- Delete: `src/components/playbooks/PlaybooksList.jsx`
- Delete: `src/components/playbooks/PlaybookDetail.jsx`
- Modify: `src/App.jsx` (verwijder imports indien aanwezig)

- [ ] **Step 1: Check waar oude files nog gebruikt worden**

```bash
grep -rn "PlaybooksList\|PlaybookDetail" src/ --exclude-dir=node_modules
```

Verwacht: alleen in `src/App.jsx` of nergens meer (afhankelijk van eerdere refactors).

- [ ] **Step 2: Verwijder imports uit App.jsx als ze er nog staan**

Als de grep imports tonen in `src/App.jsx`, verwijder de regels `import PlaybooksList from ...` en `import PlaybookDetail from ...`.

- [ ] **Step 3: Verwijder de oude files**

```bash
git rm src/components/playbooks/PlaybooksList.jsx src/components/playbooks/PlaybookDetail.jsx
```

- [ ] **Step 4: Smoke-test**

```bash
npm run dev
```
- Hele app moet nog laden zonder import-errors
- Playbooks-tab → Builder → werkt
- Andere views (Funnel/Tasks/Marketing/Admin) → werken

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): remove legacy PlaybooksList + PlaybookDetail

Oude lineaire step-builder files verwijderd; vervangen door
nieuwe PlaybooksHub + PlaybookFlowBuilder (graph-based). Bestaande
data is al gemigreerd in Plan 1.

Plan 2, Task 14.
EOF
)"
```

---

## Task 15: End-to-end smoke-test + cleanup

- [ ] **Step 1: Lokale full-flow test**

```bash
npm run dev
```

End-to-end scenario:
1. Open Playbooks tab → Builder
2. Maak nieuwe playbook: "Test Reactivation"
3. Drag trigger_stage_change naar canvas, klik 'm aan, kies stage = "sleeping"
4. Drag logic_wait erbij, days = 90
5. Drag action_email_draft erbij, subject = "Test", body = "Test body"
6. Connect: trigger → wait → email
7. Drag logic_end erbij, connect email → end
8. Save draft → success
9. Refresh browser → graph is identiek terug
10. Publish v2 → success
11. Verifieer in Supabase: `select * from playbook_versions where playbook_id = '...'` → 1 rij

- [ ] **Step 2: Production-build test**

```bash
npm run build
```
Expected: build slaagt zonder errors of warnings.

- [ ] **Step 3: Cleanup todo's**

Check `grep -rn "TODO\|FIXME" src/components/playbooks/` — verwacht: geen matches in nieuwe files.

- [ ] **Step 4: Commit (alleen als er iets te commiten is)**

Als alles werkt: geen commit nodig. Anders fix issues en commit individueel.

---

## Plan 2 — Eindstand

Bij voltooiing van alle 15 tasks:

✅ Visuele builder werkt: drag-from-palette, edit configs, connect met edges, branch-labels, validate, save draft, publish
✅ 14 node-types renderen correct met category-coding
✅ Graph state synchroniseert correct met Supabase (`playbook_nodes` + `playbook_edges`)
✅ Versionering: published versions als jsonb snapshot in `playbook_versions`
✅ Oude legacy files vervangen
✅ Production-build slaagt

**Volgende plan**: Plan 3 — Execution Engine + Drafts UI (graph-traversal cron, drafts-tabblad in hub, per-channel send via MS Graph/Unipile).

---

## Self-Review notes

**Spec coverage** (uit design doc sectie 5):
- ✅ React Flow vertical layout — Task 7
- ✅ Drag-drop nodes — Task 9
- ✅ 14 node-types — Task 4
- ✅ Property panel per node-type — Task 11
- ✅ Edge creation + branch-labels — Task 10
- ✅ Validation real-time — Task 12 + 13
- ✅ Save Draft + Publish + versionering — Task 13
- ⏳ Test-run mode — gedeferreerd naar Plan 3 (vereist execution engine)
- ⏳ Undo/Redo — gedeferreerd (React Flow heeft géén built-in undo; YAGNI in V1)
- ⏳ "12 active enrollments on v2" indicator in toolbar — gedeferreerd naar Plan 3 (vereist enrollment-data)

**Placeholder scan**: geen TBD/TODO. Alle code-blokken zijn concreet.

**Type consistency**:
- node `nodeType` field naam consistent gebruikt (niet `type` om verwarring met React Flow's eigen type-veld te voorkomen).
- config-fields gebruiken `key`/`label`/`type`/`required`/`options`.
- DB-mapping: `node_type` (snake) ↔ `nodeType` (camel) in code. Conversie alleen in `playbookGraphIO.js`.

**Out-of-scope geverifieerd**: geen execution-engine code, geen drafts UI, geen suggestion-system, geen signal-system. Allemaal voor latere plannen.
