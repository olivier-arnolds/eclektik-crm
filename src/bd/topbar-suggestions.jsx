import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

export default function TopbarSuggestions({ onOpenHub }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadCount();
    const channel = supabase
      .channel('topbar_suggestions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playbook_suggestions' }, () => loadCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (open) loadList();
  }, [open]);

  useEffect(() => {
    function clickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, [open]);

  async function loadCount() {
    const { count: c } = await supabase
      .from('playbook_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setCount(c || 0);
  }

  async function loadList() {
    const { data } = await supabase
      .from('playbook_suggestions')
      .select('*, playbooks(name), contacts(full_name, first_name, company_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);
    setSuggestions(data || []);
  }

  if (count === 0) return null;

  return (
    <div ref={dropdownRef} style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-ghost tiny"
        title="Playbook-suggesties"
        style={{ position:'relative' }}>
        ▶ Suggesties
        <span style={{
          position:'absolute', top:-4, right:-4,
          background:'#ec4899', color:'#fff', borderRadius:999,
          padding:'1px 5px', fontSize:9, fontWeight:600, minWidth:14, textAlign:'center',
        }}>{count}</span>
      </button>

      {open && (
        <div style={{
          position:'absolute', top:32, right:0, zIndex:50,
          background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:6,
          boxShadow:'0 8px 24px rgba(0,0,0,0.12)', padding:8,
          width:280,
        }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#374151', paddingBottom:6, borderBottom:'0.5px solid #f1f5f9', marginBottom:6 }}>
            Playbook-suggesties ({count})
          </div>
          {suggestions.map(s => (
            <div key={s.id} style={{ padding:6, borderRadius:4, marginBottom:2 }}>
              <div style={{ fontSize:11, fontWeight:500 }}>▶ {s.playbooks?.name}</div>
              <div style={{ fontSize:10, color:'#6b7280', marginTop:2 }}>
                {s.contacts?.full_name || s.contacts?.first_name || '?'} {s.contacts?.company_name && `· ${s.contacts.company_name}`}
              </div>
            </div>
          ))}
          <button
            onClick={() => { setOpen(false); onOpenHub?.(); }}
            style={{ width:'100%', padding:'6px', marginTop:6, background:'#f8fafc', border:'0.5px solid #D3D1C7', borderRadius:4, fontSize:11, cursor:'pointer' }}>
            Alle suggesties bekijken
          </button>
        </div>
      )}
    </div>
  );
}
