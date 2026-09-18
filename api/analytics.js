import { requireUser } from './_lib/guard.js';
import crypto from 'crypto';
import {
  normalizePrivateKey, describeKeyProblem, dateRanges, pctChange,
  reportToRows, totalOf, normalizeDateSeries, buildFunnel, SCORECARD_EVENTS,
} from './_lib/ga-lib.js';

// GET /api/analytics?days=28 - leest Google Analytics 4 voor het dashboard onder
// Marketing.
//
// GEEN NIEUWE DEPENDENCY
//   De googleapis-bibliotheek kan dit ook, maar die sleept tientallen megabytes
//   mee voor precies twee HTTP-aanroepen. Een serviceaccount-token is een zelf
//   ondertekende JWT die je inwisselt voor een access token, en dat is met
//   Node's eigen crypto een handvol regels. Deze repo heeft zes dependencies en
//   dat is een van de redenen dat hij snel bouwt.
//
// WAT ER NODIG IS (Vercel-env)
//   GA_PROPERTY_ID   het nummer uit GA4, Beheer > Property-instellingen
//   GA_CLIENT_EMAIL  client_email uit de serviceaccount-JSON
//   GA_PRIVATE_KEY   private_key uit diezelfde JSON
//   Plus: dat serviceaccount-adres als Viewer toevoegen op de property zelf.
//   Zonder die laatste stap bestaat de sleutel wel maar mag hij nergens bij, en
//   dat geeft een 403 die niets met de sleutel te maken heeft.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GA_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

// De gebeurtenis die de website afvuurt bij een geslaagde inschrijving. Zie
// client/src/lib/tracking.ts in de website-repo (trackEventRegistration). Wijzigt
// die naam daar, dan moet hij hier mee.
const REGISTRATIE_EVENT = 'event_registration';

// Een access token is een uur geldig. Binnen een warme functie hergebruiken we
// het, anders doen we bij elke pagina-verversing een overbodige tokenaanvraag.
let tokenCache = { token: null, expiresAt: 0 };

const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function getAccessToken() {
  const nu = Math.floor(Date.now() / 1000);
  // Een minuut marge: een token dat tijdens de aanroep verloopt geeft een 401
  // die eruitziet als een rechtenprobleem.
  if (tokenCache.token && tokenCache.expiresAt > nu + 60) return tokenCache.token;

  const clientEmail = process.env.GA_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GA_PRIVATE_KEY);
  if (!clientEmail || !privateKey) throw new Error('GA_CLIENT_EMAIL of GA_PRIVATE_KEY ontbreekt');

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: nu, exp: nu + 3600,
  }));
  let signature;
  try {
    signature = b64url(crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(privateKey));
  } catch (e) {
    // De melding van OpenSSL ('DECODER routines::unsupported') zegt niets over
    // de oorzaak. describeKeyProblem kijkt naar de VORM van de waarde, nooit
    // naar de inhoud, en wijst zo het probleem aan zonder de sleutel te tonen.
    const probleem = describeKeyProblem(privateKey);
    throw new Error(probleem
      ? `GA_PRIVATE_KEY klopt niet: ${probleem}.`
      : `GA_PRIVATE_KEY wordt niet geaccepteerd (${e.message}). De vorm ziet er goed uit, dus controleer of dit de volledige, onveranderde waarde van private_key is.`);
  }

  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }).toString(),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.access_token) {
    throw new Error(`token ophalen faalde (${resp.status}): ${data.error_description || data.error || 'onbekend'}`);
  }
  tokenCache = { token: data.access_token, expiresAt: nu + (Number(data.expires_in) || 3600) };
  return tokenCache.token;
}

async function batchRunReports(propertyId, token, requests) {
  const resp = await fetch(`${GA_BASE}/properties/${propertyId}:batchRunReports`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const melding = data?.error?.message || `HTTP ${resp.status}`;
    // De meest voorkomende fout hier is niet de sleutel maar de toegang, en die
    // melding van Google zegt dat niet met zoveel woorden.
    if (resp.status === 403) {
      throw new Error(`geen toegang tot property ${propertyId}. Staat ${process.env.GA_CLIENT_EMAIL} als Viewer op deze property in GA4? (${melding})`);
    }
    throw new Error(melding);
  }
  return data.reports || [];
}

