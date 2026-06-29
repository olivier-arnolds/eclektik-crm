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

// Welke handles (verbindingspunten) een relatie gebruikt. Hiërarchie loopt
// verticaal (onder -> boven), peers horizontaal (rechts -> links). Hierdoor
// hoeven we de handles niet apart op te slaan: ze volgen uit rel_type.
export function handlesFor(relType) {
  return relType === 'peer'
    ? { sourceHandle: 'right', targetHandle: 'left' }
    : { sourceHandle: 'bottom', targetHandle: 'top' };
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
    ...handlesFor(relType),
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
