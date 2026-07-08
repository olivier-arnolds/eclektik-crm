import { describe, it, expect } from 'vitest';
import { validateSignal, activityPayload, profilePatch } from './website-signal-lib.js';

describe('validateSignal', () => {
  it('accepts a valid waitlist payload and normalises the email', () => {
    const { error, value } = validateSignal({
      source: 'website', event: 'waitlist_joined',
      email: '  Jane@Example.COM ', name: 'Jane Doe',
    });
    expect(error).toBeUndefined();
    expect(value.email).toBe('jane@example.com');
    expect(value.event).toBe('waitlist_joined');
  });

  it('rejects a missing body', () => {
    expect(validateSignal(undefined).error).toBeTruthy();
  });

  it('rejects an invalid email', () => {
    expect(validateSignal({ event: 'x', email: 'not-an-email' }).error).toBeTruthy();
  });

  it('rejects a missing event', () => {
    expect(validateSignal({ email: 'a@b.co' }).error).toBeTruthy();
  });
});

describe('activityPayload', () => {
  it('keeps profile + extra fields, drops meta and empty values', () => {
    const out = activityPayload({
      source: 'website', event: 'waitlist_joined', email: 'a@b.co',
      src: 'li-1', name: 'Jane', company: '', sector: 'Tech',
      extra_question: 'answer',
    });
    // email/event/source/src zijn kolommen — niet dubbel in payload
    expect(out).toEqual({ name: 'Jane', sector: 'Tech', extra_question: 'answer' });
  });
});

describe('profilePatch', () => {
  it('fills only fields that are currently empty', () => {
    const existing = { full_name: 'Jane Doe', company: null, role: '', sector: 'Tech' };
    const patch = profilePatch(existing, {
      name: 'J. Doe', company: 'Acme', role: 'CHRO', sector: 'Finance',
    });
    // full_name bestaat al, sector bestaat al → niet overschrijven
    expect(patch).toEqual({ company: 'Acme', role: 'CHRO' });
  });

  it('returns an empty patch when nothing new is provided', () => {
    expect(profilePatch({ full_name: 'X', company: 'Y', role: 'Z', sector: 'S' }, {})).toEqual({});
  });
});
