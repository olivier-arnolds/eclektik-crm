import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';

export default function SuggestionsTab() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    const channel = supabase
      .channel('playbook_suggestions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playbook_suggestions' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filter]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('playbook_suggestions')
      .select(`
        *,
        playbooks(name),
        contacts(full_name, first_name, last_name, company_name)
      `)
      .eq('status', filter)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) { console.error(error); setLoading(false); return; }
    setSuggestions(data || []);
    setLoading(false);
  }

  async function handleStart(suggestion) {
    const { data: pb } = await supabase
      .from('playbooks')
      .select('version')
      .eq('id', suggestion.playbook_id)
      .single();

    const { data: triggerNode } = await supabase
      .from('playbook_nodes')
      .select('id')
      .eq('playbook_id', suggestion.playbook_id)
      .like('node_type', 'trigger_%')
      .limit(1)
      .single();

    if (!triggerNode) {
      alert('Geen trigger-node gevonden in playbook - kan niet starten.');
      return;
    }

    const { data: enrollment, error } = await supabase
      .from('playbook_enrollments')
      .insert({
        playbook_id: suggestion.playbook_id,
        contact_id: suggestion.contact_id,
        current_node_id: triggerNode.id,
        version_at_start: pb.version,
        status: 'active',
        next_action_at: new Date().toISOString(),
        source_context: suggestion.source_context,
      })
      .select()
      .single();

    if (error) { alert('Enrollment-creatie faalde: ' + error.message); return; }

    await supabase.from('playbook_suggestions')
      .update({
        status: 'started',
        enrollment_id: enrollment.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', suggestion.id);

    load();
  }

  async function handleDismiss(suggestion) {
    await supabase.from('playbook_suggestions')
      .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
      .eq('id', suggestion.id);
    load();
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#888780' }}>Loading...</div>;

  return (
    <div style={{ padding:20, maxWidth:900, margin:'0 auto' }}>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['pending','started','dismissed','expired'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'6px 12px', fontSize:11, fontFamily:'inherit',
            background: filter===f ? '#14b8a6' : '#fff', color: filter===f ? '#fff' : '#374151',
            border:'0.5px solid #D3D1C7', borderRadius:4, cursor:'pointer', textTransform:'capitalize',
          }}>{f}</button>
        ))}
      </div>

      {suggestions.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'#888780', fontSize:12 }}>
          Geen suggesties in deze status.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {suggestions.map(s => (
            <div key={s.id} style={{ background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:6, padding:14 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>
                    {s.playbooks?.name || 'Onbekende playbook'}
                  </div>
                  <div style={{ fontSize:11, color:'#374151', marginTop:4 }}>
                    {s.contacts
                      ? `${s.contacts.full_name || s.contacts.first_name} (${s.contacts.company_name || '?'})`
                      : (s.source_context?.signal_topics?.length > 0
                          ? `Topics: ${s.source_context.signal_topics.slice(0, 3).join(', ')}`
                          : 'Company-post suggestie')}
                  </div>
                  <div style={{ fontSize:10, color:'#888780', marginTop:6 }}>
                    Bron: {s.source}
                    {s.source_context?.signal_reason && ` - ${s.source_context.signal_reason}`}
                    {s.source_context?.from_stage && ` - ${s.source_context.from_stage} -> ${s.source_context.to_stage}`}
                    {' - '}{new Date(s.created_at).toLocaleString('nl-NL')}
                  </div>
                  {s.source_context?.signal_content && (
                    <div style={{ background:'#f8fafc', padding:8, borderRadius:4, marginTop:8, fontSize:11, color:'#475569', fontStyle:'italic' }}>
                      "{s.source_context.signal_content.slice(0, 200)}{s.source_context.signal_content.length > 200 ? '...' : ''}"
                    </div>
                  )}
                </div>
                {s.status === 'pending' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <button onClick={() => handleStart(s)} style={{ padding:'4px 12px', fontSize:11, background:'#14b8a6', color:'#fff', border:'none', borderRadius:4, cursor:'pointer', fontWeight:600 }}>Start</button>
                    <button onClick={() => handleDismiss(s)} style={{ padding:'4px 12px', fontSize:11, background:'#fff', color:'#888780', border:'0.5px solid #D3D1C7', borderRadius:4, cursor:'pointer' }}>Niet nu</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
