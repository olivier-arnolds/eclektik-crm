import { useState, useEffect } from 'react';
import { I, fmtFull } from './atoms';
import { supabase } from '../supabase';
import DOMPurify from 'dompurify';

// Modal for viewing/editing meeting notes (transcripts, takeaways, action items)
// attached to a calendar event. Stored in meeting_notes table.
export default function MeetingNoteModal({ event, account, onClose, refetch }) {
  const [existing, setExisting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!event?.id) return;
    setLoading(true);
    supabase.from('meeting_notes').select('*').eq('event_id', event.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setExisting(data || []);
        setLoading(false);
      });
  }, [event?.id]);

  const save = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('meeting_notes').insert({
      event_id: event.id,
      company_id: account?.id || null,
      content: draft.trim(),
      created_by: localStorage.getItem('user_first_name') || 'MVG',
    }).select().single();
    setSaving(false);
    if (error) {
      alert('Save failed: ' + error.message);
      return;
    }
    setExisting(prev => [data, ...prev]);
    setDraft('');
    if (refetch) refetch();
  };

  const deleteNote = async (id) => {
    if (!confirm('Delete this note?')) return;
    await supabase.from('meeting_notes').delete().eq('id', id);
    setExisting(prev => prev.filter(n => n.id !== id));
  };

  const when = event?.startISO ? fmtFull(event.startISO) : '';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <I.calendar />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event?.title || '(meeting)'}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{when}{account?.name ? ` · ${account.name}` : ''}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(event?.bodyHtml || event?.bodyPreview) && (
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 5 }}>
                Meeting description
              </div>
              <div style={{
                padding: 10, border: '0.5px solid var(--sep)', borderRadius: 6,
                background: 'var(--bg-2)', fontSize: 12, lineHeight: 1.5,
                maxHeight: 200, overflowY: 'auto',
                color: 'var(--text-1)',
              }}>
                {event.bodyHtml
                  ? <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.bodyHtml) }} />
                  : <div style={{ whiteSpace: 'pre-wrap' }}>{event.bodyPreview}</div>}
              </div>
              {event.attendees && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                  <b>Attendees:</b> {event.attendees}
                </div>
              )}
              {event.meetingUrl && (
                <a href={event.meetingUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: 'var(--accent)', display: 'inline-block', marginTop: 6 }}>
                  Join Teams meeting →
                </a>
              )}
            </div>
          )}

          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 5 }}>
              Add note / transcript
            </div>
            <textarea autoFocus rows={6} value={draft} onChange={e => setDraft(e.target.value)}
              placeholder="Paste transcript, add key takeaways, decisions, action items…"
              style={{
                width: '100%', padding: 10, borderRadius: 6,
                border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
                color: 'var(--text-1)', fontSize: 12, fontFamily: 'var(--font)',
                outline: 'none', boxSizing: 'border-box', resize: 'vertical',
              }} />
            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary tiny" onClick={save} disabled={!draft.trim() || saving}>
                {saving ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
              Previous notes {existing.length > 0 && `· ${existing.length}`}
            </div>
            {loading && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Loading…</div>}
            {!loading && existing.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>No notes yet.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {existing.map(n => (
                <div key={n.id} style={{ border: '0.5px solid var(--sep)', borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{n.created_by || 'unknown'}</span>
                    <span>·</span>
                    <span>{n.created_at ? fmtFull(n.created_at) : ''}</span>
                    <button className="btn-ghost tiny" style={{ marginLeft: 'auto', color: 'var(--danger)' }} onClick={() => deleteNote(n.id)}>
                      Delete
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
