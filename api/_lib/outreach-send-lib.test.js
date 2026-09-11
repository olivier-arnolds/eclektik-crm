import { describe, it, expect } from 'vitest';
import {
  subjectForStep, stepForStatus, selectSendable, statusAfterSend, STALE_HOURS,
} from './outreach-send-lib.js';
import { linkifyBareUrls, outreachTextToHtml } from '../../src/lib/outreach-html.js';

const NOW = new Date('2026-09-16T09:00:00Z');
const FRESH = '2026-09-16T06:00:00Z';           // 3 uur oud
const OLD = '2026-09-14T06:00:00Z';             // ruim 12 uur oud

const c = (o = {}) => ({
  id: o.id || 'x', email: o.email || 'a@ing.com', email_domain: o.email_domain || 'ing.com',
  status: 'queued', next_action_at: null, priority_tier: 'top', outreach_prio: 1,
  msg1_subject: 'Uitnodiging', msg1_body: 'Hoi,\n\nkom je?',
  msg2_subject: 'Uitnodiging', msg2_body: 'Programma: https://eclectik.co/events',
  ...o,
});

const base = {
  now: NOW, dailyCap: 100, sentToday: 0, maxPerCompanyPerWeek: 2,
  domainCounts: {}, hardStopAt: '2026-10-02T00:00:00Z', lastScanISO: FRESH,
};

describe('linkifyBareUrls', () => {
  it('maakt een kale URL klikbaar', () => {
    expect(linkifyBareUrls('Zie https://eclectik.co/events voor meer'))
      .toContain('<a href="https://eclectik.co/events"');
  });

  it('laat sluitende interpunctie buiten de link', () => {
    const out = linkifyBareUrls('Programma: https://eclectik.co/events.');
    expect(out).toContain('href="https://eclectik.co/events"');
    expect(out).toMatch(/<\/a>\.$/);
  });

  it('KRITIEK: linkt een URL die al in een href staat niet dubbel', () => {
    const already = '<a href="https://x.nl" style="color:#2563eb">https://x.nl</a>';
    expect(linkifyBareUrls(already)).toBe(already);
  });

  it('laat tekst zonder URL ongemoeid', () => {
    expect(linkifyBareUrls('geen link hier')).toBe('geen link hier');
  });
});

describe('outreachTextToHtml', () => {
  it('maakt alineas en houdt de link klikbaar', () => {
    const html = outreachTextToHtml('Hoi,\n\nZie https://eclectik.co/events');
    expect(html).toContain('<p>Hoi,</p>');
    expect(html).toContain('<a href="https://eclectik.co/events"');
  });

  it('escapet HTML uit de tekst', () => {
    expect(outreachTextToHtml('a <script>x</script> b')).toContain('&lt;script&gt;');
  });

  it('voegt de afmeldregel toe als er een URL is, en anders niet', () => {
    expect(outreachTextToHtml('hoi', { unsubscribeUrl: 'https://crm/u/abc' })).toContain('https://crm/u/abc');
    expect(outreachTextToHtml('hoi')).not.toContain('Geen berichten');
  });

  it('bevat GEEN merkhandtekening of marketingfooter', () => {
    const html = outreachTextToHtml('hoi', { unsubscribeUrl: 'https://crm/u/abc' });
    expect(html).not.toMatch(/eclectik-email-header|Unsubscribe<\/a>\.<\/p><\/body>/i);
  });
});

describe('subjectForStep en stepForStatus', () => {
  it('stap 1 gebruikt het eigen onderwerp', () => {
    expect(subjectForStep(c(), 1)).toBe('Uitnodiging');
  });
  it('stap 2 zet Re: ervoor', () => {
    expect(subjectForStep(c(), 2)).toBe('Re: Uitnodiging');
  });
  it('stap 2 zet nooit dubbel Re: ervoor', () => {
    expect(subjectForStep(c({ msg2_subject: 'RE: Uitnodiging' }), 2)).toBe('RE: Uitnodiging');
  });
  it('mapt status naar stap', () => {
    expect(stepForStatus('queued')).toBe(1);
    expect(stepForStatus('msg1_sent')).toBe(2);
    expect(stepForStatus('replied')).toBeNull();
    expect(stepForStatus('paused')).toBeNull();
  });
});

