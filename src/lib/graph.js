const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// Local timezone for calendar events — Graph returns times in this zone
// when we send the Prefer header, avoiding UTC-shift bugs.
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Amsterdam';

export async function graphGet(endpoint, extraHeaders) {
  const token = localStorage.getItem('graph_token');
  if (!token) return null;
  try {
    const resp = await fetch(GRAPH_BASE + endpoint, {
      headers: { 'Authorization': 'Bearer ' + token, ...(extraHeaders || {}) }
    });
    if (resp.status === 401) {
      localStorage.removeItem('graph_token');
      return null;
    }
    return resp.json();
  } catch (e) {
    console.error('Graph API error:', e);
    return null;
  }
}

export async function getCalendarEvents(daysAhead = 14) {
  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 86400000);
  return getCalendarEventsRange(now.toISOString(), end.toISOString());
}

export async function getCalendarEventsRange(startISO, endISO) {
  // Use /me/calendar/calendarView (PRIMARY calendar only) — avoids pulling in
  // Birthdays, Dutch Holidays, or any secondary calendars the user has.
  // Ask Graph to return times in our local timezone so we don't have to
  // guess offsets.
  const tzHeaders = { 'Prefer': `outlook.timezone="${LOCAL_TZ}"` };
  let all = [];
  let url = `/me/calendar/calendarView?startDateTime=${encodeURIComponent(startISO)}&endDateTime=${encodeURIComponent(endISO)}&$top=500&$orderby=start/dateTime&$select=id,subject,start,end,location,attendees,isOnlineMeeting,onlineMeetingUrl,isAllDay,body,bodyPreview,showAs,sensitivity,categories`;
  let safety = 0;
  while (url && safety < 20) {
    const data = await graphGet(url, tzHeaders);
    if (!data?.value) break;
    all = all.concat(data.value);
    const next = data['@odata.nextLink'];
    if (!next) break;
    url = next.replace(/^https:\/\/graph\.microsoft\.com\/v1\.0/, '');
    safety++;
  }
  return all.map(e => {
    // When the Prefer header is set, Graph returns the requested timezone in the response.
    // Treat dateTime as local time (no Z suffix).
    const startLocal = e.start?.dateTime;
    const endLocal = e.end?.dateTime;
    return {
      id: e.id,
      title: e.subject || 'Untitled',
      // Store as local ISO-like string (no timezone marker) — consumer should parse without UTC
      startAt: startLocal,
      endAt: endLocal,
      startTimeZone: e.start?.timeZone || LOCAL_TZ,
      endTimeZone: e.end?.timeZone || LOCAL_TZ,
      location: e.location?.displayName || (e.isOnlineMeeting ? 'Teams meeting' : ''),
      attendees: (e.attendees || []).map(a => a.emailAddress?.name || a.emailAddress?.address).join(', '),
      attendeesEmails: (e.attendees || []).map(a => a.emailAddress?.address).filter(Boolean),
      isOnline: e.isOnlineMeeting,
      meetingUrl: e.onlineMeetingUrl,
      isAllDay: !!e.isAllDay,
      bodyPreview: e.bodyPreview || '',
      bodyHtml: e.body?.content || '',
      bodyType: e.body?.contentType || 'html',
      showAs: e.showAs,
      sensitivity: e.sensitivity,
      categories: e.categories || [],
    };
  });
}

export async function deleteCalendarEvent(eventId) {
  const token = localStorage.getItem('graph_token');
  if (!token) throw new Error('No Microsoft token. Please reconnect.');
  const resp = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token },
  });
  if (resp.status === 204 || resp.ok) return { success: true };
  if (resp.status === 401) { localStorage.removeItem('graph_token'); throw new Error('Token expired'); }
  let msg = 'Delete failed';
  try { const data = await resp.json(); msg = data?.error?.message || msg; } catch {}
  throw new Error(msg);
}

