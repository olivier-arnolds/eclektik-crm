import { useState, useMemo, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { renderTemplate, varsForContact, KNOWN_VARS } from '../lib/template-vars';
import { apiFetch } from '../lib/apiFetch';

// Vaste afzenders — allemaal op het in Resend geverifieerde domein eclectik.co.
// Andere domeinen worden door Resend geweigerd, dus het adres is een keuzelijst
// (geen vrij tekstveld). De weergavenaam is wél vrij aan te passen.
const SENDERS = [
  { email: 'marketing@eclectik.co', name: 'Marketing' },
  { email: 'olivier@eclectik.co', name: 'Olivier Arnolds' },
  { email: 'marco@eclectik.co', name: 'Marco van Gelder' },
  { email: 'yarmilla@eclectik.co', name: 'Yarmilla Koenders' },
];

// Composer for a Marketing campaign.
// Props:
//   recipients: array of contact objects (already filtered/selected)
//   onCancel: () => void
//   onSent: (campaign) => void
//   defaultFromName, defaultFromEmail (initiële afzender; keuzelijst hieronder)
export default function MarketingComposer({ recipients, onCancel, onSent, defaultFromName = 'Marketing', defaultFromEmail = 'marketing@eclectik.co' }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [fromEmail, setFromEmail] = useState(defaultFromEmail);
  const [fromName, setFromName] = useState(defaultFromName);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const { session } = useAuth();
  const sentBy = session?.user?.email || '';

  const loadHtmlFromFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setHtmlBody(text);

      // Auto-fill subject from <title>… (only if empty so user-typed values stay)
      const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch && !subject.trim()) {
        setSubject(decodeHtmlEntities(titleMatch[1]).trim());
      }

      // Auto-fill preheader from the first hidden div (display:none convention)
      const preheaderMatch = text.match(/<div[^>]*style="[^"]*display\s*:\s*none[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (preheaderMatch && !preheader.trim()) {
        const cleaned = preheaderMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        setPreheader(decodeHtmlEntities(cleaned));
      }

      // Auto-fill campaign name from the filename (strip .html / .htm)
      if (!name.trim()) {
        setName(file.name.replace(/\.(html?|htm)$/i, ''));
      }
    };
    reader.onerror = () => alert('Failed to read file: ' + (reader.error?.message || 'unknown error'));
    reader.readAsText(file);
    // Reset so the same file can be re-picked later
    e.target.value = '';
  };

  // Decode the most common HTML entities found in <title> / preheader text.
  function decodeHtmlEntities(s) {
    return s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  // Live preview — render with the first recipient's vars (or empty)
  const previewVars = useMemo(() => varsForContact(recipients?.[0] || {}), [recipients]);
  const previewHtml = useMemo(() => renderTemplate(htmlBody, previewVars), [htmlBody, previewVars]);

  const send = async (testOnly) => {
    if (!subject.trim() || !htmlBody.trim()) return;
    setBusy(true);
    setResult(null);

    // Server-side templating: stuur alleen merge-vars per recipient, niet de
    // volledige geïnlinete HTML. Voor 88+ recipients zou inline-HTML de
    // Vercel body-limit overschrijden (413 Request Entity Too Large).
    // Backend rendert html_body + per-recipient vars in marketing-send.js.
    let payloadRecipients = testOnly
      ? [{ contact_id: null, email: sentBy, vars: previewVars }]
      : recipients.filter(r => r.email).map(r => ({
          contact_id: r.id,
          email: r.email,
          vars: varsForContact(r),
        }));

    if (payloadRecipients.length === 0) {
      setResult({ ok: false, error: 'No recipients with an email address' });
      setBusy(false);
      return;
    }

    // Spam-preventie: check welke recipients in de afgelopen 3 dagen al een
    // campaign-mail van ons hebben gehad (status sent of delivered). Skip die
    // by-default, met override-optie. Test-sends skippen deze check (eigen mail).
    if (!testOnly) {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      const contactIds = payloadRecipients.map(r => r.contact_id).filter(Boolean);
      const emails = payloadRecipients.map(r => r.email);
      const recentIds = new Set();
      const recentEmails = new Set();
      try {
        if (contactIds.length > 0) {
          const { data } = await supabase
            .from('campaign_sends')
            .select('contact_id')
            .in('contact_id', contactIds)
            .in('status', ['sent', 'delivered'])
            .gte('sent_at', threeDaysAgo);
          for (const r of (data || [])) if (r.contact_id) recentIds.add(r.contact_id);
        }
        if (emails.length > 0) {
          const { data } = await supabase
            .from('campaign_sends')
            .select('recipient_email')
            .in('recipient_email', emails)
            .in('status', ['sent', 'delivered'])
            .gte('sent_at', threeDaysAgo);
          for (const r of (data || [])) if (r.recipient_email) recentEmails.add(r.recipient_email.toLowerCase());
        }
      } catch (err) {
        console.warn('Recent-send check faalde, doorgaan zonder filter:', err);
      }
      const skip = payloadRecipients.filter(r =>
        (r.contact_id && recentIds.has(r.contact_id)) || recentEmails.has((r.email || '').toLowerCase())
      );
      if (skip.length > 0) {
        const remaining = payloadRecipients.length - skip.length;
        const sample = skip.slice(0, 5).map(r => r.email).join(', ');
        const moreNote = skip.length > 5 ? ` (en ${skip.length - 5} meer)` : '';
        const ok = confirm(
          `Spam-preventie: ${skip.length} van de ${payloadRecipients.length} contacten kregen in de afgelopen 3 dagen al een campaign-mail van ons.\n\n` +
          `Voorbeeld: ${sample}${moreNote}\n\n` +
          `Klik OK om alleen naar de overige ${remaining} contact${remaining === 1 ? '' : 'en'} te mailen.\n` +
          `Annuleer om alle ${payloadRecipients.length} alsnog te mailen (override).`
        );
        if (ok) {
          payloadRecipients = payloadRecipients.filter(r =>
            !((r.contact_id && recentIds.has(r.contact_id)) || recentEmails.has((r.email || '').toLowerCase()))
          );
        }
        // Bij Annuleer: laat payloadRecipients ongewijzigd (full send).
      }
      if (payloadRecipients.length === 0) {
        setResult({ ok: false, error: 'Alle geselecteerde contacten kregen in de afgelopen 3 dagen al een campaign-mail.' });
        setBusy(false);
        return;
      }
    }

    try {
      const resp = await apiFetch('/api/marketing-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || subject,
          subject,
          preheader,
          html_body: htmlBody,
          from_name: fromName || undefined,
          from_email: fromEmail || undefined,
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
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={fromName} onChange={e => setFromName(e.target.value)}
              placeholder="Weergavenaam" style={{ ...inputStyle, flex: 1 }} />
            <select value={fromEmail}
              onChange={e => {
                const email = e.target.value;
                setFromEmail(email);
                // Vul de weergavenaam automatisch mee bij een ander adres; blijft bewerkbaar.
                const s = SENDERS.find(x => x.email === email);
                if (s) setFromName(s.name);
              }}
              style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
              {SENDERS.map(s => <option key={s.email} value={s.email}>{s.email}</option>)}
            </select>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>HTML body</div>
            <button type="button" className="btn-ghost tiny" onClick={() => fileInputRef.current?.click()}>
              📁 Open file…
            </button>
            <input ref={fileInputRef} type="file" accept=".html,.htm,text/html"
              onChange={loadHtmlFromFile}
              style={{ display: 'none' }} />
          </div>
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
