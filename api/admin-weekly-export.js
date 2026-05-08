// Weekly database export — generates a single Markdown snapshot of the
// CRM and emails it to the admin_jobs row's recipients.
//
// Two trigger modes:
//   - Vercel cron:  GET /api/admin-weekly-export?cron=1
//                   Only runs when the job row's enabled=true.
//   - Manual run:   POST /api/admin-weekly-export
//                   Runs regardless of enabled (for the "Run now" button).
//
// On either path: collects all main tables, builds Markdown, sends via
// Resend with a .md attachment, and updates the job row's last_run_*.
import { createClient } from '@supabase/supabase-js';

const RESEND_API = 'https://api.resend.com/emails';
const JOB_TYPE = 'weekly_db_export';

const TABLES = [
  'companies', 'contacts', 'leads', 'opportunities', 'follow_ups',
  'tasks', 'comms', 'calendar_events', 'tags', 'contact_tags',
  'campaigns', 'campaign_sends', 'linkedin_posts', 'meeting_notes',
];

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

function rowsToTable(rows) {
  if (!rows || rows.length === 0) return '_empty_\n';
  const cols = Array.from(new Set(rows.flatMap(r => Object.keys(r || {}))));
  const head = '| ' + cols.join(' | ') + ' |';
  const sep  = '| ' + cols.map(() => '---').join(' | ') + ' |';
  const body = rows.map(r => '| ' + cols.map(c => formatCell(r[c])).join(' | ') + ' |').join('\n');
  return head + '\n' + sep + '\n' + body + '\n';
}

function formatCell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') {
    // Markdown-escape pipes and newlines so the table doesn't break
    return v.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 300);
  }
  if (Array.isArray(v) || typeof v === 'object') {
    return '`' + JSON.stringify(v).replace(/\|/g, '\\|').slice(0, 300) + '`';
  }
  return String(v);
}

async function buildMarkdown() {
  const today = new Date();
  const stamp = today.toISOString().split('T')[0];
  const lines = [
    `# Eclectik CRM — weekly export`,
    ``,
    `Snapshot: **${today.toUTCString()}**`,
    ``,
    `## Summary`,
    ``,
  ];
  const counts = [];
  const sections = [];

  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select('*').limit(5000);
    const rows = error ? [] : (data || []);
    counts.push(`- **${t}**: ${rows.length}${error ? ` _(error: ${error.message})_` : ''}`);
    sections.push(`## ${t} (${rows.length})\n\n${rowsToTable(rows)}\n`);
  }

  lines.push(...counts, ``, `---`, ``, ...sections);
  return { stamp, content: lines.join('\n') };
}

async function sendExport({ recipients, mdContent, stamp }) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');
  const fromName = process.env.MARKETING_FROM_NAME || 'Eclectik CRM';
  const fromEmail = process.env.MARKETING_FROM_EMAIL;
  if (!fromEmail) throw new Error('MARKETING_FROM_EMAIL not configured');

  const fileName = `eclectik-crm-export-${stamp}.md`;
  const base64 = Buffer.from(mdContent, 'utf8').toString('base64');

  const resp = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: recipients,
      subject: `Eclectik CRM weekly export — ${stamp}`,
      html: `<p>The weekly Eclectik CRM database snapshot is attached as a Markdown file.</p>
             <p>You can paste it into Claude or any text editor for quick analysis.</p>
             <p><small>Generated ${new Date().toUTCString()}</small></p>`,
      attachments: [{ filename: fileName, content: base64 }],
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Resend ${resp.status}: ${data?.message || JSON.stringify(data).slice(0, 200)}`);
  return { messageId: data?.id || null, fileName, size: mdContent.length };
}

export default async function handler(req, res) {
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const isCron = req.method === 'GET' && req.query?.cron === '1';
  const isManual = req.method === 'POST';
  if (!isCron && !isManual) return res.status(405).json({ error: 'GET ?cron=1 or POST required' });

  // Look up the job row
  const { data: job, error: jobErr } = await supabase
    .from('admin_jobs').select('*').eq('job_type', JOB_TYPE).maybeSingle();
  if (jobErr) return res.status(500).json({ error: 'job lookup: ' + jobErr.message });
  if (!job) return res.status(404).json({ error: `job ${JOB_TYPE} not found in admin_jobs` });

  if (isCron && !job.enabled) {
    return res.status(200).json({ skipped: 'job is disabled', job_type: JOB_TYPE });
  }
  if (!Array.isArray(job.recipients) || job.recipients.length === 0) {
    await supabase.from('admin_jobs').update({
      last_run_at: new Date().toISOString(),
      last_run_status: 'failed',
      last_run_error: 'No recipients configured',
    }).eq('id', job.id);
    return res.status(400).json({ error: 'No recipients configured for this job' });
  }

  try {
    const { stamp, content } = await buildMarkdown();
    const meta = await sendExport({ recipients: job.recipients, mdContent: content, stamp });
    await supabase.from('admin_jobs').update({
      last_run_at: new Date().toISOString(),
      last_run_status: 'success',
      last_run_error: null,
      last_run_meta: { ...meta, recipientsCount: job.recipients.length, trigger: isCron ? 'cron' : 'manual' },
    }).eq('id', job.id);
    return res.status(200).json({ success: true, ...meta });
  } catch (e) {
    await supabase.from('admin_jobs').update({
      last_run_at: new Date().toISOString(),
      last_run_status: 'failed',
      last_run_error: (e.message || String(e)).slice(0, 1000),
    }).eq('id', job.id);
    return res.status(500).json({ error: e.message || String(e) });
  }
}
