import { describe, it, expect } from 'vitest';
import { validateScorecardAnswers, computeScorecard } from './scorecard-lib.js';

// helper: alle 20 vragen op optie-index i, profiel P1..P3
const allAnswers = (i, p = { P1: 0, P2: 0, P3: 0 }) => {
  const ids = ['V1','V2','V3','V4','V5','V6','V7','V8','C1','C2','C3','C4','C5','C6','C7','C8','R1','R2','R3','R4'];
  const a = {}; ids.forEach(id => { a[id] = i; }); return { ...a, ...p };
};

describe('validateScorecardAnswers', () => {
  it('accepts a complete valid set', () => {
    expect(validateScorecardAnswers(allAnswers(1)).error).toBeUndefined();
  });
  it('rejects a missing question id', () => {
    const a = allAnswers(1); delete a.V5;
    expect(validateScorecardAnswers(a).error).toMatch(/V5/);
  });
  it('rejects an out-of-range option index', () => {
    const a = allAnswers(1); a.V3 = 5;            // maturity heeft 5 opties (0..4)
    expect(validateScorecardAnswers(a).error).toMatch(/V3/);
  });
  it('accepts index 5 on range questions (6 opties)', () => {
    const a = allAnswers(1); a.V1 = 5;
    expect(validateScorecardAnswers(a).error).toBeUndefined();
  });
  it('rejects non-integer answers', () => {
    const a = allAnswers(1); a.C2 = 'hoog';
    expect(validateScorecardAnswers(a).error).toMatch(/C2/);
  });
});

describe('computeScorecard', () => {
  it('scores all-zero answers as flying_blind with workshop route', () => {
    const r = computeScorecard(allAnswers(0, { P1: 4, P2: 0, P3: 3 })); // Other, <1000, >24m
    expect(r.scores).toEqual({ value: 0, change: 0, readiness: 0, index: 0 });
    expect(r.bands).toEqual({ value: 'blind_spot', change: 'blind_spot', readiness: 'blind_spot' });
    expect(r.quadrant).toBe('flying_blind');
    expect(r.route).toBe('workshop');
    expect(r.readiness_overlay).toBe(true);
  });
  it('scores all-max answers as audit_ready / benchmark', () => {
    // maturity max = index 4 (score 4); range max = index 5 (score 4)
    const a = allAnswers(4, { P1: 4, P2: 3, P3: 3 });
    ['V1','V2','C3'].forEach(id => { a[id] = 5; });   // de 3 range-vragen
    const r = computeScorecard(a);
    expect(r.scores).toEqual({ value: 100, change: 100, readiness: 100, index: 100 });
    expect(r.quadrant).toBe('audit_ready');
    expect(r.route).toBe('benchmark');                 // index>=70, geen eerdere regel
    expect(r.readiness_overlay).toBe(false);
  });
  it('range scoring maps option index via [0,0,1,2,3,4]', () => {
    const a = allAnswers(0, { P1: 4, P2: 0, P3: 3 });
    a.V1 = 1;                                          // '<10%' → score 0
    expect(computeScorecard(a).scores.value).toBe(0);
    a.V1 = 2;                                          // '10–25%' → score 1
    expect(computeScorecard(a).scores.value).toBe(Math.round((1 / 8) * 25)); // mean(V)*25 = 3
  });
  it('routes renewal <6 months to assessment regardless of scores', () => {
    const r = computeScorecard(allAnswers(4, { P1: 4, P2: 0, P3: 0 }));    // P3=0 → '<6 months'
    expect(r.route).toBe('assessment');
  });
  it('routes V8<=1 + CFO to assessment', () => {
    const a = allAnswers(3, { P1: 0, P2: 0, P3: 3 });  // CFO, renewal >24m
    a.V8 = 1;                                          // score 1
    expect(computeScorecard(a).route).toBe('assessment');
  });
  it('routes change<40 + CHRO to insight_review', () => {
    const a = allAnswers(0, { P1: 2, P2: 0, P3: 3 });  // CHRO, renewal >24m
    ['V1','V2'].forEach(id => { a[id] = 5; });         // wat value, change blijft 0
    const r = computeScorecard(a);
    expect(r.scores.change).toBeLessThan(40);
    expect(r.route).toBe('insight_review');
  });
  it("routes renewal '6–12 months' to assessment (rule-1 second branch)", () => {
    const r = computeScorecard(allAnswers(4, { P1: 4, P2: 0, P3: 1 }));   // P3=1 → '6–12 months'
    expect(r.route).toBe('assessment');
  });
  it('classifies high value + low change as spreadsheet_confident', () => {
    const a = allAnswers(0, { P1: 4, P2: 0, P3: 3 });  // Other, >24m
    ['V3','V4','V5','V6','V7','V8'].forEach(id => { a[id] = 3; });  // maturity → score 3
    ['V1','V2'].forEach(id => { a[id] = 4; });                      // range index 4 → score 3
    const r = computeScorecard(a);                                  // value 75, change 0
    expect(r.scores.value).toBeGreaterThanOrEqual(60);
    expect(r.scores.change).toBeLessThan(60);
    expect(r.quadrant).toBe('spreadsheet_confident');
  });
  it('classifies low value + high change as people_aware_value_blind', () => {
    const a = allAnswers(0, { P1: 4, P2: 0, P3: 3 });  // Other, >24m
    ['C1','C2','C4','C5','C6','C7','C8'].forEach(id => { a[id] = 3; }); // maturity → score 3
    a.C3 = 4;                                                            // range index 4 → score 3
    const r = computeScorecard(a);                                       // value 0, change 75
    expect(r.scores.value).toBeLessThan(60);
    expect(r.scores.change).toBeGreaterThanOrEqual(60);
    expect(r.quadrant).toBe('people_aware_value_blind');
  });
  it("routes renewal '<6 months' + CHRO + change<40 to assessment (rule precedence)", () => {
    const r = computeScorecard(allAnswers(0, { P1: 2, P2: 0, P3: 0 }));  // CHRO, <6 months
    expect(r.scores.change).toBeLessThan(40);
    expect(r.route).toBe('assessment');                                  // regel 1 wint van insight_review
  });
  it('exposes profile labels', () => {
    const r = computeScorecard(allAnswers(2, { P1: 1, P2: 2, P3: 1 }));
    expect(r.profile).toEqual({
      role: 'CIO / IT / Digital', org_size: '5,000–20,000', renewal_window: '6–12 months',
    });
  });
});