describe('selectSendable - dagcap', () => {
  it('stuurt niet meer dan de cap', () => {
    const rows = Array.from({ length: 10 }, (_, i) => c({ id: `c${i}`, email: `a${i}@x${i}.nl`, email_domain: `x${i}.nl`, outreach_prio: i }));
    const r = selectSendable(rows, { ...base, dailyCap: 4 });
    expect(r.batch).toHaveLength(4);
    expect(r.skipped['dagcap bereikt']).toBe(6);
  });

  it('trekt wat vandaag al verstuurd is van de cap af', () => {
    const rows = Array.from({ length: 5 }, (_, i) => c({ id: `c${i}`, email: `a${i}@x${i}.nl`, email_domain: `x${i}.nl` }));
    expect(selectSendable(rows, { ...base, dailyCap: 10, sentToday: 8 }).batch).toHaveLength(2);
  });

  it('cap al vol betekent niemand', () => {
    expect(selectSendable([c()], { ...base, dailyCap: 5, sentToday: 5 }).batch).toHaveLength(0);
  });
});

describe('selectSendable - dagcap versus batchlimiet', () => {
  const rows = () => Array.from({ length: 100 }, (_, i) =>
    c({ id: `c${i}`, email: `a${i}@x${i}.nl`, email_domain: `x${i}.nl`, outreach_prio: i }));

  it('batchlimiet kleiner dan de ruimte in de dagcap: reden is batchlimiet', () => {
    const r = selectSendable(rows(), { ...base, dailyCap: 60, sentToday: 0, batchLimit: 25 });
    expect(r.batch).toHaveLength(25);
    expect(r.skipped['batchlimiet bereikt']).toBe(75);
    expect(r.skipped['dagcap bereikt']).toBeUndefined();
  });

  it('dagcap knijpt harder dan de batch: reden is dagcap', () => {
    const r = selectSendable(rows(), { ...base, dailyCap: 60, sentToday: 50, batchLimit: 25 });
    expect(r.batch).toHaveLength(10);
    expect(r.skipped['dagcap bereikt']).toBe(90);
    expect(r.skipped['batchlimiet bereikt']).toBeUndefined();
  });

  it('zonder batchlimiet is de dagcap de grens', () => {
    const r = selectSendable(rows(), { ...base, dailyCap: 40, batchLimit: null });
    expect(r.batch).toHaveLength(40);
    expect(r.skipped['dagcap bereikt']).toBe(60);
  });

  it('de kleinste van de twee wint, ook als de dagcap al vol is', () => {
    const r = selectSendable(rows(), { ...base, dailyCap: 60, sentToday: 60, batchLimit: 25 });
    expect(r.batch).toHaveLength(0);
    expect(r.skipped['dagcap bereikt']).toBe(100);
  });
});

describe('selectSendable - volgorde', () => {
  it('top voor goed voor matig, daarbinnen op prio', () => {
    const rows = [
      c({ id: 'm1', priority_tier: 'medium', outreach_prio: 1, email: 'a@m.nl', email_domain: 'm.nl' }),
      c({ id: 't9', priority_tier: 'top', outreach_prio: 9, email: 'a@t9.nl', email_domain: 't9.nl' }),
      c({ id: 't2', priority_tier: 'top', outreach_prio: 2, email: 'a@t2.nl', email_domain: 't2.nl' }),
      c({ id: 'g1', priority_tier: 'good', outreach_prio: 1, email: 'a@g.nl', email_domain: 'g.nl' }),
    ];
    const r = selectSendable(rows, base);
    expect(r.batch.map(b => b.contact.id)).toEqual(['t2', 't9', 'g1', 'm1']);
  });
});

