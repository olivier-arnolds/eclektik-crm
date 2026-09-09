// Pure helpers voor api/outreach-send.js - apart bestand zodat vitest de
// selectieregels zonder Resend- of Supabase-verbinding kan testen.
// Ontwerp: docs/outreach-handover.md §5 (job A) en §6 (veiligheidskleppen).
//
// Hier zit de logica die bepaalt WIE er nu een mail krijgt. Dat is het stuk waar
// een fout duur is (dubbel sturen, sturen na de stop, sturen op verouderde
// reply-data), dus het staat los van de I/O en is volledig getest.

// Rendering leeft in src/lib zodat de preview in de tab exact hetzelfde
// oplevert als wat hier verstuurd wordt.
import { outreachTextToHtml, subjectForStep } from '../../src/lib/outreach-html.js';
export { outreachTextToHtml, subjectForStep };

// Bericht 2 mag niet uit als de inboxscan ouder is dan dit. De scan draait in de
// browser (geen cron), dus zonder deze rem zou een opvolgmail naar iemand kunnen
// gaan die inmiddels al ja of nee heeft gezegd.
export const STALE_HOURS = 12;

const TIER_RANK = { top: 0, good: 1, medium: 2 };

export function bodyForStep(c, step) {
  return step === 1 ? (c?.msg1_body || null) : (c?.msg2_body || null);
}

export function stepForStatus(status) {
  if (status === 'queued') return 1;
  if (status === 'msg1_sent') return 2;
  return null;
}

/**
 * Kiest wie er nu een mail krijgt. Puur: alle stand van zaken komt via opts.
 *
 * @param {Array} candidates rijen uit outreach_contact (met teksten)
 * @param {object} opts
 *   now                    Date
 *   dailyCap               int  campagne-dagcap
 *   sentToday              int  al vandaag verstuurd (outbound van vandaag)
 *   batchLimit             int of null: bovengrens voor DEZE aanroep. Los van de
 *                          dagcap gehouden, want anders krijgt "de batch was vol"
 *                          de misleidende reden "dagcap bereikt".
 *   maxPerCompanyPerWeek   int
 *   domainCounts           { [email_domain]: aantal in de afgelopen 7 dagen }
 *   hardStopAt             ISO of null  na deze datum geen bericht 2 meer
 *   lastScanISO            ISO of null  laatste inboxscan
 *   staleHours             int
 *   onlyStep               1 | 2 | null  optioneel beperken tot een stap
 * @returns {{ batch: Array, skipped: object, remainingCap: number }}
 */
export function selectSendable(candidates, opts = {}) {
  const {
    now = new Date(), dailyCap = 0, sentToday = 0, batchLimit = null,
    maxPerCompanyPerWeek = 2, domainCounts = {}, hardStopAt = null,
    lastScanISO = null, staleHours = STALE_HOURS, onlyStep = null,
  } = opts;

  const skipped = {};
  const bump = (reason) => { skipped[reason] = (skipped[reason] || 0) + 1; };

  // Twee onafhankelijke bovengrenzen. We onthouden welke van de twee bindt, zodat
  // de reden die de gebruiker ziet klopt.
  const capRoom = Math.max(0, Number(dailyCap) - Number(sentToday));
  const batchRoom = batchLimit === null || batchLimit === undefined
    ? Number.POSITIVE_INFINITY
    : Math.max(0, Number(batchLimit));
  const capIsBinding = capRoom <= batchRoom;
  const limitReason = capIsBinding ? 'dagcap bereikt' : 'batchlimiet bereikt';
  let remaining = Math.min(capRoom, batchRoom);

  const scanAgeH = lastScanISO ? (now.getTime() - new Date(lastScanISO).getTime()) / 3600000 : null;
  const scanStale = scanAgeH === null || !Number.isFinite(scanAgeH) || scanAgeH > staleHours;
  const pastHardStop = hardStopAt ? now.getTime() > new Date(hardStopAt).getTime() : false;

  const ordered = [...(candidates || [])].sort((a, b) => {
    const ta = TIER_RANK[a?.priority_tier] ?? 9;
    const tb = TIER_RANK[b?.priority_tier] ?? 9;
    if (ta !== tb) return ta - tb;
    const pa = a?.outreach_prio ?? Number.MAX_SAFE_INTEGER;
    const pb = b?.outreach_prio ?? Number.MAX_SAFE_INTEGER;
    return pa - pb;
  });

  const domainUsed = { ...domainCounts };
  const batch = [];

  for (const c of ordered) {
    const step = stepForStatus(c?.status);
    if (!step) { bump('status komt niet in aanmerking'); continue; }
    if (onlyStep && step !== onlyStep) { bump('andere stap'); continue; }

    if (c?.next_action_at && new Date(c.next_action_at).getTime() > now.getTime()) {
      bump('nog niet aan de beurt'); continue;
    }

    // Bericht 2 heeft twee extra remmen.
    if (step === 2) {
      if (pastHardStop) { bump('harde stopdatum voorbij'); continue; }
      if (scanStale) { bump('inboxscan verouderd'); continue; }
    }

    const subject = subjectForStep(c, step);
    const body = bodyForStep(c, step);
    if (!subject || !body) { bump('tekst ontbreekt'); continue; }
    if (!c?.email) { bump('geen e-mailadres'); continue; }

    const dom = c.email_domain || null;
    if (dom && (domainUsed[dom] || 0) >= maxPerCompanyPerWeek) {
      bump('max per bedrijf deze week'); continue;
    }

    // Dagcap als laatste, zodat wie afvalt door een andere regel niet onnodig
    // een plek in de cap opsnoept.
    if (remaining <= 0) { bump(limitReason); continue; }

    batch.push({ contact: c, step, subject, body });
    if (dom) domainUsed[dom] = (domainUsed[dom] || 0) + 1;
    remaining--;
  }

  return { batch, skipped, remainingCap: remaining, limitReason };
}

// Statusupdate na een geslaagde verzending (handover §4).
export function statusAfterSend(step, { now = new Date(), delayMinDays = 5, delayMaxDays = 7 } = {}) {
  if (step === 1) {
    const span = Math.max(0, delayMaxDays - delayMinDays);
    const days = delayMinDays + Math.floor(Math.random() * (span + 1));
    return {
      status: 'msg1_sent',
      next_action_at: new Date(now.getTime() + days * 86400000).toISOString(),
    };
  }
  return { status: 'msg2_sent', next_action_at: null };
}
