import { requireUser } from './_lib/guard.js';
import Anthropic from '@anthropic-ai/sdk';

// Korte, on-demand samenvatting van één contentstuk voor de rapportage-popup in
// de Content Calendar. Puur intern (geen client-facing tekst), dus de §2b-
// communicatieregels gelden hier niet. Guard: alleen ingelogde CRM-gebruikers.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channel, type, subject, body } = req.body || {};
  if (!body || !String(body).trim()) {
    return res.status(400).json({ error: 'body is verplicht' });
  }

  const text = String(body).replace(/\s+/g, ' ').slice(0, 4000);
  const prompt = `Vat het volgende interne contentstuk in 1-2 korte zinnen samen, in het Nederlands, zodat een collega in één oogopslag weet waar het over gaat. Geef ALLEEN de samenvatting terug, zonder inleiding of opmaak.

Kanaal: ${channel || 'onbekend'}
Type: ${type || 'onbekend'}
${subject ? `Onderwerp: ${subject}\n` : ''}Inhoud: ${text}`;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    const summary = (message.content[0]?.text || '').trim();
    return res.status(200).json({ summary });
  } catch (e) {
    console.error('content-summary generation failed:', e);
    return res.status(500).json({ error: 'Samenvatting mislukt: ' + e.message });
  }
}