describe('selectSendable - per bedrijf', () => {
  it('max 2 per domein per week', () => {
    const rows = [1, 2, 3, 4].map(i => c({ id: `c${i}`, email: `p${i}@ing.com`, outreach_prio: i }));
    const r = selectSendable(rows, base);
    expect(r.batch).toHaveLength(2);
    expect(r.skipped['max per bedrijf deze week']).toBe(2);
  });

  it('telt wat er deze week al naar dat domein ging mee', () => {
    const rows = [1, 2].map(i => c({ id: `c${i}`, email: `p${i}@ing.com`, outreach_prio: i }));
    const r = selectSendable(rows, { ...base, domainCounts: { 'ing.com': 2 } });
    expect(r.batch).toHaveLength(0);
    expect(r.skipped['max per bedrijf deze week']).toBe(2);
  });
});

describe('selectSendable - bericht 2 heeft extra remmen', () => {
  const two = c({ status: 'msg1_sent' });

  it('gaat mee bij een verse scan', () => {
    expect(selectSendable([two], base).batch).toHaveLength(1);
  });

  it('VEILIGHEID: gaat NIET mee bij een verouderde inboxscan', () => {
    const r = selectSendable([two], { ...base, lastScanISO: OLD });
    expect(r.batch).toHaveLength(0);
    expect(r.skipped['inboxscan verouderd']).toBe(1);
  });

  it('VEILIGHEID: gaat NIET mee als er nooit gescand is', () => {
    const r = selectSendable([two], { ...base, lastScanISO: null });
    expect(r.skipped['inboxscan verouderd']).toBe(1);
  });

  it('gaat NIET mee na de harde stopdatum', () => {
    const r = selectSendable([two], { ...base, now: new Date('2026-10-03T09:00:00Z') });
    expect(r.skipped['harde stopdatum voorbij']).toBe(1);
  });

  it('bericht 1 wordt NIET geblokkeerd door een oude scan of de stopdatum', () => {
    // Er is nog geen antwoord mogelijk op een eerste contact, dus die rem hoort
    // hier niet te gelden.
    const r = selectSendable([c()], { ...base, lastScanISO: null, now: new Date('2026-10-03T09:00:00Z') });
    expect(r.batch).toHaveLength(1);
    expect(r.batch[0].step).toBe(1);
  });
});

describe('selectSendable - overige uitsluitingen', () => {
  it('slaat statussen over die niet in aanmerking komen', () => {
    const r = selectSendable([c({ status: 'replied' }), c({ status: 'paused' }), c({ status: 'bounced' })], base);
    expect(r.batch).toHaveLength(0);
    expect(r.skipped['status komt niet in aanmerking']).toBe(3);
  });

  it('respecteert next_action_at in de toekomst', () => {
    const r = selectSendable([c({ next_action_at: '2026-09-20T09:00:00Z' })], base);
    expect(r.skipped['nog niet aan de beurt']).toBe(1);
  });

  it('slaat rijen zonder tekst over', () => {
    const r = selectSendable([c({ msg1_body: null })], base);
    expect(r.skipped['tekst ontbreekt']).toBe(1);
  });

  it('slaat rijen zonder e-mailadres over', () => {
    const r = selectSendable([c({ email: null })], base);
    expect(r.skipped['geen e-mailadres']).toBe(1);
  });

  it('onlyStep beperkt tot een stap', () => {
    const r = selectSendable([c(), c({ id: 'b', status: 'msg1_sent', email: 'b@x.nl', email_domain: 'x.nl' })], { ...base, onlyStep: 2 });
    expect(r.batch).toHaveLength(1);
    expect(r.batch[0].step).toBe(2);
  });

  it('robuust tegen lege input', () => {
    expect(selectSendable(null, base).batch).toEqual([]);
  });
});

describe('statusAfterSend', () => {
  it('stap 1 plant bericht 2 over 5 tot 7 dagen', () => {
    const r = statusAfterSend(1, { now: NOW });
    expect(r.status).toBe('msg1_sent');
    const days = (new Date(r.next_action_at) - NOW) / 86400000;
    expect(days).toBeGreaterThanOrEqual(5);
    expect(days).toBeLessThanOrEqual(7);
  });

  it('stap 2 is het eind van de reeks', () => {
    expect(statusAfterSend(2, { now: NOW })).toEqual({ status: 'msg2_sent', next_action_at: null });
  });
});

