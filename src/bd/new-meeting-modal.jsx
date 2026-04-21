import { useState, useRef, useEffect } from 'react';
import { I } from './atoms';
import { createCalendarEvent } from '../lib/graph';

// Multi-email chip picker (similar to compose)
function AttendeePicker({ values, onChange, contacts, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const suggestions = (contacts || []).filter(c => {
    if (!c.email || values.includes(c.email)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return c.email.toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q) || (c.account || '').toLowerCase().includes(q);
  }).slice(0, 8);

  const addEmail = (email) => {
    const clean = email.trim();
    if (!clean || values.includes(clean)) return;
    onChange([...values, clean]);
    setQuery('');
    inputRef.current?.focus();
  };
  const removeEmail = (email) => onChange(values.filter(v => v !== email));

  const onKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') && query.trim()) {
      e.preventDefault();
      addEmail(query);
    } else if (e.key === 'Backspace' && !query && values.length > 0) {
      removeEmail(values[values.length - 1]);
    }
  };

  return (
    <div ref={ref} style={{
      position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
      padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
      minHeight: 34,
    }}>
      {values.map(v => (
        <span key={v} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 6px 2px 8px', borderRadius: 10, fontSize: 11,
          background: 'var(--accent-tint)', color: 'var(--accent)',
          fontFamily: 'var(--font-mono)',
        }}>
          {v}
          <button onClick={() => removeEmail(v)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, display: 'flex' }}>
            <I.close />
          </button>
        </span>
      ))}
      <input ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={values.length === 0 ? placeholder : ''}
        style={{ flex: 1, minWidth: 140, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-1)' }} />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--bg-1)', borderRadius: 8, boxShadow: 'var(--shadow-2)',
          border: '0.5px solid var(--sep)', zIndex: 100, maxHeight: 240, overflowY: 'auto',
        }}>
          {suggestions.map(c => (
            <div key={c.id} onMouseDown={(e) => { e.preventDefault(); addEmail(c.email); }}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '0.5px solid var(--sep)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{c.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewMeetingModal({ dayDate, contacts, deals, accounts, onClose, onCreated }) {
  const defaultDate = dayDate ? new Date(dayDate) : new Date();
  const defaultDateStr = defaultDate.toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDateStr);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [attendees, setAttendees] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState('');
  const [dealId, setDealId] = useState('');
  const [saving, setSaving] = useState(false);

  const accountDeals = accountId ? (deals || []).filter(d => d.accountId === accountId) : [];
  const canSave = title.trim() && date && startTime && endTime;

  const handleSave = async () => {
    if (!canSave) return;
    if (!localStorage.getItem('graph_token')) {
      alert('Microsoft not connected. Click "⚠ Reconnect" first.');
      return;
    }
    setSaving(true);
    const startISO = `${date}T${startTime}:00`;
    const endISO = `${date}T${endTime}:00`;
    let body = notes || '';
    if (accountId || dealId) {
      const acc = (accounts || []).find(a => a.id === accountId);
      const deal = (deals || []).find(d => d.id === dealId);
      body += `\n\n---\nLinked to: ${acc?.name || ''}${deal ? ` · ${deal.title}` : ''}`;
    }
    const result = await createCalendarEvent({
      subject: title.trim(),
      startTime: startISO,
      endTime: endISO,
      attendeeEmails: attendees,
      body: body.trim() || undefined,
      isOnline,
    });
    setSaving(false);
    if (result.error) {
      alert('Failed to create meeting: ' + result.error);
      return;
    }
    if (onCreated) onCreated(result.data);
  };

  const fieldStyle = {
    width: '100%', padding: '7px 10px', borderRadius: 6,
    border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
    color: 'var(--text-1)', fontSize: 12, outline: 'none',
    fontFamily: 'var(--font)', boxSizing: 'border-box',
  };
  const label = {
    fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 5,
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <I.calendar />
          <span>New meeting</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={label}>Title *</div>
            <input autoFocus style={fieldStyle} value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Meeting title…" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <div>
              <div style={label}>Date</div>
              <input type="date" style={fieldStyle} value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <div style={label}>Start</div>
              <input type="time" style={fieldStyle} value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <div style={label}>End</div>
              <input type="time" style={fieldStyle} value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <div>
            <div style={label}>Attendees</div>
            <AttendeePicker values={attendees} onChange={setAttendees} contacts={contacts}
              placeholder="Add people by email or name…" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <input type="checkbox" id="new-meeting-teams" checked={isOnline}
              onChange={e => setIsOnline(e.target.checked)} />
            <label htmlFor="new-meeting-teams" style={{ fontSize: 12, color: 'var(--text-1)', cursor: 'pointer' }}>
              Create as Teams meeting (auto-generates meeting link)
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={label}>Link to account</div>
              <select style={fieldStyle} value={accountId} onChange={e => { setAccountId(e.target.value); setDealId(''); }}>
                <option value="">— none —</option>
                {[...(accounts || [])].sort((a, b) => a.name.localeCompare(b.name)).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={label}>Link to deal</div>
              <select style={fieldStyle} value={dealId} onChange={e => setDealId(e.target.value)}
                disabled={accountDeals.length === 0}>
                <option value="">— none —</option>
                {accountDeals.map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div style={label}>Description / notes</div>
            <textarea rows={3} style={{ ...fieldStyle, resize: 'vertical' }}
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Optional agenda or notes…" />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Creating…' : (isOnline ? 'Create Teams meeting' : 'Create meeting')}
          </button>
        </div>
      </div>
    </div>
  );
}
