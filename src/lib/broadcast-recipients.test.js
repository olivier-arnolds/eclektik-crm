import { describe, it, expect } from 'vitest';
import { toResendContacts } from './broadcast-recipients';

describe('toResendContacts', () => {
  it('mapt e-mail + voornaam en zet unsubscribed uit do_not_email', () => {
    const out = toResendContacts([
      { email: 'a@x.co', first_name: 'Ann', do_not_email: false },
    ]);
    expect(out).toEqual([{ email: 'a@x.co', first_name: 'Ann', unsubscribed: false }]);
  });

  it('laat contacten zonder e-mail weg', () => {
    const out = toResendContacts([{ email: '', first_name: 'X' }]);
    expect(out).toEqual([]);
  });

  it('markeert opt-out contacten als unsubscribed maar houdt ze in de lijst', () => {
    const out = toResendContacts([{ email: 'b@x.co', first_name: 'Bo', do_not_email: true }]);
    expect(out).toEqual([{ email: 'b@x.co', first_name: 'Bo', unsubscribed: true }]);
  });

  it('normaliseert e-mail (trim + lowercase) en dedupliceert', () => {
    const out = toResendContacts([
      { email: ' A@X.co ', first_name: 'Ann' },
      { email: 'a@x.co', first_name: 'Ann2' },
    ]);
    expect(out).toEqual([{ email: 'a@x.co', first_name: 'Ann', unsubscribed: false }]);
  });
});
