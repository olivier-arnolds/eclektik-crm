// Score een LinkedIn-post voor relevantie voor Eclektik's outreach-doelen.
// Gebruikt door api/signals-poll.js. Server-side only (key zit in env).

const SCORING_SYSTEM_PROMPT = `Je beoordeelt LinkedIn-posts voor outreach-relevantie voor Eclektik Insights, een Nederlands advisory-bureau gespecialiseerd in strategie, transformatie en executive coaching voor C-level en seniorenmanagement.

Geef een score 0.0-1.0:
- 0.0-0.3: niet relevant (vakantie-foto, generieke inspiratie-quote, dagelijkse routine)
- 0.3-0.6: matig relevant (algemene industrie-update, persoonlijke mening zonder hook)
- 0.6-0.8: relevant (nieuwe rol, project-launch, strategische verandering, fundraise, M&A)
- 0.8-1.0: zeer relevant (acute business-vraag, openbare uitdaging, vraag om advies, leiderschapsovergang)

Output strict JSON: {"score": 0.0-1.0, "reason": "1-zin uitleg", "topics": ["tag1","tag2"]}.
Geen markdown, geen \`\`\`json\`\`\` fences, alleen pure JSON.`;

export async function scoreLinkedInPost({ anthropic, post, contact, company }) {
  if (!anthropic) {
    throw new Error('Anthropic client not configured');
  }

  const contextLine = contact
    ? `Post-auteur: ${contact.full_name || contact.first_name} (${contact.title || 'rol onbekend'}) bij ${company?.name || contact.company_name || 'bedrijf onbekend'}.`
    : `Company post van: ${company?.name || 'onbekend'} (${company?.industry || 'sector onbekend'}).`;

  const userPrompt = `${contextLine}

Post-tekst:
"""
${(post.text || '').slice(0, 2000)}
"""

Geef je score-JSON.`;

  let raw;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: SCORING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    raw = msg.content[0]?.text || '';
  } catch (err) {
    const msg = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      system: SCORING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    raw = msg.content[0]?.text || '';
  }

  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?\n?/, '').replace(/```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      score: Math.max(0, Math.min(1, Number(parsed.score) || 0)),
      reason: String(parsed.reason || '').slice(0, 200),
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 5).map(String) : [],
    };
  } catch (err) {
    console.warn('[signalScoring] JSON parse failed:', raw.slice(0, 300));
    return { score: 0, reason: 'parse-error', topics: [] };
  }
}
