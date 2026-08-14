// Gedeelde helper: stuur een LinkedIn-DM via Unipile. Twee stappen:
//  1) profiel ophalen om de provider_id te vinden (GET /users/{identifier}?account_id)
//  2) nieuwe chat starten met een eerste bericht (POST /chats, form-encoded) —
//     zelfde stijl als de bestaande start-chat-actie in api/unipile.js.
// Gebruikt door de content-kalender-cron voor linkedin_dm-items.
const DSN = process.env.UNIPILE_BASE_URL || process.env.UNIPILE_DSN;
const TOKEN = process.env.UNIPILE_API_KEY || process.env.UNIPILE_TOKEN;

// Geeft: { ok:true, messageId } | { ok:false, status?, error, details? }
export async function sendLinkedInDM({ accountId, linkedinUrl, text }) {
  if (!DSN || !TOKEN) return { ok: false, error: 'Unipile not configured (DSN/TOKEN ontbreekt)' };
  if (!accountId || !linkedinUrl) return { ok: false, error: 'accountId/linkedinUrl vereist' };
  if (!text || !String(text).trim()) return { ok: false, error: 'text vereist' };

  const m = String(linkedinUrl).match(/linkedin\.com\/in\/([^\/\?]+)/);
  const identifier = m ? m[1] : linkedinUrl;

  // 1) provider_id ophalen
  let pr;
  try {
    pr = await fetch(`https://${DSN}/api/v1/users/${encodeURIComponent(identifier)}?account_id=${encodeURIComponent(accountId)}`, {
      headers: { 'X-API-KEY': TOKEN, 'accept': 'application/json' },
    });
  } catch (e) {
    return { ok: false, error: `profiel ophalen faalde: ${e.message}` };
  }
  const praw = await pr.text();
  let pdata; try { pdata = JSON.parse(praw); } catch { pdata = {}; }
  if (!pr.ok) return { ok: false, status: pr.status, error: `profiel ophalen: Unipile ${pr.status}${pdata?.message ? ': ' + pdata.message : ''}` };
  const providerId = pdata.provider_id || pdata.id || pdata.member_id;
  if (!providerId) return { ok: false, error: 'geen provider_id gevonden voor dit profiel' };

  // 2) chat starten met eerste bericht (form-encoded; /chats werkt met urlencoded)
  const form = new URLSearchParams();
  form.append('account_id', accountId);
  form.append('attendees_ids', providerId);
  form.append('text', String(text));

  let ch;
  try {
    ch = await fetch(`https://${DSN}/api/v1/chats`, {
      method: 'POST',
      headers: { 'X-API-KEY': TOKEN, 'accept': 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
  } catch (e) {
    return { ok: false, error: `chat starten faalde: ${e.message}` };
  }
  const craw = await ch.text();
  let cdata; try { cdata = JSON.parse(craw); } catch { cdata = { raw: craw }; }
  if (!ch.ok) {
    const detail = cdata?.message || cdata?.error || (craw ? craw.slice(0, 200) : '');
    return { ok: false, status: ch.status, error: `chat starten: Unipile ${ch.status}${detail ? ': ' + detail : ''}`, details: cdata };
  }
  const messageId = cdata.message_id || cdata.chat_id || cdata.id || null;
  return { ok: true, messageId, data: cdata };
}
