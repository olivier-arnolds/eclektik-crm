import { requireUser } from './_lib/guard.js';
// Server-side wrapper voor Claude API — gebruikt door test-run modus
// in builder. Frontend kan niet direct Anthropic aanroepen (key zou
// lekken).

import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Zelfde regels als cron (api/playbook-execute.js). Zie CLAUDE.md §2b.
const EXTERNAL_COMMUNICATION_RULES = `Je schrijft een bericht dat naar een echte persoon verstuurd wordt (email, LinkedIn, WhatsApp, Instagram). Volg deze regels strikt:

VERBODEN:
- Em-dashes (—). Gebruik gewone streepjes (-) met spaties, of komma's, of splits in zinnen.
- Markdown-headers (# of ##). Berichten worden letterlijk getoond.
- Bullet lists (- of *) tenzij expliciet om gevraagd.
- Filler-openingen zoals "Hopelijk gaat het goed!" of "I hope this message finds you well".
- Emoji-overload. Maximaal 1 emoji per bericht, alleen als het natuurlijk past.

VOORKEUREN:
- Korte zinnen, natuurlijke spreektaal.
- Persoonlijk en concreet - verwijs naar specifieke dingen, niet generiek.
- Eindig met of een open vraag of een duidelijke call-to-action, niet beide.

Geef alleen de pure berichttekst terug, geen omhullende tekst, geen labels, geen "Hier is je bericht:".`;

export default async function handler(req, res) {
  // Auth guard (v1.39.0): only logged-in CRM users may call this endpoint.
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!anthropic) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { prompt, max_tokens = 600 } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt (string) required' });
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens,
      system: EXTERNAL_COMMUNICATION_RULES,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0]?.text || '';
    return res.status(200).json({ text });
  } catch (err) {
    // Fallback model if primary fails
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens,
        system: EXTERNAL_COMMUNICATION_RULES,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = msg.content[0]?.text || '';
      return res.status(200).json({ text });
    } catch (err2) {
      return res.status(500).json({ error: err2.message });
    }
  }
}
