// Microsoft Graph met de rechten van de APPLICATIE in plaats van die van een
// ingelogde gebruiker.
//
// WAAROM DIT BESTAAT
//   De inboxscan draaide alleen in de browser, want het Graph-token staat in
//   localStorage en hoort bij de persoon die inlogt. Gevolg: bericht 2 en 3 gaan
//   alleen uit op dagen dat iemand de CRM toevallig openzet. Op 27 november
//   stonden daardoor 95 mensen in de EMEA-campagne en 18 AE's te wachten op een
//   opvolging die er niet kwam, zonder enige foutmelding.
//
//   Met client credentials heeft de server zijn eigen token en kan een cron de
//   scan draaien. Zelfde flow als api/glint-sync.js, die dit al doet voor
//   SharePoint.
//
// WAT ER IN AZURE MOET GEBEUREN, EN WAAROM HET NIET TRIVIAAL IS
//   1. App registration ad62ee9d-36aa-45ca-b68e-73d81d729864 (of een aparte
//      registratie) krijgt Mail.Read als APPLICATION permission, met admin
//      consent. Dat is iets anders dan de delegated Mail.Read die de browser nu
//      gebruikt.
//   2. BELANGRIJK: een application permission geeft standaard toegang tot ELKE
//      mailbox in de tenant. Dat hoort hier niet. Beperk het met een
//      Application Access Policy, zodat de app alleen bij de afzendermailboxen
//      van de campagnes kan:
//        New-ApplicationAccessPolicy -AppId <client-id> `
//          -PolicyScopeGroupId <mailgroep met marco@ en olivier@> `
//          -AccessRight RestrictAccess -Description "Eclectik CRM inboxscan"
//      Zonder die policy kan deze code technisch de mail van het hele bedrijf
//      lezen, en dat is een bevoegdheid die niemand nodig heeft.
//
//   Tot dat gebeurd is geeft appToken() null en meldt de cron dat netjes. Dit
//   bestand is dus veilig om te deployen voordat de rechten geregeld zijn.
//
// DE VORM VAN WAT HIERUIT KOMT IS GELIJK AAN src/lib/graph.js
//   scanInbox (src/bd/outreach-match.js) verwacht een bepaalde vorm. Die hier
//   anders maken zou betekenen dat de cron iets anders beoordeelt dan de scan in
//   de browser, en dat is precies het soort verschil waar je pas achter komt als
//   er post de deur uit is.

const GRAPH = 'https://graph.microsoft.com/v1.0';

/** Token op naam van de applicatie, of null als de sleutels ontbreken. */
export async function appToken() {
  const tenant = process.env.GRAPH_TENANT_ID;
  const id = process.env.GRAPH_CLIENT_ID;
  const secret = process.env.GRAPH_CLIENT_SECRET;
  if (!tenant || !id || !secret) return null;

  const body = new URLSearchParams({
    client_id: id,
    client_secret: secret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    throw new Error(`Graph-token mislukt (${r.status}): ${j.error_description || j.error || 'onbekend'}`);
  }
  return j.access_token;
}

async function lees(pad, token) {
  const url = pad.startsWith('http') ? pad : `${GRAPH}${pad}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      // Platte tekst in plaats van HTML. Graph mag dit negeren; kiesBerichttekst
      // in src/lib/mail-body.js vangt dat op.
      Prefer: 'outlook.body-content-type="text"',
    },
  });
  if (!r.ok) {
    const tekst = await r.text().catch(() => '');
    // 403 hier betekent bijna altijd: consent niet gegeven, of de mailbox valt
    // buiten de Application Access Policy. Dat is een ander probleem dan een
    // storing, dus het staat in de melding.
    throw new Error(`Graph ${r.status} op ${pad.slice(0, 80)}: ${tekst.slice(0, 300)}`);
  }
  return r.json();
}

const SELECT = 'id,internetMessageId,subject,bodyPreview,from,toRecipients,'
  + 'receivedDateTime,sentDateTime,isRead,hasAttachments';

/** Normaliseert een Graph-bericht naar dezelfde vorm als src/lib/graph.js. */
function normaliseer(m) {
  return {
    id: m.id,
    // Stabiel over mappen heen, in tegenstelling tot id: Graph geeft een bericht
    // een NIEUW id zodra het verplaatst wordt.
    internetMessageId: m.internetMessageId || null,
    subject: m.subject,
    bodyPreview: m.bodyPreview,
    from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || '',
    fromAddress: m.from?.emailAddress?.address || '',
    to: (m.toRecipients || []).map(r => r.emailAddress?.address).join(', '),
    toAddresses: (m.toRecipients || []).map(r => r.emailAddress?.address).filter(Boolean),
    date: m.receivedDateTime || m.sentDateTime,
    isRead: m.isRead,
    hasAttachments: m.hasAttachments,
    folder: null,
  };
}

/**
 * Alle berichten in een mailbox sinds een moment, over ALLE mappen.
 *
 * Niet alleen de Inbox: Marco ruimt zijn inbox op, dus een antwoord dat hij al
 * gelezen en gearchiveerd had was voor een inbox-only scan onvindbaar. De
 * prospect bleef dan op 'bericht 1 verstuurd' staan met de opvolgmail ingepland.
 */
export async function mailboxSinds(token, mailbox, sinceISO, limit = 800) {
  const who = `/users/${encodeURIComponent(mailbox)}`;
  const since = sinceISO ? new Date(sinceISO) : null;
  const filter = since && Number.isFinite(since.getTime())
    ? `&$filter=receivedDateTime ge ${since.toISOString()}`
    : '';
  let url = `${who}/messages?$top=${Math.min(limit, 999)}`
    + `&$orderby=receivedDateTime desc${filter}&$select=${SELECT}`;

  const alles = [];
  let veiligheid = 0;
  while (url && alles.length < limit && veiligheid < 10) {
    const data = await lees(url, token);
    if (!Array.isArray(data.value)) break;
    alles.push(...data.value);
    const next = data['@odata.nextLink'];
    if (!next) break;
    url = next;
    veiligheid++;
  }
  return alles.slice(0, limit).map(normaliseer);
}

/** De volledige tekst van een bericht, of null als het er niet meer is. */
export async function berichtTekst(token, mailbox, messageId) {
  try {
    const m = await lees(
      `/users/${encodeURIComponent(mailbox)}/messages/${encodeURIComponent(messageId)}`
        + '?$select=body,uniqueBody',
      token,
    );
    return m;
  } catch {
    // Verplaatst of verwijderd. De afgekorte tekst die we al hebben blijft dan
    // staan; dat is beter dan de hele scan laten klappen op een enkel bericht.
    return null;
  }
}

/** Berichten uit een bekende map, bijvoorbeeld SentItems. */
export async function mapBerichten(token, mailbox, map, limit = 300) {
  const data = await lees(
    `/users/${encodeURIComponent(mailbox)}/mailFolders/${map}/messages`
      + `?$top=${Math.min(limit, 999)}&$orderby=receivedDateTime desc&$select=${SELECT}`,
    token,
  );
  return (data.value || []).map(normaliseer);
}
