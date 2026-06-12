// Adapter functions: map Supabase rows (via usePipelineData) to the shape the BD lanes expect.

// Owner: our DB stores owner as name string; BD uses MVG/OA/YK codes.
// Some legacy rows have only first names — map those too so the calendar's
// "filter to current user" check doesn't drop tasks owned by 'Marco' just
// because the logged-in profile resolves to 'MVG'.
const OWNER_ID = {
  'Marco van Gelder': 'MVG',
  'Olivier Arnolds':  'OA',
  'Yarmilla Koenders':'YK',
  'Marco':            'MVG',
  'Olivier':          'OA',
  'Yarmilla':         'YK',
};
export function ownerIdFromName(name) {
  if (!name) return '';
  if (OWNER_ID[name]) return OWNER_ID[name];
  // Initial-based fallback
  return name.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0,3).toUpperCase();
}

// Stable hue from a string
function hueFromString(s) {
  const str = s || '';
  return Math.abs([...str].reduce((h, c) => h + c.charCodeAt(0), 0)) % 360;
}

// ---------- Deal (lead or opportunity) ----------
// Our model: funnelStage (lead/opportunity/onboarding/active/inactive/past) + subStatus (qualify/develop/proposal/close)
// BD display stage: qualify/develop/proposal/close/onboarding/active/sleeping (7 columns)
//   - qualify/develop/proposal: pre-deal phase (lead OR opportunity)
//   - close: lost deals (any stage that ended in 'Lost')
//   - onboarding: won deals starting delivery
//   - active: in-progress projects
//   - sleeping: completed projects (revivable on customer request)
export function adaptDeal(item, rawAccounts, rawContacts) {
  const acc = (rawAccounts || []).find(a => a.id === item.accountId);
  const contact = (rawContacts || []).find(c => item.contactIds?.includes(c.id));

  let stage;
  if (['onboarding', 'active'].includes(item.funnelStage)) stage = item.funnelStage;
  else if (['inactive', 'past'].includes(item.funnelStage)) {
    // Past/inactive: disambiguate sleeping (won/finished) vs close (lost) via status
    stage = item.status === 'Won' ? 'sleeping' : 'close';
  }
  else stage = item.subStatus || 'qualify';

  return {
    id: item.id,
    dealNo: item.dealNo || '',
    title: item.title || 'Untitled',
    account: acc?.name || '',
    accountId: acc?.id,
    contact: contact?.name || '',
    contactId: contact?.id,
    contactIds: item.contactIds || [],
    value: Number(item.value) || 0,
    stage,
    funnelStage: item.funnelStage,
    subStatus: item.subStatus,
    owner: ownerIdFromName(item.owner),
    ownerRaw: item.owner,
    team: (item.team || '').split(',').map(s => s.trim()).filter(Boolean), // e.g. ["MVG", "OA"]
    staleDays: item.sortDate ? Math.floor((Date.now() - new Date(item.sortDate).getTime()) / 86400000) : 0,
    dealType: item.productLine || '',
    journeyStage: item.journeyStage || '',
    currency: item.currency || 'EUR',
    closeDate: item.closeDate || '',
    description: item.notes || '',
    probability: Number(item.probability) || 0,
    source: item.source || '',
    table: item.funnelStage === 'lead' ? 'leads' : 'opportunities',
  };
}

// ---------- Account ----------
export function adaptAccount(row) {
  return {
    id: row.id,
    accountNo: row.account_no || '',
    name: row.name || '',
    type: row.type || 'Customer',
    tier: row.tier || '',
    region: row.country || '',
    city: row.city || '',
    arr: row.annual_revenue || row.size || '',
    owner: ownerIdFromName(row.owner),
    logoHue: hueFromString(row.name),
    industry: row.industry || '',
    website: row.website || '',
    flag: row.flag || '',
    phone: row.phone || '',
    email: row.email || '',
    linkedin_url: row.linkedin_url || '',
  };
}

