// E-mail-handtekeningen per afzender. Wordt bij verzending (cron + testmail)
// onder de mail geplakt, boven de afmeldlink. E-mail-veilig: table-layout met
// inline styles, echte <a>-links (geen afbeelding nodig voor de tekst/links).
// Het merk-logo kan later als gehoste <img> worden toegevoegd (LOGO_URL).

// Uit het aangeleverde logo gesneden en gehost vanuit public/ op het CRM-domein.
// WORDMARK = "Eclectik" + tagline (witte letters) -> linksboven.
// ICON = cirkel-beeldmerk met blauwe foto (witte lijnen) -> rechts.
const WORDMARK_URL = 'https://crm.eclectik-insights.co/eclectik-email-wordmark.png';
const ICON_URL = 'https://crm.eclectik-insights.co/eclectik-email-icon-blue.png';

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
  // Split-header: wordmark ("Eclectik" + tagline) linksboven, een lijn onderlangs
  // naar rechts, het cirkel-icoon (blauwe foto) rechts. Beide uit het logo gesneden.
  const header = `<tr><td style="padding:24px 28px 2px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">
      <tr>
        <td style="vertical-align:bottom;white-space:nowrap;padding-right:14px">
          <img src="${WORDMARK_URL}" alt="Eclectik - Insights that make organizations thrive" width="300" style="display:block;border:0;width:300px;max-width:100%;height:auto" />
        </td>
        <td style="vertical-align:bottom;width:100%;padding:0 14px 10px"><div style="border-top:1px solid ${C.line};font-size:0;line-height:0">&nbsp;</div></td>
        <td style="vertical-align:middle;text-align:right;white-space:nowrap"><img src="${ICON_URL}" alt="Eclectik" width="66" style="display:inline-block;border:0;width:66px;height:auto" /></td>
      </tr>
    </table>
  </td></tr>`;
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;background:${C.bg};border-radius:8px;font-family:Arial,Helvetica,sans-serif">
  ${header}
  <tr><td style="padding:16px 28px 24px">
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
