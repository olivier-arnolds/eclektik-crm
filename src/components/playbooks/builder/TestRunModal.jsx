import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { traverseStep } from '../lib/playbookGraphTraversal';
import { substituteMergeFields, isAiMode, buildAiPrompt, getManualBody, getEmailSubject } from '../lib/draftGeneration';
import { apiFetch } from '../../../lib/apiFetch';

export default function TestRunModal({ playbookId, nodes, edges, onClose }) {
  const [contacts, setContacts] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);

  useEffect(() => {
    supabase.from('contacts').select('id, full_name, first_name, last_name, company_name, title')
      .order('full_name', { ascending: true }).limit(50)
      .then(({ data }) => setContacts(data || []));
  }, []);

  async function runSimulation() {
    if (!selectedContactId) return;
    setRunning(true);
    setLog([]);

    const contact = contacts.find(c => c.id === selectedContactId);
    const graph = {
      nodes: nodes.map(n => ({ id: n.id, node_type: n.data.nodeType, config: n.data.config || {}, pos_x: n.position.x, pos_y: n.position.y })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, condition_label: e.label || null })),
    };

    const trigger = graph.nodes.find(n => n.node_type.startsWith('trigger_'));
    if (!trigger) {
      setLog([{ level: 'error', msg: 'Geen trigger node gevonden.' }]);
      setRunning(false);
      return;
    }

    let enrollment = {
      id: 'test-' + Date.now(),
      current_node_id: trigger.id,
      enrolled_at: new Date().toISOString(),
      replied_at: null,
      next_action_at: null,
    };

    const ctx = { now: new Date(), contact, deal: null, company: null, owner: { first_name: 'OA' } };
    const logs = [{ level: 'info', msg: `Start simulation voor ${contact.full_name || contact.first_name}` }];

    for (let i = 0; i < 20; i++) {
      const result = traverseStep({ graph, enrollment, context: ctx });
      const node = graph.nodes.find(n => n.id === enrollment.current_node_id);

      if (result.action === 'complete') {
        logs.push({ level: 'success', msg: 'Playbook compleet.' });
        break;
      }
      if (result.action === 'error') {
        logs.push({ level: 'error', msg: 'Error: ' + result.error });
        break;
      }

      if (result.side_effect) {
        const eff = result.side_effect;
        if (eff.type.endsWith('_draft')) {
          const channel = eff.type.replace('action_', '').replace('_draft', '');
          let body;
          if (isAiMode(eff.config)) {
            const prompt = buildAiPrompt(eff.config, ctx);
            logs.push({ level: 'info', msg: `[${node.node_type}] AI-prompt resolved: ${prompt.slice(0, 100)}...` });
            try {
              const resp = await apiFetch('/api/anthropic-generate', {
                method: 'POST', headers: { 'Content-Type':'application/json' },
                body: JSON.stringify({ prompt, max_tokens: 400 }),
              });
              const data = await resp.json();
              body = data.text || '(geen output)';
            } catch (err) {
              body = `(AI-call failed: ${err.message})`;
            }
          } else {
            body = getManualBody(eff.config, ctx);
          }
          logs.push({ level: 'draft', msg: `[${channel.toUpperCase()} draft] ${eff.type === 'action_email_draft' ? `Subject: ${getEmailSubject(eff.config, ctx)}\n` : ''}${body}` });
        } else if (eff.type === 'action_internal_task') {
          logs.push({ level: 'info', msg: `[TASK] ${substituteMergeFields(eff.config.title, ctx)}` });
        } else if (eff.type === 'action_stage_update') {
          logs.push({ level: 'info', msg: `[STAGE UPDATE] → ${eff.config.new_stage}` });
        }
      } else if (result.action === 'wait_until') {
        logs.push({ level: 'info', msg: `[WAIT] tot ${new Date(result.next_action_at).toLocaleDateString('nl-NL')} — skip in simulation` });
      }

      if (!result.next_node_id) {
        logs.push({ level: 'info', msg: 'Geen volgende node — eind van pad.' });
        break;
      }
      enrollment.current_node_id = result.next_node_id;
      setLog([...logs]);
    }

    setLog(logs);
    setRunning(false);
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:8, padding:24, width:600, maxHeight:'80vh', overflowY:'auto' }}>
        <h2 style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Test-run playbook</h2>

        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, color:'#6b7280' }}>Test-contact</label>
          <select
            value={selectedContactId}
            onChange={e => setSelectedContactId(e.target.value)}
            disabled={running}
            style={{ width:'100%', padding:'6px 10px', fontSize:12, border:'0.5px solid #D3D1C7', borderRadius:4, marginTop:4 }}>
            <option value="">— kies contact —</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.full_name || `${c.first_name} ${c.last_name}`}</option>)}
          </select>
        </div>

        <button
          disabled={!selectedContactId || running}
          onClick={runSimulation}
          style={{ padding:'6px 14px', fontSize:12, background:'#14b8a6', color:'#fff', border:'none', borderRadius:4, cursor:'pointer', opacity:running?0.5:1 }}>
          {running ? 'Running...' : '▶ Run simulation'}
        </button>

        {log.length > 0 && (
          <div style={{ marginTop:16, background:'#0f172a', color:'#e2e8f0', padding:14, borderRadius:6, fontFamily:'monospace', fontSize:11, whiteSpace:'pre-wrap', maxHeight:300, overflowY:'auto' }}>
            {log.map((l, i) => (
              <div key={i} style={{ color: l.level==='error' ? '#fca5a5' : l.level==='success' ? '#86efac' : l.level==='draft' ? '#fcd34d' : '#e2e8f0' }}>
                {l.msg}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop:14, textAlign:'right' }}>
          <button onClick={onClose} style={{ padding:'6px 14px', fontSize:12, background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:4, cursor:'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
