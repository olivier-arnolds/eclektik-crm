import { describe, it, expect } from 'vitest';
import {
  domainOf, isBounceMessage, looksLikeAutoReply, buildIndex, findContactEmailIn,
  matchMessage, scanInbox, statusAfterClassification,
  MATCH_SENDER, MATCH_DOMAIN, MATCH_NONE, CONFIDENCE_FLOOR, needsOurReply,
} from './outreach-match';

// Drie contacten, twee bij hetzelfde domein (de ING-situatie).
const CONTACTS = [
  { id: 'c1', email: 'anna@ing.com', email_domain: 'ing.com' },
  { id: 'c2', email: 'bram@ing.com', email_domain: 'ing.com' },
  { id: 'c3', email: 'chris@asml.com', email_domain: 'asml.com' },
];
const IDX = buildIndex(CONTACTS);
const msg = (o) => ({ id: 'm1', subject: '', bodyPreview: '', fromAddress: '', date: '2026-09-17T10:00:00Z', ...o });

describe('domainOf', () => {
  it('pakt het domein, hoofdletter-ongevoelig', () => {
    expect(domainOf('A.B@ING.com')).toBe('ing.com');
  });
  it('geeft null bij onzin', () => {
    expect(domainOf('kaput')).toBeNull();
    expect(domainOf('')).toBeNull();
    expect(domainOf(null)).toBeNull();
  });
});

describe('bounce- en autoreply-herkenning', () => {
  it('herkent bounce op afzender', () => {
    expect(isBounceMessage({ fromAddress: 'postmaster@ing.com' })).toBe(true);
    expect(isBounceMessage({ fromAddress: 'MAILER-DAEMON@ing.com' })).toBe(true);
  });
  it('herkent bounce op subject, ook in het Nederlands', () => {
    expect(isBounceMessage({ fromAddress: 'x@y.nl', subject: 'Undeliverable: Uitnodiging' })).toBe(true);
    expect(isBounceMessage({ fromAddress: 'x@y.nl', subject: 'Niet bezorgd: uitnodiging' })).toBe(true);
  });
  it('een gewoon antwoord is geen bounce', () => {
    expect(isBounceMessage({ fromAddress: 'anna@ing.com', subject: 'RE: uitnodiging' })).toBe(false);
  });
  it('herkent out-of-office', () => {
    expect(looksLikeAutoReply({ subject: 'Automatic reply: uitnodiging' })).toBe(true);
    expect(looksLikeAutoReply({ subject: 'Automatisch antwoord' })).toBe(true);
    expect(looksLikeAutoReply({ subject: 'RE: uitnodiging' })).toBe(false);
  });
});

describe('findContactEmailIn', () => {
  it('vindt het gebouncede adres in de tekst', () => {
    const t = 'Your message to bram@ing.com could not be delivered.';
    expect(findContactEmailIn(t, IDX)).toBe('bram@ing.com');
  });
  it('negeert adressen die geen campagnecontact zijn', () => {
    expect(findContactEmailIn('contact helpdesk@ing.com svp', IDX)).toBeNull();
  });
});

describe('matchMessage', () => {
  it('matcht zeker op afzenderadres', () => {
    const r = matchMessage(msg({ fromAddress: 'Anna@ING.com', subject: 'RE: uitnodiging' }), IDX);
    expect(r.matchMethod).toBe(MATCH_SENDER);
    expect(r.contactId).toBe('c1');
    expect(r.isBounce).toBe(false);
  });

  it('KRITIEK: een onbekende collega op een bekend domein wordt alleen geflagd, niet gekoppeld', () => {
    const r = matchMessage(msg({ fromAddress: 'secretaresse@ing.com', subject: 'namens Anna' }), IDX);
    expect(r.matchMethod).toBe(MATCH_DOMAIN);
    expect(r.contactId).toBeNull();                 // nooit automatisch iemand op replied
    expect(r.domainCandidates).toEqual(['c1', 'c2']);
  });

  it('koppelt een bounce aan de prospect uit de body', () => {
    const r = matchMessage(msg({
      fromAddress: 'postmaster@ing.com',
      subject: 'Undeliverable',
      bodyPreview: 'Your message to bram@ing.com was not delivered',
    }), IDX);
    expect(r.isBounce).toBe(true);
    expect(r.contactId).toBe('c2');
    expect(r.bouncedEmail).toBe('bram@ing.com');
  });

  it('een bounce zonder herkenbaar adres levert geen koppeling', () => {
    const r = matchMessage(msg({ fromAddress: 'postmaster@elders.nl', subject: 'Undeliverable', bodyPreview: 'failed' }), IDX);
    expect(r.isBounce).toBe(true);
    expect(r.contactId).toBeNull();
  });

  it('volstrekt onbekende afzender geeft none', () => {
    expect(matchMessage(msg({ fromAddress: 'iemand@random.org' }), IDX).matchMethod).toBe(MATCH_NONE);
  });
});

