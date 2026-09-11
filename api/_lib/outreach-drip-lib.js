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

// Het verzendvenster staat in AMSTERDAMSE tijd, niet in UTC. Vercel-cron kent
// alleen UTC, dus een vast rooster zou met de zomertijd een uur verschuiven en
// dan sturen we in de winter ineens vanaf acht uur 's ochtends. De cron draait
// daarom ruimer (*/20 tussen 06:00 en 16:59 UTC op werkdagen) en de echte grens
// staat hier, in lokale tijd.
export const DRIP_TZ = 'Europe/Amsterdam';
export const DRIP_START_HOUR = 9;
export const DRIP_END_HOUR = 17;     // exclusief: 16:40 is het laatste moment
export const DRIP_EVERY_MIN = 20;
// Bovengrens per run. Vier berichten met de pauze ertussen is circa anderhalve
// minuut, ruim binnen de functietijd, en het blijft er menselijk uitzien.
export const DRIP_MAX_PER_RUN = 4;

/**
 * Uur, minuut en weekdag in de tijdzone van het venster. Via Intl, zodat de
 * zomertijd vanzelf goed gaat en we geen offsets hoeven bij te houden.
 */
export function localParts(now, tz = DRIP_TZ) {
  const d = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  });
  const delen = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  const dagen = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  return {
    hour: Number(delen.hour) % 24,
    minute: Number(delen.minute),
    weekday: dagen[delen.weekday] ?? null,
  };
}

/**
 * Mag er op dit moment verstuurd worden? Werkdag, en binnen het venster.
 * De cron draait ruimer dan het venster, dus deze controle doet het echte werk.
 */
export function inSendWindow(now, { startHour = DRIP_START_HOUR, endHour = DRIP_END_HOUR, tz = DRIP_TZ } = {}) {
  const p = localParts(now, tz);
  if (!p) return false;
  if (p.weekday === 0 || p.weekday === 6) return false;
  return p.hour >= startHour && p.hour < endHour;
}

/**
 * Hoeveel cron-momenten zijn er vandaag nog, dit moment meegerekend.
 * Nooit nul, want er wordt door gedeeld.
 */
export function slotsRemaining(now, { endHour = DRIP_END_HOUR, everyMin = DRIP_EVERY_MIN, tz = DRIP_TZ } = {}) {
  const p = localParts(now, tz);
  if (!p) return 1;
  const over = (endHour * 60) - (p.hour * 60 + p.minute);
  if (over <= 0) return 1;
  return Math.max(1, Math.ceil(over / everyMin));
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