describe('STALE_HOURS', () => {
  it('staat op 12 uur', () => expect(STALE_HOURS).toBe(12));
});

// ── LinkedIn-kanaal ──────────────────────────────────────────────────────────
// Een DM heeft geen onderwerp, geen e-mailadres en geen domein, en er is geen
// opvolgbericht. Zonder kanaalbesef valt elke LinkedIn-prospect af op regels die
// voor e-mail zijn bedoeld.
const li = (o = {}) => ({
  id: o.id || 'li1', email: null, email_domain: null,
  linkedin_url: o.linkedin_url || 'https://www.linkedin.com/in/nelleke',
  status: 'queued', next_action_at: null, priority_tier: 'top', outreach_prio: 1,
  msg1_subject: null, msg1_body: 'Hi Nelleke,\n\nOp 6 oktober...',
  msg2_subject: null, msg2_body: null,
  ...o,
});

const liBase = { ...base, channel: 'linkedin', maxPerCompanyPerWeek: 2 };

describe('selectSendable op het LinkedIn-kanaal', () => {
  it('kiest een prospect zonder onderwerp en zonder e-mailadres', () => {
    const { batch } = selectSendable([li()], liBase);
    expect(batch).toHaveLength(1);
    expect(batch[0].step).toBe(1);
    expect(batch[0].subject).toBeNull();
    expect(batch[0].body).toContain('Hi Nelleke');
  });

  it('slaat een prospect zonder profiel-URL over', () => {
    const { batch, skipped } = selectSendable([li({ linkedin_url: null })], liBase);
    expect(batch).toHaveLength(0);
    expect(skipped['geen LinkedIn-profiel']).toBe(1);
  });

  it('KRITIEK: de per-bedrijf-regel op e-maildomein blokkeert hier niets', () => {
    // Drie mensen bij hetzelfde bedrijf, geen e-maildomein om op te tellen.
    const rows = [li({ id: 'a' }), li({ id: 'b', linkedin_url: 'https://linkedin.com/in/b' }),
                  li({ id: 'c', linkedin_url: 'https://linkedin.com/in/c' })];
    const { batch } = selectSendable(rows, { ...liBase, maxPerCompanyPerWeek: 1 });
    expect(batch).toHaveLength(3);
  });

  it('KRITIEK: er gaat nooit een tweede bericht uit', () => {
    const { batch, skipped } = selectSendable([li({ status: 'msg1_sent' })], liBase);
    expect(batch).toHaveLength(0);
    expect(skipped['geen opvolgbericht via LinkedIn']).toBe(1);
  });

  it('de dagcap werkt hetzelfde als bij e-mail', () => {
    const rows = [1, 2, 3, 4].map(n => li({ id: `r${n}`, linkedin_url: `https://linkedin.com/in/r${n}` }));
    const { batch, skipped } = selectSendable(rows, { ...liBase, dailyCap: 20, sentToday: 18 });
    expect(batch).toHaveLength(2);
    expect(skipped['dagcap bereikt']).toBe(2);
  });

  it('een verouderde inboxscan remt bericht 1 niet (die rem geldt bericht 2)', () => {
    const { batch } = selectSendable([li()], { ...liBase, lastScanISO: null });
    expect(batch).toHaveLength(1);
  });
});

describe('statusAfterSend op het LinkedIn-kanaal', () => {
  it('KRITIEK: plant geen opvolging, want die bestaat niet', () => {
    const r = statusAfterSend(1, { now: NOW, channel: 'linkedin' });
    expect(r.status).toBe('msg1_sent');
    expect(r.next_action_at).toBeNull();
  });

  it('e-mail blijft wel opvolgen', () => {
    const r = statusAfterSend(1, { now: NOW, delayMinDays: 5, delayMaxDays: 5 });
    expect(r.next_action_at).toBe(new Date('2026-09-21T09:00:00Z').toISOString());
  });
});