export async function createCalendarEvent({ subject, startTime, endTime, attendeeEmails, body, isOnline }) {
  const token = localStorage.getItem('graph_token');
  if (!token) return { error: 'No token' };
  try {
    const resp = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        start: { dateTime: startTime, timeZone: 'Europe/Amsterdam' },
        end: { dateTime: endTime, timeZone: 'Europe/Amsterdam' },
        attendees: (attendeeEmails || []).map(e => ({ emailAddress: { address: e }, type: 'required' })),
        body: body ? { contentType: 'Text', content: body } : undefined,
        isOnlineMeeting: isOnline ?? true,
      })
    });
    if (resp.ok) { const data = await resp.json(); return { success: true, data }; }
    if (resp.status === 401) { localStorage.removeItem('graph_token'); return { error: 'Token expired' }; }
    const err = await resp.json();
    return { error: err?.error?.message || 'Creation failed' };
  } catch (e) { return { error: e.message }; }
}

export async function replyToEmail(messageId, body) {
  const token = localStorage.getItem('graph_token');
  if (!token) return { error: 'No token' };
  try {
    const resp = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}/reply`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { body: { contentType: 'Text', content: body } } })
    });
    if (resp.ok || resp.status === 202) return { success: true };
    if (resp.status === 401) { localStorage.removeItem('graph_token'); return { error: 'Token expired' }; }
    const err = await resp.json();
    return { error: err?.error?.message || 'Reply failed' };
  } catch (e) { return { error: e.message }; }
}

// Well-known folder names in Graph:
//   Inbox       — incoming
//   SentItems   — sent
//   Archive     — archived (may not exist if user never archived)
//   DeletedItems, Drafts, etc.
// Paginates via @odata.nextLink to go beyond Graph's 1000-per-request cap.
export async function getFolderEmails(folderName, limit = 500) {
  const select = 'id,subject,bodyPreview,from,toRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,parentFolderId';
  const pageSize = Math.min(limit, 1000);
  let url = `/me/mailFolders/${folderName}/messages?$top=${pageSize}&$orderby=receivedDateTime desc&$select=${select}`;
  let all = [];
  let safety = 0;
  while (url && all.length < limit && safety < 10) {
    const data = await graphGet(url);
    if (!data?.value) break;
    all = all.concat(data.value);
    const next = data['@odata.nextLink'];
    if (!next) break;
    // Feed only the path+query back to graphGet
    url = next.replace(/^https:\/\/graph\.microsoft\.com\/v1\.0/, '');
    safety++;
  }
  return all.slice(0, limit).map(m => ({
    id: m.id,
    subject: m.subject,
    bodyPreview: m.bodyPreview,
    from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || '',
    fromAddress: m.from?.emailAddress?.address || '',
    to: (m.toRecipients || []).map(r => r.emailAddress?.address).join(', '),
    toAddresses: (m.toRecipients || []).map(r => r.emailAddress?.address).filter(Boolean),
    date: m.receivedDateTime || m.sentDateTime,
    isRead: m.isRead,
    hasAttachments: m.hasAttachments,
    folder: folderName,
  }));
}

export async function getInboxEmails(limit = 500) {
  return getFolderEmails('Inbox', limit);
}

// Fetch Inbox + SentItems + Archive in parallel. Returns { inbox, sent, archived }.
// If Archive folder doesn't exist (user never archived), silently returns [].
export async function getAllMailFolders(limit = 500) {
  const [inboxResp, sentResp, archiveResp] = await Promise.allSettled([
    getFolderEmails('Inbox', limit),
    getFolderEmails('SentItems', limit),
    getFolderEmails('Archive', limit),
  ]);
  return {
    inbox: inboxResp.status === 'fulfilled' ? inboxResp.value : [],
    sent: sentResp.status === 'fulfilled' ? sentResp.value : [],
    archived: archiveResp.status === 'fulfilled' ? archiveResp.value : [],
  };
}

export async function getEmailAttachments(messageId) {
  const data = await graphGet(`/me/messages/${messageId}/attachments?$select=id,name,contentType,size,isInline`);
  if (!data?.value) return [];
  return data.value.map(a => ({
    id: a.id,
    name: a.name,
    contentType: a.contentType,
    size: a.size,
    isInline: a.isInline,
  }));
}

export async function getEmailsForContact(email, limit = 50) {
  if (!email) return [];
  const search = encodeURIComponent(`"${email}"`);
  const data = await graphGet(`/me/messages?$search=${search}&$top=200&$select=id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,isRead`);
  if (!data?.value) return [];
  const emailLower = email.toLowerCase();
  // Get my own email to determine direction
  const token = localStorage.getItem('graph_token');
  let myEmail = '';
  try {
    const meResp = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', { headers: { 'Authorization': 'Bearer ' + token } });
    const meData = await meResp.json();
    myEmail = (meData.mail || meData.userPrincipalName || '').toLowerCase();
  } catch (e) {}

  // Filter strictly:
  // 1. Contact is FROM (they sent it) AND I am in TO → inbound
  // 2. I am FROM (I sent it) AND contact is in TO → outbound
  return data.value
    .filter(m => {
      const fromAddr = (m.from?.emailAddress?.address || '').toLowerCase();
      const toAddrs = (m.toRecipients || []).map(r => (r.emailAddress?.address || '').toLowerCase());
      const contactIsSender = fromAddr === emailLower;
      const contactIsRecipient = toAddrs.includes(emailLower);
      const iAmSender = myEmail && fromAddr === myEmail;
      const iAmRecipient = myEmail && toAddrs.includes(myEmail);
      return (contactIsSender && iAmRecipient) || (iAmSender && contactIsRecipient);
    })
    .slice(0, limit)
    .map(m => ({
      id: m.id,
      subject: m.subject,
      bodyPreview: m.bodyPreview,
      bodyHtml: m.body?.content || '',
      bodyType: m.body?.contentType || 'text',
      from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || '',
      fromAddress: m.from?.emailAddress?.address || '',
      to: (m.toRecipients || []).map(r => r.emailAddress?.address).join(', '),
      date: m.receivedDateTime,
      isRead: m.isRead,
      direction: m.from?.emailAddress?.address?.toLowerCase() === emailLower ? 'inbound' : 'outbound',
    }));
}

// Get all Teams the user is a member of
export async function getMyTeams() {
  const data = await graphGet('/me/joinedTeams?$select=id,displayName,description');
  return data?.value || [];
}

// Get channels in a team
export async function getTeamChannels(teamId) {
  const data = await graphGet(`/teams/${teamId}/channels?$select=id,displayName,description`);
  return data?.value || [];
}

// Get recent messages in a channel (last 20)
export async function getChannelMessages(teamId, channelId, top = 20) {
  const data = await graphGet(`/teams/${teamId}/channels/${channelId}/messages?$top=${top}`);
  if (!data?.value) return [];
  return data.value.map(m => ({
    id: m.id,
    from: m.from?.user?.displayName || 'Unknown',
    body: m.body?.content || '',
    contentType: m.body?.contentType || 'text',
    date: m.createdDateTime,
    type: 'channel',
  }));
}

// Get 1:1 chats
export async function getMyChats(top = 30) {
  const data = await graphGet(`/me/chats?$top=${top}&$expand=members&$orderby=lastMessagePreview/createdDateTime desc`);
  if (!data?.value) return [];
  return data.value.map(c => ({
    id: c.id,
    topic: c.topic || c.members?.map(m => m.displayName).filter(n => n).join(', ') || 'Chat',
    lastMessage: c.lastMessagePreview?.body?.content || '',
    lastDate: c.lastMessagePreview?.createdDateTime || '',
    members: (c.members || []).map(m => m.displayName).filter(n => n),
    chatType: c.chatType,
  }));
}

// Fetch recent 1:1 and group chats as a flat list of "conversation threads",
// one row per chat with the latest message preview. For use in the Comms lane.
// Returns an array compatible with our email shape (folder, dir, from, etc.).
export async function getTeamsConversations(limit = 500) {
  const token = localStorage.getItem('graph_token');
  if (!token) return [];
  // Also need my email to determine direction (who sent the last message)
  let myEmail = '';
  let myId = '';
  try {
    const meResp = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,id', { headers: { 'Authorization': 'Bearer ' + token } });
    const meData = await meResp.json();
    myEmail = (meData.mail || meData.userPrincipalName || '').toLowerCase();
    myId = meData.id;
  } catch {}

  // Paginate: Graph caps $top at 50 for chats. Walk @odata.nextLink up to `limit`.
  const all = [];
  let page = await graphGet(`/me/chats?$top=50&$expand=members&$orderby=lastMessagePreview/createdDateTime desc`);
  while (page?.value?.length) {
    all.push(...page.value);
    if (all.length >= limit || !page['@odata.nextLink']) break;
    try {
      const next = await fetch(page['@odata.nextLink'], { headers: { 'Authorization': 'Bearer ' + token } });
      page = await next.json();
    } catch (e) { break; }
  }

  // Chats can be 'oneOnOne', 'group', or 'meeting'. Filter out meetings (those come through calendar).
  const chats = all.filter(c => c.chatType !== 'meeting');

  return chats.map(c => {
    const members = c.members || [];
    // Other-party members (exclude me)
    const others = members.filter(m => {
      const em = (m.email || '').toLowerCase();
      return em && em !== myEmail;
    });
    const otherNames = others.map(m => m.displayName).filter(Boolean);
    const otherEmails = others.map(m => (m.email || '').toLowerCase()).filter(Boolean);

    const preview = (c.lastMessagePreview?.body?.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    const lastFromId = c.lastMessagePreview?.from?.user?.id;
    const lastFromName = c.lastMessagePreview?.from?.user?.displayName || '';
    const iSent = !!(lastFromId && myId && lastFromId === myId);

    return {
      id: c.id,
      channel: 'teams',
      chatType: c.chatType,
      topic: c.topic || otherNames.join(', ') || 'Chat',
      // Use email-like shape for uniform rendering
      subject: c.topic || (others.length === 1 ? `Chat with ${otherNames[0] || 'Unknown'}` : `Group: ${otherNames.slice(0, 3).join(', ')}${otherNames.length > 3 ? '…' : ''}`),
      from: iSent ? 'You' : (lastFromName || otherNames[0] || 'Unknown'),
      fromAddress: iSent ? myEmail : (otherEmails[0] || ''),
      to: iSent ? otherEmails.join(', ') : myEmail,
      toAddresses: iSent ? otherEmails : (myEmail ? [myEmail] : []),
      bodyPreview: preview,
      date: c.lastMessagePreview?.createdDateTime || c.lastUpdatedDateTime || '',
      isRead: true, // Graph doesn't expose unread at chat level via basic scope
      dir: iSent ? 'out' : 'in',
      folder: 'Inbox', // Show Teams chats in Inbox by default (so channel=teams filter finds them)
      archived: false,
      // Extra context for matching
      participantEmails: [...otherEmails, myEmail].filter(Boolean),
    };
  });
}

// Fetch all team channels the user has access to and surface each channel
// as one 'conversation' row with the latest message preview. Requires the
// admin-consent scopes (Team.ReadBasic.All, Channel.ReadBasic.All,
// ChannelMessage.Read.All); without them, returns [].
export async function getTeamsChannelConversations() {
  const token = localStorage.getItem('graph_token');
  if (!token) return [];
  let myEmail = '';
  try {
    const r = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', { headers: { 'Authorization': 'Bearer ' + token } });
    const j = await r.json();
    myEmail = (j.mail || j.userPrincipalName || '').toLowerCase();
  } catch {}

  let teams;
  try {
    const t = await graphGet('/me/joinedTeams?$select=id,displayName');
    teams = t?.value || [];
  } catch (e) {
    console.warn('joinedTeams scope missing:', e?.message || e);
    return [];
  }

  const out = [];
  for (const team of teams) {
    let channels = [];
    try {
      const c = await graphGet(`/teams/${team.id}/channels?$select=id,displayName,description`);
      channels = c?.value || [];
    } catch (e) { continue; }

    for (const ch of channels) {
      // Newest message preview
      let last = null;
      try {
        const m = await graphGet(`/teams/${team.id}/channels/${ch.id}/messages?$top=1`);
        last = m?.value?.[0] || null;
      } catch (e) { /* skip channels without read */ }
      const preview = last ? (last.body?.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) : '';
      const fromName = last?.from?.user?.displayName || '';
      out.push({
        id: `channel:${team.id}:${ch.id}`,
        teamId: team.id,
        channelId: ch.id,
        channel: 'teams',
        chatType: 'channel',
        topic: `${team.displayName} / ${ch.displayName}`,
        subject: `${team.displayName} / ${ch.displayName}`,
        from: fromName || team.displayName,
        fromAddress: '',
        to: '',
        toAddresses: [],
        bodyPreview: preview,
        date: last?.createdDateTime || last?.lastModifiedDateTime || '',
        isRead: true,
        dir: 'in',
        folder: 'Inbox',
        archived: false,
        participantEmails: myEmail ? [myEmail] : [],
      });
    }
  }
  return out;
}

// Get messages in a chat (1:1 / group) OR in a team channel.
// For channels, pass the synthetic 'channel:teamId:channelId' id we generate
// in getTeamsChannelConversations. For channels, replies (threaded answers)
// are fetched and inlined under each top-level message.
export async function getChatMessages(chatId, max = 200) {
  const token = localStorage.getItem('graph_token');
  const isChannel = chatId.startsWith('channel:');
  const baseUrl = isChannel
    ? (() => { const [, teamId, channelId] = chatId.split(':'); return `/teams/${teamId}/channels/${channelId}/messages?$top=50`; })()
    : `/me/chats/${chatId}/messages?$top=50`;

  // Paginate top-level messages
  const all = [];
  let page = await graphGet(baseUrl);
  while (page?.value?.length) {
    all.push(...page.value);
    if (all.length >= max || !page['@odata.nextLink']) break;
    try {
      const r = await fetch(page['@odata.nextLink'], { headers: { 'Authorization': 'Bearer ' + token } });
      page = await r.json();
    } catch (e) { break; }
  }

  // For channels, fetch replies for each top-level message (in batches of 5)
  if (isChannel) {
    const [, teamId, channelId] = chatId.split(':');
    const concurrency = 5;
    const withReplies = [];
    for (let i = 0; i < all.length; i += concurrency) {
      const slice = all.slice(i, i + concurrency);
      const replies = await Promise.all(slice.map(async m => {
        try {
          const r = await graphGet(`/teams/${teamId}/channels/${channelId}/messages/${m.id}/replies?$top=50`);
          return r?.value || [];
        } catch { return []; }
      }));
      slice.forEach((m, idx) => withReplies.push(m, ...replies[idx]));
    }
    // Channel API returns parents newest-first; sort everything by createdDateTime asc
    return withReplies
      .map(m => ({
        id: m.id,
        from: m.from?.user?.displayName || 'Unknown',
        body: m.body?.content || '',
        contentType: m.body?.contentType || 'text',
        date: m.createdDateTime,
        type: 'chat',
      }))
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }

  // Plain chat: just map (caller already reverses for chronological order)
  return all.map(m => ({
    id: m.id,
    from: m.from?.user?.displayName || 'Unknown',
    body: m.body?.content || '',
    contentType: m.body?.contentType || 'text',
    date: m.createdDateTime,
    type: 'chat',
  }));
}

export async function sendEmail({ to, subject, body, cc, isHtml = true }) {
  const token = localStorage.getItem('graph_token');
  if (!token) throw new Error('No Microsoft token. Please reconnect.');

  // Normalize to + cc to arrays of email strings
  const toArr = Array.isArray(to) ? to : (to || '').split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const ccArr = Array.isArray(cc) ? cc : (cc ? (cc || '').split(/[,;]/).map(s => s.trim()).filter(Boolean) : []);

  const resp = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: isHtml ? 'HTML' : 'Text', content: body },
        toRecipients: toArr.map(addr => ({ emailAddress: { address: addr } })),
        ...(ccArr.length ? { ccRecipients: ccArr.map(addr => ({ emailAddress: { address: addr } })) } : {})
      }
    })
  });
  if (resp.status === 202 || resp.ok) return { success: true };
  if (resp.status === 401) { localStorage.removeItem('graph_token'); throw new Error('Token expired. Please reconnect.'); }
  let msg = 'Sending failed';
  try { const data = await resp.json(); msg = data?.error?.message || msg; } catch {}
  throw new Error(msg);
}
