import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';

export default function RunningTab() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('playbook_enrollments')
      .select('*, contacts(full_name, first_name, last_name), playbooks(name, version)')
      .in('status', ['active', 'awaiting_review'])
      .order('enrolled_at', { ascending: false })
      .then(({ data }) => { setEnrollments(data || []); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#888780' }}>Loading...</div>;
  if (enrollments.length === 0) return <div style={{ padding:40, textAlign:'center', color:'#888780', fontSize:13 }}>Geen lopende enrollments.</div>;

  return (
    <div style={{ padding:20, maxWidth:900, margin:'0 auto' }}>
      <h2 style={{ fontSize:14, marginBottom:14 }}>Lopende enrollments ({enrollments.length})</h2>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {enrollments.map(e => (
          <div key={e.id} style={{ background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:6, padding:12, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{e.contacts?.full_name || `${e.contacts?.first_name} ${e.contacts?.last_name}`}</div>
              <div style={{ fontSize:10, color:'#888780', marginTop:2 }}>
                {e.playbooks?.name} v{e.playbooks?.version} · status: {e.status}
                {e.next_action_at && ` · next: ${new Date(e.next_action_at).toLocaleDateString('nl-NL')}`}
              </div>
            </div>
            <div style={{ fontSize:11, color:'#888780' }}>{new Date(e.enrolled_at).toLocaleDateString('nl-NL')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
