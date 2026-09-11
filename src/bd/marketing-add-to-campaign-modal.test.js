import { describe, it, expect } from 'vitest';
import { splitsOntvangers } from './marketing-add-to-campaign-modal.jsx';

// Deze regels bepalen wie er alsnog een campagnemail krijgt. Het scenario waar
// het scherm voor bestaat: iemand bouncede op het oude adres, is verhuisd naar
// een ander bedrijf en heeft een nieuw adres. Die moet er WEL door.
const c = (o = {}) => ({ id: o.id || '1', name: o.name || 'Muriel Werlé', email: 'nieuw@imcdgroup.com', ...o });

describe('splitsOntvangers', () => {
  it('KRITIEK: een nieuw adres van dezelfde persoon mag wel', () => {
    const verzonden = new Set(['oud@vorigbedrijf.com']);
    const { mee, afvallers } = splitsOntvangers([c()], verzonden);
    expect(mee).toHaveLength(1);
    expect(afvallers).toHaveLength(0);
  });

  it('KRITIEK: hetzelfde adres krijgt de uiting nooit twee keer', () => {
    const { mee, afvallers } = splitsOntvangers([c()], new Set(['nieuw@imcdgroup.com']));
    expect(mee).toHaveLength(0);
    expect(afvallers[0][1]).toBe('dit adres heeft de mail al gehad');
  });

  it('hoofdletters en spaties in het adres tellen als hetzelfde adres', () => {
    const { mee } = splitsOntvangers([c({ email: '  Nieuw@IMCDgroup.com ' })], new Set(['nieuw@imcdgroup.com']));
    expect(mee).toHaveLength(0);
  });

  it('zonder adres, op do-not-email, of inactief valt iemand af met de reden erbij', () => {
    const { mee, afvallers } = splitsOntvangers([
      c({ id: 'a', email: '' }),
      c({ id: 'b', do_not_email: true }),
      c({ id: 'c', isInactive: true }),
      c({ id: 'd', isFormer: true }),
    ], new Set());
    expect(mee).toHaveLength(0);
    expect(afvallers.map(([, reden]) => reden)).toEqual([
      'geen e-mailadres', 'staat op do-not-email',
      'staat op inactief of former', 'staat op inactief of former',
    ]);
  });

  it('gaat om met een lege selectie en een lege set', () => {
    expect(splitsOntvangers([], new Set()).mee).toHaveLength(0);
    expect(splitsOntvangers(null, null).mee).toHaveLength(0);
  });
});
