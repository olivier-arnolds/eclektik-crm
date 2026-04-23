// Calendar event sync: push the current user's Graph events into a shared
// Supabase table so all CRM users can see meetings their colleagues had.
//
// Key concepts:
// - Each user syncs their OWN Outlook calendar (via /me/calendar/calendarView).
// - Each event row is tagged with owner_email (the user this came from).
// - A dedup_key identifies the canonical meeting across owners: same start
//   time (to the minute) + same lowercased sorted attendee emails.
// - When rendering Account 360 Meetings, we collapse rows by dedup_key so
//   one meeting only appears once, regardless of how many attendees synced it.

import { getCalendarEventsRange } from '../lib/graph';
import { supabase } from '../supabase';

// Build a stable dedup key so the SAME meeting across multiple attendees'
// mailboxes hashes to the same bucket.
export function buildDedupKey(startAt, attendeeEmails) {
  if (!startAt) return null;
  // Truncate to minute precision
  const d = new Date(startAt);
  if (isNaN(d.getTime())) return null;
  const mins = Math.floor(d.getTime() / 60000) * 60000;
  const normalizedStart = new Date(mins).toISOString();
  const emails = (attendeeEmails || [])
    .map(e => (e || '').toLowerCase().trim())
    .filter(Boolean);
  emails.sort();
  return `${normalizedStart}|${emails.join(',')}`;
}

// Resolve which company this event most likely belongs to.
// Uses the same strict logic as account 360: contact email match → strict
// website domain match. Never matches on our own Eclectik domains.
const ECLECTIK_DOMAINS = new Set(['eclectik.co', 'eclectik.com', 'eclectikadmin.onmicrosoft.com']);

function resolveCompanyId(event, accounts, contacts) {
  const emails = (event.attendeesEmails || []).map(e => (e || '').toLowerCase()).filter(Boolean);
  if (!emails.length) return null;

  // 1) Direct contact-email match
  const contactByEmail = new Map((contacts || []).filter(c => c.email).map(c => [c.email.toLowerCase(), c]));
  for (const em of emails) {
    const c = contactByEmail.get(em);
    if (c?.company_id) return c.company_id;
  }

  // 2) Strict domain match against company website
  for (const em of emails) {
    const dom = (em.split('@')[1] || '').toLowerCase();
    if (!dom || ECLECTIK_DOMAINS.has(dom) || dom.length < 4) continue;
    const acc = (accounts || []).find(a => {
      const web = (a.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
      if (!web || web.length < 4) return false;
      return dom === web || dom.endsWith('.' + web);
    });
    if (acc) return acc.id;
  }

  return null;
}

// Sync the current user's Outlook events into synced_events.
// Called:
//   - once on app load (for the whole year, so Account 360 meetings work immediately)
//   - every time a user opens an account (forces fresh view)
//
// Returns { synced: N, errors: [...] }
export async function syncMyCalendar({ userEmail, userName, accounts, contacts, startISO, endISO, skipIfRecent = true }) {
  if (!userEmail) return { synced: 0, errors: ['No user email'] };
  if (!localStorage.getItem('graph_token')) return { synced: 0, errors: ['No Graph token'] };

  // Skip if we synced less than 2 minutes ago (prevents spamming on every click)
  if (skipIfRecent) {
    const key = `sync_last_${userEmail}`;
    const last = parseInt(localStorage.getItem(key) || '0', 10);
    if (Date.now() - last < 2 * 60 * 1000) return { synced: 0, skipped: true };
    localStorage.setItem(key, String(Date.now()));
  }

  // Default range: Jan 1 of this year → Dec 31 of this year
  const year = new Date().getFullYear();
  const startI = startISO || new Date(year, 0, 1).toISOString();
  const endI = endISO || new Date(year, 11, 31, 23, 59, 59).toISOString();

  let events = [];
  try {
    events = await getCalendarEventsRange(startI, endI);
  } catch (e) {
    return { synced: 0, errors: [e.message] };
  }

  // Build rows
  const rows = events
    .filter(e => !e.isAllDay) // skip all-day events from sync
    .map(e => {
      const attendeeList = [];
      // attendeesEmails already parsed
      (e.attendeesEmails || []).forEach((em, idx) => {
        attendeeList.push({ email: em, name: (e.attendees || '').split(',')[idx]?.trim() || em });
      });
      const startAtISO = e.startAt ? parseLocalToISO(e.startAt) : null;
      const endAtISO = e.endAt ? parseLocalToISO(e.endAt) : null;
      return {
        graph_event_id: e.id,
        owner_email: userEmail,
        owner_name: userName || '',
        subject: e.title || null,
        start_at: startAtISO,
        end_at: endAtISO,
        is_all_day: false,
        body_preview: e.bodyPreview || null,
        body_html: e.bodyHtml || null,
        attendees: attendeeList,
        attendee_emails: e.attendeesEmails || [],
        is_online: !!e.isOnline,
        online_url: e.meetingUrl || null,
        company_id: resolveCompanyId(e, accounts, contacts),
        dedup_key: buildDedupKey(startAtISO, e.attendeesEmails),
        synced_at: new Date().toISOString(),
      };
    });

  if (rows.length === 0) return { synced: 0 };

  // Batch upsert (200 per batch)
  const errors = [];
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await supabase
      .from('synced_events')
      .upsert(batch, { onConflict: 'graph_event_id,owner_email' });
    if (error) errors.push(error.message);
  }

  return { synced: rows.length, errors };
}

// Graph's "Prefer: outlook.timezone" mode returns local time without Z.
// Convert to a proper ISO with local offset so Supabase stores a real timestamp.
function parseLocalToISO(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (/Z$|[+-]\d{2}:\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss] = m;
  const date = new Date(+y, +mo - 1, +d, +hh, +mm, ss ? Math.floor(parseFloat(ss)) : 0);
  return date.toISOString();
}

// Fetch synced events for an account (shared across all users).
// Returns dedupe'd meetings with owner list.
export async function getSharedEventsForAccount(companyId) {
  if (!companyId) return [];
  const { data, error } = await supabase
    .from('synced_events')
    .select('*')
    .eq('company_id', companyId)
    .order('start_at', { ascending: false });
  if (error) {
    console.error('Shared events fetch failed:', error);
    return [];
  }
  // Deduplicate by dedup_key
  const byKey = new Map();
  (data || []).forEach(row => {
    if (!row.dedup_key) {
      // No dedup key — keep as unique entry
      byKey.set(row.id, { ...row, owners: [row.owner_email] });
      return;
    }
    const existing = byKey.get(row.dedup_key);
    if (!existing) {
      byKey.set(row.dedup_key, { ...row, owners: [row.owner_email] });
    } else {
      // Merge: pick the entry with the richest body/attendees
      existing.owners.push(row.owner_email);
      if (!existing.body_html && row.body_html) existing.body_html = row.body_html;
      if (!existing.body_preview && row.body_preview) existing.body_preview = row.body_preview;
      if ((row.attendees?.length || 0) > (existing.attendees?.length || 0)) {
        existing.attendees = row.attendees;
        existing.attendee_emails = row.attendee_emails;
      }
    }
  });
  return Array.from(byKey.values());
}
