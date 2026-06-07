import { useState, useEffect, useRef } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

// SharePoint / external document links (SOWs, proposals, …).
// Two modes:
//   account mode: <DocLinksSection accountId={id} />            → general account docs
//   deal mode:    <DocLinksSection dealTable="opportunities" dealId={id} accountId={optional} />
// Links open in a new browser window; each link can be deleted.
export default function DocLinksSection({ accountId, dealTable, dealId, label = 'Documents', compact = false }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const dealMode = !!dealId;

  useEffect(() => {
    if (!accountId && !dealId) return;
    setLoading(true);
    let q = supabase.from('document_links').select('id, label, url, created_at');
    if (dealMode) q = q.eq('deal_table', dealTable).eq('deal_id', dealId);
    else q = q.eq('account_id', accountId).is('deal_id', null);
    q.order('created_at', { ascending: false }).then(({ data, error }) => {
      if (!error) setLinks(data || []);
      setLoading(false);
    });
  }, [accountId, dealTable, dealId, dealMode]);

  const addLink = async (lbl, url) => {
    const clean = (url || '').trim();
    if (!clean) return;
    const href = /^https?:\/\//i.test(clean) ? clean : 'https://' + clean;
    const row = {
      account_id: accountId || null,
      deal_table: dealMode ? dealTable : null,
      deal_id: dealMode ? dealId : null,
      label: (lbl || '').trim() || 'Document',
      url: href,
      created_by: localStorage.getItem('user_first_name') || 'MVG',
    };
    const { data, error } = await supabase.from('document_links').insert(row).select().single();
    if (error) { alert('Failed to add link: ' + error.message); return; }
    setLinks(prev => [data, ...prev]);
    setShowAdd(false);
  };

  const removeLink = async (id) => {
    if (!confirm('Delete this document link?')) return;
    const { error } = await supabase.from('document_links').delete().eq('id', id);
    if (error) { alert('Failed to delete: ' + error.message); return; }
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const body = (
    <>
      {loading && <div className="empty" style={{ padding: '6px 0', textAlign: 'left' }}>Loading…</div>}
      {!loading && links.length === 0 && !showAdd && (
        <div className="empty" style={{ padding: '6px 0', textAlign: 'left' }}>No documents linked</div>
      )}
      {showAdd && <AddLinkForm onAdd={addLink} onCancel={() => setShowAdd(false)} />}
      {links.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: showAdd ? 6 : 0 }}>
          {links.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 5, background: 'var(--fill-1)' }}>
              <span style={{ fontSize: 12 }}>📄</span>
              <a href={l.url} target="_blank" rel="noopener noreferrer"
                title={l.url}
                style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {l.label}
              </a>
              <button className="icon-btn tiny" style={{ color: 'var(--danger)' }}
                onClick={() => removeLink(l.id)} title="Delete link">
                <I.close />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (compact) {
    // Deal mode: lightweight block (no collapsible section chrome).
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label} · {links.length}
          </span>
          <button className="btn-ghost tiny" onClick={() => setShowAdd(p => !p)}><I.plus /> Add</button>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Section label={`${label} · ${links.length}`}
      actions={<button className="btn-ghost tiny" onClick={() => setShowAdd(p => !p)}><I.plus /> Add</button>}>
      {body}
    </Section>
  );
}

function AddLinkForm({ onAdd, onCancel }) {
  const [lbl, setLbl] = useState('');
  const [url, setUrl] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const inputStyle = {
    width: '100%', padding: '6px 8px', borderRadius: 5,
    border: '0.5px solid var(--sep)', background: 'var(--bg-1)',
    color: 'var(--text-1)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
  };
  const submit = () => { if (url.trim()) onAdd(lbl, url); };
  return (
    <div style={{ border: '0.5px solid var(--accent)', borderRadius: 6, padding: 8, marginBottom: 8, background: 'var(--fill-1)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input ref={ref} value={lbl} onChange={e => setLbl(e.target.value)}
        placeholder="Name (e.g. SOW 2026, Proposal v2)" style={inputStyle}
        onKeyDown={e => { if (e.key === 'Escape') onCancel(); }} />
      <input value={url} onChange={e => setUrl(e.target.value)}
        placeholder="Paste SharePoint link…" style={inputStyle}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button className="btn-ghost tiny" onClick={onCancel}>Cancel</button>
        <button className="btn-ghost tiny" style={{ color: 'var(--accent)' }} onClick={submit} disabled={!url.trim()}>Add link</button>
      </div>
    </div>
  );
}

function Section({ label, actions, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="acc-section">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="acc-section-head" style={{ flex: 1 }} onClick={() => setOpen(o => !o)}>
          {open ? <I.chevronD /> : <I.chevronR />}
          <span>{label}</span>
        </button>
        {actions && <div style={{ display: 'flex', gap: 4, paddingRight: 14 }}>{actions}</div>}
      </div>
      {open && <div className="acc-section-body">{children}</div>}
    </div>
  );
}
