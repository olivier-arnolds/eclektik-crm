import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabase';
import { graphGet } from '../../lib/graph';
import ComposeEmail from '../forms/ComposeEmail';
import LinkedInCompose from '../forms/LinkedInCompose';

const CHANNELS = [
  { key: 'all',      label: 'All',      color: '#2C2C2A', bg: '#F1EFE8' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2', bg: '#E8F1FC' },
  { key: 'email',    label: 'Email',    color: '#1D9E75', bg: '#E1F5EE' },
  { key: 'teams',    label: 'Teams',    color: '#7C5CFC', bg: '#EEEBFE' },
];

const CHANNEL_ICONS = { linkedin: '\u25C8', email: '\u2709', teams: '\u25CE' };
const CHANNEL_COLORS = {
  linkedin: { bg: '#E8F1FC', color: '#0A66C2' },
  email:    { bg: '#E1F5EE', color: '#1D9E75' },
  teams:    { bg: '#EEEBFE', color: '#7C5CFC' },
};

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return diffMin + 'm ago';
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + 'h ago';
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return diffDay + 'd ago';
  return d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
}

function deduplicateMessages(messages) {
  const seen = new Set();
  return messages.filter(m => {
    // Prefer external_id for dedup, fallback to content+timestamp
    const key = m.externalId || (m.subject + '|' + m.body?.slice(0, 80) + '|' + m.date);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function UnifiedInbox({ contacts, accounts, onSwitchMode }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [composeEmail, setComposeEmail] = useState(null);
  const [composeLinkedIn, setComposeLinkedIn] = useState(null);

  // Match a contact by email address
  const matchContactByEmail = useCallback((emailAddr) => {
    if (!emailAddr || !contacts) return null;
    const lower = emailAddr.toLowerCase();
    return contacts.find(c => c.email && c.email.toLowerCase() === lower) || null;
  }, [contacts]);

  // Match a contact by name
  const matchContactByName = useCallback((name) => {
    if (!name || !contacts) return null;
    const lower = name.toLowerCase().trim();
    return contacts.find(c => c.name && c.name.toLowerCase().trim() === lower) || null;
  }, [contacts]);

  // Get account name for a contact
  const getAccountName = useCallback((contactId) => {
    if (!contactId || !contacts || !accounts) return '';
    const contact = contacts.find(c => c.id === contactId);
    if (!contact?.accountId) return '';
    const account = accounts.find(a => a.id === contact.accountId);
    return account?.name || '';
  }, [contacts, accounts]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const allMessages = [];

    // 1. Fetch comms from Supabase
    try {
      const { data: commsData } = await supabase
        .from('comms')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(200);

      if (commsData) {
        commsData.forEach(row => {
          const contact = row.contact_id ? contacts?.find(c => c.id === row.contact_id) : null;
          const contactByName = !contact && row.owner ? matchContactByName(row.owner) : null;
          const matched = contact || contactByName;
          allMessages.push({
            id: 'comms-' + row.id,
            externalId: row.external_id || null,
            channel: row.channel || 'email',
            direction: row.direction || 'inbound',
            contactName: matched?.name || row.owner || 'Unknown',
            companyName: matched ? getAccountName(matched.id) : '',
            contactId: matched?.id || row.contact_id || null,
            contactEmail: matched?.email || null,
            contactLinkedin: matched?.linkedin || null,
            subject: row.subject || '',
            body: row.body || row.subject || '',
            date: row.sent_at || row.created_at || '',
            isRead: row.is_read !== false,
          });
        });
      }
    } catch (e) {
      console.error('Error fetching comms:', e);
    }

    // 2. Fetch activity entries that are message-like
    try {
      const { data: activityData } = await supabase
        .from('activity')
        .select('*')
        .or('type.ilike.%email%,type.ilike.%linkedin%,type.ilike.%message%')
        .order('created_at', { ascending: false })
        .limit(100);

      if (activityData) {
        activityData.forEach(row => {
          const contact = row.contact_id ? contacts?.find(c => c.id === row.contact_id) : null;
          const channel = (row.type || '').toLowerCase().includes('linkedin') ? 'linkedin'
            : (row.type || '').toLowerCase().includes('teams') ? 'teams' : 'email';
          allMessages.push({
            id: 'activity-' + row.id,
            externalId: row.external_id || null,
            channel,
            direction: row.direction || 'outbound',
            contactName: contact?.name || row.contact_name || row.owner || 'Unknown',
            companyName: contact ? getAccountName(contact.id) : '',
            contactId: contact?.id || row.contact_id || null,
            contactEmail: contact?.email || null,
            contactLinkedin: contact?.linkedin || null,
            subject: row.title || row.subject || '',
            body: row.description || row.body || row.title || '',
            date: row.created_at || '',
            isRead: true,
          });
        });
      }
    } catch (e) {
      console.error('Error fetching activity:', e);
    }

    // 3. Fetch emails from Microsoft Graph
    try {
      const graphData = await graphGet('/me/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead');
      if (graphData?.value) {
        // Get own email for direction
        let myEmail = '';
        try {
          const meData = await graphGet('/me?$select=mail,userPrincipalName');
          myEmail = (meData?.mail || meData?.userPrincipalName || '').toLowerCase();
        } catch (e) {}

        graphData.value.forEach(m => {
          const fromAddr = m.from?.emailAddress?.address || '';
          const fromName = m.from?.emailAddress?.name || fromAddr;
          const isOutbound = myEmail && fromAddr.toLowerCase() === myEmail;
          const senderEmail = isOutbound
            ? (m.toRecipients?.[0]?.emailAddress?.address || '')
            : fromAddr;
          const senderName = isOutbound
            ? (m.toRecipients?.[0]?.emailAddress?.name || senderEmail)
            : fromName;

          const matched = matchContactByEmail(senderEmail) || matchContactByName(senderName);

          allMessages.push({
            id: 'graph-' + m.id,
            externalId: m.id,
            channel: 'email',
            direction: isOutbound ? 'outbound' : 'inbound',
            contactName: matched?.name || senderName,
            companyName: matched ? getAccountName(matched.id) : '',
            contactId: matched?.id || null,
            contactEmail: senderEmail || matched?.email || null,
            contactLinkedin: null,
            subject: m.subject || '',
            body: m.bodyPreview || '',
            date: m.receivedDateTime || '',
            isRead: m.isRead !== false,
            graphMessageId: m.id,
          });
        });
      }
    } catch (e) {
      console.error('Error fetching Graph emails:', e);
    }

    // Deduplicate, sort newest first
    const deduped = deduplicateMessages(allMessages);
    deduped.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    setMessages(deduped);
    setLoading(false);
  }, [contacts, accounts, matchContactByEmail, matchContactByName, getAccountName]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Filtered + searched messages
  const filtered = useMemo(() => {
    let list = messages;
    if (channelFilter !== 'all') {
      list = list.filter(m => m.channel === channelFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        (m.contactName || '').toLowerCase().includes(q) ||
        (m.subject || '').toLowerCase().includes(q) ||
        (m.body || '').toLowerCase().includes(q) ||
        (m.companyName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [messages, channelFilter, searchQuery]);

  const unreadCount = messages.filter(m => !m.isRead).length;

  const handleReply = (msg) => {
    if (msg.channel === 'email' && msg.contactEmail) {
      setComposeEmail({
        contactEmail: msg.contactEmail,
        replySubject: msg.subject ? 'Re: ' + msg.subject.replace(/^Re:\s*/i, '') : '',
      });
    } else if (msg.channel === 'linkedin') {
      setComposeLinkedIn({
        contactName: msg.contactName,
        linkedinUrl: msg.contactLinkedin || '',
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FFFFFF' }}>
      {/* Header */}
      <div style={{ padding: '18px 24px 0', borderBottom: '0.5px solid #D3D1C7', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#2C2C2A' }}>Inbox</h2>
          {unreadCount > 0 && (
            <span style={{ background: '#378ADD', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>
              {unreadCount}
            </span>
          )}
        </div>

        {/* Channel filter buttons */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {CHANNELS.map(ch => {
            const isActive = channelFilter === ch.key;
            return (
              <button
                key={ch.key}
                onClick={() => setChannelFilter(ch.key)}
                style={{
                  padding: '5px 14px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
                  border: '0.5px solid', fontFamily: 'inherit', fontWeight: isActive ? 500 : 400,
                  borderColor: isActive ? ch.color : '#D3D1C7',
                  background: isActive ? ch.bg : 'transparent',
                  color: isActive ? ch.color : '#888780',
                }}
              >
                {ch.label}
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search by name, subject, or content..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 32px', fontSize: 12,
              border: '0.5px solid #D3D1C7', borderRadius: 7,
              background: '#F1EFE8', color: '#2C2C2A', outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#888780' }}>
            {'\u2315'}
          </span>
        </div>
      </div>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 12px' }}>
        {loading && (
          <div style={{ padding: 32, textAlign: 'center', color: '#888780', fontSize: 13 }}>
            Loading messages...
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#888780', fontSize: 13 }}>
            No messages found
          </div>
        )}
        {filtered.map(msg => {
          const isExpanded = expandedId === msg.id;
          const chColor = CHANNEL_COLORS[msg.channel] || CHANNEL_COLORS.email;

          return (
            <div
              key={msg.id}
              onClick={() => setExpandedId(isExpanded ? null : msg.id)}
              style={{
                padding: '12px 24px',
                borderBottom: '0.5px solid #F1EFE8',
                cursor: 'pointer',
                background: isExpanded ? '#FAFAF7' : (!msg.isRead ? '#F8F9FD' : 'transparent'),
                transition: 'background 0.15s',
              }}
            >
              {/* Message header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Unread dot */}
                <div style={{ width: 6, flexShrink: 0 }}>
                  {!msg.isRead && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#378ADD' }} />
                  )}
                </div>

                {/* Channel icon */}
                <span style={{ fontSize: 14, flexShrink: 0, width: 18, textAlign: 'center' }}>
                  {CHANNEL_ICONS[msg.channel] || '\u2709'}
                </span>

                {/* Direction arrow */}
                <span style={{ fontSize: 12, flexShrink: 0, color: msg.direction === 'inbound' ? '#1D9E75' : '#888780' }}>
                  {msg.direction === 'inbound' ? '\u2199' : '\u2197'}
                </span>

                {/* Contact name + company */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: msg.isRead ? 400 : 600, color: '#2C2C2A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {msg.contactName}
                  </span>
                  {msg.companyName && (
                    <span style={{ fontSize: 11, color: '#888780', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {msg.companyName}
                    </span>
                  )}
                </div>

                {/* Channel badge */}
                <span style={{
                  fontSize: 9, padding: '1px 7px', borderRadius: 8, fontWeight: 500,
                  background: chColor.bg, color: chColor.color, flexShrink: 0,
                }}>
                  {msg.channel}
                </span>

                {/* Timestamp */}
                <span style={{ fontSize: 11, color: '#888780', flexShrink: 0, minWidth: 55, textAlign: 'right' }}>
                  {relativeTime(msg.date)}
                </span>
              </div>

              {/* Subject / preview */}
              <div style={{
                fontSize: 12, color: '#5F5E5A', marginTop: 4, paddingLeft: 30,
                whiteSpace: isExpanded ? 'normal' : 'nowrap',
                overflow: isExpanded ? 'visible' : 'hidden',
                textOverflow: isExpanded ? 'unset' : 'ellipsis',
              }}>
                {msg.subject || msg.body}
              </div>

              {/* Expanded body + reply */}
              {isExpanded && (
                <div style={{ marginTop: 10, paddingLeft: 30 }}>
                  {msg.body && msg.body !== msg.subject && (
                    <div style={{
                      fontSize: 12, color: '#2C2C2A', lineHeight: 1.6,
                      background: '#F1EFE8', borderRadius: 7, padding: '10px 14px',
                      marginBottom: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {msg.body}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(msg.channel === 'email' && msg.contactEmail) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReply(msg); }}
                        style={{
                          padding: '5px 14px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                          border: '0.5px solid #378ADD', background: '#E6F1FB', color: '#0C447C',
                          fontFamily: 'inherit', fontWeight: 500,
                        }}
                      >
                        Reply
                      </button>
                    )}
                    {msg.channel === 'linkedin' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReply(msg); }}
                        style={{
                          padding: '5px 14px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                          border: '0.5px solid #0A66C2', background: '#E8F1FC', color: '#0A66C2',
                          fontFamily: 'inherit', fontWeight: 500,
                        }}
                      >
                        Reply on LinkedIn
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compose Email Modal */}
      {composeEmail && (
        <ComposeEmail
          open={true}
          onClose={() => setComposeEmail(null)}
          contactEmail={composeEmail.contactEmail}
          item={null}
          refetch={fetchAll}
        />
      )}

      {/* LinkedIn Compose Modal */}
      {composeLinkedIn && (
        <LinkedInCompose
          open={true}
          onClose={() => setComposeLinkedIn(null)}
          contactName={composeLinkedIn.contactName}
          linkedinUrl={composeLinkedIn.linkedinUrl}
        />
      )}
    </div>
  );
}
