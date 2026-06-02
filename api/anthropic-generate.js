// Server-side wrapper voor Claude API — gebruikt door test-run modus
// in builder. Frontend kan niet direct Anthropic aanroepen (key zou
// lekken).

import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export default async function handler(req, res) {
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
        messages: [{ role: 'user', content: prompt }],
      });
      const text = msg.content[0]?.text || '';
      return res.status(200).json({ text });
    } catch (err2) {
      return res.status(500).json({ error: err2.message });
    }
  }
}
