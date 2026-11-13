// Iemand met de hand weer in de rij zetten voor bericht 2, en de datum bepalen
// waarop dat mag.
//
// WAAROM DIT NODIG IS
//   De classificatie zet een herkende afwezigheid vanzelf op de terugkeerdatum.
//   Maar bij twijfel (confidence onder de drempel) of bij 'other' blijft de
//   prospect hangen in een 'hold': er kwam een antwoord binnen en er staat geen
//   vervolgdatum. De verzender slaat die bewust over, want dat is het geval waar
//   een mens naar moet kijken. Tot nu toe kon die mens er niets mee: er was geen
//   knop. En een afwezigheidsbericht dat als 'interested' werd gelezen, zette de
//   prospect op 'replied', waar hij voorgoed bleef staan.
//
//   De afzender van het antwoord weet vaak zelf wanneer hij terug is. Die datum
//   overnemen is beter dan wat voor automaat dan ook.
//
// WAT WE NOOIT HERVATTEN
//   Afgemeld en gebounced niet, en iemand met een vastgelegde uitkomst ook niet.
//   Dat laatste is een beslissing die een mens al genomen heeft; die stilletjes
//   terugdraaien met een datumveld zou de ergste soort verrassing zijn.

/** Statussen die uit zichzelf nooit meer een bericht krijgen, en terecht. */
const NOOIT_HERVATTEN = new Set(['opted_out', 'bounced']);

/**
 * Waarom krijgt deze prospect nu geen bericht 2?
 *
 * @returns {null|{code, tekst, herstelbaar}} null betekent: hij staat gewoon in
 *   de rij, er is niets aan de hand.
 */
export function redenGeenBericht2(rij) {
  const status = String(rij?.status || '');

  if (NOOIT_HERVATTEN.has(status)) {
    return {
      code: status,
      tekst: status === 'opted_out' ? 'Afgemeld, krijgt niets meer' : 'Mail kwam niet aan',
      herstelbaar: false,
    };
  }
  if (rij?.outcome) {
    return { code: 'uitkomst', tekst: 'Uitkomst vastgelegd', herstelbaar: false };
  }
  // KRITIEK: bericht 2 is al verstuurd, dus er is niets meer te hervatten.
  //
  // Dit stond hieronder niet en dat was fout. Zo iemand heeft vaak wel een
  // antwoord binnen zonder vervolgdatum, en viel daardoor in de hold hieronder.
  // Op de echte data waren dat 25 mensen die allemaal een hervat-knop zouden
  // krijgen, en één klik zou hun bericht 2 een TWEEDE keer sturen.
  if (status === 'msg2_sent') {
    return { code: 'msg2_sent', tekst: 'Bericht 2 is al verstuurd', herstelbaar: false };
  }
  if (status === 'replied' || status === 'referred' || status === 'paused') {
    const tekst = status === 'replied' ? 'Heeft geantwoord'
      : status === 'referred' ? 'Doorverwezen' : 'Stilgezet';
    return { code: status, tekst, herstelbaar: true };
  }
  // De hold: antwoord binnen, geen vervolgdatum. Precies het geval waar de
  // verzender op wacht tot een mens kijkt.
  if (rij?.last_inbound_at && !rij?.next_action_at) {
    return { code: 'hold', tekst: 'Antwoord binnen, wacht op beoordeling', herstelbaar: true };
  }
  if (status === 'done') {
    return { code: 'done', tekst: 'Reeks afgerond', herstelbaar: true };
  }
  return null;
}

/** Mag er bij deze prospect een hervat-knop staan? */
export function magHervatten(rij) {
  const reden = redenGeenBericht2(rij);
  return reden === null ? false : reden.herstelbaar;
}

/**
 * Een datum uit een datumveld ('2026-11-20') naar het tijdstip dat we opslaan.
 *
 * Middernacht aan het begin van die dag, zodat de verzender hem die ochtend om
 * negen uur als 'aan de beurt' ziet. Een tijdstip later op de dag zou de eerste
 * ronde missen en de mail een dag opschuiven, en dan klopt de terugkeerdatum
 * die de ontvanger zelf opgaf niet meer.
 */
export function datumNaarMoment(datum) {
  const d = String(datum || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const t = new Date(`${d}T00:00:00.000Z`);
  return Number.isFinite(t.getTime()) ? t.toISOString() : null;
}

/** Omgekeerd: een opgeslagen moment terug naar de waarde voor het datumveld. */
export function momentNaarDatum(moment) {
  if (!moment) return '';
  const t = new Date(moment);
  return Number.isFinite(t.getTime()) ? t.toISOString().slice(0, 10) : '';
}

/**
 * De kolommen voor 'zet deze persoon weer in de rij voor bericht 2'.
 *
 * @returns {{fout}|{patch}}
 *
 * last_inbound_at blijft staan. Dat is een feit uit het verleden: er kwam een
 * antwoord. Dat wissen om de verzender tevreden te stellen zou het spoor
 * uitvegen waarom deze persoon ooit stilgezet werd. De datum is wat de
 * blokkade opheft, niet het verwijderen van de geschiedenis.
 */
export function hervatPatch(rij, datum, now = new Date()) {
  const reden = redenGeenBericht2(rij);
  if (reden && !reden.herstelbaar) {
    return { fout: `Kan niet hervatten: ${reden.tekst.toLowerCase()}` };
  }
  const moment = datumNaarMoment(datum);
  if (!moment) return { fout: 'Geen geldige datum' };
  return {
    patch: {
      status: 'msg1_sent',
      next_action_at: moment,
      paused_reason: null,
      updated_at: now.toISOString(),
    },
  };
}

/**
 * De kolommen voor alleen een andere datum, zonder de status aan te raken.
 *
 * Voor iemand die al netjes op een terugkeerdatum staat maar bij wie die datum
 * niet klopt. Een lege datum haalt de wachttijd weg.
 */
export function datumPatch(datum, now = new Date()) {
  const leeg = String(datum || '').trim() === '';
  if (leeg) return { patch: { next_action_at: null, updated_at: now.toISOString() } };
  const moment = datumNaarMoment(datum);
  if (!moment) return { fout: 'Geen geldige datum' };
  return { patch: { next_action_at: moment, updated_at: now.toISOString() } };
}
