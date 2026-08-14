// Gedeelde helper: check of een Unipile-account 1e-graads verbonden is met een
// LinkedIn-profiel. Haalt het profiel op (bevat network_distance / is_relationship).
// Gebruikt door de check-relation-actie in api/unipile.js en de bulk-check in
// api/linkedin-connections.js.
const DSN = process.env.UNIPILE_BASE_URL || process.env.UNIPILE_DSN;
const TOKEN = process.env.UNIPILE_API_KEY || process.env.UNIPILE_TOKEN;

// Geeft: { status: 'connected'|'not_connected'|'error', networkDistance, isRelationship, error? }
export async function checkRelation({ accountId, linkedinUrl }) {
  if (!DSN || !TOKEN) return { status: 'error', error: 'Unipile not configured' };
  if (!accountId || !linkedinUrl) return { status: 'error', error: 'accountId/linkedinUrl vereist' };

  const m = String(linkedinUrl).match(/linkedin\.com\/in\/([^\/\?]+)/);
  const identifier = m ? m[1] : linkedinUrl;

  let resp;
  try {
    resp = await fetch(`https://${DSN}/api/v1/users/${encodeURIComponent(identifier)}?account_id=${encodeURIComponent(accountId)}`, {
      headers: { 'X-API-KEY': TOKEN, 'accept': 'application/json' },
    });
  } catch (e) {
    return { status: 'error', error: `Unipile request faalde: ${e.message}` };
  }

  const raw = await resp.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = {}; }

  if (!resp.ok) {
    return { status: 'error', error: data?.message || data?.error || `Unipile error ${resp.status}`, httpStatus: resp.status };
  }

  const distance = data.network_distance || '';
  const isRelationship = data.is_relationship;
  let status = 'not_connected';
  if (distance === 'FIRST_DEGREE' || distance === 'DISTANCE_1') status = 'connected';
  else if (isRelationship) status = 'connected';
  return { status, networkDistance: distance, isRelationship };
}
