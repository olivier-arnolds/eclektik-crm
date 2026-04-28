import { useState, useEffect } from 'react';
import { I, fmtFull, fmtMoney, OwnerDot, STAGE_TINT } from './atoms';
import { supabase } from '../supabase';
import DOMPurify from 'dompurify';
import { updateRow } from '../hooks/useSupabase';
import TypePicker from './type-picker';

// Inline editable field — click to edit, blur/Enter to save.
export function InlineField({ label, value, onSave, type = 'text', colspan }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(value || ''); }, [value]);

  const commit = async () => {
    setEditing(false);
    if ((draft || '') === (value || '')) return;
    setSaving(true);
    await onSave(draft || null);
    setSaving(false);
  };

  const labelEl = (
    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
      {label}{saving && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>…</span>}
    </div>
  );

  const input = editing ? (
    type === 'textarea' ? (
      <textarea autoFocus rows={3} value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); } }}
        style={fieldInputStyle} />
    ) : (
      <input autoFocus type={type} value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); } }}
        style={fieldInputStyle} />
    )
  ) : type === 'url' && value ? (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 6px', borderRadius: 4, minHeight: 20,
      border: '0.5px solid transparent',
    }}>
      <a href={value.startsWith('http') ? value : `https://${value}`}
        target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
        {value}
      </a>
      <button onClick={() => setEditing(true)}
        title="Edit"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 10, padding: 2, fontFamily: 'var(--font-mono)' }}>
        edit
      </button>
    </div>
  ) : (
    <div onClick={() => setEditing(true)}
      style={{
        fontSize: 12, color: value ? 'var(--text-1)' : 'var(--text-3)',
        padding: '4px 6px', borderRadius: 4, cursor: 'text',
        minHeight: 20, whiteSpace: 'pre-wrap',
        border: '0.5px solid transparent',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {value || <span style={{ fontStyle: 'italic' }}>Click to edit…</span>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, ...(colspan === 2 ? { gridColumn: 'span 2' } : {}) }}>
      {labelEl}
      {input}
    </div>
  );
}

const fieldInputStyle = {
  width: '100%', padding: '4px 6px', borderRadius: 4,
  border: '0.5px solid var(--sep)', background: 'var(--bg-1)',
  color: 'var(--text-1)', fontSize: 12, outline: 'none',
  fontFamily: 'var(--font)', boxSizing: 'border-box', resize: 'vertical',
};

