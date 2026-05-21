// Publishing-logic: snapshot huidige graph naar playbook_versions tabel.

import { supabase } from '../../../supabase';

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
