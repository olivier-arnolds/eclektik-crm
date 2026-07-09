// Scorecard-regels (bank v1.0) — MOET in sync blijven met shared/scorecard.ts
// in het eclectik-website-repo. Bron: Marco's build-spec §2–§4
// (website-repo docs/superpowers/specs/2026-07-07-scorecard-build-spec-marco-v1.md).
// Antwoorden zijn 0-based OPTIE-INDEXEN; scoring mapt per vraagtype.

const RANGE_SCORES = [0, 0, 1, 2, 3, 4];                 // 6 opties
const V = ['V1','V2','V3','V4','V5','V6','V7','V8'];
const C = ['C1','C2','C3','C4','C5','C6','C7','C8'];
const R = ['R1','R2','R3','R4'];
const RANGE_IDS = new Set(['V1','V2','C3']);             // de 3 range-vragen
export const SCORED_IDS = [...V, ...C, ...R];

const P1_OPTIONS = ['CFO / Finance','CIO / IT / Digital','CHRO / HR','Transformation / Strategy','Other'];
const P2_OPTIONS = ['<1,000','1,000–5,000','5,000–20,000','>20,000'];
const P3_OPTIONS = ['<6 months','6–12 months','12–24 months','>24 months',"Don't know"];

function optionCount(id) {
  if (id === 'P1') return P1_OPTIONS.length;
  if (id === 'P2') return P2_OPTIONS.length;
  if (id === 'P3') return P3_OPTIONS.length;
  return RANGE_IDS.has(id) ? 6 : 5;
}

export function validateScorecardAnswers(answers) {
  if (!answers || typeof answers !== 'object') return { error: 'Missing answers' };
  for (const id of [...SCORED_IDS, 'P1', 'P2', 'P3']) {
    const v = answers[id];
    if (!Number.isInteger(v) || v < 0 || v >= optionCount(id)) {
      return { error: `Invalid or missing answer for ${id}` };
    }
  }
  return {};
}

function answerScore(id, optionIndex) {
  return RANGE_IDS.has(id) ? RANGE_SCORES[optionIndex] : optionIndex;
}

const mean = (ids, answers) => ids.reduce((s, id) => s + answerScore(id, answers[id]), 0) / ids.length;
const band = (x) => (x < 40 ? 'blind_spot' : x < 70 ? 'partial_view' : 'evidence_led');

// Rekent alles uit vanuit ruwe antwoorden. Retourneert ook profile-labels,
// zodat de intake ze in de lead-activiteit en stats kan opnemen.
export function computeScorecard(answers) {
  const value = mean(V, answers) * 25;
  const change = mean(C, answers) * 25;
  const readiness = mean(R, answers) * 25;
  const index = 0.4 * value + 0.4 * change + 0.2 * readiness;

  const quadrant =
    value < 60 && change < 60 ? 'flying_blind'
    : value >= 60 && change < 60 ? 'spreadsheet_confident'
    : value < 60 ? 'people_aware_value_blind'
    : 'audit_ready';

  const role = P1_OPTIONS[answers.P1];
  const renewal = P3_OPTIONS[answers.P3];

  // §4: top-down, eerste match wint
  let route = 'workshop';
  if (['<6 months', '6–12 months'].includes(renewal)
      || (answerScore('V8', answers.V8) <= 1 && ['CFO / Finance', 'CIO / IT / Digital'].includes(role))) {
    route = 'assessment';
  } else if (change < 40 && role === 'CHRO / HR') {
    route = 'insight_review';
  } else if (index >= 70) {
    route = 'benchmark';
  }

  return {
    scores: {
      value: Math.round(value), change: Math.round(change),
      readiness: Math.round(readiness), index: Math.round(index),
    },
    bands: { value: band(value), change: band(change), readiness: band(readiness) },
    quadrant,
    route,
    readiness_overlay: readiness < 40,
    profile: { role, org_size: P2_OPTIONS[answers.P2], renewal_window: renewal },
  };
}
