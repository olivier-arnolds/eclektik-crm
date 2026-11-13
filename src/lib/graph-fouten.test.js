import { describe, it, expect } from 'vitest';
import { magOpnieuw, wachttijd, graphFout } from './graph-fouten.js';

describe('magOpnieuw', () => {
  it('probeert opnieuw bij drukte en bij een hik aan hun kant', () => {
    for (const s of [429, 500, 502, 503, 504]) {
      expect(magOpnieuw(s, 1)).toBe(true);
    }
  });

  it('KRITIEK: probeert NIET opnieuw bij een fout die niet overgaat', () => {
    // Een 400 of 404 wordt bij een tweede poging niet anders. Blijven proberen
    // maakt het alleen trager en verbergt de echte reden.
    for (const s of [400, 401, 403, 404, 422]) {
      expect(magOpnieuw(s, 1)).toBe(false);
    }
  });

  it('stopt na het maximum', () => {
    expect(magOpnieuw(500, 2, 3)).toBe(true);
    expect(magOpnieuw(500, 3, 3)).toBe(false);
    expect(magOpnieuw(500, 4, 3)).toBe(false);
  });
});

describe('wachttijd', () => {
  it('loopt op als Microsoft niets zegt', () => {
    expect(wachttijd(1)).toBe(1000);
    expect(wachttijd(2)).toBe(2000);
    expect(wachttijd(3)).toBe(4000);
  });

  it('KRITIEK: volgt Retry-After als die er is', () => {
    // Eerder terugkomen dan gevraagd verlengt de beperking alleen maar.
    expect(wachttijd(1, '5')).toBe(5000);
    expect(wachttijd(3, 2)).toBe(2000);
  });

  it('laat de wachttijd niet eindeloos oplopen', () => {
    expect(wachttijd(1, '600')).toBe(30000);
    expect(wachttijd(9)).toBe(8000);
  });

  it('negeert onzin in de header', () => {
    expect(wachttijd(1, 'binnenkort')).toBe(1000);
    expect(wachttijd(1, '-4')).toBe(1000);
  });
});

describe('graphFout', () => {
  it('zet de HTTP-status er altijd bij', () => {
    // Juist bij UnknownError is de status het enige onderscheid tussen te druk
    // en iets anders.
    const f = graphFout(500, { error: { code: 'UnknownError', message: '' } });
    expect(f.tekst).toContain('UnknownError (HTTP 500)');
  });

  it('legt een lege UnknownError uit', () => {
    const f = graphFout(500, { error: { code: 'UnknownError', message: '' } }, 'abc-123');
    expect(f.tekst).toMatch(/hun kant/);
    expect(f.tekst).toContain('request-id abc-123');
    expect(f.toegangGeweigerd).toBe(false);
  });

  it('voegt die uitleg niet toe als Graph wel iets zegt', () => {
    const f = graphFout(500, { error: { code: 'UnknownError', message: 'Mailbox is busy' } });
    expect(f.tekst).toContain('Mailbox is busy');
    expect(f.tekst).not.toMatch(/statuspagina/);
  });

  it('herkent geweigerde toegang, op status en op code', () => {
    expect(graphFout(403, { error: { code: 'Forbidden' } }).toegangGeweigerd).toBe(true);
    expect(graphFout(401, { error: { code: 'ErrorAccessDenied' } }).toegangGeweigerd).toBe(true);
    expect(graphFout(500, { error: { code: 'UnknownError' } }).toegangGeweigerd).toBe(false);
  });

  it('redt zich zonder bruikbaar antwoordlichaam', () => {
    expect(graphFout(502, {}).tekst).toBe('HTTP 502');
    expect(graphFout(502, null).tekst).toBe('HTTP 502');
  });
});
