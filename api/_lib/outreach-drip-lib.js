// Doseerlogica voor de automatische verzending (api/outreach-drip.js).
//
// WAAROM DIT BESTAAT
//   Een klik op 'verstuur batch' kan de dagcap niet halen: bij LinkedIn zit er
//   12 tot 25 seconden tussen twee berichten, dus 30 stuks is ruim negen minuten
//   en een serverloze functie mag er vijf draaien. Zonder cron moet iemand de
//   hele dag zelf bijhouden wanneer er weer ruimte is, en dat is precies het
//   soort werk dat de app hoort te doen.
//
// HOE HET DOSEERT
//   De cron draait op vaste momenten. Per keer sturen we de resterende dagruimte
//   gedeeld door het aantal resterende momenten. Daarmee loopt het vanzelf gelijk
//   op met de dag, en haalt het zichzelf in als er een run is overgeslagen (bij
//   een storing of een trage functie) zonder aan het eind alles in een keer te
//   dumpen: er zit een harde bovengrens per run op.
//
// Alles hier is puur, zodat de verdeling te toetsen is zonder Supabase of Unipile.

// De cron staat in vercel.json op */20 tussen 07:00 en 16:59 UTC, op werkdagen.
// Dat is 09:00 tot 18:59 in Amsterdam in de zomer, 08:00 tot 17:59 in de winter.
// Deze constanten moeten in de pas lopen met die regel.
export const DRIP_EVERY_MIN = 20;
export const DRIP_LAST_HOUR_UTC = 16;
// Bovengrens per run. Vier berichten met de pauze ertussen is circa anderhalve
// minuut, ruim binnen de functietijd, en het blijft er menselijk uitzien.
export const DRIP_MAX_PER_RUN = 4;

/**
 * Hoeveel cron-momenten zijn er vandaag nog, dit moment meegerekend.
 * Buiten de venstertijden is dat er nog 1, zodat een late run niet door nul deelt.
 */
export function slotsRemaining(now, { lastHourUtc = DRIP_LAST_HOUR_UTC, everyMin = DRIP_EVERY_MIN } = {}) {
  const d = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(d.getTime())) return 1;
  const minutenNu = d.getUTCHours() * 60 + d.getUTCMinutes();
  const minutenLaatste = lastHourUtc * 60 + 59;
  const over = minutenLaatste - minutenNu;
  if (over <= 0) return 1;
  return Math.floor(over / everyMin) + 1;
}

/**
 * Hoeveel berichten gaan er in deze run uit.
 *
 * @param {object} opts
 *   roomToday   ruimte in de dagcap
 *   roomWeek    ruimte in de weekcap (null = geen weekcap)
 *   slotsLeft   resterende cron-momenten vandaag, dit moment meegerekend
 *   maxPerRun   harde bovengrens per run
 * @returns {{ count: number, reason: string }}
 */
export function planDrip({ roomToday = 0, roomWeek = null, slotsLeft = 1, maxPerRun = DRIP_MAX_PER_RUN } = {}) {
  const dag = Math.max(0, Number(roomToday) || 0);
  const week = roomWeek === null || roomWeek === undefined
    ? Number.POSITIVE_INFINITY
    : Math.max(0, Number(roomWeek) || 0);

  if (dag <= 0) return { count: 0, reason: 'dagcap bereikt' };
  if (week <= 0) return { count: 0, reason: 'weekcap bereikt' };

  const ruimte = Math.min(dag, week);
  const slots = Math.max(1, Math.floor(Number(slotsLeft) || 1));
  const gelijkmatig = Math.ceil(ruimte / slots);
  const count = Math.min(gelijkmatig, Math.max(1, maxPerRun), ruimte);

  return {
    count,
    reason: count === ruimte ? 'laatste ruimte van vandaag' : 'gelijkmatig over de dag',
  };
}
