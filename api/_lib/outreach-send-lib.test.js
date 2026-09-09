import { describe, it, expect } from 'vitest';
import {
  linkifyBareUrls, outreachTextToHtml, subjectForStep, stepForStatus,
  selectSendable, statusAfterSend, STALE_HOURS,
} from './outreach-send-lib.js';

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
