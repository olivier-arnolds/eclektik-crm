import { describe, it, expect } from 'vitest';
import { confirmationMail, eventsMetMail, EVENT_MAILS } from './event-confirmation-mails.js';

describe('confirmationMail', () => {
  it('vult de voornaam in', () => {
    const m = confirmationMail('amsterdam-2026', 'Rinus');
    expect(m.body.startsWith('Hi Rinus,')).toBe(true);
  });

  it('valt terug op "there" bij een lege voornaam', () => {
    // 'Hi ,' verraadt meteen dat er een sjabloon achter zit.
    expect(confirmationMail('zurich-2026', '  ').body.startsWith('Hi there,')).toBe(true);
  });

  it('geeft null bij een onbekend event en NOOIT een standaardtekst', () => {
    expect(confirmationMail('lissabon-2027', 'Jan')).toBe(null);
    expect(confirmationMail('', 'Jan')).toBe(null);
    expect(confirmationMail(null, 'Jan')).toBe(null);
  });

  it('stuurt per event de eigen datum en plaats mee', () => {
    const ams = confirmationMail('amsterdam-2026', 'A');
    const zur = confirmationMail('zurich-2026', 'A');
    expect(ams.body).toContain('Tuesday 17 November 2026');
    expect(ams.body).toContain('Amsterdam');
    expect(ams.body).not.toContain('Zürich');
    expect(zur.body).toContain('Tuesday 1 December 2026');
    expect(zur.body).toContain('Zürich');
    expect(zur.body).not.toContain('Amsterdam');
  });

  it('laat geen onvervangen sjabloonhaakjes achter', () => {
    for (const slug of eventsMetMail()) {
      expect(confirmationMail(slug, 'X').body).not.toContain('{{');
      expect(confirmationMail(slug, 'X').subject).not.toContain('{{');
    }
  });

  it('houdt zich aan de huisregels voor klantcommunicatie', () => {
    for (const [slug, m] of Object.entries(EVENT_MAILS)) {
      // Geen em-dashes en geen markdown-koppen: dat zijn de twee die in een
      // mailclient meteen verraden dat er een machine achter zit.
      expect(m.body, slug).not.toContain('—');
      expect(m.body, slug).not.toMatch(/^#/m);
    }
  });
});
