// Bereken een leesbare tekst-kleur voor een gegeven tag/badge-color. Pastel
// kleuren (lichtgeel, lichtroze etc.) zijn onleesbaar als tekst op witte
// achtergrond — die worden hier gedimd naar dezelfde hue maar darker.
// Donkere input-kleuren blijven onveranderd.
//
// Gebruik voor tag-chips, status-pills, etc. waar de gebruiker zelf de
// kleur kiest maar er ook tekst op moet leesbaar zijn.
export function readableTextColor(hex) {
  const clean = (hex || '').replace('#', '').trim();
  if (clean.length !== 6) return 'var(--text-1)';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r + g + b)) return 'var(--text-1)';
  // Relative luminance (simpele weighted avg, niet WCAG-perceptueel maar
  // voldoende voor onze pastel/normal palette).
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum <= 0.55) return hex; // donker genoeg, gebruik origineel
  // Te licht: scale RGB naar een donkerdere variant. Target luminance ~0.3
  // levert leesbare tekst op witte achtergrond.
  const factor = 0.4 / lum;
  const dr = Math.max(0, Math.round(r * factor));
  const dg = Math.max(0, Math.round(g * factor));
  const db = Math.max(0, Math.round(b * factor));
  return `rgb(${dr}, ${dg}, ${db})`;
}
