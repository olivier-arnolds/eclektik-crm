// Welke blokken in de Leads-tab bij een lopende campagne horen en welke bij
// een afgelopen. Pure logica, zonder React en zonder database, zodat de regels
// in tests vastliggen.
//
// WAAROM
//   Op 24 november 2026 vroeg Olivier om oude acties te kunnen wegklappen.
//   Amsterdam was op 17 november, de customer session begin november, en
//   allebei stonden ze met al hun rijen boven Zürich, dat nog moet komen. De
//   tab werd een archief waar je doorheen moest scrollen.
//
// AFGELOPEN IS EEN DATUM, GEEN VINKJE
//   Een campagne is afgelopen als zijn datum voorbij is. Dat volgt vanzelf uit
//   EVENTS in lead-bron.js en uit de slots van de customer session, dus er
//   hoeft niets bijgehouden te worden en niets kan vergeten worden. Wil je een
//   afgelopen blok toch zien, dan staat het onder Afgelopen of Alles.
//
// ZONDER DATUM IS ACTIEF
//   Afspraken uit outreach hebben geen einddatum, en een event met een slug
//   die we niet kennen ook niet. Die tonen we liever te vaak dan dat ze
//   ongemerkt onder Afgelopen verdwijnen.

export const CAMPAGNE_FILTERS = [
  { id: 'actief', label: 'Actief' },
  { id: 'afgelopen', label: 'Afgelopen' },
  { id: 'alles', label: 'Alles' },
];

/** De sleutel van het customer-sessionblok, naast de sleutels uit maakBlokken. */
export const SESSIE_SLEUTEL = 'customer-session';

const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** Vandaag als YYYY-MM-DD, in de tijdzone van de browser. */
export function vandaagISO(nu = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${nu.getFullYear()}-${p(nu.getMonth() + 1)}-${p(nu.getDate())}`;
}

/**
 * De laatste datum van de customer session, uit de gekozen slots.
 * 'slot-2026-11-05' wordt '2026-11-05'. Null als niemand een slot koos.
 */
export function laatsteSessieDatum(rijen) {
  let laatste = null;
  for (const r of (rijen || [])) {
    const slots = Array.isArray(r?.slots) ? r.slots : [];
    for (const s of slots) {
      const m = /^slot-(\d{4}-\d{2}-\d{2})$/.exec(String(s || '').trim());
      if (m && (!laatste || m[1] > laatste)) laatste = m[1];
    }
  }
  return laatste;
}

/**
 * Is de datum voorbij? Op de dag zelf nog niet: dan loopt de campagne nog.
 * Zonder bruikbare datum is het antwoord nee.
 */
export function isAfgelopen(datum, vandaag) {
  const d = String(datum || '').trim();
  if (!ISO_DATUM.test(d) || !ISO_DATUM.test(String(vandaag || ''))) return false;
  return d < vandaag;
}

/**
 * Hoort een blok in beeld bij dit filter? Een onbekend filter, bijvoorbeeld
 * een oude waarde uit localStorage, gedraagt zich als Actief.
 */
export function toonCampagne(filter, afgelopen) {
  if (filter === 'alles') return true;
  if (filter === 'afgelopen') return !!afgelopen;
  return !afgelopen;
}

/** Aantallen voor op de knoppen, uit een lijst van afgelopen-vlaggen. */
export function telCampagnes(afgelopenVlaggen) {
  const lijst = afgelopenVlaggen || [];
  const afgelopen = lijst.filter(Boolean).length;
  return { actief: lijst.length - afgelopen, afgelopen, alles: lijst.length };
}

/** Klapt een blok in of uit. Geeft een nieuwe lijst terug, raakt de oude niet. */
export function wisselIngeklapt(lijst, sleutel) {
  const huidig = Array.isArray(lijst) ? lijst : [];
  return huidig.includes(sleutel)
    ? huidig.filter(s => s !== sleutel)
    : [...huidig, sleutel];
}
