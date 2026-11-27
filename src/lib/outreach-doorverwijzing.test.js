import { describe, it, expect } from 'vitest';
import {
  openingsregel, bouwDoorverwijsBericht, magBesluiten, besluitPatch,
  DOORVERWIJZING_STATUSSEN,
} from './outreach-doorverwijzing.js';

const ORIGINEEL = `Hi Patrick,

It is my understanding that, in your role as Telco Majors Account Executive, you are responsible for accounts including our mutual client Liberty Global Europe Limited.

We also run AI ROI analyses that translate Copilot adoption into dollar-value outcomes.

Marco`;

describe('openingsregel', () => {
  it('KRITIEK: een afwezigheidsbericht beweert niet dat iemand doorverwees', () => {
    // Die collega heeft ons niet doorgestuurd; een automaat noemde zijn naam
    // voor spoedgevallen. 'Je collega verwees me door' is dan een zin waar
    // iemand terecht op terugschrijft met: dat heb ik nooit gezegd.
    const r = openingsregel('ooo', 'Patrick Jansen');
    expect(r).toBe('I wrote to Patrick Jansen, and the out of office reply pointed me to you.');
    expect(r).not.toMatch(/suggested/);
  });

  it('bij een echte doorverwijzing mag het wel zo staan', () => {
    expect(openingsregel('referral', 'Patrick Jansen'))
      .toBe('Patrick Jansen suggested I reach out to you.');
  });

  it('behandelt een onbekende bron als het voorzichtige geval', () => {
    expect(openingsregel('other', 'Ana')).toMatch(/out of office reply/);
    expect(openingsregel(null, 'Ana')).toMatch(/out of office reply/);
  });

  it('geeft niets terug zonder naam', () => {
    for (const v of [null, '', '   ']) expect(openingsregel('ooo', v)).toBeNull();
  });
});

describe('bouwDoorverwijsBericht', () => {
  it('vervangt de aanhef en houdt de rest woordelijk', () => {
    const r = bouwDoorverwijsBericht({
      origineelBody: ORIGINEEL, voornaam: 'Taryn', verwijzer: 'Patrick', bron: 'ooo',
    });
    expect(r.body.startsWith('Hi Taryn,\n\nI wrote to Patrick,')).toBe(true);
    // KRITIEK: de naam van de oorspronkelijke prospect mag nergens meer staan,
    // behalve in de regel die uitlegt hoe we hier komen.
    expect(r.body).not.toContain('Hi Patrick,');
    // En het onderzoekswerk bij dat account blijft staan; dat is juist waarom
    // we het oorspronkelijke bericht hergebruiken.
    expect(r.body).toContain('Liberty Global Europe Limited');
    expect(r.body.endsWith('Marco')).toBe(true);
  });

  it('weigert een bericht zonder bruikbare opbouw', () => {
    expect(bouwDoorverwijsBericht({
      origineelBody: 'Een regel zonder lege regel', voornaam: 'Taryn', verwijzer: 'P', bron: 'ooo',
    }).fout).toBeTruthy();
  });

  it('weigert zonder voornaam of zonder verwijzer', () => {
    expect(bouwDoorverwijsBericht({ origineelBody: ORIGINEEL, voornaam: '', verwijzer: 'P' }).fout)
      .toBeTruthy();
    expect(bouwDoorverwijsBericht({ origineelBody: ORIGINEEL, voornaam: 'Taryn', verwijzer: '' }).fout)
      .toBeTruthy();
  });

  it('houdt zich aan de huisregels voor klantcommunicatie', () => {
    const r = bouwDoorverwijsBericht({
      origineelBody: ORIGINEEL, voornaam: 'Taryn', verwijzer: 'Patrick', bron: 'referral',
    });
    expect(r.body).not.toContain('—');
    expect(r.body).not.toMatch(/^[-*•]\s/m);
  });
});

describe('besluitPatch', () => {
  it('legt vast wie wanneer besloot', () => {
    const now = new Date('2026-11-27T12:00:00Z');
    const r = besluitPatch('later', { door: 'marco@eclectik.co', now });
    expect(r.patch.referral_status).toBe('later');
    expect(r.patch.referral_decided_at).toBe('2026-11-27T12:00:00.000Z');
    expect(r.patch.referral_decided_by).toBe('marco@eclectik.co');
    expect(r.patch.referral_contact_id).toBeNull();
  });

  it('KRITIEK: opgepakt kan niet zonder aangemaakte prospect', () => {
    // Anders verdwijnt de doorverwijzing uit de werklijst terwijl er niemand
    // benaderd is. Dat is het ene geval waarin je denkt dat het geregeld is.
    expect(besluitPatch('opgepakt', { door: 'm@e.co' }).fout).toBeTruthy();
    expect(besluitPatch('opgepakt', { door: 'm@e.co', contactId: 'abc' }).patch.referral_contact_id)
      .toBe('abc');
  });

  it('weigert een stand die niet bestaat', () => {
    expect(besluitPatch('misschien', {}).fout).toBeTruthy();
    expect(DOORVERWIJZING_STATUSSEN).toEqual(['open', 'opgepakt', 'later', 'laten']);
  });
});

describe('magBesluiten', () => {
  it('een opgepakte doorverwijzing staat vast', () => {
    // Opnieuw oppakken zou dezelfde persoon een tweede keer in de campagne
    // zetten, en die krijgt dan twee keer bericht 1.
    expect(magBesluiten({ referral_status: 'opgepakt' })).toBe(false);
    for (const s of ['open', 'later', 'laten', undefined]) {
      expect(magBesluiten({ referral_status: s })).toBe(true);
    }
  });
});

describe('voornaamUit (api/outreach-referral.js)', () => {
  it('haalt een voornaam uit een adres als er geen naam is', async () => {
    const { voornaamUit } = await import('../../api/outreach-referral.js');
    expect(voornaamUit('Anne den Hertog', null)).toBe('Anne');
    expect(voornaamUit('', 'tamara.meskes@csu.nl')).toBe('Tamara');
    expect(voornaamUit('', 'kaone.kopi@fnbbotswana.co.bw')).toBe('Kaone');
    // Niets bruikbaars: liever leeg dan 'Hi Info,'.
    expect(voornaamUit('', '')).toBe('');
  });
});
