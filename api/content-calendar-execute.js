import { requireCron } from './_lib/guard.js';
import { sendBroadcast } from './_lib/send-broadcast.js';
import { createClient } from '@supabase/supabase-js';

// Content Calendar publish-cron (stap 6: e-mail). Vindt goedgekeurde, geplande
// items waarvan de tijd verstreken is (status='scheduled' AND scheduled_at<=now())
// en publiceert ze. E-mail gaat via de gedeelde Resend-broadcast (segment =
// contacten met item.target_tag EN marketing_content_opt_in=true). LinkedIn-types
// worden nog overgeslagen (stap 7-8). Bij succes: status='published',
// published_at, external_message_id. Bij mislukking blijft het item 'scheduled'
// en wordt het de volgende run opnieuw geprobeerd.
//
// Bewust klein per run (timeout-veilig); de cron draait vaak genoeg om de wachtrij
// te legen.

export const config = { maxDuration: 60 };

const BATCH = 3; // max items per run
const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// Plain-text body -> simpele HTML (dubbele newline = alinea, enkele = <br>).
// {{first_name}} blijft staan; sendBroadcast zet het om naar Resend's merge-tag.
function textToHtml(text) {
  const paras = String(text || '')
    .split(/\n{2,}/)
    .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222222">${paras}</body></html>`;
}

// target_tag kan een tag-naam of een tag-id zijn. Geeft het tag-id terug (of null).
async function resolveTagId(targetTag) {
  const t = String(targetTag || '').trim();
  if (!t) return null;
  const byName = await supabase.from('tags').select('id').ilike('name', t).limit(1);
  if (byName.data && byName.data.length) return byName.data[0].id;
  if (UUID_RE.test(t)) {
    const byId = await supabase.from('tags').select('id').eq('id', t).limit(1);
    if (byId.data && byId.data.length) return byId.data[0].id;
  }
  return null;
}

// Ontvangers voor een e-mail-item: contacten met de tag EN de content-opt-in EN een e-mail.
async function recipientsForItem(item) {
  const tagId = await resolveTagId(item.target_tag);
  if (!tagId) return { error: `tag "${item.target_tag || '(leeg)'}" niet gevonden` };
  const links = await supabase.from('contact_tags').select('contact_id').eq('tag_id', tagId);
  const ids = (links.data || []).map(r => r.contact_id);
  if (ids.length === 0) return { recipients: [] };
  const rows = [];
  for (let i = 0; i < ids.length; i += 500) {
    const { data, error } = await supabase.from('contacts')
      .select('id, email, first_name, do_not_email')
      .in('id', ids.slice(i, i + 500))
      .eq('marketing_content_opt_in', true)
      .not('email', 'is', null);
    if (error) return { error: error.message };
    rows.push(...(data || []));
  }
  return { recipients: rows };
}

async function publishEmail(item) {
  if (!item.subject) return { ok: false, reason: 'e-mail zonder onderwerp' };
  const { recipients, error } = await recipientsForItem(item);
  if (error) return { ok: false, reason: error };
  if (!recipients || recipients.length === 0) return { ok: false, reason: 'geen opted-in ontvangers voor deze tag' };

  const send = await sendBroadcast({
    subject: item.subject,
    html_body: textToHtml(item.body),
    recipients,
    campaign_name: `[${String(item.channel).toUpperCase()}] ${item.subject}`,
  });
  if (!send.ok) return { ok: false, reason: send.error || 'broadcast mislukt' };
  return { ok: true, external_message_id: send.result?.broadcast_id || null, recipients: send.result?.recipients ?? recipients.length };
}

export default async function handler(req, res) {
  if (!requireCron(req, res)) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase
    .from('content_calendar_items')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso)
    .order('scheduled_at', { ascending: true })
    .limit(BATCH);
  if (error) return res.status(500).json({ error: error.message });

  const stats = { due: (due || []).length, published: 0, skipped_linkedin: 0, failed: 0 };
  const details = [];

  for (const item of (due || [])) {
    if (item.type !== 'email') {
      // LinkedIn (post/dm) volgt in stap 7-8; laat 'scheduled' staan.
      stats.skipped_linkedin++;
      details.push({ id: item.id, type: item.type, status: 'skipped (linkedin, nog niet ondersteund)' });
      continue;
    }
    let outcome;
    try {
      outcome = await publishEmail(item);
    } catch (e) {
      outcome = { ok: false, reason: e.message };
    }
    if (outcome.ok) {
      const { error: upErr } = await supabase.from('content_calendar_items').update({
        status: 'published',
        published_at: new Date().toISOString(),
        external_message_id: outcome.external_message_id,
        updated_at: new Date().toISOString(),
      }).eq('id', item.id);
      if (upErr) {
        // Verzonden maar niet kunnen bijwerken: luid loggen (risico op dubbele verzending
        // bij de volgende run). Handmatig op 'published' zetten indien nodig.
        console.error('[content-calendar-execute] VERZONDEN maar status-update faalde', item.id, upErr.message);
        stats.failed++;
        details.push({ id: item.id, channel: item.channel, status: 'sent-but-not-marked', error: upErr.message });
      } else {
        stats.published++;
        details.push({ id: item.id, channel: item.channel, status: 'published', recipients: outcome.recipients });
      }
    } else {
      stats.failed++;
      details.push({ id: item.id, channel: item.channel, status: 'failed', reason: outcome.reason });
      console.warn('[content-calendar-execute] item niet gepubliceerd', item.id, outcome.reason);
    }
  }

  return res.status(200).json({ ok: true, at: nowIso, stats, details });
}
