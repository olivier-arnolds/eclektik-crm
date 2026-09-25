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
    // RUIM, en dat is geen slordigheid maar een reparatie.
    //
    // Op claude-opus-5 staat thinking standaard aan. Die 200 tokens moesten dus
    // het denkwerk EN de JSON dekken. Bij een kort antwoord lukt dat; bij een
    // lang of meerledig bericht is het budget op voordat de JSON eruit komt,
    // parseClassification vindt dan niets en geeft null terug.
    //
    // Zichtbaar geworden toen de LinkedIn-scan hele gespreksdraden ging
    // meesturen in plaats van alleen het laatste bericht: het aantal mislukte
    // classificaties ging van een naar zes op twaalf antwoorden. Die kwamen
    // allemaal binnen als 'check handmatig: onbekend (0%)', niet te
    // onderscheiden van een echt twijfelgeval.
    //
    // Het antwoord zelf blijft klein (een regel JSON); dit budget is er voor
    // het denkwerk ervoor. We betalen alleen voor wat werkelijk gebruikt wordt.
    max_tokens: 2000,
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
