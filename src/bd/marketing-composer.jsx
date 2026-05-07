import { useState, useMemo } from 'react';
import { useAuth } from '../lib/auth';
import { renderTemplate, varsForContact, KNOWN_VARS } from '../lib/template-vars';

// Composer for a Marketing campaign.
// Props:
//   recipients: array of contact objects (already filtered/selected)
//   onCancel: () => void
//   onSent: (campaign) => void
//   defaultFromName, defaultFromEmail (read-only display; configured via env)
export default function MarketingComposer({ recipients, onCancel, onSent, defaultFromName = 'Marketing', defaultFromEmail = 'marketing@eclectik.co' }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const { session } = useAuth();
  const sentBy = session?.user?.email || '';

  // Live preview — render with the first recipient's vars (or empty)
  const previewVars = useMemo(() => varsForContact(recipients?.[0] || {}), [recipients]);
  const previewHtml = useMemo(() => renderTemplate(htmlBody, previewVars), [htmlBody, previewVars]);

  const send = async (testOnly) => {
    if (!subject.trim() || !htmlBody.trim()) return;
    setBusy(true);
    setResult(null);

    const payloadRecipients = testOnly
      ? [{ contact_id: null, email: sentBy, html: renderTemplate(htmlBody, previewVars) }]
      : recipients.filter(r => r.email).map(r => {
          const v = varsForContact(r);
          return { contact_id: r.id, email: r.email, html: renderTemplate(htmlBody, v) };
        });

    if (payloadRecipients.length === 0) {
      setResult({ ok: false, error: 'No recipients with an email address' });
      setBusy(false);
      return;
    }

    try {
      const resp = await fetch('/api/marketing-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || subject,
          subject,
          preheader,
          html_body: htmlBody,
          reply_to: replyTo || null,
          audience_filter: testOnly ? { test: true } : null,
          recipients: payloadRecipients,
          sent_by: sentBy,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setResult({ ok: true, sent: data.sent, failed: data.failed, testOnly });
      if (!testOnly && onSent) onSent(data);
    } catch (e) {
      setResult({ ok: false, error: e.message });
    }
    setBusy(false);
  };

  const recipientsWithEmail = recipients.filter(r => r.email).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Campaign name</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Glint newsletter mei 2026"
            style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Audience</div>
          <div style={{ padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--fill-1)', fontSize: 12, color: 'var(--text-2)' }}>
            {recipients.length} contact{recipients.length !== 1 ? 's' : ''} ({recipientsWithEmail} with email)
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>From</div>
          <div style={{ padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--fill-1)', fontSize: 12, color: 'var(--text-2)' }}>
            {defaultFromName} &lt;{defaultFromEmail}&gt;
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Reply-to (optional)</div>
          <input value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder={sentBy} style={inputStyle} />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Subject</div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Viva Glint &amp; Pulse — May update" style={inputStyle} />
      </div>

      <div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Preheader</div>
        <input value={preheader} onChange={e => setPreheader(e.target.value)} placeholder="Copilot highlights, admin change…" style={inputStyle} />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>HTML body</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
            Variables: {KNOWN_VARS.map(v => `{{${v}}}`).join(', ')}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, height: 380 }}>
          <textarea value={htmlBody} onChange={e => setHtmlBody(e.target.value)}
            placeholder="<html>...</html>"
            spellCheck={false}
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)', resize: 'none', height: '100%', padding: 10, fontSize: 11 }} />
          <iframe title="preview" srcDoc={previewHtml}
            sandbox=""
            style={{ width: '100%', height: '100%', border: '0.5px solid var(--sep)', borderRadius: 6, background: '#fff' }} />
        </div>
      </div>

      {result && (
        <div style={{ fontSize: 12, color: result.ok ? 'var(--good)' : 'var(--danger)' }}>
          {result.ok
            ? `✓ ${result.testOnly ? 'Test sent to ' + sentBy : `Sent ${result.sent} email${result.sent !== 1 ? 's' : ''}, ${result.failed} failed`}`
            : `✗ ${result.error}`}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn-ghost tiny" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn-ghost tiny" onClick={() => send(true)} disabled={busy || !subject.trim() || !htmlBody.trim()}>
          {busy ? 'Sending…' : 'Test send → me'}
        </button>
        <button className="btn-primary tiny" onClick={() => {
          if (!confirm(`Send "${subject}" to ${recipientsWithEmail} recipients?`)) return;
          send(false);
        }} disabled={busy || recipientsWithEmail === 0 || !subject.trim() || !htmlBody.trim()}>
          {busy ? 'Sending…' : `Send to ${recipientsWithEmail} recipient${recipientsWithEmail !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '7px 10px', borderRadius: 6,
  border: '0.5px solid var(--sep)', background: 'var(--bg-1)',
  fontSize: 12, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
};