describe('spreiding over bedrijven bij LinkedIn', () => {
  const bij = (bedrijf, n) => li({
    id: `${bedrijf}${n}`, company: bedrijf,
    linkedin_url: `https://linkedin.com/in/${bedrijf}${n}`, outreach_prio: n,
  });

  it('KRITIEK: niet meer dan het maximum van hetzelfde bedrijf in een batch', () => {
    const rows = [bij('KPN', 1), bij('KPN', 2), bij('KPN', 3), bij('Rabobank', 4)];
    const { batch, skipped } = selectSendable(rows, { ...liBase, maxPerCompanyPerWeek: 2 });
    expect(batch.map(b => b.contact.id)).toEqual(['KPN1', 'KPN2', 'Rabobank4']);
    expect(skipped['max per bedrijf deze week']).toBe(1);
  });

  it('telt mee wat er deze week al naar dat bedrijf ging', () => {
    const { batch, skipped } = selectSendable([bij('KPN', 1)], {
      ...liBase, maxPerCompanyPerWeek: 2, companyCounts: { kpn: 2 },
    });
    expect(batch).toHaveLength(0);
    expect(skipped['max per bedrijf deze week']).toBe(1);
  });

  it('schrijfwijze maakt niet uit', () => {
    const rows = [bij('KPN', 1), li({ id: 'x', company: 'K.P.N.', linkedin_url: 'https://linkedin.com/in/x' })];
    const { batch } = selectSendable(rows, { ...liBase, maxPerCompanyPerWeek: 1 });
    expect(batch).toHaveLength(1);
  });

  it('zonder bedrijfsnaam geldt de regel niet, en die mensen belanden niet in een emmer samen', () => {
    const rows = [li({ id: 'a', company: null }), li({ id: 'b', company: '', linkedin_url: 'https://linkedin.com/in/b' })];
    const { batch } = selectSendable(rows, { ...liBase, maxPerCompanyPerWeek: 1 });
    expect(batch).toHaveLength(2);
  });
});

describe('weekcap', () => {
  // LinkedIn rekent per week, niet per dag: voor een premium account ligt de
  // grens op 150 berichten aan eerstegraads connecties. Een dagcap alleen is
  // daar geen bescherming tegen, want 30 per dag is 210 in zeven dagen.
  const rijen = (n) => Array.from({ length: n }, (_, i) =>
    li({ id: `w${i}`, linkedin_url: `https://linkedin.com/in/w${i}`, company: `Bedrijf${i}`, outreach_prio: i }));

  it('KRITIEK: de weekcap remt ook als de dagcap nog ruimte heeft', () => {
    const { batch, skipped } = selectSendable(rijen(10), {
      ...liBase, dailyCap: 30, sentToday: 0, weeklyCap: 150, sentThisWeek: 146, batchLimit: 10,
    });
    expect(batch).toHaveLength(4);
    expect(skipped['weekcap bereikt']).toBe(6);
  });

  it('zonder weekcap verandert er niets', () => {
    const { batch } = selectSendable(rijen(10), {
      ...liBase, dailyCap: 30, sentToday: 0, batchLimit: 10,
    });
    expect(batch).toHaveLength(10);
  });

  it('de strengste van de drie bindt, en de reden klopt', () => {
    const r1 = selectSendable(rijen(10), { ...liBase, dailyCap: 30, sentToday: 28, weeklyCap: 150, sentThisWeek: 0, batchLimit: 10 });
    expect(r1.batch).toHaveLength(2);
    expect(r1.skipped['dagcap bereikt']).toBe(8);

    const r2 = selectSendable(rijen(10), { ...liBase, dailyCap: 30, sentToday: 0, weeklyCap: 150, sentThisWeek: 0, batchLimit: 3 });
    expect(r2.batch).toHaveLength(3);
    expect(r2.skipped['batchlimiet bereikt']).toBe(7);
  });

  it('een volle week laat niets meer door', () => {
    const { batch, skipped } = selectSendable(rijen(5), {
      ...liBase, dailyCap: 30, sentToday: 0, weeklyCap: 150, sentThisWeek: 150, batchLimit: 10,
    });
    expect(batch).toHaveLength(0);
    expect(skipped['weekcap bereikt']).toBe(5);
  });
});
