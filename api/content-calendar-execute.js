import { requireCron } from './_lib/guard.js';
import { sendBroadcast } from './_lib/send-broadcast.js';
import { createLinkedInPost } from './_lib/unipile-post.js';
import { sendLinkedInDM } from './_lib/unipile-dm.js';
import { contentTextToHtml } from './_lib/content-html.js';
import { appendSignature } from './_lib/signatures.js';
import { excludeAlreadyReached } from '../src/bd/content-calendar-logic.js';
import { createClient } from '@supabase/supabase-js';

// Alle content-LinkedIn-posts gaan via Marco's account (afspraak). Overschrijfbaar
// via env zonder code-wijziging. Zie CLAUDE.md §5 voor de account-map.
const CONTENT_LINKEDIN_ACCOUNT_ID = process.env.CONTENT_LINKEDIN_ACCOUNT_ID || 'KYq2oN8JSPiAQSrcIfT5Ew';

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

// Ontvangers voor een e-mail-item. Voorkeur: bevroren target_contact_ids;
// anders fallback naar de tag. Beide paden filteren op content-opt-in, e-mail,
// en slaan afgemelde/inactieve/former contacten over (compliance-vangnet).
async function baseContactIds(item) {
  if (Array.isArray(item.target_contact_ids) && item.target_contact_ids.length) {
    return { ids: item.target_contact_ids };
  }
  const tagId = await resolveTagId(item.target_tag);
  if (!tagId) return { error: `tag "${item.target_tag || '(leeg)'}" niet gevonden` };
  const links = await supabase.from('contact_tags').select('contact_id').eq('tag_id', tagId);
  return { ids: (links.data || []).map(r => r.contact_id) };
}

async function recipientsForItem(item) {
  const { ids, error: baseErr } = await baseContactIds(item);
  if (baseErr) return { error: baseErr };
  if (!ids || ids.length === 0) return { recipients: [] };
  const rows = [];
  for (let i = 0; i < ids.length; i += 500) {
    let q = supabase.from('contacts')
      .select('id, email, first_name, last_name, do_not_email, former, stage')
      .in('id', ids.slice(i, i + 500))
      .not('email', 'is', null);
    // Cold outreach negeert de opt-in-eis; do_not_email/afgemeld/former/inactief
    // blijven altijd uitgesloten (hieronder + in sendBroadcast).
    if (!item.cold_outreach) q = q.eq('marketing_content_opt_in', true);
    const { data, error } = await q;
    if (error) return { error: error.message };
    rows.push(...(data || []));
  }
  // Inactieve/former contacten overslaan (zelfde regel als de app: stage 'inactive' of former=true).
  const active = rows.filter(r => !r.former && String(r.stage || '').toLowerCase() !== 'inactive');

  // Dubbel-beveiliging: sluit contacten uit die deze uiting al kregen (het
  // origineel of een andere kopie uit dezelfde familie). Permanent, los van de
  // 5-dagen-cooldown in sendBroadcast. content_family_reached() bepaalt de familie.
  const { data: reached, error: reachedErr } = await supabase.rpc('content_family_reached', { p_item_id: item.id });
  if (reachedErr) return { error: `dedup-check faalde: ${reachedErr.message}` };
  const { kept, skipped } = excludeAlreadyReached(active, reached || []);
  if (skipped > 0) console.log('[content-calendar-execute] uiting-dedup: overgeslagen', { item: item.id, skipped });
  return { recipients: kept };
}

// Cold-outreach dript per run een klein aantal (default 7 -> ~28/uur bij de */15-cron)
// om spamdetectie te minimaliseren. Instelbaar via env CONTENT_DRIP_PER_RUN.
const DRIP_PER_RUN = Math.max(1, Number(process.env.CONTENT_DRIP_PER_RUN) || 7);

