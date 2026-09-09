import { describe, it, expect } from 'vitest';
import {
  validateEventSlug, shapeRegistration, dedupeByEmail, sortByOccurredAt, buildRegistrations,
} from './event-registrations-lib.js';

describe('validateEventSlug', () => {
  it('accepts a normal slug', () => {
    expect(validateEventSlug('amsterdam-2026')).toEqual({ value: 'amsterdam-2026' });
  });

  it('trims and lowercases', () => {
    expect(validateEventSlug('  Amsterdam-2026 ').value).toBe('amsterdam-2026');
  });

  it('rejects a missing or empty param', () => {
    expect(validateEventSlug(undefined).error).toBeTruthy();
    expect(validateEventSlug('   ').error).toBeTruthy();
  });

  it('rejects a repeated query param (array)', () => {
    expect(validateEventSlug(['a', 'b']).error).toBeTruthy();
  });

  it('rejects anything that is not a plain slug', () => {
    // Komma, haakje en punt hebben betekenis in een PostgREST-filter; spatie,
    // slash en underscore horen niet in een slug.
    for (const bad of ['a,b', 'a(b)', 'a.b', 'a b', '../secret', 'a_b', 'a%b', "a'b"]) {
      expect(validateEventSlug(bad).error, bad).toBeTruthy();
    }
  });

  it('rejects stray hyphens', () => {
    for (const bad of ['-amsterdam', 'amsterdam-', 'amsterdam--2026', '-']) {
      expect(validateEventSlug(bad).error, bad).toBeTruthy();
    }
  });

  it('rejects an absurdly long slug', () => {
    expect(validateEventSlug('a'.repeat(65)).error).toBeTruthy();
    expect(validateEventSlug('a'.repeat(64)).value).toBeTruthy();
  });
});

describe('shapeRegistration', () => {
  const row = {
    occurred_at: '2026-09-08T10:00:00.000Z',
    payload: {
      name: 'Jane Doe', company: 'Acme', role: 'CHRO',
      eventSlug: 'amsterdam-2026', country: 'Netherlands',
      invitedBy: 'Eclectik',
      phone: '+31 6 12345678', consentWorkvivo: true,
    },
    lead: { email: 'jane@acme.com', full_name: 'Jane Doe', company: 'Acme', role: 'CHRO' },
  };

  it('maps the joined lead plus the payload fields', () => {
    expect(shapeRegistration(row)).toEqual({
      occurred_at: '2026-09-08T10:00:00.000Z',
      email: 'jane@acme.com',
      full_name: 'Jane Doe',
      company: 'Acme',
      role: 'CHRO',
      country: 'Netherlands',
      invited_by: 'Eclectik',
      phone: '+31 6 12345678',
      consent_workvivo: true,
    });
  });

  it('falls back to the payload when a lead column is still empty', () => {
    const out = shapeRegistration({
      ...row,
      lead: { email: 'jane@acme.com', full_name: null, company: '', role: null },
    });
    expect(out.full_name).toBe('Jane Doe');
    expect(out.company).toBe('Acme');
    expect(out.role).toBe('CHRO');
  });

  // De reden dat dit endpoint de payload voorrang geeft en de rest van het CRM
  // niet. upsertMarketingLead overschrijft bestaande profielvelden nooit, dus
  // een terugkerend e-mailadres houdt de gegevens van zijn eerste bezoek. Voor
  // een gastenlijst wil je juist wat er op dit formulier is ingevuld.
  it('prefers the payload over stale lead columns for a returning registrant', () => {
    const out = shapeRegistration({
      ...row,
      payload: { ...row.payload, name: 'Jane Doe', company: 'Bolt', role: 'CPO' },
      lead: {
        email: 'jane@acme.com',
        full_name: 'Jane Doe',
        company: 'Acme',
        role: 'Head of HR',
      },
    });
    expect(out.company).toBe('Bolt');
    expect(out.role).toBe('CPO');
  });

  it('falls back to the lead column when the payload lacks the field', () => {
    const out = shapeRegistration({
      ...row,
      payload: { eventSlug: 'amsterdam-2026' },
      lead: { email: 'jane@acme.com', full_name: 'Jane Doe', company: 'Acme', role: 'CHRO' },
    });
    expect(out.full_name).toBe('Jane Doe');
    expect(out.company).toBe('Acme');
    expect(out.role).toBe('CHRO');
  });

  it('returns nulls instead of undefined for a missing payload', () => {
    const out = shapeRegistration({
      occurred_at: '2026-09-08T10:00:00.000Z', payload: null,
      lead: { email: 'jane@acme.com' },
    });
    expect(out).toEqual({
      occurred_at: '2026-09-08T10:00:00.000Z',
      email: 'jane@acme.com',
      full_name: null, company: null, role: null,
      country: null, invited_by: null, phone: null, consent_workvivo: false,
    });
  });

  it('only counts a real boolean as consent', () => {
    expect(shapeRegistration({ payload: { consentWorkvivo: 'true' } }).consent_workvivo).toBe(false);
    expect(shapeRegistration({ payload: { consentWorkvivo: 1 } }).consent_workvivo).toBe(false);
    expect(shapeRegistration({ payload: {} }).consent_workvivo).toBe(false);
  });

  it('also reads the lead when the embed arrives as an array', () => {
    const out = shapeRegistration({ ...row, lead: [row.lead] });
    expect(out.email).toBe('jane@acme.com');
    expect(out.full_name).toBe('Jane Doe');
  });

  it('drops non-string junk from the payload', () => {
    const out = shapeRegistration({ payload: { country: 42, phone: { nr: 1 } }, lead: {} });
    expect(out.country).toBeNull();
    expect(out.phone).toBeNull();
  });
});

