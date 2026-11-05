// Wanneer begint de verzenddag?
//
// WAAROM DIT BESTAAT
//   De dagcap liep over een rollend etmaal: alles van de afgelopen 24 uur telde
//   mee. Dat voorkomt twaalf mails om 23:00 gevolgd door twaalf om 01:00, maar
//   het leest verkeerd. Wie gistermiddag om 14:12 zijn twaalf verstuurde zag de
//   volgende ochtend 'dagcap bereikt' staan en kon tot 14:12 niets, terwijl het
//   gewoon een nieuwe dag was.
//
//   De dag loopt nu van middernacht tot middernacht, in Amsterdamse tijd. Alles
//   van voor middernacht is gisteren. De avondstapeling die het rollende venster
//   tegenhield wordt op een andere manier afgedekt: het verzendvenster loopt van
//   09:00 tot 17:00 (zie inSendWindow in api/_lib/outreach-drip-lib.js), dus er
//   gaat sowieso niets om 23:00 of 01:00 uit.
//
// WAAROM AMSTERDAM EN NIET UTC
//   De server draait op UTC. In de zomer is dat twee uur achter, dus een nieuwe
//   dag zou daar pas om 02:00 beginnen en een verzending van 00:30 nog op
//   gisteren worden geboekt. De grens hoort te liggen waar de gebruiker hem
//   verwacht.
export const VERZEND_TZ = 'Europe/Amsterdam';

/**
 * Het verschil tussen de klok in deze tijdzone en UTC, op dit moment. Via Intl,
 * zodat de zomertijd vanzelf goed gaat.
 */
function offsetMs(date, tz) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map(x => [x.type, x.value]));
  const alsUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second));
  return alsUtc - date.getTime();
}

/**
 * Middernacht van de dag waarin dit moment valt, als ISO-tijdstip in UTC.
 *
 * Dit is de ondergrens waarmee de dagcap telt: alles vanaf hier is 'vandaag'.
 *
 * @param {Date|number|string} now  het moment waarvoor je de dag wilt weten
 * @param {string} tz               tijdzone, standaard Amsterdam
 * @returns {string|null}           ISO-tijdstip, of null bij onbruikbare invoer
 */
export function beginVanDeDag(now = new Date(), tz = VERZEND_TZ) {
  const d = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(d.getTime())) return null;
  let jaar, maand, dag;
  try {
    // Een onbekende tijdzone gooit hier. Null teruggeven is dan beter dan de
    // fout laten doorslaan: de aanroeper valt terug op het rollende venster, en
    // dat is de strengere kant.
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const p = Object.fromEntries(fmt.formatToParts(d).map(x => [x.type, x.value]));
    jaar = Number(p.year); maand = Number(p.month); dag = Number(p.day);
  } catch {
    return null;
  }
  if (!Number.isFinite(jaar) || !Number.isFinite(maand) || !Number.isFinite(dag)) return null;

  // Eerst gokken met de offset op middernacht-UTC, dan corrigeren met de offset
  // die op het gevonden tijdstip echt geldt. Die tweede ronde is nodig in het
  // weekend van de klokwisseling, waar de offset van de dag zelf verschilt van
  // die op middernacht-UTC.
  const kaal = Date.UTC(jaar, maand - 1, dag);
  let ts = kaal - offsetMs(new Date(kaal), tz);
  ts = kaal - offsetMs(new Date(ts), tz);
  return new Date(ts).toISOString();
}

/**
 * De ondergrens waarmee de dagcap telt. Valt terug op een rollend etmaal als de
 * dag niet te bepalen is, want dan liever te streng dan te ruim.
 */
export function dagcapVanaf(now = new Date(), tz = VERZEND_TZ) {
  const d = now instanceof Date ? now : new Date(now);
  const basis = Number.isFinite(d.getTime()) ? d : new Date();
  return beginVanDeDag(basis, tz) || new Date(basis.getTime() - 86400000).toISOString();
}
