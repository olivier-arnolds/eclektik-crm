import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { getFlag, avatarColorFromName, getInitials } from '../lib/constants'

// Transform a Supabase company row into the shape the BD Dashboard expects
function adaptCompany(row) {
  const ac = avatarColorFromName(row.name)
  return {
    ...row,
    id: row.id,
    name: row.name || '',
    type: row.type || 'Klant',
    flag: getFlag(row.country),
    city: row.address || row.city || '',
    country: row.country || '',
    industry: row.industry || '',
    website: row.website || '',
    size: row.size || '',
    since: row.created_at ? new Date(row.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : '',
    avatarBg: ac.bg,
    avatarColor: ac.color,
  }
}

// Transform a Supabase contact row
function adaptContact(row, companies) {
  // Build name from first + last when available; fall back to full_name.
  // This keeps consistent "Firstname Lastname" formatting across imports
  // (Dynamics exports sometimes have odd spacing/casing in full_name).
  const built = `${row.first_name || ''} ${row.last_name || ''}`.trim()
  const name = built || row.full_name || ''
  const ac = avatarColorFromName(name)
  return {
    ...row,
    id: row.id,
    name,
    accountId: row.company_id,
    role: row.title || '',
    initials: getInitials(name),
    avatarBg: ac.bg,
    avatarColor: ac.color,
    email: row.email || '',
    source: row.event_source || '',
    isPrimary: !!row.is_primary,
  }
}

// Supabase may return product_line as string OR text[] array.
// Normalize to a comma-separated string so downstream .split() is safe.
function normalizeProductLine(v) {
  if (Array.isArray(v)) return v.filter(Boolean).join(', ')
  return v || ''
}

// Transform a lead row into pipeline item shape
function adaptLead(row) {
  return {
    id: row.id,
    funnelStage: 'lead',
    subStatus: row.sub_status || row.status || 'qualify',
    sortDate: (row.updated_at || row.created_at || '').split('T')[0],
    title: row.full_name || row.topic || 'Untitled lead',
    accountId: row.company_id,
    contactIds: row.contact_id ? [row.contact_id] : [],
    partnerIds: [],
    value: row.est_revenue || 0,
    owner: row.owner || '',
    team: row.team || '',
    probability: row.probability || 0,
    closeDate: row.close_date || '',
    productLine: normalizeProductLine(row.product_line),
    source: row.source || '',
    notes: row.notes || row.description || '',
    documents: [],
    timeline: [],
  }
}

// Transform an opportunity row into pipeline item shape
function adaptOpportunity(row) {
  const stage = row.stage || 'opportunity'
  const isProject = ['onboarding', 'active', 'inactive', 'past'].includes(stage)
  return {
    id: row.id,
    funnelStage: stage,
    subStatus: row.sub_status || (isProject ? null : 'qualify'),
    sortDate: (row.updated_at || row.created_at || '').split('T')[0],
    title: row.topic || 'Untitled',
    accountId: row.company_id,
    contactIds: row.contact_id ? [row.contact_id] : [],
    partnerIds: [],
    value: row.est_revenue || row.actual_revenue || 0,
    owner: row.owner || '',
    team: row.team || '',
    probability: row.probability || 0,
    closeDate: row.close_date || row.est_close_date || '',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    productLine: normalizeProductLine(row.product_line),
    status: row.status || '',
    statusReason: row.status_reason || '',
    notes: row.notes || '',
    documents: [],
    timeline: [],
  }
}

// Transform a follow-up row
function adaptFollowUp(row) {
  const daysAgo = row.due_date
    ? Math.max(0, Math.floor((Date.now() - new Date(row.due_date).getTime()) / 86400000))
    : 0
  return {
    id: row.id,
    itemIds: [row.opportunity_id, row.lead_id].filter(Boolean),
    contactId: row.contact_id,
    type: 'email',
    subject: row.title || '',
    sentDate: row.due_date || '',
    daysWithoutReply: row.status === 'pending' ? daysAgo : 0,
    pepPriority: row.priority || 'schedule',
    status: row.status === 'replied' || row.status === 'done' ? 'replied' : 'no-reply',
    replyDate: row.status === 'replied' ? row.updated_at?.split('T')[0] : null,
    note: row.description || '',
  }
}

// Transform a task row
function adaptTask(row) {
  const isOverdue = row.due_date && row.status !== 'done' && new Date(row.due_date) < new Date()
  const dueLabel = row.due_date
    ? (row.status === 'done' ? `Done ${row.due_date}` : `Due ${new Date(row.due_date).toLocaleDateString('en', { day: 'numeric', month: 'short' })}`)
    : ''
  return {
    id: row.id,
    itemIds: [row.opportunity_id, row.lead_id].filter(Boolean),
    company_id: row.company_id,
    text: row.title || '',
    due: dueLabel,
    dueDate: row.due_date || '',
    overdue: isOverdue,
    done: row.status === 'done',
  }
}

// Transform a comm row
function adaptComm(row) {
  const channelIcons = { email: '✉', teams: '◎', linkedin: '◈', phone: '☎', other: '◆' }
  const ac = avatarColorFromName(row.owner || 'Unknown')
  return {
    id: row.id,
    itemIds: [row.opportunity_id, row.lead_id].filter(Boolean),
    icon: channelIcons[row.channel] || '✉',
    bg: ac.bg,
    tc: ac.color,
    from: row.owner || 'Unknown',
    sub: row.subject || '',
    time: row.sent_at ? new Date(row.sent_at).toLocaleDateString('en', { day: 'numeric', month: 'short' }) : '',
    unread: !row.is_read,
    date: row.sent_at || row.created_at || '',
  }
}

// Transform a calendar event row
function adaptCalEvent(row) {
  const d = row.start_at ? new Date(row.start_at) : new Date()
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const dateLabel = isToday
    ? `Today, ${d.toLocaleDateString('en', { day: 'numeric', month: 'short' })}`
    : d.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
  const endTime = row.end_at ? new Date(row.end_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
  return {
    id: row.id,
    itemIds: [row.opportunity_id, row.lead_id].filter(Boolean),
    date: row.start_at?.split('T')[0] || '',
    dateLabel,
    title: row.title || '',
    time: `${d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}${endTime ? ' – ' + endTime : ''}`,
    who: row.attendees || row.owner || '',
    color: '#378ADD',
  }
}

export function usePipelineData() {
  const [accounts, setAccounts] = useState([])
  const [contacts, setContacts] = useState([])
  const [allItems, setAllItems] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [tasks, setTasks] = useState([])
  const [comms, setComms] = useState([])
  const [calEvents, setCalEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [
      { data: companiesRaw },
      { data: contactsRaw },
      { data: leadsRaw },
      { data: oppsRaw },
      { data: followUpsRaw },
      { data: tasksRaw },
      { data: commsRaw },
      { data: calRaw },
    ] = await Promise.all([
      supabase.from('companies').select('*').limit(1000),
      supabase.from('contacts').select('*').limit(1000),
      supabase.from('leads').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('opportunities').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('follow_ups').select('*').order('due_date', { ascending: false }).limit(500),
      supabase.from('tasks').select('*').order('due_date', { ascending: false }).limit(500),
      supabase.from('comms').select('*').order('sent_at', { ascending: false }).limit(1000),
      supabase.from('calendar_events').select('*').order('start_at', { ascending: false }).limit(500),
    ])

    const adaptedAccounts = (companiesRaw || []).map(adaptCompany)
    const adaptedContacts = (contactsRaw || []).map(c => adaptContact(c, adaptedAccounts))

    const leadItems = (leadsRaw || []).map(adaptLead)
    const oppItems = (oppsRaw || []).map(adaptOpportunity)
    const items = [...leadItems, ...oppItems]

    setAccounts(adaptedAccounts)
    setContacts(adaptedContacts)
    setAllItems(items)
    setFollowUps((followUpsRaw || []).map(adaptFollowUp))
    setTasks((tasksRaw || []).map(adaptTask))
    setComms((commsRaw || []).map(adaptComm))
    setCalEvents((calRaw || []).map(adaptCalEvent))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return {
    accounts,
    contacts,
    allItems,
    followUps,
    tasks,
    comms,
    calEvents,
    loading,
    refetch: fetchAll,
  }
}
