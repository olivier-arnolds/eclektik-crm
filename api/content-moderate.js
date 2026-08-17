import { requireUser } from './_lib/guard.js';
import Anthropic from '@anthropic-ai/sdk';

// Content-moderatie ("Criticus") — poortwachter bij het goedkeuren van een
// content-kalender-item. De frontend roept dit aan zodra iemand "Goedgekeurd"
// aanzet op een nog niet-goedgekeurd item; bij verdict 'fail' blokkeert de UI de
// goedkeuring en toont de verbeterpunten (met een expliciete "toch goedkeuren"-
// override — de mens blijft eindverantwoordelijk).
//
// De system-prompt is de letterlijke Criticus-rol uit het Claude Project, plus
// de bronhiërarchie-regel, de redactionele lijn (§4 handoff-spec) en de externe-
// communicatieregels (CLAUDE.md §2b). Zie ook api/anthropic-generate.js /
// api/playbook-execute.js voor hetzelfde aanroeppatroon.

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// ─────────────────────────────────────────────────────────────────────────
// HUISSTIJL-SJABLOON (data-gestuurd — vul dit later met écht Eclectik-materiaal)
//
// De Criticus toetst content tegen de huisstijl aan de hand van voorbeeldposts.
// In dit traject is dat contextblok nooit met echt materiaal ingevuld. Zolang
// deze velden leeg zijn, wordt de huisstijl-check OVERGESLAGEN (altijd pass) —
// dan zou hij tegen niets toetsen. Vul de velden + voorbeeldposts in en de check
// gaat vanzelf leven; er hoeft geen code herbouwd te worden, alleen data toe-
// gevoegd. Laat `examples` gevuld zijn om de check te activeren.
const STYLE_GUIDE = {
  brand: '',        // Merk/klant
  audience: '',     // Doelgroep
  toneOfVoice: '',  // Tone-of-voice
  do: '',           // Wat wel
  dont: '',         // Wat niet
  channels: '',     // Kanalen (per-kanaal nuances, indien van toepassing)
  examples: [],     // Voorbeeldposts (strings). LEEG = huisstijl-check overslaan.
};

const styleGuideActive = () =>
  Array.isArray(STYLE_GUIDE.examples) && STYLE_GUIDE.examples.length > 0;

function styleGuideBlock() {
  if (!styleGuideActive()) return '';
  const lines = [
    'HUISSTIJL (toets de content hiertegen):',
    STYLE_GUIDE.brand && `- Merk/klant: ${STYLE_GUIDE.brand}`,
    STYLE_GUIDE.audience && `- Doelgroep: ${STYLE_GUIDE.audience}`,
    STYLE_GUIDE.toneOfVoice && `- Tone-of-voice: ${STYLE_GUIDE.toneOfVoice}`,
    STYLE_GUIDE.do && `- Wat wel: ${STYLE_GUIDE.do}`,
    STYLE_GUIDE.dont && `- Wat niet: ${STYLE_GUIDE.dont}`,
    STYLE_GUIDE.channels && `- Kanalen: ${STYLE_GUIDE.channels}`,
    '',
    'Voorbeeldposts die de huisstijl illustreren:',
    ...STYLE_GUIDE.examples.map((e, i) => `[voorbeeld ${i + 1}]\n${e}`),
  ].filter(Boolean);
  return lines.join('\n');
}

