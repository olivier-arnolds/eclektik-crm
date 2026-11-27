// Een doorverwijzing uit een antwoord omzetten in een prospect met een bericht
// dat klopt.
//
// WAAROM DIT EEN APART, PUUR BESTAND IS
//   Hier wordt de tekst gemaakt die daadwerkelijk naar een mens gaat die ons
//   nooit iets gevraagd heeft. Dat is precies het soort beslissing dat je wilt
//   kunnen testen zonder database, browser of mailserver erbij. Zelfde reden
//   als outreach-hervatten.js en outreach-status.js.
//
// HET UITGANGSPUNT: HERGEBRUIK HET BERICHT VAN DE OORSPRONKELIJKE PROSPECT
//   De collega werkt bij hetzelfde bedrijf. Het onderzoekswerk in bericht 1
//   ("Copilot at Serco", de aanleiding die bij dat account hoort) geldt dus
//   onverminderd. Een nieuw bericht schrijven zou dat weggooien en een algemene
//   mail opleveren, terwijl de aanleiding juist het sterkste deel is.
//
//   Daarom: aanhef vervangen, een regel erbij die uitlegt hoe we hier komen, de
//   rest woordelijk laten staan.
//
// DE OPENINGSREGEL IS EERLIJK, EN DAT IS EEN KEUZE
//   Bij een afwezigheidsbericht heeft die collega ons NIET doorgestuurd. Een
//   automaat noemde zijn naam voor spoedgevallen. "Je collega verwees me door"
//   zou dan een beleefde leugen zijn, en precies het soort zin waar iemand op
//   terugschrijft met "dat heb ik nooit gezegd". De tekst zegt daarom wat er
//   werkelijk gebeurde, en dat leest ook nog eens als een gewoon mens.

/** De standen die een doorverwijzing kan hebben. */
export const DOORVERWIJZING_STATUSSEN = ['open', 'opgepakt', 'later', 'laten'];

export const DOORVERWIJZING_LABEL = {
  open: 'Nog beoordelen',
  opgepakt: 'Opgepakt, staat in de campagne',
  later: 'Later bij de oorspronkelijke contactpersoon',
  laten: 'Niets mee doen',
};

/**
 * De openingsregel, afhankelijk van hoe we aan deze naam komen.
 *
 * @param {'ooo'|'referral'|string} bron  de classificatie van het antwoord
 * @param {string} verwijzer              naam van degene die doorverwees
 */
export function openingsregel(bron, verwijzer) {
  const naam = String(verwijzer || '').trim();
  if (!naam) return null;
  if (bron === 'referral') {
    return `${naam} suggested I reach out to you.`;
  }
  // Alles wat geen expliciete doorverwijzing is behandelen we als het
  // voorzichtige geval. Een onbekende bron is geen reden om meer te beweren.
  return `I wrote to ${naam}, and the out of office reply pointed me to you.`;
}

/** De aanhefregel uit een bericht, en de rest apart. */
function splitsAanhef(body) {
  const tekst = String(body || '');
  const eersteLeegRegel = tekst.indexOf('\n\n');
  if (eersteLeegRegel === -1) return { aanhef: null, rest: tekst };
  return {
    aanhef: tekst.slice(0, eersteLeegRegel),
    rest: tekst.slice(eersteLeegRegel + 2),
  };
}

/**
 * Bouwt bericht 1 voor een doorverwezen collega.
 *
 * @param {object} o
 *   origineelBody   bericht 1 van de oorspronkelijke prospect
 *   voornaam        voornaam van de collega
 *   verwijzer       naam van degene die doorverwees
 *   bron            'ooo' of 'referral'
 * @returns {{fout: string}|{body: string}}
 *
 * De aanhef van het origineel wordt NIET hergebruikt: daar staat de verkeerde
 * naam in. Staat er geen lege regel in het origineel, dan is het geen bericht
 * waar we iets zinnigs mee kunnen en geven we een fout terug in plaats van een
 * mail met een half afgeknipte aanhef.
 */
export function bouwDoorverwijsBericht({ origineelBody, voornaam, verwijzer, bron } = {}) {
  const naam = String(voornaam || '').trim();
  if (!naam) return { fout: 'Geen voornaam voor de doorverwezen collega' };

  const { aanhef, rest } = splitsAanhef(origineelBody);
  if (!aanhef || !rest.trim()) {
    return { fout: 'Het oorspronkelijke bericht heeft geen bruikbare opbouw' };
  }

  const opening = openingsregel(bron, verwijzer);
  if (!opening) return { fout: 'Geen naam van de doorverwijzer' };

  return { body: `Hi ${naam},\n\n${opening}\n\n${rest}` };
}

/**
 * Mag deze doorverwijzing nog een besluit krijgen?
 *
 * Een die al opgepakt is niet: daar hangt een prospect aan, en die opnieuw
 * aanmaken zou dezelfde persoon twee keer in de campagne zetten.
 */
export function magBesluiten(rij) {
  return String(rij?.referral_status || 'open') !== 'opgepakt';
}

/**
 * De kolommen voor een besluit op een doorverwijzing.
 *
 * @param {string} status      een van DOORVERWIJZING_STATUSSEN
 * @param {object} o           door = e-mailadres van wie besloot
 * @returns {{fout}|{patch}}
 */
export function besluitPatch(status, { door = null, contactId = null, now = new Date() } = {}) {
  const s = String(status || '').trim();
  if (!DOORVERWIJZING_STATUSSEN.includes(s)) return { fout: 'Onbekende stand' };
  if (s === 'opgepakt' && !contactId) {
    // Opgepakt zonder prospect erachter is een lege belofte: de doorverwijzing
    // verdwijnt dan uit de werklijst zonder dat er iemand benaderd wordt.
    return { fout: 'Opgepakt kan alleen met een aangemaakte prospect' };
  }
  return {
    patch: {
      referral_status: s,
      referral_decided_at: now.toISOString(),
      referral_decided_by: door || null,
      referral_contact_id: s === 'opgepakt' ? contactId : null,
    },
  };
}
