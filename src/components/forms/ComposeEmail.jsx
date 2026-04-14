import { useState } from 'react';
import { sendEmail } from '../../lib/graph';
import { insertRow } from '../../hooks/useSupabase';

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(44,44,42,0.35)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 9999,
};

const modalStyle = {
  background: '#FFFFFF', borderRadius: 12, padding: '28px 32px 24px',
  width: 480, maxHeight: '85vh', overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 500,
  color: '#888780', marginBottom: 4, textTransform: 'uppercase',
  letterSpacing: '0.3px',
};

const inputStyle = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '0.5px solid #D3D1C7', borderRadius: 6,
  background: '#FAFAF7', color: '#2C2C2A', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
};

const rowStyle = { marginBottom: 14 };

const btnBase = {
  padding: '8px 20px', fontSize: 13, fontWeight: 500,
  borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
  border: 'none',
};

export default function ComposeEmail({ open, onClose, contactEmail, item, refetch }) {
  const [to, setTo] = useState(contactEmail || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [cc, setCc] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!to.trim()) { setError('Recipient is required.'); return; }
    if (!subject.trim()) { setError('Subject is required.'); return; }
    setSending(true);
    setError('');

    const result = await sendEmail({ to: to.trim(), subject: subject.trim(), body, cc: cc.trim() || undefined });

    if (result.error) {
      setError(result.error);
      setSending(false);
      return;
    }

    // Log to comms table
    try {
      await insertRow('comms', {
        contact_id: item?.contactIds?.[0] || null,
        opportunity_id: item?.funnelStage !== 'lead' ? item?.id : null,
        lead_id: item?.funnelStage === 'lead' ? item?.id : null,
        channel: 'email',
        direction: 'outbound',
        subject: subject.trim(),
        body_preview: body.substring(0, 200),
        is_read: true,
        sent_at: new Date().toISOString(),
        owner: 'You'
      });
    } catch (_) {
      // logging failure should not block success
    }

    setSending(false);
    setSuccess(true);
    if (refetch) refetch();
    setTimeout(() => {
      setSuccess(false);
      setTo(contactEmail || '');
      setSubject('');
      setBody('');
      setCc('');
      onClose();
    }, 1200);
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2A', marginBottom: 20 }}>
          Compose message
        </div>

        {success ? (
          <div style={{ color: '#1D9E75', fontSize: 13, background: '#E6F7F0', padding: '12px 14px', borderRadius: 8, textAlign: 'center', fontWeight: 500 }}>
            Message sent successfully.
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <div style={rowStyle}>
              <label style={labelStyle}>To *</label>
              <input style={inputStyle} type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="recipient@example.com" autoFocus />
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Subject *</label>
              <input style={inputStyle} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" />
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Body</label>
              <textarea style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} rows={6} value={body} onChange={e => setBody(e.target.value)} placeholder="Type your message..." />
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>CC</label>
              <input style={inputStyle} type="email" value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@example.com (optional)" />
            </div>

            {error && (
              <div style={{ color: '#791F1F', fontSize: 12, marginBottom: 10, background: '#FCEBEB', padding: '6px 10px', borderRadius: 6 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <button type="button" onClick={onClose} style={{ ...btnBase, background: '#F1EFE8', color: '#5F5E5A' }}>
                Cancel
              </button>
              <button type="submit" disabled={sending} style={{ ...btnBase, background: '#042C53', color: '#B5D4F4', opacity: sending ? 0.6 : 1 }}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
