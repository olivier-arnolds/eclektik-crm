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

  // Rule 3b: voor draft-action nodes: body OR ai_prompt moet gevuld zijn (conditioneel op use_ai)
  for (const n of nodes) {
    const def = NODE_TYPES[n.data.nodeType];
    if (!def) continue;
    const isDraftAction = ['action_email_draft','action_linkedin_draft','action_whatsapp_draft','action_instagram_draft'].includes(n.data.nodeType);
    if (!isDraftAction) continue;
    const config = n.data.config || {};
    const useAi = config.use_ai || 'manual';
    if (useAi === 'manual' && !config.body) {
      issues.push({ severity: 'error', nodeId: n.id, message: `${def.label}: 'Body' is verplicht bij manual-modus.` });
    }
    if (useAi === 'ai' && !config.ai_prompt) {
      issues.push({ severity: 'error', nodeId: n.id, message: `${def.label}: 'AI prompt template' is verplicht bij ai-modus.` });
    }
    if (n.data.nodeType === 'action_email_draft' && !config.subject) {
      issues.push({ severity: 'error', nodeId: n.id, message: `${def.label}: 'Onderwerp' is verplicht.` });
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
