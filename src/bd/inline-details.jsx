import { useState, useEffect } from 'react';
import { I, fmtFull, fmtMoney, OwnerDot, STAGE_TINT } from './atoms';
import { supabase } from '../supabase';
import DOMPurify from 'dompurify';
import { updateRow } from '../hooks/useSupabase';

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
export function InlineContactDetail({ contactId, onCompose }) {
  const [row, setRow] = useState(null);
  const [saving, setSaving] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contactId) return;
    setLoading(true);
    supabase.from('contacts').select('*, companies(name, linkedin_url, website)').eq('id', contactId).single()
      .then(({ data }) => { setRow(data); setLoading(false); });
  }, [contactId]);

  const saveField = async (field, value) => {
    setSaving(s => ({ ...s, [field]: true }));
    const { error } = await supabase.from('contacts').update({ [field]: value }).eq('id', contactId);
    setSaving(s => ({ ...s, [field]: false }));
    if (!error) setRow(r => ({ ...r, [field]: value }));
  };

  if (loading || !row) return <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Loading…</div>;

  const linkedinSearch = () => {
    const company = row.companies?.name || row.company_name || '';
    const slugMatch = (row.companies?.linkedin_url || '').match(/linkedin\.com\/company\/([^\/\?]+)/);
    const slug = slugMatch ? slugMatch[1] : '';
    const keywords = [row.full_name, slug || company].filter(Boolean).join(' ');
    window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`, '_blank');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      <InlineField label="First name" value={row.first_name} onSave={v => saveField('first_name', v)} />
      <InlineField label="Last name" value={row.last_name} onSave={v => saveField('last_name', v)} />
      <InlineField label="Email" value={row.email} onSave={v => saveField('email', v)} type="email" colspan={2} />
      <InlineField label="Phone" value={row.phone} onSave={v => saveField('phone', v)} />
      <InlineField label="Mobile" value={row.mobile} onSave={v => saveField('mobile', v)} />
      <InlineField label="Role / title" value={row.title} onSave={v => saveField('title', v)} colspan={2} />
      <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>LinkedIn URL</span>
          <button onClick={linkedinSearch} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--chip-linkedin)', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', padding: 0 }}>
            🔍 Search on LinkedIn
          </button>
          {row.linkedin_url && (
            <a href={row.linkedin_url} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--chip-linkedin)', fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
              → Open
            </a>
          )}
        </div>
        <InlineField label="" value={row.linkedin_url} onSave={v => saveField('linkedin_url', v)} />
      </div>
      <InlineField label="Notes" value={row.notes} onSave={v => saveField('notes', v)} type="textarea" colspan={2} />
      {row.email && onCompose && (
        <div style={{ gridColumn: 'span 2', marginTop: 4 }}>
          <button className="btn-primary tiny" onClick={() => onCompose({ to: row.email, contact: row })}>
            <I.send /> Email
          </button>
        </div>
      )}
    </div>
  );
}

// Inline expand contents for a meeting (shows body + notes + add-note)
export function InlineMeetingDetail({ event, companyId, onRefresh }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!event?.id) return;
    setLoading(true);
    supabase.from('meeting_notes').select('*').eq('event_id', event.id).order('created_at', { ascending: false })
      .then(({ data }) => { setNotes(data || []); setLoading(false); });
  }, [event?.id]);

  const saveNote = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('meeting_notes').insert({
      event_id: event.id,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
      </div>
    </div>
  );
}