describe('sortByOccurredAt', () => {
  it('sorts ascending and leaves the input alone', () => {
    const input = [{ occurred_at: '2026-09-08T12:00:00Z' }, { occurred_at: '2026-09-08T09:00:00Z' }];
    const out = sortByOccurredAt(input);
    expect(out.map(r => r.occurred_at)).toEqual(['2026-09-08T09:00:00Z', '2026-09-08T12:00:00Z']);
    expect(input[0].occurred_at).toBe('2026-09-08T12:00:00Z');
  });

  it('puts an unparseable timestamp last instead of scrambling the rest', () => {
    const out = sortByOccurredAt([
      { occurred_at: 'not-a-date' },
      { occurred_at: '2026-09-08T12:00:00Z' },
      { occurred_at: '2026-09-08T09:00:00Z' },
    ]);
    expect(out.map(r => r.occurred_at)).toEqual([
      '2026-09-08T09:00:00Z', '2026-09-08T12:00:00Z', 'not-a-date',
    ]);
  });
});

describe('dedupeByEmail', () => {
  it('keeps the first row per email, case-insensitively', () => {
    const out = dedupeByEmail([
      { email: 'jane@acme.com', company: 'Acme' },
      { email: 'JANE@acme.com', company: 'Acme BV' },
      { email: 'bob@acme.com', company: 'Acme' },
    ]);
    expect(out.map(r => r.company)).toEqual(['Acme', 'Acme']);
    expect(out.map(r => r.email)).toEqual(['jane@acme.com', 'bob@acme.com']);
  });

  it('never silently drops a row without an email', () => {
    const out = dedupeByEmail([{ email: null }, { email: null }]);
    expect(out).toHaveLength(2);
  });
});

describe('buildRegistrations', () => {
  const rows = [
    {
      occurred_at: '2026-09-08T12:00:00.000Z',
      payload: { eventSlug: 'amsterdam-2026', country: 'Belgium', consentWorkvivo: true },
      lead: { email: 'jane@acme.com', full_name: 'Jane Doe', company: 'Acme', role: 'CHRO' },
    },
    {
      occurred_at: '2026-09-08T09:00:00.000Z',
      payload: { eventSlug: 'amsterdam-2026', country: 'Netherlands', consentWorkvivo: true },
      lead: { email: 'Jane@Acme.com', full_name: 'Jane Doe', company: 'Acme', role: 'CHRO' },
    },
    {
      occurred_at: '2026-09-08T10:00:00.000Z',
      payload: { eventSlug: 'amsterdam-2026', consentWorkvivo: true },
      lead: { email: 'bob@acme.com', full_name: 'Bob Roos', company: 'Acme', role: 'HRBP' },
    },
  ];

  it('sorts ascending and keeps the earliest row per email', () => {
    const out = buildRegistrations(rows);
    expect(out.map(r => r.email)).toEqual(['Jane@Acme.com', 'bob@acme.com']);
    // De vroegste inschrijving van Jane (09:00) wint van die van 12:00.
    expect(out[0].occurred_at).toBe('2026-09-08T09:00:00.000Z');
    expect(out[0].country).toBe('Netherlands');
  });

  it('is order-independent: the same rows in any order give the same list', () => {
    const reversed = buildRegistrations([...rows].reverse());
    expect(reversed).toEqual(buildRegistrations(rows));
  });

  it('handles an empty or missing result set', () => {
    expect(buildRegistrations([])).toEqual([]);
    expect(buildRegistrations(null)).toEqual([]);
  });
});
