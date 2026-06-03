// Daily cron — pollt Unipile voor LinkedIn-posts per signal_subject,
// dedupes via source_id, scoort via Claude, creëert suggestions bij score > 0.6.
//
// Trigger: vercel.json cron entry, 0 7 * * 1-5 (7u NL werkdagen).
// Force-trigger handmatig via ?force=true voor testing.

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { scoreLinkedInPost } from '../src/components/playbooks/lib/signalScoring.js';
import { shouldCreateSuggestion, findPlaybookForSignal, buildSourceContext } from '../src/components/playbooks/lib/signalSuggestionRules.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const UNIPILE_DSN = process.env.UNIPILE_BASE_URL || process.env.UNIPILE_DSN;
const UNIPILE_TOKEN = process.env.UNIPILE_API_KEY || process.env.UNIPILE_TOKEN;

const UNIPILE_ACCOUNTS = {
  'olivier@eclektik.co': 'tC2o50tiTBiRCt9xAnio3w',
  'marco@eclektik.co':   'KYq2oN8JSPiAQSrcIfT5Ew',
  'yarmilla@eclektik.co':'j9-n2jeNTtGUxemfjlBsZA',
};

async function unipileGet(path) {
  if (!UNIPILE_DSN || !UNIPILE_TOKEN) throw new Error('Unipile not configured');
  const url = `https://${UNIPILE_DSN}/api/v1${path}`;
  const resp = await fetch(url, {
    headers: { 'X-API-KEY': UNIPILE_TOKEN, 'accept': 'application/json' },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.message || `Unipile ${resp.status}`);
  return data;
}

export default async function handler(req, res) {
  const force = req.query?.force === 'true';
  const limit = Number(req.query?.limit) || 50;

  const stats = {
    subjects_polled: 0,
    posts_seen: 0,
    new_signals: 0,
    signals_scored: 0,
    suggestions_created: 0,
    errors: [],
  };

  try {
    const accountId = UNIPILE_ACCOUNTS['olivier@eclektik.co'];

    const { data: subjects, error } = await supabase
      .from('signal_subjects')
      .select('*, contacts(*), companies(*)')
      .eq('enabled', true)
      .order('last_polled_at', { ascending: true, nullsFirst: true })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch subjects: ${error.message}`);

    const { data: activePlaybooks } = await supabase
      .from('playbooks')
      .select('id, trigger_type, trigger_config, version, name')
      .eq('status', 'active');

    for (const subject of subjects || []) {
      try {
        await processSubject(subject, accountId, activePlaybooks || [], stats);
        stats.subjects_polled++;
      } catch (err) {
        stats.errors.push({ subject_id: subject.id, error: err.message });
      }
    }

    res.status(200).json({ status: 'ok', stats });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
}

async function processSubject(subject, accountId, activePlaybooks, stats) {
  // Resolve LinkedIn URL to internal Unipile-acceptable ID.
  // Two-step pattern (same as api/unipile.js get-posts):
  //   Persons:   GET /users/{slug}?account_id=X  -> data.provider_id  -> /users/{provider_id}/posts
  //   Companies: GET /linkedin/company/{slug}?account_id=X -> data.id -> /users/{id}/posts?is_company=true

  let slug, isCompany;
  if (subject.contact_id) {
    const contact = subject.contacts;
    if (!contact?.linkedin_url) return;
    const m = contact.linkedin_url.match(/linkedin\.com\/in\/([^\/\?]+)/);
    if (!m) return;
    slug = m[1];
    isCompany = false;
  } else if (subject.company_id) {
    const company = subject.companies;
    if (!company?.linkedin_url) return;
    const m = company.linkedin_url.match(/linkedin\.com\/company\/([^\/\?]+)/);
    if (!m) return;
    slug = m[1];
    isCompany = true;
  } else {
    return;
  }

  // Step 1: resolve slug to internal ID
  let resolvedId;
  if (isCompany) {
    const companyResult = await unipileGet(`/linkedin/company/${encodeURIComponent(slug)}?account_id=${accountId}`);
    resolvedId = companyResult.id;
    if (!resolvedId && companyResult.entity_urn) {
      const numMatch = companyResult.entity_urn.match(/(\d+)$/);
      if (numMatch) resolvedId = numMatch[1];
    }
    if (!resolvedId) throw new Error(`Could not resolve company ID for slug ${slug}`);
  } else {
    const personResult = await unipileGet(`/users/${encodeURIComponent(slug)}?account_id=${accountId}`);
    resolvedId = personResult.provider_id;
    if (!resolvedId) throw new Error(`Could not resolve provider_id for slug ${slug}`);
  }

  // Step 2: fetch posts using the resolved ID
  const isCompanyParam = isCompany ? '&is_company=true' : '';
  const data = await unipileGet(`/users/${encodeURIComponent(resolvedId)}/posts?limit=10&account_id=${accountId}${isCompanyParam}`);
  const posts = data.items || data.data || [];
  stats.posts_seen += posts.length;

  for (const post of posts) {
    const sourceId = post.id || post.urn || post.post_urn;
    if (!sourceId) continue;

    const { data: existing } = await supabase
      .from('signals')
      .select('id')
      .eq('source', subject.source_type)
      .eq('source_id', sourceId)
      .limit(1);
    if (existing?.length) continue;

    const postText = post.text || post.body || post.content || '';
    const postUrl = post.url || post.permalink || null;
    const rawPostedAt = post.posted_at || post.date || post.created_at;
    const postedAt = parsePostedAt(rawPostedAt);

    const insertPayload = {
      source: subject.source_type,
      source_id: sourceId,
      content: postText.slice(0, 4000),
      post_url: postUrl,
      posted_at: postedAt,
      contact_id: subject.contact_id,
      company_id: subject.company_id,
    };

    const { data: newSignalRows, error: insertErr } = await supabase
      .from('signals')
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      stats.errors.push({ source_id: sourceId, error: insertErr.message });
      continue;
    }

    stats.new_signals++;

    if (anthropic) {
      try {
        const scoreResult = await scoreLinkedInPost({
          anthropic,
          post: { text: postText },
          contact: subject.contacts,
          company: subject.companies,
        });

        await supabase.from('signals')
          .update({
            relevance_score: scoreResult.score,
            scoring_reason: scoreResult.reason,
            topic_tags: scoreResult.topics,
          })
          .eq('id', newSignalRows.id);

        stats.signals_scored++;

        const enrichedSignal = { ...newSignalRows, ...scoreResult, relevance_score: scoreResult.score };
        if (shouldCreateSuggestion(enrichedSignal)) {
          const playbook = findPlaybookForSignal(enrichedSignal, activePlaybooks);
          if (playbook) {
            const { data: existingSuggestion } = await supabase
              .from('playbook_suggestions')
              .select('id')
              .eq('playbook_id', playbook.id)
              .eq('contact_id', subject.contact_id)
              .eq('status', 'pending')
              .limit(1);

            if (!existingSuggestion?.length) {
              await supabase.from('playbook_suggestions').insert({
                playbook_id: playbook.id,
                contact_id: subject.contact_id,
                source: subject.source_type,
                source_context: buildSourceContext(enrichedSignal),
                status: 'pending',
              });
              stats.suggestions_created++;

              await supabase.from('signals')
                .update({ resolved_at: new Date().toISOString() })
                .eq('id', newSignalRows.id);
            }
          }
        }
      } catch (err) {
        stats.errors.push({ signal_id: newSignalRows.id, scoring_error: err.message });
      }
    }
  }

  await supabase.from('signal_subjects')
    .update({ last_polled_at: new Date().toISOString() })
    .eq('id', subject.id);
}

// Unipile levert posted_at vaak als relatieve string ("5h", "1d", "2w", "1mo")
// in plaats van ISO-timestamp. Parse naar absolute ISO-string of return null.
function parsePostedAt(raw) {
  if (!raw) return null;
  // Already ISO-ish? trust the DB to parse
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  // Try numeric epoch (ms or seconds)
  if (typeof raw === 'number' || /^\d+$/.test(raw)) {
    const n = Number(raw);
    const ms = n > 1e12 ? n : n * 1000; // heuristic: ms vs seconds
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  // Relative: "5h", "14h", "1d", "5d", "1w", "2w", "1mo", "2mo", "1y"
  const m = String(raw).match(/^(\d+)\s*(h|d|w|mo|m|y)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const msPerUnit = {
    h: 3600 * 1000,
    d: 86400 * 1000,
    w: 7 * 86400 * 1000,
    mo: 30 * 86400 * 1000,
    m: 30 * 86400 * 1000,
    y: 365 * 86400 * 1000,
  }[unit];
  if (!msPerUnit) return null;
  return new Date(Date.now() - n * msPerUnit).toISOString();
}
