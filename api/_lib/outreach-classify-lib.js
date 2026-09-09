// Pure helpers voor api/outreach-classify.js - apart bestand zodat vitest ze
// zonder Anthropic- of Supabase-verbinding kan testen. (Bestanden onder api/_lib
// worden niet als endpoint gedeployed.)
//
// Hier staan de classificatieprompt en de parser. Bewust op één plek: een
// testscript dat zijn eigen kopie van de prompt meeneemt gaat driften, en dan
// test je iets anders dan wat er in productie draait.

export const MODEL = 'claude-opus-5';

// Bewust GEEN samenvatting: de tab toont de echte tekst van het antwoord
// (body_preview). Dat is korter dan een parafrase en je leest wat iemand
// werkelijk schreef in plaats van een interpretatie ervan.
export const SYSTEM = `Je classificeert antwoorden op een persoonlijke uitnodiging voor een zakelijk event.

Geef ALLEEN geldige JSON terug, zonder inleiding, zonder codeblok:
{"classification":"interested|declined|ooo|referral|bounce|other","confidence":0.0-1.0,"ooo_until":"YYYY-MM-DD of null","referral_name":"naam of null","referral_email":"adres of null"}

Regels:
- Een vraag over datum, programma, locatie of praktische zaken is "interested".
- Expliciet afwijzen of geen interesse is "declined".
- "Stuur het naar X" of doorverwijzen naar een collega is "referral"; vul dan referral_name en indien bekend referral_email.
- Een automatisch antwoord zonder mens erachter is "ooo"; vul ooo_until als er een terugkeerdatum in staat.
- Een systeemmelding over niet-bezorgen is "bounce".
- Twijfel je, of gaat het over iets anders, dan "other" met een lage confidence.
- confidence is je eigen zekerheid; wees streng, want bij lage confidence stopt het systeem de opvolging en laat het een mens kijken.`;

export const VALID_CLASSIFICATIONS = ['interested', 'declined', 'ooo', 'referral', 'bounce', 'other'];

/**
 * Haalt de JSON uit het modelantwoord, ook als er een codeblok of een regel
 * tekst om heen staat. Geeft null als er niets bruikbaars in zit; de aanroeper
 * behandelt dat als "onbekend", en de confidence-drempel in
 * statusAfterClassification houdt de status dan vast voor review.
 *
 * Een onbekende classificatie wordt bewust null met confidence 0, niet
 * doorgelaten: anders zou een verzonnen label als "maybe" ongezien de
 * statusmachine in lopen.
 */
export function parseClassification(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  let o;
  try {
    o = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object') return null;

  const label = typeof o.classification === 'string' ? o.classification.trim().toLowerCase() : null;
  const known = label && VALID_CLASSIFICATIONS.includes(label);
  const conf = Number(o.confidence);
  const str = (v) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim() : null);

  return {
    classification: known ? label : null,
    // Onbekend label betekent geen vertrouwen, ongeacht wat het model beweert.
    confidence: known && Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0,
    ooo_until: str(o.ooo_until),
    referral_name: str(o.referral_name),
    referral_email: str(o.referral_email),
  };
}
