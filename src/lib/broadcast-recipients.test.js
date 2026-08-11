import { describe, it, expect } from 'vitest';
import { toResendContacts } from './broadcast-recipients';

describe('toResendContacts', () => {
  it('mapt e-mail + voornaam en zet unsubscribed uit do_not_email', () => {
    const out = toResendContacts([
      { email: 'a@x.co', first_name: 'Ann', do_not_email: false, contact_id: 'c1' },
    ]);
    expect(out).toEqual([{ email: 'a@x.co', first_name: 'Ann', unsubscribed: false, contact_id: 'c1' }]);
  });

  it('laat contacten zonder e-mail weg', () => {
    const out = toResendContacts([{ email: '', first_name: 'X' }]);
    expect(out).toEqual([]);
  });

  it('markeert opt-out contacten als unsubscribed maar houdt ze in de lijst', () => {
    const out = toResendContacts([{ email: 'b@x.co', first_name: 'Bo', do_not_email: true }]);
    expect(out).toEqual([{ email: 'b@x.co', first_name: 'Bo', unsubscribed: true, contact_id: null }]);
  });

  it('normaliseert e-mail (trim + lowercase) en dedupliceert', () => {
    const out = toResendContacts([
      { email: ' A@X.co ', first_name: 'Ann', contact_id: 'c1' },
      { email: 'a@x.co', first_name: 'Ann2', contact_id: 'c2' },
    ]);
    expect(out).toEqual([{ email: 'a@x.co', first_name: 'Ann', unsubscribed: false, contact_id: 'c1' }]);
  });

  it('valt terug op id als contact_id ontbreekt', () => {
    const out = toResendContacts([{ email: 'd@x.co', first_name: 'Di', id: 'row-9' }]);
    expect(out).toEqual([{ email: 'd@x.co', first_name: 'Di', unsubscribed: false, contact_id: 'row-9' }]);
  });
});
