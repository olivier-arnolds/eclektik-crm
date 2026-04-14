const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export async function graphGet(endpoint) {
  const token = localStorage.getItem('graph_token');
  if (!token) return null;
  try {
    const resp = await fetch(GRAPH_BASE + endpoint, {
      headers: { 'Authorization': 'Bearer ' + token }
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
  const startStr = now.toISOString();
  const endStr = end.toISOString();
  const data = await graphGet(`/me/calendarView?startDateTime=${startStr}&endDateTime=${endStr}&$top=50&$orderby=start/dateTime&$select=id,subject,start,end,location,attendees,isOnlineMeeting,onlineMeetingUrl`);
  if (!data?.value) return [];
  return data.value.map(e => ({
    id: e.id,
    title: e.subject || 'Untitled',
    startAt: e.start?.dateTime,
    endAt: e.end?.dateTime,
    location: e.location?.displayName || (e.isOnlineMeeting ? 'Teams meeting' : ''),
    attendees: (e.attendees || []).map(a => a.emailAddress?.name || a.emailAddress?.address).join(', '),
    isOnline: e.isOnlineMeeting,
    meetingUrl: e.onlineMeetingUrl,
  }));
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

// Get messages in a chat
export async function getChatMessages(chatId, top = 20) {
  const data = await graphGet(`/me/chats/${chatId}/messages?$top=${top}`);
  if (!data?.value) return [];
  return data.value.map(m => ({
    id: m.id,
    from: m.from?.user?.displayName || 'Unknown',
    body: m.body?.content || '',
    contentType: m.body?.contentType || 'text',
    date: m.createdDateTime,
    type: 'chat',
  }));
}

export async function sendEmail({ to, subject, body, cc }) {
  const token = localStorage.getItem('graph_token');
  if (!token) return { error: 'No token' };
  try {
    const resp = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'Text', content: body },
          toRecipients: [{ emailAddress: { address: to } }],
          ...(cc ? { ccRecipients: [{ emailAddress: { address: cc } }] } : {})
        }
      })
    });
    if (resp.status === 202 || resp.ok) return { success: true };
    if (resp.status === 401) { localStorage.removeItem('graph_token'); return { error: 'Token expired' }; }
    const data = await resp.json();
    return { error: data?.error?.message || 'Sending failed' };
  } catch (e) {
    return { error: e.message };
  }
}
