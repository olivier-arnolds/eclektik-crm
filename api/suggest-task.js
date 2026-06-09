import { requireUser } from './_lib/guard.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Strip HTML tags + decode common entities, then collapse whitespace.
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Try to isolate the latest message in a thread by cutting at the first
// boundary marker (most mail clients prefix forwarded/quoted blocks).
const REPLY_MARKERS = [
  /\nFrom:\s/,
  /\nOn .+ wrote:/,
  /\n-----Original Message-----/,
  /\n_{5,}\s*From:/,
  /\nVan:\s/,                  // NL Outlook
  /\nVerzonden:\s/,
];
function latestMessageOnly(text) {
  if (!text) return '';
  let cut = text.length;
  for (const re of REPLY_MARKERS) {
    const m = text.match(re);
    if (m && m.index < cut) cut = m.index;
  }
  return text.slice(0, cut).trim();
}

const TASK_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Concise, action-oriented task title (max 80 chars). Use imperative form, e.g. "Reply to NDA request from Patrizio".',
    },
    description: {
      type: 'string',
      description: 'Optional 1-3 sentence description with the relevant context from the email so the user can act without re-reading the thread. Empty string if title is self-explanatory.',
    },
    priority: {
      type: 'string',
      enum: ['Low', 'Normal', 'High'],
      description: 'High only when the email signals urgency (deadline today/tomorrow, escalation, blocker). Low for FYI / no clear action. Otherwise Normal.',
    },
    due_date_iso: {
      type: 'string',
      description: 'YYYY-MM-DD due date. Use the deadline mentioned in the email if any. Otherwise pick a sensible default: tomorrow for asks, +3 days for general follow-ups, empty string for FYI.',
    },
  },
  required: ['title', 'description', 'priority', 'due_date_iso'],
  additionalProperties: false,
};

const SYSTEM = `You convert a single business email into a CRM task.
Read only the LATEST message (everything quoted from earlier replies has been stripped).
Output valid JSON matching the provided schema. Be concrete and short.
Today's date for due-date reasoning: ${new Date().toISOString().slice(0, 10)}.`;

async function callClaude(model, content) {
  return anthropic.messages.create({
    model,
    max_tokens: 600,
    system: SYSTEM,
    messages: [{ role: 'user', content }],
    output_config: {
      format: { type: 'json_schema', schema: TASK_SCHEMA },
    },
  });
}

export default async function handler(req, res) {
  // Auth guard (v1.39.0): only logged-in CRM users may call this endpoint.
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { subject = '', fromName = '', body = '' } = req.body || {};

  const cleanBody = latestMessageOnly(stripHtml(body)).slice(0, 6000);
  if (!cleanBody && !subject) {
    return res.status(400).json({ error: 'Empty email — nothing to summarize.' });
  }

  const userContent = [
    `From: ${fromName || '(unknown)'}`,
    `Subject: ${subject || '(no subject)'}`,
    '',
    'Latest message body:',
    cleanBody || '(empty)',
  ].join('\n');

  let response;
  try {
    response = await callClaude('claude-haiku-4-5', userContent);
  } catch (err) {
    // If the primary model is unavailable for some reason, fall back to 3.5.
    console.warn('haiku-4-5 failed, falling back:', err?.message || err);
    try {
      response = await callClaude('claude-3-5-haiku-20241022', userContent);
    } catch (err2) {
      console.error('haiku-3-5 also failed:', err2?.message || err2);
      return res.status(502).json({ error: 'AI suggestion failed: ' + (err2?.message || 'unknown') });
    }
  }

  // output_config.format guarantees the first text block is valid JSON
  const text = (response.content || []).find(b => b.type === 'text')?.text;
  if (!text) {
    return res.status(502).json({ error: 'No text returned from model' });
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return res.status(502).json({ error: 'Model returned non-JSON', raw: text.slice(0, 500) });
  }

  return res.status(200).json(parsed);
}
