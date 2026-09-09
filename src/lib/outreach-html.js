// Platte tekst -> HTML voor outreach-mails. Bewust in src/lib zodat ZOWEL het
// verzend-endpoint (api/outreach-send.js) als de preview in de tab dezelfde
// functie gebruiken. Een aparte preview-implementatie zou onvermijdelijk gaan
// afwijken van wat er echt verstuurd wordt, en dan liegt de preview.
//
// api importeert uit src/lib (bestaand patroon: send-broadcast.js gebruikt
// src/lib/broadcast-recipients.js, outreach-send.js gebruikt src/lib/senders.js).

export function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// [woord](https://url) -> klikbare link. Draait NA escapeHtml.
export function linkifyMarkdown(escaped) {
  return String(escaped || '').replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" style="color:#2563eb;text-decoration:underline">$1</a>');
}

// Kale URL's klikbaar maken. De outreach-teksten zijn met de hand geschreven en
// bevatten https://... zonder markdown; zonder dit is de link in bericht 2 gewoon
// platte tekst. Splitst op bestaande <a>-blokken zodat een URL die al in een href
// staat niet nog een keer gelinkt wordt.
export function linkifyBareUrls(html) {
  return String(html || '')
    .split(/(<a\b[^>]*>.*?<\/a>)/gis)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(
      // Laat sluitende interpunctie buiten de URL, anders wordt "zie https://x.nl."
      // een link naar "x.nl.".
      /(^|[\s(])(https?:\/\/[^\s<)]*[^\s<).,;:!?])/g,
      (_m, pre, url) => `${pre}<a href="${url}" style="color:#2563eb;text-decoration:underline">${url}</a>`,
    )))
    .join('');
}

// Bewust GEEN merkhandtekening: dit moet een persoonlijke 1-op-1-mail zijn, en
// een gestileerde marketingfooter verraadt precies het tegendeel. De afmeldregel
// is een gewone zin, geen banner, en Engels omdat de teksten dat zijn.
export function outreachTextToHtml(text, { unsubscribeUrl } = {}) {
  const paras = String(text || '')
    .split(/\n{2,}/)
    .map(p => `<p>${linkifyBareUrls(linkifyMarkdown(escapeHtml(p))).replace(/\n/g, '<br>')}</p>`)
    .join('');

  const optOut = unsubscribeUrl
    ? `<p style="font-size:12px;color:#888888">If you'd rather not hear more about this, <a href="${escapeHtml(unsubscribeUrl)}" style="color:#888888">opt out here</a>.</p>`
    : '';

  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222222">${paras}${optOut}</body></html>`;
}

// Onderwerp per stap. Bericht 2 gaat als "Re: " op hetzelfde onderwerp: we
// versturen via Resend, dus er is geen echte thread. Nooit dubbel "Re: ".
// Hier zodat de preview in de tab hetzelfde onderwerp toont als wat er uitgaat.
export function subjectForStep(c, step) {
  if (step === 1) return c?.msg1_subject || null;
  const base = c?.msg2_subject || c?.msg1_subject || null;
  if (!base) return null;
  return /^re:\s/i.test(base) ? base : `Re: ${base}`;
}
