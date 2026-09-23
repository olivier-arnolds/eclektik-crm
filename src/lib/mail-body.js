// Kiest de bruikbare tekst uit een Graph-bericht, en ruimt op wat een
// classificatie op het verkeerde been zet.
//
// WAAROM DIT BESTAAT
//   De inboxscan vroeg Graph om `bodyPreview`. Dat veld is per definitie de
//   eerste 255 tekens van het bericht; Microsoft knipt af voordat wij het zien.
//   Van de 78 binnengekomen antwoorden stonden er 49 op exact 255 tekens. Dat is
//   niet alleen lelijk in de tab: diezelfde tekst gaat naar de classificatie die
//   bepaalt of iemand nog een opvolgmail krijgt. Staat het bruikbare deel na
//   teken 255 ("ik kan zelf niet, maar mijn collega wel"), dan ziet de
//   classificatie dat nooit.
//
//   Puur gehouden zodat vitest de keuzeregels vastlegt zonder Graph.

/**
 * Kiest de tekst van een bericht.
 *
 * `uniqueBody` is wat Graph als het NIEUWE deel van een antwoord ziet, zonder de
 * geciteerde geschiedenis eronder. Dat is precies wat je wilt lezen, en ook wat
 * je wilt classificeren: zonder dit leest de classificatie ons eigen uitgaande
 * bericht mee en concludeert vrolijk dat de prospect geïnteresseerd is.
 *
 * Graph vult uniqueBody niet altijd (bij een eerste bericht in een keten is er
 * geen verschil met body). Vandaar de terugval, met het knippen van de
 * citaatgeschiedenis als vangnet.
 */
export function kiesBerichttekst(bericht) {
  const uniek = schoon(bericht?.uniqueBody?.content);
  if (uniek) return uniek;
  const heel = schoon(bericht?.body?.content);
  return heel ? knipCitaat(heel) : null;
}

// Platte tekst uit Graph komt met CRLF, harde spaties en soms nog HTML als de
// Prefer-header niet is aangekomen. Alle drie leveren rommel in de tab op.
export function schoon(tekst) {
  let s = String(tekst ?? '');
  if (!s.trim()) return null;
  if (/<(html|body|div|p|br)\b/i.test(s)) {
    s = s
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }
  s = s.replace(/\r\n/g, '\n').replace(/ /g, ' ');
  // Meer dan twee lege regels achter elkaar is opmaak, geen inhoud.
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.split('\n').map(r => r.replace(/[ \t]+$/, '')).join('\n').trim();
  return s || null;
}

// Herkenbare openingen van de geciteerde geschiedenis. Bewust conservatief: een
// regel te veel laten staan is onschuldig, een antwoord halverwege afkappen is
// precies de fout die we aan het repareren zijn.
const CITAAT = [
  /^-{2,}\s*Original Message\s*-{2,}/i,
  /^_{5,}$/,
  /^From:\s.+$/i,
  /^Van:\s.+$/i,
  /^Op .+ schreef .+:$/i,
  /^On .+ wrote:$/i,
];

export function knipCitaat(tekst) {
  const regels = String(tekst ?? '').split('\n');
  for (let i = 0; i < regels.length; i++) {
    const r = regels[i].trim();
    if (!r) continue;
    if (CITAAT.some(p => p.test(r))) {
      const ervoor = regels.slice(0, i).join('\n').trim();
      // Staat het citaat meteen bovenaan, dan is er geen nieuwe tekst en houden
      // we alles: beter het hele bericht dan een lege classificatie.
      if (ervoor) return ervoor;
      return String(tekst).trim();
    }
  }
  return String(tekst).trim();
}

/** Korte weergave voor in de lijst, zonder midden in een woord af te breken. */
export function kort(tekst, max = 500) {
  const s = String(tekst ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s || null;
  const knip = s.slice(0, max);
  const spatie = knip.lastIndexOf(' ');
  return `${(spatie > max * 0.6 ? knip.slice(0, spatie) : knip).trim()}…`;
}
