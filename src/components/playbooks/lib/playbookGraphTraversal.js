// Pure graph-traversal logic for playbook execution engine.
//
// Geen DB-toegang, geen side-effects — alleen graph + state in, decisions out.
// Hierdoor testbaar in isolatie + bruikbaar voor zowel runtime (cron) als
// test-run (dry-run modus) in de builder.
//
// Input:
//   graph: { nodes: [...], edges: [...] }  — uit playbook_versions snapshot
//   enrollment: { current_node_id, replied_at, version_at_start, enrolled_at, next_action_at }
//   context: { now: Date, contact: {...}, deal: {...}, signal_context?: string }
//
// Output:
//   { action: 'noop' | 'execute_node' | 'wait_until' | 'complete' | 'error',
//     next_node_id?, next_action_at?, error?, side_effect? }

export function traverseStep({ graph, enrollment, context }) {
  if (!enrollment.current_node_id) {
    return { action: 'error', error: 'enrollment has no current_node_id' };
  }

  const currentNode = graph.nodes.find(n => n.id === enrollment.current_node_id);
  if (!currentNode) {
    return { action: 'error', error: `current node ${enrollment.current_node_id} not found in graph` };
  }

  const nodeType = currentNode.node_type;
  const config = currentNode.config || {};

  // ===== Logic: end =====
  if (nodeType === 'logic_end') {
    return { action: 'complete' };
  }

  // ===== Logic: wait =====
  if (nodeType === 'logic_wait') {
    const days = Number(config.days) || 0;
    const nextActionAt = new Date(context.now.getTime() + days * 86400 * 1000);
    const outgoingEdges = graph.edges.filter(e => e.source === currentNode.id);
    if (outgoingEdges.length === 0) return { action: 'complete' };
    return {
      action: 'wait_until',
      next_node_id: outgoingEdges[0].target,
      next_action_at: nextActionAt.toISOString(),
    };
  }

  // ===== Logic: wait-until-or =====
  if (nodeType === 'logic_wait_until_or') {
    const maxDays = Number(config.max_days) || 0;
    const eventType = config.event_type;
    const outgoingEdges = graph.edges.filter(e => e.source === currentNode.id);

    // Convention: edge with condition_label === 'event' is event-path, 'timeout' is timeout-path.
    // Else: first edge is event-path, second is timeout-path.
    const eventEdge = outgoingEdges.find(e => e.condition_label === 'event') || outgoingEdges[0];
    const timeoutEdge = outgoingEdges.find(e => e.condition_label === 'timeout') || outgoingEdges[1];

    const eventHappened = checkEvent(eventType, enrollment, context);
    if (eventHappened) {
      return { action: 'execute_node', next_node_id: eventEdge?.target || null };
    }

    const enteredAt = new Date(enrollment.next_action_at || enrollment.enrolled_at);
    const timeoutAt = new Date(enteredAt.getTime() + maxDays * 86400 * 1000);
    if (context.now >= timeoutAt) {
      return { action: 'execute_node', next_node_id: timeoutEdge?.target || null };
    }

    return { action: 'wait_until', next_node_id: currentNode.id, next_action_at: timeoutAt.toISOString() };
  }

  // ===== Logic: branch =====
  if (nodeType === 'logic_branch') {
    const conditionType = config.condition_type;
    const outgoingEdges = graph.edges.filter(e => e.source === currentNode.id);

    if (conditionType === 'event_check') {
      const yesEdge = outgoingEdges.find(e => e.condition_label === 'ja' || e.condition_label === 'yes');
      const noEdge = outgoingEdges.find(e => e.condition_label === 'nee' || e.condition_label === 'no');
      const result = checkEvent(config.condition_field, enrollment, context);
      return { action: 'execute_node', next_node_id: (result ? yesEdge?.target : noEdge?.target) || outgoingEdges[0]?.target };
    }

    if (conditionType === 'time_check') {
      const enteredAt = new Date(enrollment.enrolled_at);
      const daysPassed = (context.now - enteredAt) / (86400 * 1000);
      const threshold = Number(config.condition_value) || 0;
      const result = daysPassed >= threshold;
      const yesEdge = outgoingEdges.find(e => e.condition_label === 'ja' || e.condition_label === 'yes');
      const noEdge = outgoingEdges.find(e => e.condition_label === 'nee' || e.condition_label === 'no');
      return { action: 'execute_node', next_node_id: (result ? yesEdge?.target : noEdge?.target) || outgoingEdges[0]?.target };
    }

    // field_compare = V2 — for now: default to first edge
    return { action: 'execute_node', next_node_id: outgoingEdges[0]?.target };
  }

  // ===== Action nodes (draft generation, task creation, etc.) =====
  if (nodeType.startsWith('action_')) {
    const outgoingEdges = graph.edges.filter(e => e.source === currentNode.id);
    const nextNode = outgoingEdges[0]?.target;
    return {
      action: 'execute_node',
      next_node_id: nextNode,
      side_effect: { type: nodeType, config, node_id: currentNode.id },
    };
  }

  // ===== Trigger nodes (just pass through) =====
  if (nodeType.startsWith('trigger_')) {
    const outgoingEdges = graph.edges.filter(e => e.source === currentNode.id);
    return { action: 'execute_node', next_node_id: outgoingEdges[0]?.target };
  }

  return { action: 'error', error: `unknown node_type: ${nodeType}` };
}

function checkEvent(eventType, enrollment, context) {
  if (eventType === 'reply_received' || eventType === 'linkedin_reply' || eventType === 'any_inbound') {
    return !!enrollment.replied_at;
  }
  // email_opened: niet ondersteund in V1 (geen Graph webhook)
  return false;
}
