// De Claude-aanroep voor het classificeren van een antwoord.
//
// Apart van outreach-classify-lib.js, want dat bestand is bewust puur (prompt en
// parser, testbaar zonder verbinding). En apart van het endpoint zelf, zodat
// api/outreach-reclassify.js dezelfde aanroep gebruikt zonder een endpoint te
// importeren. Zelfde reden als outreach-runner.js: twee kopieën van dezelfde
// beslissing gaan uit elkaar lopen, en dan classificeert de herstelactie anders
// dan de dagelijkse scan.

import Anthropic from '@anthropic-ai/sdk';
import { MODEL, SYSTEM, parseClassification } from './outreach-classify-lib.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * @param {{fromAddress?: string, subject?: string, bodyPreview?: string, bodyFull?: string}} bericht
 */
export async function classifyWithClaude({ fromAddress, subject, bodyPreview, bodyFull }) {
  // bodyFull heeft voorrang. bodyPreview is wat Graph in de lijstopvraag
  // teruggeeft en dat is per definitie de eerste 255 tekens; staat het bruikbare
  // deel daarna ("ik kan zelf niet, maar mijn collega wel"), dan zag de
  // classificatie dat nooit.
  const tekst = String(bodyFull || bodyPreview || '').replace(/\s+/g, ' ').slice(0, 4000);
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `Afzender: ${fromAddress || 'onbekend'}\n`
        + `Onderwerp: ${subject || '(geen)'}\n`
        + `Bericht: ${tekst}`,
    }],
  });
  const text = (message.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return parseClassification(text);
}