async function publishEmail(item) {
  if (!item.subject) return { ok: false, reason: 'e-mail zonder onderwerp' };
  const { recipients, error } = await recipientsForItem(item);
  if (error) return { ok: false, reason: error };
  if (!recipients || recipients.length === 0) return { ok: false, reason: item.cold_outreach ? 'geen verzendbare ontvangers in de selectie' : 'geen opted-in ontvangers in de selectie' };

  const html_body = appendSignature(contentTextToHtml(item.body), item.from_email);
  const from_email = item.from_email || undefined;
  const from_name = item.from_name || undefined;
  const channel = String(item.channel).toUpperCase();

  // COLD OUTREACH -> gedoseerd versturen (drip), voortgang in sent_emails.
  if (item.cold_outreach) {
    const already = new Set((item.sent_emails || []).map(e => String(e).toLowerCase()));
    const remaining = recipients.filter(r => !already.has(String(r.email).toLowerCase()));
    if (remaining.length === 0) {
      return { ok: true, done: true, recipients: already.size };
    }
    const batch = remaining.slice(0, DRIP_PER_RUN);
    const send = await sendBroadcast({
      subject: item.subject, html_body, recipients: batch, from_email, from_name,
      campaign_name: `[${channel}] ${item.subject} (drip)`,
      contentItemId: item.id,
    });
    if (!send.ok) return { ok: false, reason: send.error || 'drip-verzending mislukt' };
    // Alle geprobeerde adressen als 'gedaan' markeren (ook globaal-afgemelde die
    // sendBroadcast oversloeg), zodat ze niet elke run opnieuw worden geprobeerd.
    const sent_emails = [...(item.sent_emails || []), ...batch.map(b => b.email)];
    const done = remaining.length <= batch.length;
    return {
      ok: true, done, partial: !done, sent_emails,
      recipients: sent_emails.length, total: recipients.length,
      external_message_id: send.result?.broadcast_id || null,
    };
  }

  // Normaal (opted-in) -> één broadcast ineens.
  const send = await sendBroadcast({
    subject: item.subject, html_body, recipients, from_email, from_name,
    campaign_name: `[${channel}] ${item.subject}`,
    contentItemId: item.id,
  });
  if (!send.ok) return { ok: false, reason: send.error || 'broadcast mislukt' };
  return { ok: true, done: true, external_message_id: send.result?.broadcast_id || null, recipients: send.result?.recipients ?? recipients.length };
}

async function publishLinkedInPost(item) {
  if (!item.body || !String(item.body).trim()) return { ok: false, reason: 'lege tekst' };
  const accountId = item.linkedin_account_id || CONTENT_LINKEDIN_ACCOUNT_ID;
  const res = await createLinkedInPost({ accountId, text: item.body });
  if (!res.ok) return { ok: false, reason: res.error || 'LinkedIn-post mislukt' };
  return { ok: true, external_message_id: res.postId || null };
}

async function publishLinkedInDM(item) {
  if (!item.body || !String(item.body).trim()) return { ok: false, reason: 'lege tekst' };
  if (!item.recipient_contact_id) return { ok: false, reason: 'geen ontvanger gekozen' };
  const { data: c, error } = await supabase.from('contacts')
    .select('linkedin_url').eq('id', item.recipient_contact_id).single();
  if (error) return { ok: false, reason: `ontvanger ophalen: ${error.message}` };
  if (!c?.linkedin_url) return { ok: false, reason: 'ontvanger heeft geen LinkedIn-URL' };
  const accountId = item.linkedin_account_id || CONTENT_LINKEDIN_ACCOUNT_ID;
  const res = await sendLinkedInDM({ accountId, linkedinUrl: c.linkedin_url, text: item.body });
  if (!res.ok) return { ok: false, reason: res.error || 'LinkedIn-DM mislukt' };
  return { ok: true, external_message_id: res.messageId || null };
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

  const stats = { due: (due || []).length, published: 0, skipped: 0, failed: 0 };
  const details = [];

  for (const item of (due || [])) {
    let outcome;
    try {
      if (item.type === 'email') outcome = await publishEmail(item);
      else if (item.type === 'linkedin_post') outcome = await publishLinkedInPost(item);
      else if (item.type === 'linkedin_dm') outcome = await publishLinkedInDM(item);
      else { stats.skipped++; details.push({ id: item.id, type: item.type, status: 'skipped (onbekend type)' }); continue; }
    } catch (e) {
      outcome = { ok: false, reason: e.message };
    }
    if (outcome.ok && outcome.partial) {
      // Drip nog niet klaar: alleen voortgang opslaan, item blijft 'scheduled'
      // zodat de volgende run de volgende batch verstuurt.
      const { error: upErr } = await supabase.from('content_calendar_items').update({
        sent_emails: outcome.sent_emails,
        updated_at: new Date().toISOString(),
      }).eq('id', item.id);
      if (upErr) {
        console.error('[content-calendar-execute] drip-batch verzonden maar voortgang-update faalde', item.id, upErr.message);
        stats.failed++;
        details.push({ id: item.id, channel: item.channel, status: 'drip-sent-but-not-tracked', error: upErr.message });
      } else {
        stats.sending = (stats.sending || 0) + 1;
        details.push({ id: item.id, channel: item.channel, status: 'sending (drip)', sent: outcome.recipients, total: outcome.total });
      }
    } else if (outcome.ok) {
      const upd = {
        status: 'published',
        published_at: new Date().toISOString(),
        external_message_id: outcome.external_message_id,
        published_recipient_count: outcome.recipients ?? null,
        updated_at: new Date().toISOString(),
      };
      if (outcome.sent_emails) upd.sent_emails = outcome.sent_emails;
      const { error: upErr } = await supabase.from('content_calendar_items').update(upd).eq('id', item.id);
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
