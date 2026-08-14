import { describe, it, expect } from 'vitest';
import { isApproved, deriveStatus, statusAfterMove } from './content-calendar-logic';

describe('content calendar status logic', () => {
  it('isApproved: draft is niet goedgekeurd, de rest wel', () => {
    expect(isApproved('draft')).toBe(false);
    expect(isApproved('approved')).toBe(true);
    expect(isApproved('scheduled')).toBe(true);
    expect(isApproved('published')).toBe(true);
  });

  it('deriveStatus: goedkeuring × datum → juiste status', () => {
    expect(deriveStatus(false, false)).toBe('draft');
    expect(deriveStatus(false, true)).toBe('draft');   // niet-goedgekeurd blijft draft, ook met datum
    expect(deriveStatus(true, false)).toBe('approved'); // goedgekeurd zonder datum
    expect(deriveStatus(true, true)).toBe('scheduled'); // goedgekeurd met datum
  });

  describe('statusAfterMove — slepen mag goedkeuring NOOIT omklappen', () => {
    it('draft naar een dag blijft draft (wordt niet stiekem goedgekeurd)', () => {
      expect(statusAfterMove('draft', true)).toBe('draft');
    });
    it('draft van de kalender halen blijft draft', () => {
      expect(statusAfterMove('draft', false)).toBe('draft');
    });
    it('approved (geen datum) naar een dag wordt scheduled (blijft goedgekeurd)', () => {
      expect(statusAfterMove('approved', true)).toBe('scheduled');
    });
    it('scheduled naar een andere dag blijft scheduled', () => {
      expect(statusAfterMove('scheduled', true)).toBe('scheduled');
    });
    it('scheduled van de kalender halen wordt approved (blijft goedgekeurd, niet draft)', () => {
      expect(statusAfterMove('scheduled', false)).toBe('approved');
    });
    it('published blijft published, ongeacht datum', () => {
      expect(statusAfterMove('published', true)).toBe('published');
      expect(statusAfterMove('published', false)).toBe('published');
    });
  });
});