describe('scanInbox', () => {
  it('filtert oude mail, eigen domein en ruis weg', () => {
    const { candidates, stats } = scanInbox([
      msg({ id: 'a', fromAddress: 'anna@ing.com', date: '2026-09-17T10:00:00Z' }),      // houden
      msg({ id: 'b', fromAddress: 'anna@ing.com', date: '2026-01-01T10:00:00Z' }),      // te oud
      msg({ id: 'c', fromAddress: 'marco@eclectik.co', date: '2026-09-17T10:00:00Z' }), // eigen domein
      msg({ id: 'd', fromAddress: 'ruis@random.org', date: '2026-09-17T10:00:00Z' }),   // geen match
    ], CONTACTS, { sinceISO: '2026-09-16T00:00:00Z' });

    expect(candidates.map(c => c.messageId)).toEqual(['a']);
    expect(stats).toMatchObject({ scanned: 4, tooOld: 1, ownDomain: 1, noMatch: 1, sender: 1 });
  });

  it('houdt domain-flags wel, want die vragen handwerk', () => {
    const { candidates, stats } = scanInbox(
      [msg({ id: 'x', fromAddress: 'onbekend@asml.com' })], CONTACTS, { sinceISO: '2026-09-16T00:00:00Z' });
    expect(candidates).toHaveLength(1);
    expect(candidates[0].matchMethod).toBe(MATCH_DOMAIN);
    expect(stats.domainFlag).toBe(1);
  });

  it('zonder sinceISO wordt er niet op datum gefilterd', () => {
    const { stats } = scanInbox([msg({ fromAddress: 'anna@ing.com', date: '2020-01-01T00:00:00Z' })], CONTACTS, {});
    expect(stats.tooOld).toBe(0);
    expect(stats.sender).toBe(1);
  });

  it('robuust tegen lege input', () => {
    expect(scanInbox(null, null, {}).candidates).toEqual([]);
  });
});

describe('statusAfterClassification', () => {
  const NOW = new Date('2026-09-20T09:00:00Z');

  it('interested en declined zetten op replied en stoppen bericht 2', () => {
    for (const c of ['interested', 'declined']) {
      const r = statusAfterClassification({ classification: c, confidence: 0.95, now: NOW });
      expect(r.status).toBe('replied');
      expect(r.next_action_at).toBeNull();
    }
  });

  it('bounce zet op bounced, ongeacht confidence', () => {
    const r = statusAfterClassification({ classification: 'bounce', confidence: 0.1, now: NOW });
    expect(r.status).toBe('bounced');
    expect(r.needs_review).toBe(false);
  });

  it('referral vraagt handwerk', () => {
    const r = statusAfterClassification({ classification: 'referral', confidence: 0.9, now: NOW });
    expect(r.status).toBe('referred');
    expect(r.needs_review).toBe(true);
  });

  it('ooo houdt de status en probeert na de terugkeerdatum opnieuw', () => {
    const r = statusAfterClassification({
      classification: 'ooo', confidence: 0.9, currentStatus: 'msg1_sent',
      oooUntilISO: '2026-09-25T00:00:00Z', now: NOW,
    });
    expect(r.status).toBe('msg1_sent');
    expect(r.next_action_at).toBe('2026-09-25T00:00:00.000Z');
  });

  it('ooo zonder datum wacht 7 dagen', () => {
    const r = statusAfterClassification({ classification: 'ooo', confidence: 0.9, now: NOW });
    expect(r.next_action_at).toBe('2026-09-27T09:00:00.000Z');
  });

  it('VEILIGHEID: onder de drempel wijzigt de status niet maar stopt bericht 2 wel', () => {
    const r = statusAfterClassification({
      classification: 'interested', confidence: CONFIDENCE_FLOOR - 0.01, currentStatus: 'msg1_sent', now: NOW,
    });
    expect(r.status).toBe('msg1_sent');       // niet stilletjes op replied
    expect(r.next_action_at).toBeNull();      // maar ook geen bericht 2
    expect(r.needs_review).toBe(true);
  });

  it("'other' en een lege classificatie houden vast voor review", () => {
    expect(statusAfterClassification({ classification: 'other', confidence: 0.99, now: NOW }).needs_review).toBe(true);
    expect(statusAfterClassification({ classification: null, confidence: 0.99, now: NOW }).needs_review).toBe(true);
  });
});

describe("needsOurReply - de weergave 'Onbeantwoord'", () => {
  it('geen antwoord binnen: niets te doen', () => {
    expect(needsOurReply({ last_inbound_at: null, answered_at: null })).toBe(false);
    expect(needsOurReply({})).toBe(false);
    expect(needsOurReply(null)).toBe(false);
  });

  it('antwoord binnen en wij nog niets terug: wacht op ons', () => {
    expect(needsOurReply({ last_inbound_at: '2026-09-17T10:00:00Z', answered_at: null })).toBe(true);
  });

  it('wij hebben na het antwoord gereageerd: afgehandeld', () => {
    expect(needsOurReply({
      last_inbound_at: '2026-09-17T10:00:00Z', answered_at: '2026-09-17T11:00:00Z',
    })).toBe(false);
  });

  it('KRITIEK: een nieuw antwoord na ons antwoord telt weer als onbeantwoord', () => {
    expect(needsOurReply({
      last_inbound_at: '2026-09-18T09:00:00Z', answered_at: '2026-09-17T11:00:00Z',
    })).toBe(true);
  });

  it('robuust tegen onparseerbare datums', () => {
    expect(needsOurReply({ last_inbound_at: 'kaput' })).toBe(false);
    expect(needsOurReply({ last_inbound_at: '2026-09-17T10:00:00Z', answered_at: 'kaput' })).toBe(true);
  });
});
