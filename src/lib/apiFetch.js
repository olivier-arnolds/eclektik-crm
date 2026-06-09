// fetch() wrapper for our own /api endpoints: attaches the caller's Supabase
// session token so the serverless guard (api/_lib/guard.js) can verify who is
// calling. All /api fetches in the frontend must go through this — a bare
// fetch('/api/...') will get a 401 since v1.39.0.
import { supabase } from '../supabase';

export async function apiFetch(path, opts = {}) {
  let token = null;
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token || null;
  } catch (_) { /* fall through — request will 401 server-side */ }
  const headers = { ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(path, { ...opts, headers });
}
