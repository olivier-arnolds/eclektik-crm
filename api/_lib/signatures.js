// E-mail-handtekeningen per afzender. Wordt bij verzending (cron + testmail)
// onder de mail geplakt, boven de afmeldlink. E-mail-veilig: table-layout met
// inline styles, echte <a>-links (geen afbeelding nodig voor de tekst/links).
// Het merk-logo kan later als gehoste <img> worden toegevoegd (LOGO_URL).

// Samengestelde kop-afbeeldingen (navy achtergrond + "Eclectik" + tagline + lijn
// + cirkel-icoon), gehost vanuit public/. Bewust EEN opaque beeld: letters kunnen
// zo nooit wegvallen op clients die de tabel-achtergrond negeren. 2x-resolutie
// (1360px), getoond op 680px. Twee kleurstellingen: donker (navy) en licht (sage).
const THEME_DARK = {
  headerUrl: 'https://crm.eclectik-insights.co/eclectik-email-header.png',
  bg: '#0f2537', name: '#ffffff', title: '#c9d4dd', label: '#8aa0b0',
  link: '#5cb8b8', email: '#5cb8b8', li: '#0a66c2',
};
const THEME_LIGHT = {
  headerUrl: 'https://crm.eclectik-insights.co/eclectik-email-header-light.png',
  bg: '#d4e2db', name: '#0f2537', title: '#33424c', label: '#2f8f8c',
  link: '#0f2537', email: '#2f8f8c', li: '#0a66c2',
};

function link(href, text, color, extra = '') {
  return `<a href="${href}" style="font-size:12px;color:${color};text-decoration:underline;${extra}">${text}</a>`;
}

// Gedeelde handtekening-opbouw; het naam-blok (naam/functie/e-mail/persoonlijke
// LinkedIn) en het thema (kleuren + kop-afbeelding) verschillen per persoon.
// person = { name, titleLines:[...], email, linkedin }
function personSignature(person, t) {
  // Kop = één samengestelde afbeelding met afgeronde bovenhoeken in het beeld
  // gebakken (transparant). Geen achtergrond op deze cel, zodat die transparante
  // hoeken de mail-achtergrond tonen (rond effect).
  const header = `<tr><td style="padding:0;line-height:0;font-size:0">
    <a href="https://www.eclectik.co" style="text-decoration:none"><img src="${t.headerUrl}" alt="Eclectik - Insights that make organizations thrive" width="680" style="display:block;border:0;width:100%;max-width:680px;height:auto" /></a>
  </td></tr>`;
  const titleHtml = (person.titleLines || [])
    .map(line => `<div style="font-size:12px;color:${t.title}">${line}</div>`).join('');
  const label = (txt) => `<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${t.label};text-transform:uppercase;margin-bottom:6px">${txt}</div>`;
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;border-radius:10px;font-family:Arial,Helvetica,sans-serif">
  ${header}
  <tr><td bgcolor="${t.bg}" style="padding:16px 28px 24px;background:${t.bg};border-radius:0 0 10px 10px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">
      <tr>
        <td style="vertical-align:top;padding-right:16px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:top;padding-right:10px">
              <a href="${person.linkedin}" style="display:inline-block;width:22px;height:22px;background:${t.li};border-radius:4px;text-align:center;line-height:22px;color:#ffffff;font-size:12px;font-weight:700;text-decoration:none">in</a>
            </td>
            <td style="vertical-align:top">
              <div style="font-size:13px;font-weight:700;color:${t.name};letter-spacing:0.5px">${person.name}</div>
              ${titleHtml}
              ${link('mailto:' + person.email, person.email, t.email)}
            </td>
          </tr></table>
        </td>
        <td style="vertical-align:top;padding-right:28px">
          ${label('Learn')}
          ${link('https://www.eclectik.co/consulting', 'Services', t.link, 'display:block;margin-bottom:3px')}
          ${link('https://www.eclectik.co/about-us', 'About', t.link, 'display:block;margin-bottom:3px')}
          ${link('https://www.eclectik.co/', 'Resources', t.link, 'display:block')}
        </td>
        <td style="vertical-align:top">
          ${label('Connect')}
          ${link('https://www.eclectik.co', 'www.eclectik.co', t.link, 'display:block;margin-bottom:3px')}
          ${link('https://www.linkedin.com/company/eclectik-insights/', 'LinkedIn', t.link, 'display:block')}
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
  }, THEME_DARK),
  'olivier@eclectik.co': personSignature({
    name: 'OLIVIER ARNOLDS',
    titleLines: ['Chief Marketing Officer'],
    email: 'olivier@eclectik.co',
    linkedin: 'https://www.linkedin.com/in/olivierarnolds/',
  }, THEME_DARK),
  'yarmilla@eclectik.co': personSignature({
    name: 'YARMILLA KOENDERS',
    titleLines: ['Chief Finance &amp; Operations Officer'],
    email: 'yarmilla@eclectik.co',
    linkedin: 'https://www.linkedin.com/in/yarmilla-koenders-93116a1/',
  }, THEME_LIGHT),
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
