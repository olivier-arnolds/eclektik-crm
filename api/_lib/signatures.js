// E-mail-handtekeningen per afzender. Wordt bij verzending (cron + testmail)
// onder de mail geplakt, boven de afmeldlink. E-mail-veilig: table-layout met
// inline styles, echte <a>-links (geen afbeelding nodig voor de tekst/links).
// Het merk-logo kan later als gehoste <img> worden toegevoegd (LOGO_URL).

// Eén samengestelde kop-afbeelding (navy achtergrond + "Eclectik" + tagline +
// lijn + cirkel-icoon), gehost vanuit public/ op het CRM-domein. Bewust EEN
// opaque beeld: witte letters kunnen zo nooit wegvallen op clients die de
// tabel-achtergrond negeren, en de losse delen kunnen niet los mislukken.
// 2x-resolutie (1360px breed), getoond op 680px voor scherpte.
const HEADER_URL = 'https://crm.eclectik-insights.co/eclectik-email-header.png';

const C = {
  bg: '#0f2537',       // donkere navy
  line: '#2a4258',
  teal: '#5cb8b8',     // accent / links
  white: '#ffffff',
  muted: '#c9d4dd',
  label: '#8aa0b0',
  liBlue: '#0a66c2',
};

function link(href, text, extra = '') {
  return `<a href="${href}" style="font-size:12px;color:${C.teal};text-decoration:underline;${extra}">${text}</a>`;
}

// Gedeelde handtekening-opbouw; alleen het naam-blok (naam/functie/e-mail/
// persoonlijke LinkedIn) verschilt per persoon. Kop + LEARN/CONNECT zijn gelijk.
// person = { name, titleLines:[...], email, linkedin }
function personSignature(person) {
  // Kop = één samengestelde afbeelding (wordmark + tagline + lijn + icoon op navy),
  // met afgeronde bovenhoeken in het beeld gebakken (transparant). Geen navy op
  // deze cel, zodat die transparante hoeken de mail-achtergrond tonen (rond effect).
  const header = `<tr><td style="padding:0;line-height:0;font-size:0">
    <a href="https://www.eclectik.co" style="text-decoration:none"><img src="${HEADER_URL}" alt="Eclectik - Insights that make organizations thrive" width="680" style="display:block;border:0;width:100%;max-width:680px;height:auto" /></a>
  </td></tr>`;
  const titleHtml = (person.titleLines || [])
    .map(t => `<div style="font-size:12px;color:${C.muted}">${t}</div>`).join('');
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;border-radius:10px;font-family:Arial,Helvetica,sans-serif">
  ${header}
  <tr><td bgcolor="${C.bg}" style="padding:16px 28px 24px;background:${C.bg};border-radius:0 0 10px 10px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">
      <tr>
        <td style="vertical-align:top;padding-right:16px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:top;padding-right:10px">
              <a href="${person.linkedin}" style="display:inline-block;width:22px;height:22px;background:${C.liBlue};border-radius:4px;text-align:center;line-height:22px;color:${C.white};font-size:12px;font-weight:700;text-decoration:none">in</a>
            </td>
            <td style="vertical-align:top">
              <div style="font-size:13px;font-weight:700;color:${C.white};letter-spacing:0.5px">${person.name}</div>
              ${titleHtml}
              ${link('mailto:' + person.email, person.email)}
            </td>
          </tr></table>
        </td>
        <td style="vertical-align:top;padding-right:28px">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${C.label};text-transform:uppercase;margin-bottom:6px">Learn</div>
          ${link('https://www.eclectik.co/consulting', 'Services', 'display:block;margin-bottom:3px')}
          ${link('https://www.eclectik.co/about-us', 'About', 'display:block;margin-bottom:3px')}
          ${link('https://www.eclectik.co/', 'Resources', 'display:block')}
        </td>
        <td style="vertical-align:top">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${C.label};text-transform:uppercase;margin-bottom:6px">Connect</div>
          ${link('https://www.eclectik.co', 'www.eclectik.co', 'display:block;margin-bottom:3px')}
          ${link('https://www.linkedin.com/company/eclectik-insights/', 'LinkedIn', 'display:block')}
        </td>
      </tr>
    </table>
  </td></tr>
</table>`;
}

// email (lowercase) -> handtekening-HTML.
const SIGNATURES = {
  'marco@eclectik.co': personSignature({
    name: 'MARCO VAN GELDER',
    titleLines: ['Founder', 'Client Strategy &amp; Innovation'],
    email: 'marco@eclectik.co',
    linkedin: 'https://www.linkedin.com/in/marcovangelder/',
  }),
  'olivier@eclectik.co': personSignature({
    name: 'OLIVIER ARNOLDS',
    titleLines: ['Chief Marketing Officer'],
    email: 'olivier@eclectik.co',
    linkedin: 'https://www.linkedin.com/in/olivierarnolds/',
  }),
};

export function signatureFor(fromEmail) {
  return SIGNATURES[String(fromEmail || '').trim().toLowerCase()] || '';
}

// Plakt de handtekening onder de body-HTML (vóór </body> als die er is).
export function appendSignature(html, fromEmail) {
  const sig = signatureFor(fromEmail);
  if (!sig) return html;
  const block = `<div style="margin-top:28px">${sig}</div>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, block + '</body>') : html + block;
}
