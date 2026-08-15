// Gedeelde helper: stuur een LinkedIn-connectieverzoek via Unipile.
//  1) profiel ophalen om provider_id te vinden (GET /users/{identifier}?account_id)
//  2) uitnodigen (POST /users/invite met provider_id + optioneel message)
// Gebruikt door de connectie-drip-cron (api/linkedin-invite-drip.js).
const DSN = process.env.UNIPILE_BASE_URL || process.env.UNIPILE_DSN;
const TOKEN = process.env.UNIPILE_API_KEY || process.env.UNIPILE_TOKEN;

// Geeft: { ok:true, data } | { ok:false, status?, error, details? }
export async function sendLinkedInInvite({ accountId, linkedinUrl, message }) {
  if (!DSN || !TOKEN) return { ok: false, error: 'Unipile not configured (DSN/TOKEN ontbreekt)' };
  if (!accountId || !linkedinUrl) return { ok: false, error: 'accountId/linkedinUrl vereist' };

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
  // Al verbonden? Dan geen invite nodig.
  const distance = pdata.network_distance || '';
  if (distance === 'FIRST_DEGREE' || distance === 'DISTANCE_1' || pdata.is_relationship === true) {
    return { ok: false, alreadyConnected: true, error: 'al verbonden' };
  }
  const providerId = pdata.provider_id || pdata.id || pdata.member_id;
  if (!providerId) return { ok: false, error: 'geen provider_id gevonden voor dit profiel' };

  // 2) uitnodigen (JSON body — zelfde als de bestaande send-invite-actie)
  let inv;
  try {
    inv = await fetch(`https://${DSN}/api/v1/users/invite`, {
      method: 'POST',
      headers: { 'X-API-KEY': TOKEN, 'accept': 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ provider_id: providerId, account_id: accountId, message: message || '' }),
    });
  } catch (e) {
    return { ok: false, error: `uitnodigen faalde: ${e.message}` };
  }
  const iraw = await inv.text();
  let idata; try { idata = JSON.parse(iraw); } catch { idata = { raw: iraw }; }
  if (!inv.ok) {
    const detail = idata?.message || idata?.error || (iraw ? iraw.slice(0, 200) : '');
    return { ok: false, status: inv.status, error: `uitnodigen: Unipile ${inv.status}${detail ? ': ' + detail : ''}`, details: idata };
  }
  return { ok: true, data: idata };
}
