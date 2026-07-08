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

  it('rejects a non-string event', () => {
    expect(validateSignal({ email: 'a@b.co', event: {} }).error).toBeTruthy();
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

  it('skips dangerous keys like __proto__ from untrusted JSON', () => {
    // JSON.parse maakt (anders dan een object-literal) een échte own
    // property "__proto__" aan — precies wat een aanvaller kan sturen.
    const body = JSON.parse('{"__proto__": {"x": 1}, "safe": "ok"}');
    const out = activityPayload(body);
    expect(out).toEqual({ safe: 'ok' });
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(out.x).toBeUndefined();
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

  it('only accepts string values for text columns', () => {
    const patch = profilePatch({}, { name: 42, company: { name: 'Acme' }, role: 'CHRO' });
    expect(patch).toEqual({ role: 'CHRO' });
  });
});
