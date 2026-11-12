import { describe, it, expect } from 'vitest';
import { slaagt, bronNaam, vatSamen, oordeel, periodeTekst } from './dmarc-overzicht.js';

const outlookOk = {
  source_ip: '40.107.22.55', aantal: 100, dkim_eval: 'pass', spf_eval: 'pass',
  dkim_domain: 'eclectik.co', dkim_result: 'pass', spf_domain: 'eclectik.co', spf_result: 'pass',
};
const resendOk = {
  source_ip: '54.240.1.2', aantal: 40, dkim_eval: 'pass', spf_eval: 'pass',
  dkim_domain: 'eclectik.co', dkim_result: 'pass', spf_domain: 'send.eclectik.co', spf_result: 'pass',
};
const vreemdeBron = {
  source_ip: '203.0.113.9', aantal: 6, dkim_eval: 'fail', spf_eval: 'fail',
  dkim_domain: null, dkim_result: null, spf_domain: 'mailchimp.example', spf_result: 'fail',
};

describe('slaagt', () => {
  it('KRITIEK: een van beide is genoeg', () => {
    // DMARC vraagt niet om SPF EN DKIM. Beide eisen zou geldige mail als
    // mislukt tonen en je een probleem laten oplossen dat er niet is.
    expect(slaagt({ dkim_eval: 'pass', spf_eval: 'fail' })).toBe(true);
    expect(slaagt({ dkim_eval: 'fail', spf_eval: 'pass' })).toBe(true);
    expect(slaagt({ dkim_eval: 'fail', spf_eval: 'fail' })).toBe(false);
    expect(slaagt({})).toBe(false);
  });
});

describe('bronNaam', () => {
  it('herkent de eigen verzendwegen', () => {
    expect(bronNaam(outlookOk)).toBe('Microsoft 365 (Outlook)');
    expect(bronNaam(resendOk)).toBe('Resend (Amazon SES)');
    expect(bronNaam({ source_ip: '35.157.190.5' })).toBe('Barracuda');
  });

  it('noemt een vreemd domein bij naam', () => {
    expect(bronNaam(vreemdeBron)).toBe('mailchimp.example');
  });

  it('valt terug op het IP-adres, want dat is dan het enige spoor', () => {
    expect(bronNaam({ source_ip: '198.51.100.7' })).toBe('198.51.100.7');
    expect(bronNaam({})).toBe('onbekend');
  });
});

describe('vatSamen', () => {
  it('telt per bron en over het geheel', () => {
    const s = vatSamen([outlookOk, resendOk, vreemdeBron]);
    expect(s.totaal).toBe(146);
    expect(s.geslaagd).toBe(140);
    expect(s.gefaald).toBe(6);
    expect(s.percentage).toBe(95.9);
    expect(s.bronnen[0]).toMatchObject({ naam: 'Microsoft 365 (Outlook)', totaal: 100, gefaald: 0 });
  });

  it('zet de falende bronnen apart, met de grootste eerst', () => {
    const s = vatSamen([outlookOk, vreemdeBron, { ...vreemdeBron, source_ip: '198.51.100.1', aantal: 20, spf_domain: 'spoof.example' }]);
    expect(s.probleembronnen.map(b => b.naam)).toEqual(['spoof.example', 'mailchimp.example']);
    expect(s.probleembronnen[0].gefaald).toBe(20);
  });

  it('noemt een ontbrekende handtekening als bevinding', () => {
    // Een lege verzameling zou verzwijgen dat er helemaal niet getekend is, en
    // juist dat is de aanwijzing bij een dienst die verkeerd staat.
    const s = vatSamen([vreemdeBron]);
    expect(s.probleembronnen[0].dkimFouten).toContain('geen handtekening');
    expect(s.probleembronnen[0].spfFouten).toContain('fail');
  });

  it('KRITIEK: nul mail geeft geen percentage', () => {
    // 0% zou lezen als 'alles faalt' en iemand iets laten repareren dat niet
    // stuk is.
    const s = vatSamen([]);
    expect(s.totaal).toBe(0);
    expect(s.percentage).toBeNull();
  });
});

describe('oordeel', () => {
  it('is groen vanaf 98 procent', () => {
    // Niet pas bij 100: een doorgestuurde mail breekt SPF altijd, dat is normaal.
    expect(oordeel({ totaal: 100, geslaagd: 98, gefaald: 2, percentage: 98 }).kleur).toBe('groen');
    expect(oordeel({ totaal: 100, geslaagd: 97, gefaald: 3, percentage: 97 }).kleur).toBe('oranje');
    expect(oordeel({ totaal: 100, geslaagd: 50, gefaald: 50, percentage: 50 }).kleur).toBe('rood');
  });

  it('zegt bij nul rapporten dat er nog niets is', () => {
    expect(oordeel({ totaal: 0, percentage: null }).kleur).toBe('grijs');
    expect(oordeel(null).kleur).toBe('grijs');
  });
});

describe('periodeTekst', () => {
  it('vat de periode van alle rapporten samen', () => {
    const t = periodeTekst([
      { date_begin: '2026-11-09T00:00:00Z', date_end: '2026-11-10T00:00:00Z' },
      { date_begin: '2026-11-11T00:00:00Z', date_end: '2026-11-12T00:00:00Z' },
    ]);
    expect(t).toMatch(/9 nov/);
    expect(t).toMatch(/12 nov/);
  });

  it('geeft null als er niets is', () => {
    expect(periodeTekst([])).toBeNull();
    expect(periodeTekst(null)).toBeNull();
  });
});
