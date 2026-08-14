// Gedeelde helper om een LinkedIn-post te plaatsen via Unipile.
// Endpoint: POST /api/v1/posts (X-API-KEY, form-encoded — zelfde stijl als de
// werkende chat-/message-endpoints in api/unipile.js). Response: { post_id }.
// Gebruikt door de content-kalender-cron (linkedin_post) en het unipile-endpoint
// (action=create-post) zodat er één implementatie is.
const DSN = process.env.UNIPILE_BASE_URL || process.env.UNIPILE_DSN;
const TOKEN = process.env.UNIPILE_API_KEY || process.env.UNIPILE_TOKEN;

// Geeft terug: { ok:true, postId } | { ok:false, status?, error, details? }
export async function createLinkedInPost({ accountId, text }) {
  if (!DSN || !TOKEN) return { ok: false, error: 'Unipile not configured (DSN/TOKEN ontbreekt)' };
  if (!accountId) return { ok: false, error: 'accountId vereist' };
  if (!text || !String(text).trim()) return { ok: false, error: 'text vereist' };

  // Unipile /posts vereist multipart/form-data (niet urlencoded zoals de chat-
  // endpoints). Gebruik een echte FormData; fetch zet zelf de juiste
  // content-type met boundary (dus GEEN eigen content-type header meesturen).
  const form = new FormData();
  form.append('account_id', accountId);
  form.append('text', String(text));

  let resp;
  try {
    resp = await fetch(`https://${DSN}/api/v1/posts`, {
      method: 'POST',
      headers: { 'X-API-KEY': TOKEN, 'accept': 'application/json' },
      body: form,
    });
  } catch (e) {
    return { ok: false, error: `Unipile request faalde: ${e.message}` };
  }

  const raw = await resp.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { raw }; }

  if (!resp.ok) {
    const detail = data?.message || data?.error || data?.detail || (raw ? raw.slice(0, 300) : '');
    return { ok: false, status: resp.status, error: `Unipile error ${resp.status}${detail ? ': ' + detail : ''}`, details: data };
  }
  return { ok: true, postId: data?.post_id || null, data };
}
