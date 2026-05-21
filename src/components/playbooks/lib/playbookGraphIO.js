// Load/save helpers voor playbook graph data tussen Supabase en React Flow state.
//
// React Flow state shape:
//   nodes: [{ id, type:'custom', position:{x,y}, data:{ nodeType, config, label } }]
//   edges: [{ id, source, target, label?, data?:{ condition_expr } }]
//
// Supabase shape:
//   playbook_nodes: { id, playbook_id, node_type, config, pos_x, pos_y }
//   playbook_edges: { id, playbook_id, source_node_id, target_node_id, condition_label, condition_expr }

import { supabase } from '../../../supabase';

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
