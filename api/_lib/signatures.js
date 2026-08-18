// E-mail-handtekeningen per afzender. Wordt bij verzending (cron + testmail)
// onder de mail geplakt, boven de afmeldlink. E-mail-veilig: table-layout met
// inline styles, echte <a>-links (geen afbeelding nodig voor de tekst/links).
// Het merk-logo kan later als gehoste <img> worden toegevoegd (LOGO_URL).

// Gehost vanuit public/ op het CRM-domein. Bevat het beeldmerk + "Eclectik" +
// tagline (wit, transparante achtergrond) - dus geen losse HTML-wordmark meer.
const LOGO_URL = 'https://crm.eclectik-insights.co/eclectik-email-logo.png';

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

function marcoSignature() {
  // Met logo: het beeld bevat wordmark + tagline, dus geen losse tekstkop.
  // Zonder logo: nette tekst-fallback (wordmark + tagline).
  const header = LOGO_URL
    ? `<tr><td style="padding:22px 24px 4px"><img src="${LOGO_URL}" alt="Eclectik - Insights that make organizations thrive" width="280" style="display:block;border:0;width:280px;max-width:100%;height:auto" /></td></tr>`
    : `<tr><td style="padding:22px 24px 0">
    <div style="font-size:26px;font-weight:700;color:${C.white};letter-spacing:0.5px">Eclectik</div>
    <div style="border-top:1px solid ${C.line};margin:8px 0 6px"></div>
    <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:${C.teal};text-transform:uppercase">Insights that make organizations thrive</div>
  </td></tr>`;
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.bg};border-radius:8px;font-family:Arial,Helvetica,sans-serif">
  ${header}
  <tr><td style="padding:10px 24px 22px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">
      <tr>
        <td style="vertical-align:top;padding-right:16px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:top;padding-right:10px">
              <a href="https://www.linkedin.com/in/marcovangelder/" style="display:inline-block;width:22px;height:22px;background:${C.liBlue};border-radius:4px;text-align:center;line-height:22px;color:${C.white};font-size:12px;font-weight:700;text-decoration:none">in</a>
            </td>
            <td style="vertical-align:top">
              <div style="font-size:13px;font-weight:700;color:${C.white};letter-spacing:0.5px">MARCO VAN GELDER</div>
              <div style="font-size:12px;color:${C.muted}">Founder</div>
              <div style="font-size:12px;color:${C.muted}">Client Strategy &amp; Innovation</div>
              ${link('mailto:marco@eclectik.co', 'marco@eclectik.co')}
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

// email (lowercase) -> handtekening-HTML. Marco's handtekening hangt ook onder
// Olivier's afzender (zodat Olivier namens/als Marco kan testen en versturen).
const MARCO = marcoSignature();
const SIGNATURES = {
  'marco@eclectik.co': MARCO,
  'olivier@eclectik.co': MARCO,
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
