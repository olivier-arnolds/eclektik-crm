import { describe, it, expect } from 'vitest';
import { validateAanwezigheid, aanwezigheidPatch } from './session-attendance-lib.js';

const ID = '11111111-2222-3333-4444-555555555555';

describe('validateAanwezigheid', () => {
  it('neemt aanwezig en afwezig aan', () => {
    expect(validateAanwezigheid({ id: ID, attendance: 'aanwezig' }))
      .toEqual({ value: { id: ID, attendance: 'aanwezig' } });
    expect(validateAanwezigheid({ id: ID, attendance: 'AFWEZIG' }))
      .toEqual({ value: { id: ID, attendance: 'afwezig' } });
  });

  it('KRITIEK: aangemeld en leeg betekenen allebei null', () => {
    // Anders zou een rij op twee manieren 'aangemeld' kunnen zijn en moet elke
    // lezer raden welke van de twee telt.
    expect(validateAanwezigheid({ id: ID, attendance: 'aangemeld' }).value.attendance).toBeNull();
    expect(validateAanwezigheid({ id: ID, attendance: '' }).value.attendance).toBeNull();
    expect(validateAanwezigheid({ id: ID, attendance: null }).value.attendance).toBeNull();
    expect(validateAanwezigheid({ id: ID }).value.attendance).toBeNull();
  });

  it('weigert een onbekende waarde', () => {
    expect(validateAanwezigheid({ id: ID, attendance: 'misschien' }).error).toBe('Invalid attendance');
  });

  it('weigert een id dat geen uuid is', () => {
    expect(validateAanwezigheid({ id: 'abc', attendance: 'aanwezig' }).error).toBe('Invalid id');
    expect(validateAanwezigheid({ attendance: 'aanwezig' }).error).toBe('Invalid id');
    expect(validateAanwezigheid(null).error).toBe('Missing body');
  });
});

describe('aanwezigheidPatch', () => {
  const now = new Date('2026-11-05T10:00:00.000Z');

  it('legt vast wie het zette en wanneer', () => {
    expect(aanwezigheidPatch({ attendance: 'aanwezig', door: 'olivier@eclectik.co' }, now))
      .toEqual({
        attendance: 'aanwezig',
        attendance_at: '2026-11-05T10:00:00.000Z',
        attendance_by: 'olivier@eclectik.co',
        updated_at: '2026-11-05T10:00:00.000Z',
      });
  });

  it('maakt bij terugzetten ook het spoor leeg', () => {
    // Een datum van een waarneming die is ingetrokken leest als bewijs dat er
    // iets waargenomen is.
    expect(aanwezigheidPatch({ attendance: null, door: 'olivier@eclectik.co' }, now))
      .toEqual({
        attendance: null, attendance_at: null, attendance_by: null,
        updated_at: '2026-11-05T10:00:00.000Z',
      });
  });
});
