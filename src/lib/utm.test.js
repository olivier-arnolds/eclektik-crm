import { describe, it, expect } from 'vitest';
import { slugify, addUtmToUrl, addUtmToHtml, addUtmToPlainText, UTM_BRONNEN } from './utm.js';

const O = { source: 'eclektik', medium: 'email', campaign: 'glint-okt' };

describe('slugify', () => {
  it('maakt er iets van dat leesbaar blijft in een rapport', () => {
    expect(slugify('Glint Uitnodiging #3')).toBe('glint-uitnodiging-3');
    expect(slugify('  Événement  Amsterdam ')).toBe('evenement-amsterdam');
  });
  it('gaat om met leeg', () => {
    expect(slugify(null)).toBe('');
  });
});

describe('addUtmToUrl', () => {
  it('tagt een eigen link', () => {
    expect(addUtmToUrl('https://eclectik.co/events', O))
      .toBe('https://eclectik.co/events?utm_source=eclektik&utm_medium=email&utm_campaign=glint-okt');
  });

  it('werkt ook op www en subdomeinen', () => {
    expect(addUtmToUrl('https://www.eclectik.co/x', O)).toContain('utm_source=eclektik');
    expect(addUtmToUrl('https://crm.eclectik-insights.co/x', O)).toContain('utm_source=eclektik');
  });

  it('KRITIEK: laat vreemde domeinen met rust', () => {
    // Andermans site doet niets met onze tags en het vervuilt hun statistieken.
    const ext = 'https://www.linkedin.com/in/iemand';
    expect(addUtmToUrl(ext, O)).toBe(ext);
  });

  it('KRITIEK: overschrijft bestaande tags niet', () => {
    const al = 'https://eclectik.co/x?utm_source=handmatig&utm_medium=print';
    expect(addUtmToUrl(al, O)).toBe(al);
  });

  it('behoudt bestaande parameters die geen utm zijn', () => {
    const r = addUtmToUrl('https://eclectik.co/x?id=7', O);
    expect(r).toContain('id=7');
    expect(r).toContain('utm_campaign=glint-okt');
  });

  it('raakt mailto, ankers en onzin niet aan', () => {
    expect(addUtmToUrl('mailto:marco@eclectik.co', O)).toBe('mailto:marco@eclectik.co');
    expect(addUtmToUrl('#programma', O)).toBe('#programma');
    expect(addUtmToUrl('{{{RESEND_UNSUBSCRIBE_URL}}}', O)).toBe('{{{RESEND_UNSUBSCRIBE_URL}}}');
    expect(addUtmToUrl('', O)).toBe('');
  });
});

describe('addUtmToHtml', () => {
  it('tagt alle eigen links en laat de rest staan', () => {
    const html = '<p>Zie <a href="https://eclectik.co/events">het event</a> en '
      + '<a href=\'https://nos.nl\'>nieuws</a>.</p>';
    const r = addUtmToHtml(html, O);
    expect(r).toContain('href="https://eclectik.co/events?utm_source=eclektik');
    expect(r).toContain("href='https://nos.nl'");
  });

  it('KRITIEK: laat de rest van de HTML ongemoeid', () => {
    // Een echte HTML-parser zou onvolledige opmaak 'repareren' en daarmee de
    // mail veranderen. Alleen het stukje tussen de aanhalingstekens mag wijzigen.
    const html = '<div style="color:#000"><a href="https://eclectik.co/a">x</a><br>Hi {{first_name}}';
    const r = addUtmToHtml(html, O);
    expect(r.startsWith('<div style="color:#000">')).toBe(true);
    expect(r.endsWith('<br>Hi {{first_name}}')).toBe(true);
  });

  it('laat de afmeldtag van Resend met rust', () => {
    const html = '<a href="{{{RESEND_UNSUBSCRIBE_URL}}}">afmelden</a>';
    expect(addUtmToHtml(html, O)).toBe(html);
  });
});

describe('addUtmToPlainText', () => {
  it('tagt een kale URL in lopende tekst', () => {
    const r = addUtmToPlainText('Programma: https://eclectik.co/events.', O);
    expect(r).toContain('https://eclectik.co/events?utm_source=eclektik');
    // De punt aan het eind hoort niet bij de URL.
    expect(r.endsWith('.')).toBe(true);
  });
});

describe('UTM_BRONNEN', () => {
  it('KRITIEK: de mediums zijn termen die Google kent', () => {
    // Een zelfbedacht medium als 'dm' valt in GA in Niet toegewezen, en dan is
    // het kanaaloverzicht stuk. Dat het om een DM gaat staat in utm_content.
    expect(UTM_BRONNEN.campagne.medium).toBe('email');
    expect(UTM_BRONNEN.outreachEmail.medium).toBe('email');
    expect(UTM_BRONNEN.outreachLinkedIn.medium).toBe('social');
    expect(UTM_BRONNEN.outreachLinkedIn.content).toBe('dm');
  });

  it('de bronnen zijn uit elkaar te houden in een rapport', () => {
    const bronnen = Object.values(UTM_BRONNEN).map(b => b.source);
    expect(new Set(bronnen).size).toBe(bronnen.length);
  });
});

describe('een echt outreach-bericht taggen', () => {
  it('de link in een LinkedIn-DM krijgt de tags, de tekst blijft heel', () => {
    const bericht = 'Hi Nelleke,\n\nOp 6 oktober verkennen we dit.\n\n'
      + 'https://www.eclectik.co/events/amsterdam-2026\n\nGroet, Marco';
    const r = addUtmToPlainText(bericht, { ...UTM_BRONNEN.outreachLinkedIn, campaign: 'amsterdam-2026-linkedin' });
    expect(r).toContain('utm_source=linkedin');
    expect(r).toContain('utm_medium=social');
    expect(r).toContain('utm_content=dm');
    expect(r).toContain('Hi Nelleke,');
    expect(r).toContain('Groet, Marco');
  });
});