function buildSystemPrompt() {
  const style = styleGuideBlock();
  return `Je bent de Criticus in Eclectik's content-pijplijn (Scout/Strateeg/Schrijver/Criticus). Je beoordeelt het werk van de Schrijver kritisch VOORDAT de gebruiker het publiceert. Je bent er niet om aardig te zijn: ga eerst actief op zoek naar zwakke plekken. Als er echt niets aan te merken is, mag dat gezegd worden. Geef concrete verbeterpunten, geen algemene complimenten.

WAAR JE OP LET:
- Afwijkingen van de huisstijl${style ? ' (zie het huisstijl-blok onderaan)' : ' — LET OP: er is nu geen huisstijl-referentie beschikbaar, dus beoordeel huisstijl NIET en meld dat niet als probleem'}.
- Feitelijke claims die niet onderbouwd zijn: verzonnen of niet-verifieerbare cijfers, statistieken, bronnen of citaten. Dit is een harde faal-reden.
- Herhaling en clichés.
- Of de invalshoek (van de Strateeg) goed is uitgewerkt en scherp is.
- Bronhiërarchie: als een post start vanuit extern bronmateriaal (artikel, onderzoek, statistiek), blijft dat bronmateriaal leidend voor de invalshoek en de opening. Een eigen Eclectik-klantcase mag er alleen ter ondersteuning bij ("wij zagen dit ook"), niet als vervanging van het hoofdverhaal. Check: is de externe bron nog duidelijk het startpunt, of is de klantcase per ongeluk het hoofdonderwerp geworden?

REDACTIONELE LIJN:
- Eclektik adviseert over de scheidslijn tussen ROI of AI (AI-agents inzetten) en ROE, Return on Engagement (mensen inzetten). GLINT en SEER zijn tool-specifieke tracks daarbinnen.
- Alle gepubliceerde content is in het Engels, ongeacht de werktaal.

EXTERNE-COMMUNICATIEREGELS (CLAUDE.md §2b — schending = faal-reden):
- Geen em-dashes (—). Gewone streepjes (-), komma's, of gesplitste zinnen.
- Geen markdown-headers (# of ##) in de tekst zelf.
- Geen bullet-lijsten (- of *) tenzij de context daar expliciet om vraagt.
- Maximaal 1 emoji, alleen als het natuurlijk past. Geen emoji-overload.
- Geen filler-openingen ("Hopelijk gaat het goed!" / "I hope this message finds you well").

BEOORDELING:
- verdict = "fail" als er onderbouwingsproblemen zijn (verzonnen cijfers/bronnen), §2b-schendingen, de bronhiërarchie omgedraaid is, of de invalshoek zwak/niet uitgewerkt is.
- verdict = "pass" als het klaar is om te publiceren. Twijfelgevallen die alleen "nice to have" zijn, mag je pass geven met de punten als 'suggestion'.

Antwoord UITSLUITEND met geldige JSON, geen omhullende tekst, in dit formaat:
{"verdict":"pass"|"fail","issues":[{"severity":"high"|"medium"|"low","category":"onderbouwing"|"huisstijl"|"bronhierarchie"|"invalshoek"|"herhaling-cliche"|"communicatieregels","note":"concreet verbeterpunt"}],"suggestion":"optionele korte herschrijf-suggestie of null","checked_style":${styleGuideActive() ? 'true' : 'false'}}${style ? `\n\n${style}` : ''}`;
}

const CHANNEL_LABEL = { glint: 'GLINT', seer: 'SEER', roi: 'ROI', roe: 'ROE' };
const TYPE_LABEL = { email: 'E-mail', linkedin_post: 'LinkedIn-post', linkedin_dm: 'LinkedIn-DM' };

function buildUserPrompt({ channel, type, subject, body, source_note }) {
  const parts = [
    `Kanaal: ${CHANNEL_LABEL[channel] || channel || '?'}`,
    `Type: ${TYPE_LABEL[type] || type || '?'}`,
  ];
  if (source_note) parts.push(`Bron (source note): ${source_note}`);
  if (subject) parts.push(`Onderwerp: ${subject}`);
  parts.push('', 'CONTENT:', String(body || '').trim());
  return parts.join('\n');
}

// Robuuste JSON-parse: strip code-fences en pak het eerste {...}-blok.
function parseVerdict(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    const obj = JSON.parse(t.slice(start, end + 1));
    if (obj.verdict !== 'pass' && obj.verdict !== 'fail') return null;
    return {
      verdict: obj.verdict,
      issues: Array.isArray(obj.issues) ? obj.issues.slice(0, 20) : [],
      suggestion: obj.suggestion || null,
      checked_style: !!obj.checked_style,
    };
  } catch { return null; }
}

async function critique(system, userPrompt) {
  const call = (model) => anthropic.messages.create({
    model,
    max_tokens: 1200,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });
  let msg;
  try { msg = await call('claude-sonnet-5'); }
  catch { msg = await call('claude-haiku-4-5'); }
  return parseVerdict(msg?.content?.[0]?.text || '');
}

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!anthropic) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { channel, type, subject, body, source_note } = req.body || {};
  if (!body || typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'body (string) required' });
  }

  try {
    const verdict = await critique(buildSystemPrompt(), buildUserPrompt({ channel, type, subject, body, source_note }));
    if (!verdict) {
      // Kon geen bruikbaar oordeel parsen — blokkeer de goedkeuring niet op een
      // technische hapering; laat de mens beslissen ('error' = zichtbaar in UI).
      return res.status(200).json({ verdict: 'pass', issues: [], suggestion: null, checked_style: false, error: 'Kon het moderatie-oordeel niet lezen; niet automatisch beoordeeld.' });
    }
    return res.status(200).json(verdict);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
