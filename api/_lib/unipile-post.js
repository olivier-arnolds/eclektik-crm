// Gedeelde helper om een LinkedIn-post te plaatsen via Unipile.
// Endpoint: POST /api/v1/posts (X-API-KEY, form-encoded — zelfde stijl als de
// werkende chat-/message-endpoints in api/unipile.js). Response: { post_id }.
// Gebruikt door de content-kalender-cron (linkedin_post) en het unipile-endpoint
// (action=create-post) zodat er één implementatie is.
const DSN = process.env.UNIPILE_BASE_URL || process.env.UNIPILE_DSN;
const TOKEN = process.env.UNIPILE_API_KEY || process.env.UNIPILE_TOKEN;

// Max grootte van een meegestuurde afbeelding (LinkedIn accepteert tot ~8 MB).
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Haalt de afbeelding op (publieke URL, bv. Storage-bucket content-images) zodat
// hij als bijlage in de multipart-body kan. Geeft { blob, filename } of gooit.
export async function fetchImageForPost(imageUrl) {
  const url = String(imageUrl || '').trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('image_url is geen geldige http(s)-URL');
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`afbeelding ophalen mislukt (HTTP ${resp.status})`);
  const type = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!type.startsWith('image/')) throw new Error(`afbeelding heeft geen image content-type (${type || 'onbekend'})`);
  const buf = await resp.arrayBuffer();
  if (buf.byteLength === 0) throw new Error('afbeelding is leeg');
  if (buf.byteLength > MAX_IMAGE_BYTES) throw new Error(`afbeelding te groot (${Math.round(buf.byteLength / 1024 / 1024)} MB, max 8 MB)`);
  const ext = type === 'image/jpeg' ? 'jpg' : (type.split('/')[1] || 'png').replace('+xml', '');
  let filename = `image.${ext}`;
  try {
    const last = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
    if (last && /\.[a-z0-9]{2,5}$/i.test(last)) filename = last;
  } catch { /* houd de default-bestandsnaam */ }
  return { blob: new Blob([buf], { type }), filename };
}

// Geeft terug: { ok:true, postId } | { ok:false, status?, error, details? }
// imageUrl (optioneel): publieke URL van een afbeelding die als bijlage meegaat.
// Een post met afbeelding die niet op te halen is, wordt NIET zonder afbeelding
// geplaatst; dan komt er een fout terug zodat de cron het later opnieuw probeert.
export async function createLinkedInPost({ accountId, text, imageUrl }) {
  if (!DSN || !TOKEN) return { ok: false, error: 'Unipile not configured (DSN/TOKEN ontbreekt)' };
  if (!accountId) return { ok: false, error: 'accountId vereist' };
  if (!text || !String(text).trim()) return { ok: false, error: 'text vereist' };

  // Unipile /posts vereist multipart/form-data (niet urlencoded zoals de chat-
  // endpoints). Gebruik een echte FormData; fetch zet zelf de juiste
  // content-type met boundary (dus GEEN eigen content-type header meesturen).
  const form = new FormData();
  form.append('account_id', accountId);
  form.append('text', String(text));

  // Afbeelding als bijlage. Unipile verwacht het veld 'attachments' (herhaalbaar)
  // met het bestand zelf; de afbeelding staat bij ons in Storage, dus eerst ophalen.
  if (imageUrl) {
    let img;
    try {
      img = await fetchImageForPost(imageUrl);
    } catch (e) {
      return { ok: false, error: `afbeelding: ${e.message}` };
    }
    form.append('attachments', img.blob, img.filename);
  }

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
