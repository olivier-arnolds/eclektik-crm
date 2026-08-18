// Gedeelde plain-text -> HTML-rendering voor content-kalender-e-mails. Gebruikt
// door de publish-cron (api/content-calendar-execute.js) en de testmail
// (api/content-test-email.js), zodat een testmail er identiek uitziet als de
// echte verzending.

export function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// [woord](https://url) -> klikbare link. Draait NA escapeHtml zodat de
// woord-tekst geëscaped is; & < > in de URL zijn na escape veilig in de href.
export function linkifyMarkdown(escaped) {
  return escaped.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" style="color:#2563eb;text-decoration:underline">$1</a>');
}

// Plain-text body -> simpele HTML (dubbele newline = alinea, enkele = <br>).
// {{first_name}}/{{last_name}} blijven staan (broadcast zet ze om naar Resend's
// merge-tags); [woord](url) wordt hier al een echte <a>.
export function contentTextToHtml(text) {
  const paras = String(text || '')
    .split(/\n{2,}/)
    .map(p => `<p>${linkifyMarkdown(escapeHtml(p)).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222222">${paras}</body></html>`;
}
