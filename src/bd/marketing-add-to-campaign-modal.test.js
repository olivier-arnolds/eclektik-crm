import { describe, it, expect } from 'vitest';
import { applyMergeFields } from './marketing-add-to-campaign-modal.jsx';

// De samenvoeging gebeurt bij het OPSLAAN, niet bij het versturen. De
// verzendkant stuurt de tekst zoals hij in de rij staat, dus wat hier
// wegschrijft is letterlijk wat de prospect leest.
describe('applyMergeFields', () => {
  const c = { first_name: 'Nelleke', company_name: 'Rabobank' };

  it('vult voornaam en bedrijf in', () => {
    expect(applyMergeFields('Hi {{voornaam}},\n\nbij {{bedrijf}}...', c))
      .toBe('Hi Nelleke,\n\nbij Rabobank...');
  });

  it('accepteert spaties en hoofdletters in de tokens', () => {
    expect(applyMergeFields('Hi {{ Voornaam }},', c)).toBe('Hi Nelleke,');
  });

  it('valt terug op de volledige naam als first_name ontbreekt', () => {
    expect(applyMergeFields('Hi {{voornaam}},', { name: 'Mark Cowlard' })).toBe('Hi Mark,');
  });

  it('KRITIEK: laat geen token achter als er geen waarde is', () => {
    // Een resterende {{voornaam}} zou letterlijk in de mail belanden. Leeg is
    // lelijk maar zichtbaar bij het nalezen; een token is dat pas bij de klant.
    expect(applyMergeFields('Hi {{voornaam}},', {})).toBe('Hi ,');
  });

  it('laat tekst zonder tokens ongemoeid', () => {
    expect(applyMergeFields('Gewoon tekst', c)).toBe('Gewoon tekst');
  });
});
