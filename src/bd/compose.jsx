import { useState, useEffect, useRef } from 'react';
import { I, ChannelIcon, fmtMoney } from './atoms';
import { sendEmail, replyToEmail } from '../lib/graph';

function ContactPicker({ value, onChange, contacts }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const suggestions = (contacts || []).filter(c =>
    c.email && (
      !query ||
      c.email.toLowerCase().includes(query.toLowerCase()) ||
      (c.name || '').toLowerCase().includes(query.toLowerCase()) ||
      (c.account || '').toLowerCase().includes(query.toLowerCase())
    )
  ).slice(0, 8);

  const pick = (c) => {
    onChange(c.email);
    setQuery(c.email);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ flex: 1, position: 'relative' }}>
      <input value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="recipient@example.com or search by name…"
        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-1)', padding: '4px 0' }} />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--bg-1)', borderRadius: 8, boxShadow: 'var(--shadow-2)',
          border: '0.5px solid var(--sep)', zIndex: 10, maxHeight: 240, overflowY: 'auto',
        }}>
          {suggestions.map(c => (
            <div key={c.id} onClick={() => pick(c)}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '0.5px solid var(--sep)', display: 'flex', flexDirection: 'column', gap: 2 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{c.email}</div>
              {c.account && <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{c.account}{c.role ? ' · ' + c.role : ''}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TONES = ['Professional', 'Warm', 'Executive', 'Direct'];
const CHANNELS = ['email', 'linkedin', 'teams'];
const TEMPLATES = ['Follow-up', 'Proposal cover', 'Check-in', 'Escalation', 'Meeting recap'];

export default function ComposeModal({ ctx, onClose, onSent, accounts, contacts, deals }) {
  const [channel, setChannel] = useState(ctx?.replyTo?.channel || 'email');
  const [tone, setTone] = useState('Professional');
  const [template, setTemplate] = useState('');
  const [to, setTo] = useState(ctx?.to || ctx?.replyTo?.from || '');
  const [subject, setSubject] = useState(
    ctx?.replyTo ? (ctx.replyTo.subject?.startsWith('Re:') ? ctx.replyTo.subject : 'Re: ' + (ctx.replyTo.subject || '')) :
    ctx?.forwardOf ? 'Fwd: ' + (ctx.forwardOf.subject || '') : ''
  );
  const [context, setContext] = useState(
    ctx?.replyTo?.preview || ctx?.forwardOf?.preview || ''
  );
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [sending, setSending] = useState(false);

  const contact = ctx?.contact || (ctx?.replyTo?.accountId && contacts.find(c => c.email === ctx?.replyTo?.from));
  const account = contact?.accountId ? accounts.find(a => a.id === contact.accountId) : null;

  const generateDraft = () => {
    setStreaming(true);
    setDraft('');
    // Simple template-based draft (future: replace with Anthropic API call)
    const greeting = tone === 'Warm' ? `Hi ${contact?.name?.split(' ')[0] || 'there'},` :
                     tone === 'Direct' ? `${contact?.name?.split(' ')[0] || 'Hi'} –` :
                     tone === 'Executive' ? `Dear ${contact?.name?.split(' ')[0] || 'colleague'},` :
                     `Hello ${contact?.name?.split(' ')[0] || 'there'},`;
    const templateBody = {
      'Follow-up': `Following up on our last exchange${account ? ` regarding ${account.name}` : ''}. ${context ? 'Based on:\n\n> ' + context + '\n\n' : ''}Let me know if a quick call this week would help move things forward.`,
      'Proposal cover': `Attached is our proposal for ${account?.name || 'your review'}. Happy to walk through the key points on a call if useful.`,
      'Check-in': `Touching base to see how things are going${account ? ` on the ${account.name} side` : ''}. Any updates or blockers I can help with?`,
      'Escalation': `Wanted to raise a concern on our current timeline. Could we find a slot this week to align?`,
      'Meeting recap': `Thanks for the meeting. Summary of what we agreed:\n\n- \n- \n- \n\nNext steps from my side: `,
      '': context ? `Thanks for your note. ${context ? '\n\nIn response:\n\n' : ''}` : 'Hope this finds you well.',
    }[template] || '';
    const closing = tone === 'Warm' ? 'Cheers,' : tone === 'Executive' ? 'Kind regards,' : 'Best,';
    const full = `${greeting}\n\n${templateBody}\n\n${closing}\n${localStorage.getItem('user_first_name') || ''}`;
    // Character-by-character streaming
    let i = 0;
    const timer = setInterval(() => {
      setDraft(full.slice(0, i));
      i += 3;
      if (i >= full.length) {
        clearInterval(timer);
        setDraft(full);
        setStreaming(false);
      }
    }, 18);
  };

  useEffect(() => {
    generateDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tone, template]);

  const send = async () => {
    if (channel !== 'email') {
      if (channel === 'linkedin') {
        alert('LinkedIn send via Unipile: open contact → Send LinkedIn Message (coming in next step).');
      } else {
        alert('Teams posts require opening Teams directly.');
      }
      return;
    }
    if (!to.trim()) {
      alert('Please enter a recipient email address.');
      return;
    }
    if (!localStorage.getItem('graph_token')) {
      alert('Microsoft not connected. Click "⚠ Reconnect Microsoft" in the top bar first.');
      return;
    }
    setSending(true);
    try {
      // Convert plain text draft to simple HTML with line breaks
      const htmlBody = draft.replace(/\n/g, '<br>');
      if (ctx?.replyTo?.id && /^[A-Za-z0-9=+/_-]{40,}$/.test(ctx.replyTo.id)) {
        await replyToEmail(ctx.replyTo.id, htmlBody);
      } else {
        await sendEmail({ to: to.trim(), subject, body: htmlBody });
      }
      setSending(false);
      if (onSent) onSent();
      onClose();
      alert('Email sent ✓');
    } catch (err) {
      setSending(false);
      console.error('Send failed:', err);
      const msg = err?.message || String(err);
      if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('token')) {
        alert('Microsoft token expired. Click "⚠ Reconnect Microsoft" and try again.');
      } else {
        alert('Send failed: ' + msg);
      }
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(draft);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-compose" onClick={e => e.stopPropagation()}>
        <div className="compose-header">
          <div className="compose-to" style={{ position: 'relative' }}>
            <span className="compose-label">To</span>
            <ContactPicker value={to} onChange={setTo} contacts={contacts} />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {CHANNELS.map(c => (
              <button key={c} className={`chip ${channel === c ? 'chip-on' : ''}`} onClick={() => setChannel(c)}>
                <ChannelIcon ch={c} size={10} />{c}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={onClose}><I.close /></button>
        </div>

        <div className="compose-split">
          <div className="compose-inputs">
            {channel === 'email' && (
              <div className="compose-field">
                <label>Subject</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  style={{ width: '100%', background: 'var(--fill-1)', border: '0.5px solid transparent', borderRadius: 6, padding: 8, fontSize: 12, outline: 'none', color: 'var(--text-1)', boxSizing: 'border-box' }} />
              </div>
            )}

            <div className="compose-field">
              <label>Tone</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {TONES.map(t => (
                  <button key={t} className={`chip ${tone === t ? 'chip-on' : ''}`} onClick={() => setTone(t)}>{t}</button>
                ))}
              </div>
            </div>

            <div className="compose-field">
              <label>Template</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button className={`chip ${template === '' ? 'chip-on' : ''}`} onClick={() => setTemplate('')}>None</button>
                {TEMPLATES.map(t => (
                  <button key={t} className={`chip ${template === t ? 'chip-on' : ''}`} onClick={() => setTemplate(t)}>{t}</button>
                ))}
              </div>
            </div>

            <div className="compose-field">
              <label>Context</label>
              <textarea rows={6} value={context} onChange={e => setContext(e.target.value)}
                placeholder="Add context, quote a message, or leave blank…" />
            </div>

            <button className="btn-primary compose-regen" onClick={generateDraft} disabled={streaming}>
              <I.sparkle /> Regenerate draft
            </button>
          </div>

          <div className="compose-draft">
            <div className="draft-header">
              <div className="draft-title">
                <I.sparkle />
                <span>AI draft</span>
                <span className="draft-status">{streaming ? 'drafting…' : 'ready'}</span>
              </div>
              <button className="btn-ghost tiny" onClick={copy} disabled={streaming}><I.archive /> Copy</button>
            </div>
            <div className="draft-body">
              <pre>{draft}{streaming && <span className="draft-cursor">▍</span>}</pre>
            </div>
            <div className="draft-actions">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" disabled={sending || streaming || !draft.trim()} onClick={send}>
                <I.send /> {sending ? 'Sending…' : channel === 'email' ? 'Send email' : channel === 'linkedin' ? 'Send LinkedIn' : 'Post to Teams'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
