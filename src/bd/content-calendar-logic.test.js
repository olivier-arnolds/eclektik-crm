import { describe, it, expect } from 'vitest';
import { isApproved, deriveStatus, statusAfterMove, itemReport } from './content-calendar-logic';

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

describe('itemReport — afgeleide rapportage per contentstuk', () => {
  const NOW = new Date('2026-08-19T12:00:00Z');
  const base = {
    status: 'draft', channel: 'glint', type: 'email',
    created_at: '2026-08-01T09:00:00Z', scheduled_at: null, published_at: null,
    target_tag: null, target_contact_ids: null, recipient_contact_id: null,
    published_recipient_count: null, external_message_id: null, sent_emails: null,
  };

  it('stage en stageIndex volgen de status', () => {
    expect(itemReport({ ...base, status: 'draft' }, { now: NOW }).stageIndex).toBe(0);
    expect(itemReport({ ...base, status: 'approved' }, { now: NOW }).stageIndex).toBe(1);
    expect(itemReport({ ...base, status: 'scheduled' }, { now: NOW }).stageIndex).toBe(2);
    expect(itemReport({ ...base, status: 'published' }, { now: NOW }).stageIndex).toBe(3);
  });

  it('onbekende status valt terug op draft', () => {
    expect(itemReport({ ...base, status: 'weird' }, { now: NOW }).stage).toBe('draft');
  });

  it('waarschuwt: goedgekeurd zonder datum', () => {
    const w = itemReport({ ...base, status: 'approved', scheduled_at: null }, { now: NOW }).warnings;
    expect(w.some(x => x.level === 'warn' && /geen datum/i.test(x.message))).toBe(true);
  });

  it('waarschuwt: geplande tijd verstreken', () => {
    const w = itemReport({ ...base, status: 'scheduled', scheduled_at: '2026-08-18T09:00:00Z', target_tag: 'klanten' }, { now: NOW }).warnings;
    expect(w.some(x => x.level === 'warn' && /verstreken/i.test(x.message))).toBe(true);
  });

  it('geen verstreken-waarschuwing als de datum in de toekomst ligt', () => {
    const w = itemReport({ ...base, status: 'scheduled', scheduled_at: '2026-08-20T09:00:00Z', target_tag: 'klanten' }, { now: NOW }).warnings;
    expect(w.some(x => /verstreken/i.test(x.message))).toBe(false);
  });

  it('blokkeert: e-mail zonder doelgroep', () => {
    const w = itemReport({ ...base, status: 'approved', type: 'email', target_tag: null, target_contact_ids: [] }, { now: NOW }).warnings;
    expect(w.some(x => x.level === 'block' && /doelgroep/i.test(x.message))).toBe(true);
  });

  it('geen doelgroep-blokkade als er een target_tag is', () => {
    const w = itemReport({ ...base, status: 'approved', type: 'email', target_tag: 'klanten' }, { now: NOW }).warnings;
    expect(w.some(x => /doelgroep/i.test(x.message))).toBe(false);
  });

  it('blokkeert: DM zonder ontvanger', () => {
    const w = itemReport({ ...base, status: 'scheduled', type: 'linkedin_dm', scheduled_at: '2026-08-20T09:00:00Z', recipient_contact_id: null }, { now: NOW }).warnings;
    expect(w.some(x => x.level === 'block' && /ontvanger/i.test(x.message))).toBe(true);
  });

  it('send is null bij een kale draft', () => {
    expect(itemReport({ ...base, status: 'draft' }, { now: NOW }).send).toBeNull();
  });

  it('send toont drip-voortgang en ontvangersaantal', () => {
    const r = itemReport({ ...base, status: 'published', published_recipient_count: 42, sent_emails: ['a@x.nl', 'b@x.nl'], external_message_id: 'msg_1' }, { now: NOW });
    expect(r.send.recipientCount).toBe(42);
    expect(r.send.dripSent).toBe(2);
    expect(r.send.externalId).toBe('msg_1');
  });

  it('timeline geeft de gevulde momenten door', () => {
    const r = itemReport({ ...base, status: 'published', published_at: '2026-08-19T09:00:00Z' }, { now: NOW });
    expect(r.timeline.created_at).toBe('2026-08-01T09:00:00Z');
    expect(r.timeline.published_at).toBe('2026-08-19T09:00:00Z');
  });
});