// Inline expand contents for a contact
export function InlineContactDetail({ contactId, onCompose, refetch }) {
  const [row, setRow] = useState(null);
  const [saving, setSaving] = useState({});
  const [loading, setLoading] = useState(true);
  const [allAccounts, setAllAccounts] = useState([]);
  const [linkedAccounts, setLinkedAccounts] = useState([]); // [{ id, link_type, account: { id, name, type } }]

  useEffect(() => {
    if (!contactId) return;
    setLoading(true);
    supabase.from('contacts').select('*, companies(name, linkedin_url, website)').eq('id', contactId).single()
      .then(({ data }) => { setRow(data); setLoading(false); });
    supabase.from('companies').select('id,name,type').neq('stage', 'Inactive').order('name')
      .then(({ data }) => setAllAccounts(data || []));
    // Other accounts this contact is linked to (as partner or eclectik team)
    supabase.from('account_links')
      .select('id, link_type, account_id, role, companies:account_id(id, name, type)')
      .eq('contact_id', contactId)
      .then(({ data }) => setLinkedAccounts((data || []).filter(l => l.companies)));
  }, [contactId]);

  const saveField = async (field, value) => {
    setSaving(s => ({ ...s, [field]: true }));
    const { error } = await supabase.from('contacts').update({ [field]: value }).eq('id', contactId);
    setSaving(s => ({ ...s, [field]: false }));
    if (!error) setRow(r => ({ ...r, [field]: value }));
  };

  const moveToAccount = async (newCompanyId) => {
    // Also update company_name so the legacy text field stays in sync
    const newAcc = allAccounts.find(a => a.id === newCompanyId);
    setSaving(s => ({ ...s, company_id: true }));
    const { error } = await supabase.from('contacts').update({
      company_id: newCompanyId || null,
      company_name: newAcc?.name || null,
    }).eq('id', contactId);
    setSaving(s => ({ ...s, company_id: false }));
    if (!error) {
      setRow(r => ({ ...r, company_id: newCompanyId, company_name: newAcc?.name || null, companies: newAcc ? { name: newAcc.name } : null }));
    }
  };

  if (loading || !row) return <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Loading…</div>;

  const linkedinSearch = () => {
    const company = row.companies?.name || row.company_name || '';
    const slugMatch = (row.companies?.linkedin_url || '').match(/linkedin\.com\/company\/([^\/\?]+)/);
    const slug = slugMatch ? slugMatch[1] : '';
    const keywords = [row.full_name, slug || company].filter(Boolean).join(' ');
    window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`, '_blank', 'noopener,width=1000,height=700');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      <div style={{ gridColumn: 'span 2' }}>
        <CompanyPicker
          value={row.company_id}
          label={row.companies?.name || row.company_name || '— no account linked —'}
          accounts={allAccounts}
          saving={saving.company_id}
          onChange={moveToAccount}
        />
      </div>
      <InlineField label="First name" value={row.first_name} onSave={v => saveField('first_name', v)} />
      <InlineField label="Last name" value={row.last_name} onSave={v => saveField('last_name', v)} />
      <InlineField label="Email" value={row.email} onSave={v => saveField('email', v)} type="email" colspan={2} />
      <InlineField label="Phone" value={row.phone} onSave={v => saveField('phone', v)} />
      <InlineField label="Mobile" value={row.mobile} onSave={v => saveField('mobile', v)} />
      <InlineField label="Role / title" value={row.title} onSave={v => saveField('title', v)} colspan={2} />
      <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            title="Search this person on LinkedIn"
            onClick={linkedinSearch}
            style={{ cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 2 }}>
            LinkedIn URL
          </span>
        </div>
        <InlineField label="" value={row.linkedin_url} type="url" onSave={v => saveField('linkedin_url', v)} />
      </div>
      <InlineField label="Notes" value={row.notes} onSave={v => saveField('notes', v)} type="textarea" colspan={2} />

      {linkedAccounts.length > 0 && (
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            Also linked to · {linkedAccounts.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {linkedAccounts.map(l => (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 8px', borderRadius: 5,
                border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
                fontSize: 12,
              }}>
                <span style={{ flex: 1, color: 'var(--text-1)' }}>{l.companies.name}</span>
                <span style={{
                  fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: 'var(--text-3)',
                  padding: '1px 5px', borderRadius: 3, background: 'var(--bg-2)',
                }}>
                  {l.link_type === 'partner' ? 'partner' : l.link_type === 'eclectik_team' ? 'eclectik' : l.link_type}
                </span>
                {l.companies.type && <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{l.companies.type}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ gridColumn: 'span 2', marginTop: 4, display: 'flex', gap: 6, alignItems: 'center', borderTop: '0.5px solid var(--sep)', paddingTop: 8 }}>
        {row.email && onCompose && (
          <button className="btn-primary tiny" onClick={() => onCompose({ to: row.email, contact: row })}>
            <I.send /> Email
          </button>
        )}
        <button className="btn-ghost tiny" style={{ marginLeft: 'auto', color: 'var(--danger)' }}
          onClick={async () => {
            const reason = prompt(`Inactivate ${row.full_name || 'this contact'}?\n\nOptional reason (e.g. duplicate, left company, unsubscribed):`, '');
            if (reason === null) return; // cancelled
            const { error } = await supabase.from('contacts').update({
              stage: 'Inactive',
              inactive_reason: reason.trim() || 'Manually inactivated',
              inactivated_at: new Date().toISOString(),
            }).eq('id', contactId);
            if (error) { alert('Failed: ' + error.message); return; }
            setRow(r => ({ ...r, stage: 'Inactive' }));
            if (refetch) refetch();
          }}>
          <I.archive /> Inactivate
        </button>
      </div>
    </div>
  );
}

// Picker to link/move a contact to a different account (company).
// Type to search; click to select; clear with the × on the selected chip.
function CompanyPicker({ value, label, accounts, onChange, saving }) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = (accounts || []).filter(a => {
    if (!query) return true;
    const q = query.toLowerCase();
    return a.name.toLowerCase().includes(q) || (a.type || '').toLowerCase().includes(q);
  }).slice(0, 20);

  const pick = (id) => {
    onChange(id);
    setEditing(false);
    setQuery('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Account</span>
        {saving && <span style={{ color: 'var(--accent)' }}>…</span>}
        {value && !editing && (
          <button onClick={(e) => { e.stopPropagation(); if (confirm('Unlink from this account?')) onChange(null); }}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: 0 }}>
            × unlink
          </button>
        )}
      </div>
      {editing ? (
        <div style={{ border: '0.5px solid var(--accent)', borderRadius: 6, padding: 6, background: 'var(--fill-1)' }}>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search accounts by name or type…"
            onKeyDown={e => { if (e.key === 'Escape') { setEditing(false); setQuery(''); } }}
            style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 4 }} />
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', padding: 6 }}>No matches</div>}
            {filtered.map(a => (
              <div key={a.id} onClick={() => pick(a.id)}
                style={{ padding: '5px 8px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: 12, color: 'var(--text-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                {a.type && <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{a.type}</div>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={() => { setEditing(false); setQuery(''); }} className="btn-ghost tiny">Cancel</button>
          </div>
        </div>
      ) : (
        <div onClick={() => setEditing(true)}
          style={{
            fontSize: 12, color: value ? 'var(--text-1)' : 'var(--text-3)',
            padding: '5px 8px', borderRadius: 5, cursor: 'pointer',
            border: '0.5px solid transparent',
            fontStyle: value ? 'normal' : 'italic',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {label} <span style={{ color: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)', marginLeft: 4 }}>→ click to change</span>
        </div>
      )}
    </div>
  );
}

// Parent account picker: select an existing account as the parent of
// the current account. Shows current parent as a clickable chip that
// navigates to that account.
function ParentAccountPicker({ value, parent, parentNameFallback, accounts, currentAccountId, onChange, onOpenParent, saving }) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = (accounts || []).filter(a => {
    if (a.id === currentAccountId) return false; // can't parent to self
    if (!query) return true;
    const q = query.toLowerCase();
    return a.name.toLowerCase().includes(q) || (a.type || '').toLowerCase().includes(q);
  }).slice(0, 20);

  const pick = (id) => {
    onChange(id);
    setEditing(false);
    setQuery('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Parent account</span>
        {saving && <span style={{ color: 'var(--accent)' }}>…</span>}
        {value && !editing && (
          <button onClick={(e) => { e.stopPropagation(); if (confirm('Remove parent link?')) onChange(null); }}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: 0 }}>
            × unlink
          </button>
        )}
      </div>
      {editing ? (
        <div style={{ border: '0.5px solid var(--accent)', borderRadius: 6, padding: 6, background: 'var(--fill-1)' }}>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search parent account…"
            onKeyDown={e => { if (e.key === 'Escape') { setEditing(false); setQuery(''); } }}
            style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 4 }} />
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', padding: 6 }}>No matches</div>}
            {filtered.map(a => (
              <div key={a.id} onClick={() => pick(a.id)}
                style={{ padding: '5px 8px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: 12, color: 'var(--text-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                {a.type && <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{a.type}</div>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={() => { setEditing(false); setQuery(''); }} className="btn-ghost tiny">Cancel</button>
          </div>
        </div>
      ) : parent ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 5 }}>
          <button onClick={() => onOpenParent && onOpenParent(parent)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, padding: 0, textAlign: 'left', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title="Open parent account">
            → {parent.name}
          </button>
          {parent.type && <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{parent.type}</span>}
          <button onClick={() => setEditing(true)} className="btn-ghost tiny">Change</button>
        </div>
      ) : (
        <div onClick={() => setEditing(true)}
          style={{
            fontSize: 12, color: 'var(--text-3)',
            padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontStyle: 'italic',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {parentNameFallback ? `${parentNameFallback} (not linked) — click to link` : 'Click to link a parent…'}
        </div>
      )}
    </div>
  );
}

// Inline expand contents for a meeting (shows body + notes + add-note).
// Notes are stored against dedup_key so all users see the same shared notes
// for a given meeting (regardless of who synced it).
export function InlineMeetingDetail({ event, companyId, dedupKey, onRefresh }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  // Graph event id without "graph:" prefix, for backward-compat with older notes
  const graphEventId = typeof event?.id === 'string' ? event.id.replace(/^graph:/, '') : event?.id;

  useEffect(() => {
    if (!graphEventId && !dedupKey) return;
    setLoading(true);
    // Run up to 3 parallel queries (dedup_key, event_id, and legacy
    // "graph:"-prefixed event_id). We avoid .or() because dedup_key values
    // contain commas, which break PostgREST's .or() parsing.
    const queries = [];
    if (dedupKey) {
      queries.push(supabase.from('meeting_notes').select('*').eq('dedup_key', dedupKey));
    }
    if (graphEventId) {
      queries.push(supabase.from('meeting_notes').select('*').eq('event_id', graphEventId));
      queries.push(supabase.from('meeting_notes').select('*').eq('event_id', 'graph:' + graphEventId));
    }
    Promise.all(queries).then(results => {
      const merged = [];
      const seen = new Set();
      results.forEach(r => {
        (r.data || []).forEach(row => {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(row);
          }
        });
      });
      merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setNotes(merged);
      setLoading(false);
    });
  }, [graphEventId, dedupKey]);

  const saveNote = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('meeting_notes').insert({
      event_id: graphEventId || null,
      dedup_key: dedupKey || null,
      company_id: companyId || null,
      content: draft.trim(),
      created_by: localStorage.getItem('user_first_name') || 'MVG',
    }).select().single();
    setSaving(false);
    if (error) { alert('Save failed: ' + error.message); return; }
    setNotes(prev => [data, ...prev]);
    setDraft('');
    if (onRefresh) onRefresh();
  };

  const deleteNote = async (id) => {
    if (!confirm('Delete this note?')) return;
    await supabase.from('meeting_notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (onRefresh) onRefresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(event?.bodyHtml || event?.bodyPreview) && (
        <div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
            Meeting description
          </div>
          <div style={{
            padding: 8, borderRadius: 4, background: 'var(--bg-2)',
            fontSize: 12, lineHeight: 1.5, color: 'var(--text-1)',
            maxHeight: 160, overflowY: 'auto',
            border: '0.5px solid var(--sep)',
          }}>
            {event.bodyHtml
              ? <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.bodyHtml) }} />
              : <div style={{ whiteSpace: 'pre-wrap' }}>{event.bodyPreview}</div>}
          </div>
        </div>
      )}
      {event?.attendees && (
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
          <b>Attendees:</b> {event.attendees}
        </div>
      )}
      {event?.meetingUrl && (
        <a href={event.meetingUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color: 'var(--accent)' }}>
          Join Teams meeting →
        </a>
      )}

      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
          Add note / transcript
        </div>
        <textarea rows={3} value={draft} onChange={e => setDraft(e.target.value)}
          placeholder="Paste transcript, add takeaways, decisions, action items…"
          style={{ ...fieldInputStyle, resize: 'vertical' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn-primary tiny" onClick={saveNote} disabled={!draft.trim() || saving}>
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
          Previous notes {notes.length > 0 && `· ${notes.length}`}
        </div>
        {loading && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Loading…</div>}
        {!loading && notes.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>No notes yet.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {notes.map(n => (
            <div key={n.id} style={{ border: '0.5px solid var(--sep)', borderRadius: 4, padding: 8, background: 'var(--bg-2)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{n.created_by || 'unknown'}</span>
                <span>·</span>
                <span>{n.created_at ? fmtFull(n.created_at) : ''}</span>
                <button style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 10 }}
                  onClick={() => deleteNote(n.id)}>Delete</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Inline expand contents for an account (shows core company fields,
// click to edit any value). Used in Account 360 hero.
export function InlineAccountDetails({ accountId, onPickAccount }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [allAccounts, setAllAccounts] = useState([]);
  const [parentInfo, setParentInfo] = useState(null);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    supabase.from('companies').select('*').eq('id', accountId).single()
      .then(({ data }) => { setRow(data); setLoading(false); });
    supabase.from('companies').select('id,name,type').neq('stage', 'Inactive').order('name')
      .then(({ data }) => setAllAccounts(data || []));
  }, [accountId]);

  // Load parent info whenever parent_id changes
  useEffect(() => {
    if (!row?.parent_id) { setParentInfo(null); return; }
    supabase.from('companies').select('id,name,type,stage').eq('id', row.parent_id).single()
      .then(({ data }) => setParentInfo(data));
  }, [row?.parent_id]);

  const saveField = async (field, value) => {
    setSaving(s => ({ ...s, [field]: true }));
    const { error } = await supabase.from('companies').update({ [field]: value }).eq('id', accountId);
    setSaving(s => ({ ...s, [field]: false }));
    if (!error) setRow(r => ({ ...r, [field]: value }));
  };

  const setParent = async (parentId) => {
    setSaving(s => ({ ...s, parent_id: true }));
    const parent = allAccounts.find(a => a.id === parentId);
    const { error } = await supabase.from('companies').update({
      parent_id: parentId || null,
      parent_account: parent?.name || null, // keep text field in sync for legacy/Dynamics
    }).eq('id', accountId);
    setSaving(s => ({ ...s, parent_id: false }));
    if (!error) {
      setRow(r => ({ ...r, parent_id: parentId || null, parent_account: parent?.name || null }));
    }
  };

  if (loading || !row) return <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Loading…</div>;

  const websiteUrl = row.website && (row.website.startsWith('http') ? row.website : `https://${row.website}`);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            Type {saving.type && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>…</span>}
          </div>
          <TypePicker value={row.type} onSave={v => saveField('type', v)} saving={saving.type} />
        </div>
        <InlineField label="Stage" value={row.stage} onSave={v => saveField('stage', v)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, gridColumn: 'span 2' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              title="Search this company on Google"
              onClick={() => {
                const q = encodeURIComponent(`${row.name || ''} official website`);
                window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener,width=1000,height=700');
              }}
              style={{ cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 2 }}>
              Website
            </span>
          </div>
          <InlineField label="" value={row.website} type="url" onSave={v => saveField('website', v)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, gridColumn: 'span 2' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              title="Search this company on LinkedIn"
              onClick={() => {
                const q = encodeURIComponent(row.name || '');
                window.open(`https://www.linkedin.com/search/results/companies/?keywords=${q}`, '_blank', 'noopener,width=1000,height=700');
              }}
              style={{ cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 2 }}>
              LinkedIn URL
            </span>
          </div>
          <InlineField label="" value={row.linkedin_url} type="url" onSave={v => saveField('linkedin_url', v)} />
        </div>
        <InlineField label="Phone" value={row.phone} onSave={v => saveField('phone', v)} />
        <InlineField label="Email" value={row.email} type="email" onSave={v => saveField('email', v)} />
        <InlineField label="Industry" value={row.industry} onSave={v => saveField('industry', v)} colspan={2} />
        <InlineField label="Address" value={row.address} onSave={v => saveField('address', v)} colspan={2} />
        <InlineField label="City" value={row.city} onSave={v => saveField('city', v)} />
        <InlineField label="Postal code" value={row.postal_code} onSave={v => saveField('postal_code', v)} />
        <InlineField label="Country" value={row.country} onSave={v => saveField('country', v)} />
        <InlineField label="Employees" value={row.employee_count} onSave={v => saveField('employee_count', v)} />
        <InlineField label="Annual revenue" value={row.annual_revenue} onSave={v => saveField('annual_revenue', v)} />
        <InlineField label="Size" value={row.size} onSave={v => saveField('size', v)} />
        <InlineField label="Founded" value={row.founded_year} onSave={v => saveField('founded_year', v)} />
        <div style={{ gridColumn: 'span 1' }}>
          <ParentAccountPicker
            value={row.parent_id}
            parent={parentInfo}
            parentNameFallback={row.parent_account}
            accounts={allAccounts}
            currentAccountId={accountId}
            saving={saving.parent_id}
            onChange={setParent}
            onOpenParent={(acc) => onPickAccount && onPickAccount(acc)}
          />
        </div>
        <InlineField label="Owner" value={row.owner} onSave={v => saveField('owner', v)} />
        <InlineField label="Tagline" value={row.tagline} onSave={v => saveField('tagline', v)} colspan={2} />
        <InlineField label="Specialities" value={row.specialities} onSave={v => saveField('specialities', v)} type="textarea" colspan={2} />
        <InlineField label="Description" value={row.description} type="textarea" onSave={v => saveField('description', v)} colspan={2} />
      </div>
    </div>
  );
}

// Parse notes with date-prefix lines into entries
// Supports: DDMMYYYY:, DD-MM-YYYY:, YYYY-MM-DD:, DD/MM/YYYY:
function parseDatedNotes(notes) {
  if (!notes) return [];
  const lines = notes.split('\n');
  const entries = [];
  let current = null;

  const dateRe = /^(\d{8})(?:\s|:)|^(\d{4}-\d{2}-\d{2})(?:\s|:)|^(\d{2}[-\/]\d{2}[-\/]\d{4})(?:\s|:)/;

  const formatDate = (str) => {
    // DDMMYYYY → Jan 29, 2026 style
    if (/^\d{8}$/.test(str)) {
      const d = str.slice(0, 2), m = str.slice(2, 4), y = str.slice(4);
      return new Date(+y, +m - 1, +d);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str);
    if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(str)) {
      const [d, m, y] = str.split(/[-\/]/);
      return new Date(+y, +m - 1, +d);
    }
    return null;
  };

  for (const line of lines) {
    const m = line.match(dateRe);
    if (m) {
      if (current) entries.push(current);
      const rawDate = m[1] || m[2] || m[3];
      const dateObj = formatDate(rawDate);
      // Strip prefix and optional colon/space
      const rest = line.slice(rawDate.length).replace(/^[:\s]+/, '');
      current = { date: dateObj, dateStr: rawDate, text: rest };
    } else if (current) {
      current.text += (current.text ? '\n' : '') + line;
    } else {
      // Lines before any date prefix — treat as "un-dated preamble"
      if (line.trim()) entries.push({ date: null, dateStr: '', text: line, noPrefix: true });
    }
  }
  if (current) entries.push(current);
  return entries;
}

// Inline expand contents for a deal (shows fields + notes timeline + add-note)
export function InlineDealDetail({ deal, rawItems, onCompose, onOpenModal, refetch }) {
  const rawRow = (rawItems || []).find(i => i.id === deal.id);
  const [noteDraft, setNoteDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const entries = parseDatedNotes(rawRow?.notes || '');

  const updateField = async (field, value) => {
    await updateRow(deal.table, deal.id, { [field]: value });
    if (refetch) refetch();
  };

  const addDatedNote = async () => {
    if (!noteDraft.trim()) return;
    setSaving(true);
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const prefix = `${dd}${mm}${yyyy}:`;
    const newLine = `${prefix} ${noteDraft.trim()}`;
    const combined = newLine + (rawRow?.notes ? '\n' + rawRow.notes : '');
    await updateRow(deal.table, deal.id, { notes: combined });
    setSaving(false);
    setNoteDraft('');
    if (refetch) refetch();
  };

  // Title field: opportunities → topic, leads → full_name
  const titleField = deal.table === 'opportunities' ? 'topic' : 'full_name';
  const titleValue = rawRow?.topic || rawRow?.full_name || deal.title;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <InlineField label="Deal name" value={titleValue}
        onSave={v => updateField(titleField, v || titleValue)} colspan={2} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <InlineField label="Value (€)" value={rawRow?.est_revenue} type="number"
          onSave={v => updateField('est_revenue', Number(v) || 0)} />
        <InlineField label="Probability %" value={rawRow?.probability} type="number"
          onSave={v => updateField('probability', Number(v) || 0)} />
        <InlineField label="Close date" value={rawRow?.close_date || rawRow?.est_close_date} type="date"
          onSave={v => updateField(deal.table === 'opportunities' ? 'est_close_date' : 'close_date', v)} />
      </div>

      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
          Add note (auto-dated)
        </div>
        <input value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
          placeholder="New note — gets today's date prefix on save…"
          onKeyDown={e => { if (e.key === 'Enter') addDatedNote(); }}
          style={fieldInputStyle} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn-primary tiny" onClick={addDatedNote} disabled={!noteDraft.trim() || saving}>
            {saving ? 'Saving…' : 'Add note'}
          </button>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
          Notes history · {entries.length}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
          {entries.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>No notes yet.</div>
          )}
          {entries.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: 6, background: 'var(--bg-2)', borderRadius: 4, border: '0.5px solid var(--sep)' }}>
              {e.date ? (
                <div style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)',
                  padding: '1px 6px', background: 'var(--accent-tint)', borderRadius: 3,
                  height: 'fit-content', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {e.date.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              ) : (
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', flexShrink: 0 }}>—</div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5, whiteSpace: 'pre-wrap', flex: 1 }}>
                {e.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', borderTop: '0.5px solid var(--sep)', paddingTop: 8 }}>
        {onCompose && (
          <button className="btn-ghost tiny" onClick={() => onCompose({})}>
            <I.send /> Compose
          </button>
        )}
        {onOpenModal && (
          <button className="btn-ghost tiny" onClick={onOpenModal}>
            <I.arrow /> Full deal actions (convert / disqualify / enroll)
          </button>
        )}
        <button className="btn-ghost tiny" style={{ marginLeft: 'auto', color: 'var(--danger)' }}
          onClick={async () => {
            const label = `${deal.title || 'this deal'} (${deal.stage})`;
            if (!confirm(`Delete ${label}?\n\nThis permanently removes the ${deal.table === 'opportunities' ? 'opportunity' : 'lead'} from the database.`)) return;
            const { error } = await supabase.from(deal.table).delete().eq('id', deal.id);
            if (error) { alert('Delete failed: ' + error.message); return; }
            if (refetch) refetch();
          }}>
          🗑 Delete
        </button>
      </div>
    </div>
  );
}

// Inline expandable task editor — shown in the Tasks section of Account 360
export function InlineTaskDetail({ taskId, refetch }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    supabase.from('tasks').select('*').eq('id', taskId).single()
      .then(({ data }) => { setRow(data); setLoading(false); });
  }, [taskId]);

  const update = async (patch) => {
    const { error } = await supabase.from('tasks').update(patch).eq('id', taskId);
    if (error) { alert('Save failed: ' + error.message); return; }
    setRow(r => ({ ...r, ...patch }));
    if (refetch) refetch();
  };

  if (loading || !row) return <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <InlineField label="Title" value={row.title} onSave={v => update({ title: v || row.title })} colspan={2} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <InlineField label="Due date" value={row.due_date} type="date" onSave={v => update({ due_date: v || null })} />
        <InlineField label="Owner" value={row.owner} onSave={v => update({ owner: v || null })} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Priority</div>
          <select value={row.priority || 'Normal'} onChange={e => update({ priority: e.target.value })}
            style={{
              padding: '4px 6px', borderRadius: 4, border: '0.5px solid var(--sep)',
              background: 'var(--fill-1)', color: 'var(--text-1)', fontSize: 12,
              fontFamily: 'var(--font)', outline: 'none',
            }}>
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>
      <InlineField label="Notes" value={row.description} type="textarea" onSave={v => update({ description: v || null })} colspan={2} />
      <div style={{ display: 'flex', gap: 4, borderTop: '0.5px solid var(--sep)', paddingTop: 8 }}>
        <button className="btn-ghost tiny"
          onClick={() => update({ status: row.status === 'done' ? 'pending' : 'done' })}>
          {row.status === 'done' ? '↻ Mark as open' : '✓ Mark as done'}
        </button>
        <button className="btn-ghost tiny" style={{ marginLeft: 'auto', color: 'var(--danger)' }}
          onClick={async () => {
            if (!confirm(`Delete task "${row.title || ''}"?`)) return;
            await supabase.from('tasks').delete().eq('id', taskId);
            if (refetch) refetch();
          }}>
          🗑 Delete
        </button>
      </div>
    </div>
  );
}
