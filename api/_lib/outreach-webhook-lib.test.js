import { describe, it, expect } from 'vitest';
import { isPermanentBounce, bounceReason, outreachUpdatesForEvent } from './outreach-webhook-lib.js';

const NOW = '2026-09-09T16:30:00.000Z';
const ev = (data) => ({ type: 'email.bounced', data });

describe('isPermanentBounce', () => {
  it('permanent is permanent', () => {
    expect(isPermanentBounce(ev({ bounce: { type: 'Permanent' } }))).toBe(true);
  });

  it('transient en soft zijn tijdelijk', () => {
    expect(isPermanentBounce(ev({ bounce: { type: 'Transient' } }))).toBe(false);
    expect(isPermanentBounce(ev({ bounce: { type: 'soft' } }))).toBe(false);
    expect(isPermanentBounce(ev({ bounce: { type: 'Deferred' } }))).toBe(false);
  });

  it('VEILIGHEID: onbekend of ontbrekend type geldt als permanent', () => {
    // Doorgaan met mailen naar een dood adres schaadt de domeinreputatie;
    // een onterecht gestopte prospect is zichtbaar en handmatig te herstellen.
    expect(isPermanentBounce(ev({}))).toBe(true);
    expect(isPermanentBounce(ev({ bounce: {} }))).toBe(true);
    expect(isPermanentBounce({})).toBe(true);
  });
});

describe('bounceReason', () => {
  it('pakt de melding van Resend', () => {
    expect(bounceReason(ev({ bounce: { message: 'Recipient not found' } }))).toBe('Recipient not found');
  });
  it('valt terug op reason of subType', () => {
    expect(bounceReason(ev({ reason: 'mailbox full' }))).toBe('mailbox full');
    expect(bounceReason(ev({ bounce: { subType: 'General' } }))).toBe('General');
  });
  it('geeft een lege string als er niets is', () => {
    expect(bounceReason(ev({}))).toBe('');
  });
});

describe('outreachUpdatesForEvent', () => {
  it('delivered stempelt alleen het bericht', () => {
    const r = outreachUpdatesForEvent('email.delivered', {}, {}, NOW);
    expect(r.handled).toBe(true);
    expect(r.message).toEqual({ delivered_at: NOW });
    expect(r.contact).toEqual({});
  });

  it('KRITIEK: een harde bounce stopt de opvolging', () => {
    const r = outreachUpdatesForEvent(
      'email.bounced',
      ev({ bounce: { type: 'Permanent', message: "Recipient not found" } }),
      {}, NOW,
    );
    expect(r.message.bounced_at).toBe(NOW);
    expect(r.message.bounce_reason).toBe('Recipient not found');
    expect(r.contact.status).toBe('bounced');
    expect(r.contact.next_action_at).toBeNull();
    expect(r.stopFollowup).toBe(true);
  });

  it('een tijdelijke bounce raakt de prospect NIET aan', () => {
    const r = outreachUpdatesForEvent('email.bounced', ev({ bounce: { type: 'Transient' } }), {}, NOW);
    expect(r.message.bounced_at).toBe(NOW);
    expect(r.contact).toEqual({});          // adres kan morgen werken
    expect(r.stopFollowup).toBe(false);
  });

  it('een spamklacht zet op afgemeld, definitiever dan een bounce', () => {
    const r = outreachUpdatesForEvent('email.complained', {}, {}, NOW);
    expect(r.contact.status).toBe('opted_out');
    expect(r.contact.opted_out_at).toBe(NOW);
    expect(r.contact.next_action_at).toBeNull();
    expect(r.stopFollowup).toBe(true);
  });

  it('opens en clicks tellen op zonder de status te raken', () => {
    const o = outreachUpdatesForEvent('email.opened', {}, { open_count: 2, first_opened_at: NOW }, NOW);
    expect(o.message.open_count).toBe(3);
    expect(o.message.first_opened_at).toBeUndefined();   // niet overschrijven
    expect(o.contact).toEqual({});

    const c = outreachUpdatesForEvent('email.clicked', {}, {}, NOW);
    expect(c.message.click_count).toBe(1);
    expect(c.message.first_clicked_at).toBe(NOW);
  });

  it('email.sent is bekend maar verandert niets', () => {
    const r = outreachUpdatesForEvent('email.sent', {}, {}, NOW);
    expect(r.handled).toBe(true);
    expect(r.message).toEqual({});
  });

  it('een onbekend event wordt niet behandeld', () => {
    expect(outreachUpdatesForEvent('email.something_new', {}, {}, NOW).handled).toBe(false);
  });
});
