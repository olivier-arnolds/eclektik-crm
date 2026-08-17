import { describe, it, expect } from 'vitest';
import { contactMatchesAudience, filterAudience, audienceSummary, seniorityScore, isHrRole, contactRank, surplusExclusions } from './content-audience-logic';

const meta = new Map([
  ['a1', { type: 'Prospect', country: 'Netherlands', industry: 'Retail' }],
  ['a2', { type: 'Customer', country: 'United Kingdom', industry: 'Finance' }],
]);
const base = { id: 'c1', accountId: 'a1', tags: [{ id: 't1', name: 'Glint' }], email: 'x@y.com', isFormer: false, marketing_content_opt_in: true };

describe('contactMatchesAudience', () => {
  it('leeg filter matcht elk actief contact', () => {
    expect(contactMatchesAudience(base, {}, meta)).toBe(true);
  });
  it('former contacten matchen nooit', () => {
    expect(contactMatchesAudience({ ...base, isFormer: true }, {}, meta)).toBe(false);
  });
  it('tagIds: matcht alleen als contact een van de tags heeft', () => {
    expect(contactMatchesAudience(base, { tagIds: ['t1'] }, meta)).toBe(true);
    expect(contactMatchesAudience(base, { tagIds: ['t9'] }, meta)).toBe(false);
  });
  it('statuses: matcht op account-type', () => {
    expect(contactMatchesAudience(base, { statuses: ['Prospect'] }, meta)).toBe(true);
    expect(contactMatchesAudience(base, { statuses: ['Customer'] }, meta)).toBe(false);
  });
  it('countries + industries', () => {
    expect(contactMatchesAudience(base, { countries: ['Netherlands'] }, meta)).toBe(true);
    expect(contactMatchesAudience(base, { industries: ['Finance'] }, meta)).toBe(false);
  });
  it('hasEmail true/false', () => {
    expect(contactMatchesAudience({ ...base, email: '' }, { hasEmail: true }, meta)).toBe(false);
    expect(contactMatchesAudience({ ...base, email: '' }, { hasEmail: false }, meta)).toBe(true);
  });
  it('optIn true sluit niet-opted-in uit', () => {
    expect(contactMatchesAudience({ ...base, marketing_content_opt_in: false }, { optIn: true }, meta)).toBe(false);
  });
  it('onbekend account (geen meta) faalt op status/land/industrie-filters', () => {
    const noAcc = { ...base, accountId: 'zzz' };
    expect(contactMatchesAudience(noAcc, { statuses: ['Prospect'] }, meta)).toBe(false);
    expect(contactMatchesAudience(noAcc, {}, meta)).toBe(true);
  });
});

describe('filterAudience', () => {
  it('geeft alleen matchende contacten terug', () => {
    const cs = [base, { id: 'c2', accountId: 'a2', tags: [], email: 'a@b.com', isFormer: false, marketing_content_opt_in: true }];
    const out = filterAudience(cs, { statuses: ['Customer'] }, meta);
    expect(out.map(c => c.id)).toEqual(['c2']);
  });
});

describe('audienceSummary', () => {
  it('bouwt een leesbare regel met telling', () => {
    const s = audienceSummary({ statuses: ['Prospect'], countries: ['Netherlands'], tagNames: [], industries: [], hasEmail: true, optIn: true }, 42);
    expect(s).toBe('Prospect, Netherlands, e-mail aanwezig, opt-in - 42 contacten');
  });
  it('leeg filter = alle contacten, enkelvoud bij 1', () => {
    expect(audienceSummary({}, 1)).toBe('alle contacten - 1 contact');
  });
  it('geen em-dash in de samenvatting', () => {
    const s = audienceSummary({ tagNames: ['Glint'] }, 3);
    expect(s.includes('—')).toBe(false);
  });
});

describe('seniorityScore', () => {
  it('kent tiers toe op basis van titel', () => {
    expect(seniorityScore('Chief People Officer')).toBe(100);
    expect(seniorityScore('VP of People')).toBe(80);
    expect(seniorityScore('Head of HR')).toBe(80);
    expect(seniorityScore('HR Director')).toBe(60);
    expect(seniorityScore('HR Manager')).toBe(40);
    expect(seniorityScore('HR Business Partner')).toBe(20);
    expect(seniorityScore('')).toBe(20);
  });
  it('managing director telt als exec, niet als director', () => {
    expect(seniorityScore('Managing Director')).toBe(100);
  });
  it('vice president is tier 80, niet exec', () => {
    expect(seniorityScore('Vice President')).toBe(80);
    expect(seniorityScore('Executive Vice President')).toBe(80);
  });
  it('losse president (geen vice) is exec', () => {
    expect(seniorityScore('President')).toBe(100);
  });
});

describe('isHrRole', () => {
  it('herkent HR/People-rollen', () => {
    expect(isHrRole('Head of People')).toBe(true);
    expect(isHrRole('Talent Acquisition Lead')).toBe(true);
    expect(isHrRole('CHRO')).toBe(true);
    expect(isHrRole('Chief Financial Officer')).toBe(false);
    expect(isHrRole('Software Engineer')).toBe(false);
  });
});

describe('contactRank', () => {
  it('HR-rol krijgt boost boven gelijke niet-HR-tier', () => {
    const hrHead = { role: 'Head of HR', email: 'a@b.com', marketing_content_opt_in: true };
    const cfo = { role: 'Chief Financial Officer', email: 'c@d.com', marketing_content_opt_in: true };
    expect(contactRank(hrHead)).toBeGreaterThan(contactRank(cfo));
  });
  it('tie-break: e-mail + opt-in verhogen de rang', () => {
    const withBoth = { role: 'HR Manager', email: 'x@y.com', marketing_content_opt_in: true };
    const without = { role: 'HR Manager', email: '', marketing_content_opt_in: false };
    expect(contactRank(withBoth)).toBeGreaterThan(contactRank(without));
  });
  it('leest zowel role als title', () => {
    expect(contactRank({ title: 'CHRO' })).toBeGreaterThan(contactRank({ title: 'Analyst' }));
  });
});

describe('surplusExclusions', () => {
  const mk = (id, accountId, role) => ({ id, accountId, role, email: 'x@y.com', marketing_content_opt_in: true });
  it('onbeperkt (null/0) sluit niets uit', () => {
    const cs = [mk('1', 'a', 'HR Manager'), mk('2', 'a', 'HR Director')];
    expect(surplusExclusions(cs, null)).toEqual([]);
    expect(surplusExclusions(cs, 0)).toEqual([]);
  });
  it('max 1 houdt per bedrijf de hoogst-rangschikkende, sluit de rest uit', () => {
    const cs = [mk('1', 'a', 'HR Manager'), mk('2', 'a', 'Head of HR'), mk('3', 'b', 'HR Director')];
    expect(surplusExclusions(cs, 1).sort()).toEqual(['1']);
  });
  it('contacten zonder account worden niet gelimiteerd', () => {
    const cs = [mk('1', null, 'HR Manager'), mk('2', null, 'HR Director')];
    expect(surplusExclusions(cs, 1)).toEqual([]);
  });
});
