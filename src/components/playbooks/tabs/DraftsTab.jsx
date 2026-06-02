import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { sendDraft } from '../lib/sendChannels';

export default function DraftsTab() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('playbook_drafts')
      .select('*, contacts(*), playbook_nodes(node_type, config), playbook_enrollments(playbook_id, playbooks(name))')
      .eq('status', 'pending')
      .order('generated_at', { ascending: false });
    if (error) { setError(error.message); setLoading(false); return; }
    setDrafts(data || []);
    if (data?.length > 0 && !selectedId) setSelectedId(data[0].id);
    setLoading(false);
  }

  const selected = drafts.find(d => d.id === selectedId);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#888780' }}>Loading...</div>;
  if (error) return <div style={{ padding:40, color:'#dc2626' }}>Error: {error}</div>;
  if (drafts.length === 0) return <div style={{ padding:40, textAlign:'center', color:'#888780', fontSize:13 }}>Geen drafts wachtend op review.</div>;

  return (
    <div style={{ display:'flex', height:'100%' }}>
      <div style={{ width:300, borderRight:'0.5px solid #D3D1C7', overflowY:'auto', background:'#fff' }}>
        {drafts.map(d => {
          const isSelected = d.id === selectedId;
          const ageHours = Math.round((Date.now() - new Date(d.generated_at).getTime()) / 3600000);
          const stale = ageHours > 120;
          return (
            <div key={d.id} onClick={() => setSelectedId(d.id)} style={{
              padding:'10px 14px',
              borderBottom:'0.5px solid #f1f5f9',
              cursor:'pointer',
              background: isSelected ? '#f0fdfa' : (stale ? '#fef9c3' : '#fff'),
              borderLeft: isSelected ? '3px solid #14b8a6' : '3px solid transparent',
            }}>
              <div style={{ fontSize:10, color:'#92400e', fontWeight:600 }}>
                {d.channel.toUpperCase()} {stale && '· STALE'}
              </div>
              <div style={{ fontSize:12, fontWeight:500, marginTop:2 }}>{d.contacts?.full_name || d.contacts?.first_name || 'Unknown'}</div>
              <div style={{ fontSize:10, color:'#6b7280', marginTop:2 }}>{d.playbook_enrollments?.playbooks?.name}</div>
              <div style={{ fontSize:9, color:'#9ca3af', marginTop:2 }}>{ageHours}u geleden</div>
            </div>
          );
        })}
      </div>
      <div style={{ flex:1, padding:20, overflowY:'auto', background:'#fafafa' }}>
        {selected ? (
          <DraftPreview draft={selected} onAction={load} />
        ) : (
          <div style={{ color:'#888780', fontSize:12 }}>Selecteer een draft.</div>
        )}
      </div>
    </div>
  );
}

function DraftPreview({ draft, onAction }) {
  const [body, setBody] = useState(draft.body || '');
  const [subject, setSubject] = useState(draft.subject || '');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setBody(draft.body || '');
    setSubject(draft.subject || '');
  }, [draft.id]);

  async function handleSave() {
    await supabase.from('playbook_drafts')
      .update({ body, subject, edited_at: new Date().toISOString() })
      .eq('id', draft.id);
  }

  async function handleSkip() {
    if (!confirm('Skip deze step?')) return;
    setSending(true);
    await supabase.from('playbook_drafts')
      .update({ status: 'skipped', resolved_at: new Date().toISOString() })
      .eq('id', draft.id);
    await supabase.from('playbook_enrollments')
      .update({ status: 'active', next_action_at: new Date().toISOString() })
      .eq('id', draft.enrollment_id);
    onAction();
    setSending(false);
  }

  return (
    <div>
      <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>
        {draft.channel.toUpperCase()} draft → {draft.contacts?.full_name}
      </div>

      {draft.channel === 'email' && (
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:10, color:'#6b7280', textTransform:'uppercase', fontWeight:600 }}>Subject</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onBlur={handleSave}
            style={{ width:'100%', padding:'6px 10px', fontSize:12, border:'0.5px solid #D3D1C7', borderRadius:4, marginTop:4, fontFamily:'inherit' }}
          />
        </div>
      )}

      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:10, color:'#6b7280', textTransform:'uppercase', fontWeight:600 }}>Body</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onBlur={handleSave}
          rows={14}
          style={{ width:'100%', padding:'8px 12px', fontSize:12, border:'0.5px solid #D3D1C7', borderRadius:4, marginTop:4, fontFamily:'inherit', resize:'vertical' }}
        />
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <button
          disabled={sending}
          onClick={async () => {
            setSending(true);
            try {
              await handleSave();
              await sendDraft({ ...draft, body, subject });
              onAction();
            } catch (err) {
              alert('Send failed: ' + err.message);
            } finally {
              setSending(false);
            }
          }}
          style={{ padding:'8px 16px', background:'#14b8a6', color:'#fff', border:'none', borderRadius:4, fontSize:12, fontWeight:600, cursor: sending ? 'not-allowed' : 'pointer' }}>
          ▶ Verzend
        </button>
        <button
          disabled={sending}
          onClick={handleSkip}
          style={{ padding:'8px 16px', background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:4, fontSize:12, cursor:'pointer' }}>
          Skip step
        </button>
      </div>
    </div>
  );
}
