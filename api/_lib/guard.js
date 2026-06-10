// Shared auth guards for the /api serverless endpoints (v1.39.0).
//
// Files under api/_lib are NOT deployed as endpoints (Vercel ignores
// underscore-prefixed paths inside /api).
//
// Three guard types:
//   requireUser(req, res)  — verifies the caller's Supabase session JWT
//                            (Authorization: Bearer <access_token>). Returns
//                            the user object, or null after sending a 401.
//                            Use for every endpoint the frontend calls.
//   requireCron(req, res)  — verifies a Vercel cron invocation. If CRON_SECRET
//                            is set in Vercel env, requires the matching
//                            Authorization header (Vercel sends it
//                            automatically for cron jobs). Without CRON_SECRET
//                            it falls back to the x-vercel-cron header, which
//                            the platform sets on cron requests. Setting
//                            CRON_SECRET is recommended.
//   requireQueueSecret(req)— optional shared-secret check for automation
//                            callers (Claude's feature-request queue).
//   requireWebhookSecret(req, res, envName)
//                          — for inbound webhooks from external providers.
//                            Checks either x-webhook-secret header OR
//                            ?secret=... query-param against the named env
//                            var. Used for unipile-webhook because the
//                            Unipile dashboard does not let us configure
//                            custom headers — the secret goes in the URL.
//
// Frontend counterpart: src/lib/apiFetch.js attaches the session token to
// every /api fetch.
import { createClient } from '@supabase/supabase-js';

const admin = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export async function requireUser(req, res) {
  if (!admin) {
    res.status(500).json({ error: 'Auth not configured (SUPABASE_SERVICE_KEY missing)' });
    return null;
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: missing bearer token' });
    return null;
  }
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: 'Unauthorized: invalid or expired session' });
      return null;
    }
    return data.user;
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized: token verification failed' });
    return null;
  }
}

export function requireCron(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if ((req.headers.authorization || '') === `Bearer ${secret}`) return true;
    res.status(401).json({ error: 'Unauthorized: invalid cron secret' });
    return false;
  }
  // Vercel sets x-vercel-cron on platform cron invocations.
  if (req.headers['x-vercel-cron']) return true;
  res.status(401).json({ error: 'Unauthorized: cron invocations only (set CRON_SECRET)' });
  return false;
}

export function requireQueueSecret(req) {
  const secret = process.env.FEATURE_QUEUE_SECRET;
  return !!(secret && req.headers['x-feature-queue-secret'] === secret);
}

export function requireWebhookSecret(req, res, envName) {
  const expected = process.env[envName];
  if (!expected) {
    res.status(500).json({ error: `${envName} not configured` });
    return false;
  }
  // Accept secret in either x-webhook-secret header OR ?secret=... query
  // param. URL-based is the fallback when the provider's dashboard does
  // not allow custom headers (Unipile, e.g.) — bewust afgewogen tradeoff
  // voor low-traffic internal endpoints (Vercel logs URLs incl. secret).
  const fromHeader = req.headers['x-webhook-secret'] || '';
  const fromQuery = req.query?.secret || '';
  if (fromHeader !== expected && fromQuery !== expected) {
    res.status(401).json({ error: 'Unauthorized: invalid webhook signature' });
    return false;
  }
  return true;
}