export default async function handler(req, res) {
  const authedUser = await requireUser(req, res);
  if (!authedUser) return;

  const propertyId = String(process.env.GA_PROPERTY_ID || '').replace(/[^0-9]/g, '');
  if (!propertyId) {
    return res.status(503).json({
      error: 'GA_PROPERTY_ID ontbreekt. Zet het propertynummer uit GA4 in de Vercel-omgeving.',
      setup: true,
    });
  }

  const { days, current, previous } = dateRanges(req.query?.days);

  try {
    const token = await getAccessToken();

    // Vijf rapporten in een aanroep; dat is het maximum van batchRunReports.
    const [totaalNu, totaalEerder, reeks, kanalen, paginas] = await batchRunReports(propertyId, token, [
      {
        dateRanges: [current],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }, { name: 'engagementRate' }],
      },
      {
        dateRanges: [previous],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }, { name: 'engagementRate' }],
      },
      {
        dateRanges: [current],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        limit: 400,
      },
      {
        dateRanges: [current],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 12,
      },
      {
        dateRanges: [current],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 15,
      },
    ]);

    // Tweede aanroep, want vijf rapporten is de bovengrens per keer. Hier zit het
    // deel waar het echt om gaat: niet hoeveel bezoek, maar hoeveel aanmeldingen,
    // en waar die vandaan kwamen.
    //
    // We filteren op de gebeurtenis die de website zelf al afvuurt bij een
    // geslaagde inschrijving (trackEventRegistration in client/src/lib/tracking.ts).
    // Bewust via eventCount met een filter en niet via keyEvents: dan hoeft
    // niemand die gebeurtenis in GA4 eerst als sleutelgebeurtenis te markeren, en
    // werkt dit ook als die instelling ooit wordt teruggedraaid.
    const registratieFilter = {
      filter: { fieldName: 'eventName', stringFilter: { value: REGISTRATIE_EVENT } },
    };
    const [campagnes, regNu, regEerder, scorecard] = await batchRunReports(propertyId, token, [
      {
        dateRanges: [current],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'sessionCampaignName' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 15,
      },
      {
        dateRanges: [current],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'sessionCampaignName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: registratieFilter,
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 15,
      },
      {
        dateRanges: [previous],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: registratieFilter,
      },
      // De scorecard-trechter. In BEZOEKERS en niet in gebeurtenissen: wie twee
      // keer begint is een bezoeker en twee gebeurtenissen, en op gebeurtenissen
      // rekenen laat de uitval kleiner lijken dan hij is.
      {
        dateRanges: [current],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'totalUsers' }, { name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', inListFilter: { values: SCORECARD_EVENTS } },
        },
        limit: 10,
      },
    ]);

    const m = (rapport, i) => totalOf(rapport, i);
    const registratiesNu = totalOf(regNu, 0);
    const registratiesEerder = totalOf(regEerder, 0);
    const totals = {
      sessions: m(totaalNu, 0),
      users: m(totaalNu, 1),
      pageviews: m(totaalNu, 2),
      engagement: Math.round((m(totaalNu, 3) || 0) * 100),
    };
    const eerder = {
      sessions: m(totaalEerder, 0),
      users: m(totaalEerder, 1),
      pageviews: m(totaalEerder, 2),
      engagement: Math.round((m(totaalEerder, 3) || 0) * 100),
    };

    return res.status(200).json({
      ok: true,
      range: { days, ...current, previous },
      totals,
      previous_totals: eerder,
      change: {
        sessions: pctChange(totals.sessions, eerder.sessions),
        users: pctChange(totals.users, eerder.users),
        pageviews: pctChange(totals.pageviews, eerder.pageviews),
        engagement: pctChange(totals.engagement, eerder.engagement),
      },
      registrations: {
        total: registratiesNu,
        previous: registratiesEerder,
        change: pctChange(registratiesNu, registratiesEerder),
        by_campaign: reportToRows(regNu, ['source', 'medium', 'campaign'], ['registrations']),
      },
      scorecard: (() => {
        const rijen = reportToRows(scorecard, ['event'], ['users', 'count']);
        const vragen = rijen.find(r => r.event === 'sc_q_answered');
        return {
          steps: buildFunnel(rijen),
          answered: vragen ? vragen.count : 0,
        };
      })(),
      series: normalizeDateSeries(reportToRows(reeks, ['date'], ['sessions', 'users'])),
      channels: reportToRows(kanalen, ['channel'], ['sessions']),
      pages: reportToRows(paginas, ['path'], ['views']),
      campaigns: reportToRows(campagnes, ['source', 'medium', 'campaign'], ['sessions']),
    });
  } catch (e) {
    console.error('[analytics]', e.message);
    return res.status(502).json({ error: e.message });
  }
}
