import { useState, useEffect, useRef } from 'react';
import { I, ChannelIcon, fmtMoney } from './atoms';
import { sendEmail, replyToEmail } from '../lib/graph';

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
    setSending(true);
    try {
      if (ctx?.replyTo?.id) {
        await replyToEmail(ctx.replyTo.id, draft);
      } else {
        await sendEmail({ to, subject, body: draft });
      }
      setSending(false);
      if (onSent) onSent();
      onClose();
    } catch (err) {
      setSending(false);
      alert('Send failed: ' + (err.message || err));
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(draft);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-compose" onClick={e => e.stopPropagation()}>
        <div className="compose-header">
          <div className="compose-to">
            <span className="compose-label">To</span>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="recipient@example.com"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-1)' }} />
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
