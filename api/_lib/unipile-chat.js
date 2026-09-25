// Berichten uit een LinkedIn-chat lezen via Unipile.
//
// Eigen fetch met eigen DSN/TOKEN, net als unipile-relation.js, unipile-post.js
// en unipile-dm.js. Dat is de conventie hier; api/unipile.js houdt zijn
// unipileRequest privé.
//
// LET OP: dit is GEEN profielweergave. De rate-limit waar de bulk-connectiecheck
// rekening mee houdt geldt voor het bekijken van profielen en het versturen van
// uitnodigingen. Je eigen inbox lezen telt daar niet in mee.

const DSN = process.env.UNIPILE_BASE_URL || process.env.UNIPILE_DSN;
const TOKEN = process.env.UNIPILE_API_KEY || process.env.UNIPILE_TOKEN;

/**
 * @param {string} chatId
 * @returns {Promise<{ok: boolean, items: Array, error?: string}>}
 */
export async function haalChatBerichten(chatId) {
  if (!DSN || !TOKEN) return { ok: false, items: [], error: 'Unipile niet geconfigureerd' };
  if (!chatId) return { ok: false, items: [], error: 'chat_id ontbreekt' };

  let resp;
  try {
    resp = await fetch(`https://${DSN}/api/v1/chats/${encodeURIComponent(chatId)}/messages`, {
      headers: { 'X-API-KEY': TOKEN, accept: 'application/json' },
    });
  } catch (e) {
    return { ok: false, items: [], error: String(e?.message || e) };
  }

  const text = await resp.text();
  if (!resp.ok) return { ok: false, items: [], error: `${resp.status} ${text.slice(0, 200)}` };

  try {
    const json = JSON.parse(text);
    return { ok: true, items: Array.isArray(json?.items) ? json.items : [] };
  } catch {
    return { ok: false, items: [], error: 'onleesbaar antwoord van Unipile' };
  }
}
