// Tests for the BD-display adapter layer — the business logic that has
// historically caused real bugs (stage encoding, owner mapping, drag-drop
// writes). Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  ownerIdFromName,
  adaptDeal,
  stageUpdates,
  STAGES,
  STAGE_PROBABILITY,
} from './adapters';

// ---------- ownerIdFromName ----------
describe('ownerIdFromName', () => {
  it('maps full names to codes', () => {
    expect(ownerIdFromName('Marco van Gelder')).toBe('MVG');
    expect(ownerIdFromName('Olivier Arnolds')).toBe('OA');
    expect(ownerIdFromName('Yarmilla Koenders')).toBe('YK');
  });

  it('maps first-name-only legacy rows to the same codes (the bug that hid Marco\'s tasks)', () => {
    expect(ownerIdFromName('Marco')).toBe('MVG');
    expect(ownerIdFromName('Olivier')).toBe('OA');
    expect(ownerIdFromName('Yarmilla')).toBe('YK');
  });

  it('falls back to initials for unknown names, max 3 chars, uppercased', () => {
    expect(ownerIdFromName('Jane Doe')).toBe('JD');
    expect(ownerIdFromName('Anna Bella Carla Dora')).toBe('ABC');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(ownerIdFromName('')).toBe('');
    expect(ownerIdFromName(null)).toBe('');
    expect(ownerIdFromName(undefined)).toBe('');
  });
});

// ---------- adaptDeal: 7-column stage derivation ----------
// DB encoding → display stage:
//   onboarding/active            → same
//   past/inactive + status Won   → sleeping
//   past/inactive + status Lost  → close
//   otherwise                    → sub_status (qualify/develop/proposal), default qualify
describe('adaptDeal stage derivation', () => {
  const base = { id: 'x', title: 'T', contactIds: [], value: 0 };
  const stageOf = (item) => adaptDeal({ ...base, ...item }, [], []).stage;

  it('passes onboarding and active through', () => {
    expect(stageOf({ funnelStage: 'onboarding' })).toBe('onboarding');
    expect(stageOf({ funnelStage: 'active' })).toBe('active');
  });

  it('maps past+Won to sleeping (finished, revivable project)', () => {
    expect(stageOf({ funnelStage: 'past', status: 'Won' })).toBe('sleeping');
    expect(stageOf({ funnelStage: 'inactive', status: 'Won' })).toBe('sleeping');
  });

  it('maps past+Lost (or any non-Won past) to close', () => {
    expect(stageOf({ funnelStage: 'past', status: 'Lost' })).toBe('close');
    expect(stageOf({ funnelStage: 'inactive', status: null })).toBe('close');
  });

  it('uses sub_status for pre-deal phases, defaulting to qualify', () => {
    expect(stageOf({ funnelStage: 'opportunity', subStatus: 'develop' })).toBe('develop');
    expect(stageOf({ funnelStage: 'opportunity', subStatus: 'proposal' })).toBe('proposal');
    expect(stageOf({ funnelStage: 'lead', subStatus: null })).toBe('qualify');
  });

  it('derives source table from funnelStage (lead vs opportunity)', () => {
    expect(adaptDeal({ ...base, funnelStage: 'lead' }, [], []).table).toBe('leads');
    expect(adaptDeal({ ...base, funnelStage: 'opportunity' }, [], []).table).toBe('opportunities');
  });
});

// ---------- stageUpdates: single source of truth for drag-drop DB writes ----------
describe('stageUpdates', () => {
  it('sleeping → stage past + status Won (both tables)', () => {
    for (const table of ['leads', 'opportunities']) {
      const u = stageUpdates('sleeping', table);
      expect(u.stage).toBe('past');
      expect(u.status).toBe('Won');
      expect(u.sub_status).toBeNull();
      expect(u.status_reason).toBeNull();
    }
  });

  it('close → Lost; only opportunities get stage=past (leads have no stage column)', () => {
    const opp = stageUpdates('close', 'opportunities');
    expect(opp).toMatchObject({ sub_status: 'close', status: 'Lost', stage: 'past' });

    const lead = stageUpdates('close', 'leads');
    expect(lead).toMatchObject({ sub_status: 'close', status: 'Lost' });
    expect(lead).not.toHaveProperty('stage'); // leads table has NO stage column
  });

  it('onboarding/active on an opportunity → stage set + Won + close dates today', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const target of ['onboarding', 'active']) {
      const u = stageUpdates(target, 'opportunities');
      expect(u.stage).toBe(target);
      expect(u.status).toBe('Won');
      expect(u.close_date).toBe(today);
      expect(u.actual_close_date).toBe(today);
    }
  });

  it('onboarding/active on a lead never writes a stage column (auto-promote handles it upstream)', () => {
    for (const target of ['onboarding', 'active']) {
      const u = stageUpdates(target, 'leads');
      // stageUpdates still sets stage for these targets; the lead→opp promote
      // must intercept BEFORE writing to the leads table. This test documents
      // the contract: if this changes, lead-promote.js must change too.
      expect(u.stage).toBe(target);
      expect(u.status).toBeUndefined();
    }
  });

  it('qualify/develop/proposal → sub_status; opportunities reset to stage=opportunity with cleared status', () => {
    for (const target of ['qualify', 'develop', 'proposal']) {
      const lead = stageUpdates(target, 'leads');
      expect(lead.sub_status).toBe(target);
      expect(lead).not.toHaveProperty('stage');

      const opp = stageUpdates(target, 'opportunities');
      expect(opp).toMatchObject({ sub_status: target, stage: 'opportunity', status: null, status_reason: null });
    }
  });

  it('applies the stage-driven win probability on every move', () => {
    for (const [stage, prob] of Object.entries(STAGE_PROBABILITY)) {
      expect(stageUpdates(stage, 'opportunities').probability).toBe(prob);
    }
  });
});

// ---------- Stage model invariants ----------
describe('stage model invariants', () => {
  it('STAGES is the documented 7-column order (drives funnel layout)', () => {
    expect(STAGES.map(s => s.id)).toEqual(
      ['qualify', 'develop', 'proposal', 'close', 'onboarding', 'active', 'sleeping']
    );
  });

  it('every stage has a defined win probability', () => {
    for (const s of STAGES) {
      expect(STAGE_PROBABILITY[s.id], `probability for ${s.id}`).toBeDefined();
    }
  });

  it('close is 0%, active/sleeping are 100%', () => {
    expect(STAGE_PROBABILITY.close).toBe(0);
    expect(STAGE_PROBABILITY.active).toBe(100);
    expect(STAGE_PROBABILITY.sleeping).toBe(100);
  });
});
