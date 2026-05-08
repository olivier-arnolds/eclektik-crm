// POST /api/feedback-notify
// Body: { id }
// Sends an email to the admin list announcing a new feature_requests row.
// Fire-and-forget from the submit modal — never blocks the user.
import { createClient } from '@supabase/supabase-js';

// Feedback notifications only go to Olivier — he triages incoming requests
// before they're routed/queued elsewhere.
const ADMIN_EMAILS = ['olivier@eclectik.co'];

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.RESEND_API_KEY) return res.status(200).json({ skipped: 'no Resend key' });

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });

  const { data: row } = await supabase.from('feature_requests').select('*').eq('id', id).single();
  if (!row) return res.status(404).json({ error: 'not found' });

  const fromName = process.env.MARKETING_FROM_NAME || 'Eclectik CRM';
  const fromEmail = process.env.MARKETING_FROM_EMAIL;
  if (!fromEmail) return res.status(500).json({ error: 'MARKETING_FROM_EMAIL not configured' });

  const typeLabel = { bug: '🐛 Bug', feature: '✨ Feature', question: '❓ Question' }[row.type] || row.type;
  const screenshotBlock = row.screenshot_url
    ? `<p><a href="${row.screenshot_url}"><img src="${row.screenshot_url}" alt="screenshot" style="max-width:480px;border:1px solid #ddd;border-radius:6px"/></a></p>`
    : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5">
      <p><b>${typeLabel}</b> from ${row.submitter_email}</p>
      <h2 style="margin:8px 0 4px">${escapeHtml(row.title)}</h2>
      <p style="white-space:pre-wrap">${escapeHtml(row.description)}</p>
      ${screenshotBlock}
      <p style="font-size:12px;color:#666">
        Page: <code>${escapeHtml(row.page_path || '')}</code><br/>
        Submitted: ${new Date(row.created_at).toLocaleString()}
      </p>
      <p><a href="https://crm.eclectik-insights.co/" style="color:#0a66c2">Open CRM → Admin → Feedback inbox</a></p>
    </div>
  `;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: ADMIN_EMAILS,
        subject: `[CRM ${row.type}] ${row.title}`,
        html,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return res.status(500).json({ error: `Resend ${resp.status}: ${JSON.stringify(data).slice(0, 200)}` });
    return res.status(200).json({ ok: true, messageId: data?.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
