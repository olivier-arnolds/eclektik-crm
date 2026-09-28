// Welke opgeslagen dagregels moeten weg na een upload?
//
// WAAROM DIT BESTAAT
//   Opslaan gebeurt met een upsert op (stat_date, ad_id). Die overschrijft wel
//   maar verwijdert nooit. Zolang LinkedIn een gecorrigeerde dag op nul zet gaat
//   dat goed: de regel wordt overschreven. Maar laat LinkedIn de regel helemaal
//   weg, dan blijft het oude, hogere getal staan en telt het mee in het totaal.
//   Dat is precies het soort fout dat niemand ziet, want er verschijnt niets
//   geks; er staat alleen te veel.
//
//   Op 23 september 2026 bracht LinkedIn een dag terug van 1162 vertoningen en
//   8 kliks naar 7 vertoningen en 0 kliks. Dat ging goed omdat de regel bleef
//   bestaan. Deze functie dekt het geval waarin dat niet gebeurt.
//
// HET UITGANGSPUNT
//   Een export is het volledige antwoord voor zijn eigen rapportperiode en zijn
//   eigen campagnes. Staat een dag binnen die periode niet in het bestand, dan
//   was er die dag geen activiteit en hoort er in de database ook niets te staan.
//
// WAAROM PER GROEP EN NIET EEN VENSTER
//   Je kunt meerdere bestanden tegelijk slepen, en die hoeven niet dezelfde
//   periode of dezelfde campagne te beslaan. Zou je van alle bestanden samen het
//   ruimste venster nemen, dan wist een export van campagne A over dertig dagen
//   de dagen van campagne B die alleen een week aanleverde. Vandaar een groep
//   per bestand: periode en campagnes horen bij elkaar.

/**
 * @param {Array} bestaand  rijen uit linkedin_ad_stats (stat_date, ad_id, campaign_id)
 * @param {Array} groepen   per bestand: { van, tot, campagnes:Set|Array, sleutels:Set|Array }
 *                          sleutels zijn `${stat_date}|${ad_id}` uit dat bestand
 * @returns {Array<{stat_date: string, ad_id: string}>} wat er weg mag
 */
export function opruimPlan(bestaand = [], groepen = []) {
  const weg = new Map();
  for (const g of groepen) {
    if (!g?.van || !g?.tot) continue;
    const campagnes = new Set(g.campagnes || []);
    // Geen campagne in het bestand betekent geen enkel bereik. Een leeg rapport
    // mag nooit een periode leegvegen: het zegt alleen dat er niets geleverd is
    // voor de campagnes die erin staan, en dat zijn er nul.
    if (campagnes.size === 0) continue;
    const sleutels = new Set(g.sleutels || []);
    for (const r of bestaand) {
      const datum = String(r?.stat_date || '');
      if (!datum || datum < g.van || datum > g.tot) continue;
      if (!campagnes.has(String(r?.campaign_id ?? ''))) continue;
      const k = `${datum}|${r?.ad_id}`;
      if (sleutels.has(k)) continue;
      weg.set(k, { stat_date: datum, ad_id: String(r?.ad_id) });
    }
  }
  return [...weg.values()];
}

/** Bundelt de rijen van één gelezen bestand tot een groep voor `opruimPlan`. */
export function groepVanBestand(periode, rijen = []) {
  if (!periode?.van || !periode?.tot) return null;
  return {
    van: periode.van,
    tot: periode.tot,
    campagnes: new Set(rijen.map((r) => String(r?.campaign_id ?? '')).filter(Boolean)),
    sleutels: new Set(rijen.map((r) => `${r?.stat_date}|${r?.ad_id}`)),
  };
}