// ---------- Contact ----------
export function adaptContact(row, adaptedAccounts) {
  const acc = (adaptedAccounts || []).find(a => a.id === row.accountId);
  return {
    id: row.id,
    name: row.name || '',
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    role: row.role || '',
    account: acc?.name || '',
    accountId: row.accountId,
    email: row.email || '',
    phone: row.phone || '',
    avatarBg: row.avatarBg,
    avatarColor: row.avatarColor,
    initials: row.initials,
    isPrimary: !!row.isPrimary,
    // Inactivated contacts coalesce into isFormer so existing strike-through
    // styling on contact rows just works without extra wiring.
    isFormer: !!row.isFormer || !!row.isInactive,
    isInactive: !!row.isInactive,
    inactive_reason: row.inactive_reason || '',
    updatedAt: row.updated_at || '',
    createdAt: row.created_at || '',
    linkedin_url: row.linkedin_url || '',
    do_not_email: !!row.do_not_email,
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}

// ---------- Comm ----------
// Raw comm from adaptComm in usePipelineData: { id, icon, from, sub, time, unread, date, itemIds }
export function adaptComm(row, rawItems, rawAccounts) {
  const item = (rawItems || []).find(i => row.itemIds?.includes(i.id));
  // Prefer direct company_id (for account-level notes), else derive via deal
  const acc = row.companyId
    ? (rawAccounts || []).find(a => a.id === row.companyId)
    : (item ? (rawAccounts || []).find(a => a.id === item.accountId) : null);
  const channel = row.channel
    || (row.icon === '◈' ? 'linkedin' : row.icon === '◎' ? 'teams' : row.icon === '☎' ? 'phone' : row.icon === '📝' ? 'note' : 'email');
  return {
    id: row.id,
    channel,
    dir: row.direction === 'outbound' ? 'out' : (row.dir || 'in'),
    from: row.from || '',
    subject: row.sub || '',
    preview: row.preview || '',
    unread: !!row.unread,
    ts: row.date,
    account: acc?.name || '',
    accountId: acc?.id,
    contactId: row.contactId || null,
    chatId: row.chatId || null,
    unipileUser: row.unipileUser || null,
    deal: item?.id,
    hasAttach: !!row.hasAttach,
    flagged: !!row.flagged,
    archived: !!row.archived,
  };
}

// ---------- Calendar event ----------
export function adaptCalEvent(row, rawItems, rawAccounts) {
  const item = (rawItems || []).find(i => row.itemIds?.includes(i.id));
  const acc = item ? (rawAccounts || []).find(a => a.id === item.accountId) : null;
  // Parse start time: row.date is YYYY-MM-DD, row.time can be "09:00 – 10:00"
  let startISO = null, endISO = null;
  if (row.date) {
    const [startTime, endTime] = (row.time || '09:00 – 10:00').split(' – ');
    startISO = `${row.date}T${startTime || '09:00'}:00`;
    endISO = endTime ? `${row.date}T${endTime}:00` : null;
  }
  return {
    id: row.id,
    kind: 'meeting',
    date: row.date,
    startISO,
    endISO,
    title: row.title || '',
    deal: item?.id,
    accountId: acc?.id,
    attendees: row.who || '',
    owner: ownerIdFromName((row.who || '').split(',')[0]),
    channel: (row.title || '').toLowerCase().includes('teams') ? 'teams' : null,
  };
}

// ---------- Task ----------
export function adaptTask(row, rawItems, rawAccounts) {
  const item = (rawItems || []).find(i => row.itemIds?.includes(i.id));
  const dealAccount = item ? (rawAccounts || []).find(a => a.id === item.accountId) : null;
  // Prefer direct company_id link, fallback to deal's account
  const directAccount = row.company_id ? (rawAccounts || []).find(a => a.id === row.company_id) : null;
  const acc = directAccount || dealAccount;
  return {
    id: row.id,
    title: row.text || '',
    dueDate: row.dueDate || '',
    dueLabel: row.due || '',
    overdue: !!row.overdue,
    done: !!row.done,
    deal: item?.id,
    accountId: acc?.id,
    company_id: row.company_id,
    // Prefer task-level owner; fall back to parent deal's owner.
    owner: ownerIdFromName(row.rawOwner) || ownerIdFromName(item?.owner),
    // Full owner name string (for display next to the due date in the
    // Account 360 view; the short MVG/OA/YK code lives in `owner`).
    ownerRaw: row.rawOwner || item?.owner || '',
    // "With" — an Eclectik team member collaborating on the task (contact id).
    withContactId: row.withContactId || null,
  };
}

// ---------- Follow-up ----------
export function adaptFollowUp(row, rawItems, rawAccounts) {
  const item = (rawItems || []).find(i => row.itemIds?.includes(i.id));
  const acc = item ? (rawAccounts || []).find(a => a.id === item.accountId) : null;
  return {
    id: row.id,
    subject: row.subject || '',
    sentDate: row.sentDate,
    daysWithoutReply: row.daysWithoutReply,
    status: row.status,
    pepPriority: row.pepPriority,
    contactId: row.contactId,
    deal: item?.id,
    accountId: acc?.id,
  };
}

// ---------- Stage definitions (our 7-column model) ----------
// Order matters: this drives the column layout in lane-funnel.jsx.
// qualify → develop → proposal → close (lost) → onboarding (won) → active → sleeping (finished)
export const STAGES = [
  { id: 'qualify',    label: 'Qualify',    hue: 220 },
  { id: 'develop',    label: 'Develop',    hue: 200 },
  { id: 'proposal',   label: 'Proposal',   hue: 260 },
  { id: 'close',      label: 'Close',      hue: 40 },
  { id: 'onboarding', label: 'Onboarding', hue: 150 },
  { id: 'active',     label: 'Active',     hue: 140 },
  { id: 'sleeping',   label: 'Sleeping',   hue: 270 },
];

// Stage → win-probability (%). Single source of truth; applied on every
// stage move (and lead→opp promote) via stageUpdates, and used for the
// weighted pipeline. Edit these numbers to retune the funnel.
export const STAGE_PROBABILITY = {
  qualify:    20,
  develop:    40,
  proposal:   60,
  close:       0,
  onboarding: 80,
  active:    100,
  sleeping:  100,
};

// Convert a drop-target stage back to Supabase updates.
// Handles all 7 BD stages with the correct combination of stage / sub_status
// / status / status_reason fields. NOTE: 'leads' has no `stage` column, so
// any drop targeting onboarding/active/sleeping on a lead must be intercepted
// upstream by the lead→opportunity auto-promote in doMove (see commit 3).
export function stageUpdates(targetStage, dealTable) {
  const updates = {};
  const isOpp = dealTable === 'opportunities';

  if (targetStage === 'sleeping') {
    // Completed-won project, parked but revivable
    updates.stage = 'past';
    updates.sub_status = null;
    updates.status = 'Won';
    updates.status_reason = null;
  } else if (targetStage === 'close') {
    // Closed-lost
    updates.sub_status = 'close';
    updates.status = 'Lost';
    if (isOpp) updates.stage = 'past';
  } else if (['onboarding', 'active'].includes(targetStage)) {
    // Existing-customer / new project secured. The deal stays in the active (or
    // onboarding) funnel column — the funnel keys off `stage`, not `status` — but
    // we also record it as a Won deal with a close (won) date of today, so it
    // shows up in the quarterly won + new/recurring reporting (which counts
    // status='Won' placed by close_date). The date is editable afterwards.
    updates.stage = targetStage;
    updates.sub_status = null;
    if (isOpp) {
      updates.status = 'Won';
      updates.status_reason = null;
      const today = new Date().toISOString().slice(0, 10);
      updates.close_date = today;
      updates.actual_close_date = today;
    }
  } else {
    // qualify / develop / proposal
    updates.sub_status = targetStage;
    if (isOpp) {
      updates.stage = 'opportunity';
      updates.status = null;
      updates.status_reason = null;
    }
  }
  // Stage-driven win probability (applies to both leads and opportunities).
  if (STAGE_PROBABILITY[targetStage] !== undefined) {
    updates.probability = STAGE_PROBABILITY[targetStage];
  }
  return updates;
}
