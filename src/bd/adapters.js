// Adapter functions: map Supabase rows (via usePipelineData) to the shape the BD lanes expect.

// Owner: our DB stores owner as name string; BD uses MVG/OA/YK codes.
const OWNER_ID = { 'Marco van Gelder': 'MVG', 'Olivier Arnolds': 'OA', 'Yasmine Karkach': 'YK' };
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
// BD display stage: qualify/develop/proposal/close/onboarding/active (6 columns)
export function adaptDeal(item, rawAccounts, rawContacts) {
  const acc = (rawAccounts || []).find(a => a.id === item.accountId);
  const contact = (rawContacts || []).find(c => item.contactIds?.includes(c.id));

  let stage;
  if (['onboarding', 'active'].includes(item.funnelStage)) stage = item.funnelStage;
  else if (['inactive', 'past'].includes(item.funnelStage)) stage = 'close'; // treat closed as end-of-pipeline
  else stage = item.subStatus || 'qualify';

  return {
    id: item.id,
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
    staleDays: item.sortDate ? Math.floor((Date.now() - new Date(item.sortDate).getTime()) / 86400000) : 0,
    dealType: item.productLine || '',
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
  };
}

// ---------- Contact ----------
export function adaptContact(row, adaptedAccounts) {
  const acc = (adaptedAccounts || []).find(a => a.id === row.accountId);
  return {
    id: row.id,
    name: row.name || '',
    role: row.role || '',
    account: acc?.name || '',
    accountId: row.accountId,
    email: row.email || '',
    phone: row.phone || '',
    avatarBg: row.avatarBg,
    avatarColor: row.avatarColor,
    initials: row.initials,
  };
}

// ---------- Comm ----------
// Raw comm from adaptComm in usePipelineData: { id, icon, from, sub, time, unread, date, itemIds }
export function adaptComm(row, rawItems, rawAccounts) {
  const item = (rawItems || []).find(i => row.itemIds?.includes(i.id));
  const acc = item ? (rawAccounts || []).find(a => a.id === item.accountId) : null;
  const channel = row.icon === '◈' ? 'linkedin' : row.icon === '◎' ? 'teams' : row.icon === '☎' ? 'phone' : 'email';
  return {
    id: row.id,
    channel,
    dir: row.dir || 'in',
    from: row.from || '',
    subject: row.sub || '',
    preview: row.preview || '',
    unread: !!row.unread,
    ts: row.date,
    account: acc?.name || '',
    accountId: acc?.id,
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
    owner: ownerIdFromName(item?.owner),
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

// ---------- Stage definitions (our 6-column model) ----------
export const STAGES = [
  { id: 'qualify',    label: 'Qualify',    hue: 220 },
  { id: 'develop',    label: 'Develop',    hue: 200 },
  { id: 'proposal',   label: 'Proposal',   hue: 260 },
  { id: 'close',      label: 'Close',      hue: 40 },
  { id: 'onboarding', label: 'Onboarding', hue: 150 },
  { id: 'active',     label: 'Active',     hue: 140 },
];

// Convert a drop-target stage back to Supabase updates
export function stageUpdates(targetStage, dealTable) {
  const updates = {};
  if (['onboarding', 'active'].includes(targetStage)) {
    updates.stage = targetStage;
    updates.sub_status = null;
  } else {
    updates.sub_status = targetStage;
    if (dealTable === 'opportunities') updates.stage = 'opportunity';
  }
  return updates;
}
