import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// Generates an "AI brief" for an Account 360 view: a short narrative of what
// has happened with a client across every interaction stream (meetings,
// email, LinkedIn, Teams chats, internal Teams channel, notes, tasks, deal
// stage), plus a "needs attention" list. The frontend assembles and POSTs the
// already-matched interactions, so this endpoint does no account matching
// itself — it just summarises what it is given.
//
// Optional persistence: if an `account_briefs` table exists, the brief is
// upserted there (so it survives reloads and is shared across users). If the
// table is missing, persistence is skipped silently and the brief is still
// returned for ephemeral display.

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODELS = {
  haiku: 'claude-haiku-4-20250414',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { companyId, accountName, interactions, model } = req.body || {};
  if (!Array.isArray(interactions)) {
    return res.status(400).json({ error: 'interactions array required' });
  }
  const selectedModel = MODELS[model] || MODELS.sonnet;

  // Sort newest-first and cap the payload so the prompt stays bounded.
  const items = [...interactions]
    .filter(Boolean)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 60);

  if (items.length === 0) {
    return res.status(200).json({
      brief: { paragraphs: [], attention: [] },
      generatedAt: new Date().toISOString(),
      empty: true,
    });
  }

  const fmtDate = (d) => {
    if (!d) return 'unknown date';
    const dt = new Date(d);
    return isNaN(dt) ? 'unknown date' : dt.toISOString().slice(0, 10);
  };

  const lines = items.map((it) => {
    const parts = [
      fmtDate(it.date),
      it.type || it.channel || 'event',
      it.direction ? `(${it.direction})` : '',
      it.internal ? '[INTERNAL TEAM CHANNEL]' : '',
      it.who ? `by ${it.who}` : '',
      it.title ? `— ${it.title}` : '',
      it.text ? `: ${String(it.text).replace(/\s+/g, ' ').slice(0, 400)}` : '',
    ].filter(Boolean);
    return '- ' + parts.join(' ');
  });

  const prompt = `You are a business development analyst for Eclectik, a B2B consultancy (AI transformation, People Science / Microsoft Viva Glint, Microsoft 365 / Teams, and technical/Azure work).

Below is the full interaction history with the client "${accountName || 'this account'}", newest first. It merges several streams: client-facing email and meetings, LinkedIn, internal Teams chats, an INTERNAL team channel where Eclectik colleagues coordinate (marked [INTERNAL TEAM CHANNEL] — this is our own discussion ABOUT the client, not something the client said), notes logged against the deal, tasks, and deal-stage changes.

Write a concise relationship brief so a colleague can understand the state of play in ten seconds without reading every panel. Return ONLY valid JSON, no markdown fences, in exactly this shape:

{
  "paragraphs": [
    { "heading": "Where it stands", "body": "..." },
    { "heading": "The conversation so far", "body": "..." },
    { "heading": "From the team channel", "body": "..." }
  ],
  "attention": [
    { "text": "short actionable item", "meta": "source + date, why it matters" }
  ]
}

Rules:
- 2 to 4 paragraphs. Include "From the team channel" ONLY if there is internal-channel content; otherwise omit that paragraph.
- Each body is 1-3 sentences, plain text (no markdown). Refer to specific dates, people, amounts and the actual questions asked where present.
- "attention" = 0 to 5 items: unanswered client questions, things we owe them, upcoming due tasks, blockers. Be specific. If nothing is outstanding, return an empty array.
- Do not invent facts. Only use what is in the interactions. If something is unclear, say so plainly rather than guessing.
- Write in English.

INTERACTIONS:
${lines.join('\n')}`;

  let brief;
  try {
    const message = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 1400,
      messages: [{ role: 'user', content: prompt }],
    });
    let raw = message.content[0]?.text || '';
    // Strip accidental code fences and isolate the JSON object.
    raw = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);
    brief = JSON.parse(raw);
  } catch (e) {
    console.error('account-summary generation failed:', e);
    return res.status(500).json({ error: 'Brief generation failed: ' + e.message });
  }

  if (!brief || !Array.isArray(brief.paragraphs)) {
    brief = { paragraphs: [], attention: Array.isArray(brief?.attention) ? brief.attention : [] };
  }
  if (!Array.isArray(brief.attention)) brief.attention = [];

  const generatedAt = new Date().toISOString();

  // Best-effort persistence — silently skip if the table doesn't exist yet.
  if (companyId) {
    try {
      await supabase
        .from('account_briefs')
        .upsert(
          {
            company_id: companyId,
            brief,
            interaction_count: items.length,
            generated_at: generatedAt,
            model: selectedModel,
          },
          { onConflict: 'company_id' }
        );
    } catch (e) {
      // table missing or RLS — ephemeral mode, no problem
    }
  }

  return res.status(200).json({ brief, generatedAt, interactionCount: items.length });
}
