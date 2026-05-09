import { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { avatarColorFromName, getInitials, typeColors, fmt } from '../../lib/constants';
import { updateRow, insertRow } from '../../hooks/useSupabase';
import { useUnipileAccount } from '../../hooks/useUnipileAccount';
import { useEmailComms } from '../../hooks/useEmailComms';
import { useActivityLog } from '../../hooks/useActivityLog';
import { useTeamsChats } from '../../hooks/useTeamsChats';
import { useLinkedInMessages } from '../../hooks/useLinkedInMessages';
import { supabase } from '../../supabase';
import { replyToEmail } from '../../lib/graph';
import { useAuth } from '../../lib/auth';
import Avatar from '../atoms/Avatar';
import Btn from '../atoms/Btn';
import Chip from '../atoms/Chip';
import Empty from '../atoms/Empty';
import LinkedInCompose from '../forms/LinkedInCompose';

function EmailReply({ messageId, onSent }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleReply = async () => {
    if (!text.trim()) return;
    setSending(true);
    // Plain-text composer in this lightweight UI — keep contentType=Text
    // so newlines render correctly (no <br> conversion needed).
    const res = await replyToEmail(messageId, text.trim(), false);
    if (res.success) {
      setResult('sent');
      setText('');
      setTimeout(() => { setOpen(false); setResult(null); if (onSent) onSent(); }, 1500);
    } else {
      setResult(res.error || 'Failed');
    }
    setSending(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ marginTop: 8, padding: "4px 10px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 11, cursor: "pointer", background: "#fff", color: "#378ADD", fontFamily: "inherit" }}>
        ↩ Reply
      </button>
    );
  }

  return (
    <div style={{ marginTop: 8, borderTop: "0.5px solid #D3D1C7", paddingTop: 8 }}>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type your reply..." rows={3}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
      {result === 'sent' && <div style={{ fontSize: 11, color: "#1D9E75", marginTop: 4 }}>✓ Reply sent</div>}
      {result && result !== 'sent' && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{result}</div>}
      <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
        <button onClick={() => { setOpen(false); setText(''); setResult(null); }}
          style={{ padding: "5px 12px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 11, cursor: "pointer", background: "#fff", color: "#888780", fontFamily: "inherit" }}>Cancel</button>
        <button onClick={handleReply} disabled={sending || !text.trim()}
          style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 11, cursor: text.trim() ? "pointer" : "not-allowed", background: text.trim() ? "#042C53" : "#D3D1C7", color: text.trim() ? "#B5D4F4" : "#888780", fontFamily: "inherit", fontWeight: 500 }}>
          {sending ? 'Sending...' : '↩ Send reply'}
        </button>
      </div>
    </div>
  );
}

/* ── Style helpers ─────────────────────────────────────────────── */
const cardStyle = { background: "#FFFFFF", borderRadius: 8, border: "0.5px solid #D3D1C7", padding: "10px 14px" };
const labelStyle = { fontSize: 10, fontWeight: 500, color: "#888780", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 };
const groupLabelStyle = { fontSize: 11, fontWeight: 600, color: "#5F5E5A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, marginTop: 14 };
const inputStyle = { flex: 1, padding: "5px 8px", borderRadius: 6, border: "0.5px solid #378ADD", fontSize: 13, fontFamily: "inherit", outline: "none" };
const readOnlyValStyle = { fontSize: 13, color: "#888780", minHeight: 20, fontStyle: "italic" };

export default function ContactDetail({ contact, accounts, allItems, onBack, refetch }) {
  const { reconnectMicrosoft } = useAuth();
  const [tab, setTab] = useState('details');

  // Auto-reconnect Microsoft if no Graph token when opening email/teams tabs
  useEffect(() => {
    if ((tab === 'comms' || tab === 'teams') && !localStorage.getItem('graph_token')) {
      reconnectMicrosoft();
    }
  }, [tab]);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saved, setSaved] = useState(null);
  const {
    emails, emailLoading, expandedEmail, setExpandedEmail,
    showCompose, setShowCompose,
    composeForm, setComposeForm,
    sending, sendResult,
    fetchEmails, handleSendEmail, cancelCompose,
  } = useEmailComms(contact, { enabled: tab === 'comms' });
  const [showLinkedInCompose, setShowLinkedInCompose] = useState(false);
  const [showEnrollPlaybook, setShowEnrollPlaybook] = useState(false);
  const [availablePlaybooks, setAvailablePlaybooks] = useState(null);
  const [enrolling, setEnrolling] = useState(null);
  const [enrollResult, setEnrollResult] = useState(null);

  useEffect(() => {
    if (showEnrollPlaybook) {
      supabase.from('playbooks').select('*, playbook_steps(id)').in('status', ['active', 'draft'])
        .then(({ data }) => {
          setAvailablePlaybooks((data || []).map(pb => ({ ...pb, step_count: pb.playbook_steps?.length || 0 })));
        });
    }
  }, [showEnrollPlaybook]);
  const {
    activities, activitiesLoading,
    newNote, setNewNote, addingNote,
    fetchActivities, handleAddNote,
  } = useActivityLog(contact, { enabled: tab === 'activity' });
  const {
    chats, chatsLoading, chatsError,
    selectedChat, setSelectedChat,
    chatMessages, chatMessagesLoading,
    backToChats,
  } = useTeamsChats(contact, { enabled: tab === 'teams' });

  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState(null); // 'connected' | 'pending' | 'not_connected' | null
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const { getAccountId: getLiAccountId } = useUnipileAccount();

  // Check connection status on mount when contact has linkedin_url
  useEffect(() => {
    if (!contact.linkedin_url) return;
    setConnectionLoading(true);
    (async () => {
      try {
        const accountId = await getLiAccountId();
        if (!accountId) { setConnectionLoading(false); return; }
        const resp = await fetch(`/api/unipile?action=check-relation&account_id=${encodeURIComponent(accountId)}&linkedin_url=${encodeURIComponent(contact.linkedin_url)}`);
        const data = await resp.json();
        if (data.success && data.data) {
          setConnectionStatus(data.data.relation || 'not_connected');
        } else {
          setConnectionStatus('not_connected');
        }
      } catch (e) {
        console.error('Check relation error:', e);
        setConnectionStatus(null);
      }
      setConnectionLoading(false);
    })();
  }, [contact.linkedin_url]);

  const handleSendInvite = async () => {
    setSendingInvite(true);
    setInviteResult(null);
    try {
      const accountId = await getLiAccountId();
      if (!accountId) { setSendingInvite(false); return; }
      // Resolve provider ID from LinkedIn URL
      const resolveResp = await fetch(`/api/unipile?action=resolve-user&account_id=${accountId}&linkedin_url=${encodeURIComponent(contact.linkedin_url)}`);
      const resolveData = await resolveResp.json();
      const providerId = resolveData.provider_id;
      if (!providerId) { setInviteResult('Could not resolve LinkedIn profile'); setSendingInvite(false); return; }

      const resp = await fetch('/api/unipile?action=send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, attendee_id: providerId, message: inviteMessage || undefined }),
      });
      const data = await resp.json();
      if (data.success) {
        setInviteResult('sent');
        setConnectionStatus('pending');
        setShowInviteForm(false);
        setInviteMessage('');
      } else {
        setInviteResult(data.error || 'Failed to send invite');
      }
    } catch (e) {
      setInviteResult(e.message);
    }
    setSendingInvite(false);
  };

  const acc = accounts.find(a => a.id === contact.accountId);
  const tc = acc ? (typeColors[acc.type] || typeColors.Klant) : typeColors.Klant;
  const linkedItems = allItems.filter(i => i.contactIds?.includes(contact.id));

  /* ── Edit helpers ──────────────────────────────────────────── */
  const [localOverrides, setLocalOverrides] = useState({});
  const startEdit = (field, value) => { setEditing(field); setEditValue(value || ''); };
  const cancelEdit = () => { setEditing(null); setEditValue(''); };
  const saveField = async (field) => {
    let val = editValue;
    if (['intent_score', 'deal_value'].includes(field)) val = val === '' ? null : Number(val);
    if (field === 'li_connected') val = editValue === 'true' || editValue === true;
    // Optimistic update: store locally so display doesn't flash back
    setLocalOverrides(prev => ({ ...prev, [field]: val }));
    setEditing(null);
    setSaved(field);
    setTimeout(() => setSaved(null), 1500);
    await updateRow('contacts', contact.id, { [field]: val });
  };
  // Helper to get display value: local override > contact prop
  const getVal = (field, original) => field in localOverrides ? localOverrides[field] : original;


  /* ── Field definitions grouped ─────────────────────────────── */
  const fieldGroups = [
    {
      label: 'Contact Info',
      fields: [
        { label: 'Role', key: 'title', value: getVal('title', contact.role || '') },
        { label: 'Company', key: '_company', value: acc?.name || '', readOnly: true },
        { label: 'Email', key: 'email', value: getVal('email', contact.email) },
        { label: 'Phone', key: 'phone', value: getVal('phone', contact.phone || '') },
        { label: 'Mobile', key: 'mobile', value: getVal('mobile', contact.mobile || '') },
        { label: 'LinkedIn', key: 'linkedin_url', value: getVal('linkedin_url', contact.linkedin_url || '') },
        { label: 'Country', key: 'country', value: getVal('country', contact.country || '') },
      ]
    },
  ];

  const { messages: liMessages, loading: liMessagesLoading } = useLinkedInMessages(
    contact,
    { enabled: tab === 'linkedin-msgs' }
  );

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'comms', label: `Emails (${emails.length || 0})` },
    { key: 'linkedin-msgs', label: 'LinkedIn Messages' },
    { key: 'activity', label: 'Notes & Activity' },
    { key: 'items', label: `Pipeline (${linkedItems.length})` },
    { key: 'teams', label: 'Teams' },
  ];

  /* ── Render an editable field ──────────────────────────────── */
  const renderField = (f) => {
    const { label, key, value, readOnly, dropdown, boolean: isBool, number: isNum, multiline } = f;
    if (key === '_company') {
      return (
        <div key={key} style={cardStyle}>
          <div style={labelStyle}>{label}</div>
          {acc ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{acc.flag}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{acc.name}</div>
                <div style={{ fontSize: 11, color: "#888780" }}>{acc.city}{acc.country ? `, ${acc.country}` : ''} · {acc.industry}</div>
              </div>
              <Chip bg={tc.bg} color={tc.color} size={10}>{acc.type}</Chip>
            </div>
          ) : <div style={readOnlyValStyle}>-</div>}
        </div>
      );
    }

    if (readOnly) {
      return (
        <div key={key} style={cardStyle}>
          <div style={labelStyle}>{label}</div>
          <div style={readOnlyValStyle}>{value || '-'}</div>
        </div>
      );
    }

    if (editing === key) {
      if (dropdown) {
        return (
          <div key={key} style={cardStyle}>
            <div style={labelStyle}>{label}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <select autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                style={{ ...inputStyle, padding: "5px 6px" }}>
                <option value="">-- select --</option>
                {dropdown.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <Btn small onClick={() => saveField(key)}>&#10003;</Btn>
              <Btn small onClick={cancelEdit}>&#10007;</Btn>
            </div>
          </div>
        );
      }
      if (isBool) {
        return (
          <div key={key} style={cardStyle}>
            <div style={labelStyle}>{label}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <select autoFocus value={String(editValue)} onChange={e => setEditValue(e.target.value)}
                style={{ ...inputStyle, padding: "5px 6px" }}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
              <Btn small onClick={() => saveField(key)}>&#10003;</Btn>
              <Btn small onClick={cancelEdit}>&#10007;</Btn>
            </div>
          </div>
        );
      }
      if (multiline) {
        return (
          <div key={key} style={cardStyle}>
            <div style={labelStyle}>{label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <textarea autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <Btn small onClick={() => saveField(key)}>&#10003;</Btn>
                <Btn small onClick={cancelEdit}>&#10007;</Btn>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div key={key} style={cardStyle}>
          <div style={labelStyle}>{label}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
              type={isNum ? 'number' : 'text'}
              onKeyDown={e => { if (e.key === 'Enter') saveField(key); if (e.key === 'Escape') cancelEdit(); }}
              style={inputStyle} />
            <Btn small onClick={() => saveField(key)}>&#10003;</Btn>
            <Btn small onClick={cancelEdit}>&#10007;</Btn>
          </div>
        </div>
      );
    }

    // Display mode
    const isLinkedIn = key === 'linkedin_url';
    const linkedInSearch = isLinkedIn ? () => {
      const q = encodeURIComponent(`${contact.name} ${acc?.name || ''}`);
      window.open(`https://www.linkedin.com/search/results/people/?keywords=${q}`, '_blank');
    } : undefined;
    const displayVal = isBool ? (value ? 'Yes' : 'No') : (isNum && value !== '' && value != null ? fmt(Number(value)) : value);
    return (
      <div key={key} style={cardStyle}>
        <div onClick={linkedInSearch}
          style={{ ...labelStyle, color: isLinkedIn ? "#378ADD" : labelStyle.color, cursor: isLinkedIn ? "pointer" : "default" }}>
          {label}{isLinkedIn ? ' ↗' : ''}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isLinkedIn && displayVal ? (
            <>
              <a href={displayVal.startsWith('http') ? displayVal : `https://${displayVal}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: "#378ADD", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                {saved === key ? <span style={{ color: "#1D9E75" }}>&#10003; Saved</span> : displayVal}
              </a>
              <span onClick={() => startEdit(key, value ?? '')} style={{ fontSize: 10, color: "#888780", cursor: "pointer" }}>✎</span>
            </>
          ) : (
            <div onClick={() => startEdit(key, isBool ? String(value) : (value ?? ''))}
              style={{ fontSize: 13, cursor: "pointer", borderBottom: "1px dashed transparent", minHeight: 20, color: (displayVal !== '' && displayVal != null) ? "#2C2C2A" : "#B4B2A9", whiteSpace: multiline ? "pre-wrap" : undefined, flex: 1 }}
              onMouseEnter={e => e.currentTarget.style.borderBottomColor = "#D3D1C7"}
              onMouseLeave={e => e.currentTarget.style.borderBottomColor = "transparent"}>
              {saved === key ? <span style={{ color: "#1D9E75" }}>&#10003; Saved</span> : (displayVal || 'Click to fill in')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ background: "#FFFFFF", borderBottom: "0.5px solid #D3D1C7", padding: "12px 18px 0", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#888780", fontFamily: "inherit", padding: 0, marginBottom: 10 }}>&larr; all contacts</button>
        <div style={{ display: "flex", gap: 12, paddingBottom: 12 }}>
          <Avatar initials={contact.initials} bg={contact.avatarBg} color={contact.avatarColor} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{contact.name}</span>
              {contact.linkedin_url && !connectionLoading && connectionStatus === 'connected' && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#E6F9F0", color: "#0A7B4F", border: "0.5px solid #7DD3B0", fontWeight: 500 }}>
                  {'\uD83D\uDFE2'} Connected
                </span>
              )}
              {contact.linkedin_url && !connectionLoading && connectionStatus === 'pending' && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#FFF8E6", color: "#8B6914", border: "0.5px solid #F5D77A", fontWeight: 500 }}>
                  {'\uD83D\uDFE1'} Pending
                </span>
              )}
              {contact.linkedin_url && !connectionLoading && connectionStatus === 'not_connected' && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#FCEBEB", color: "#791F1F", border: "0.5px solid #F09595", fontWeight: 500 }}>
                    {'\uD83D\uDD34'} Not connected
                  </span>
                  <button onClick={() => setShowInviteForm(!showInviteForm)}
                    style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, border: "0.5px solid #0A66C2", background: "#fff", color: "#0A66C2", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                    Send invite
                  </button>
                </span>
              )}
              {contact.linkedin_url && connectionLoading && (
                <span style={{ fontSize: 10, color: "#888780" }}>checking...</span>
              )}
              {inviteResult === 'sent' && (
                <span style={{ fontSize: 10, color: "#1D9E75", fontWeight: 500 }}>Invite sent</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
              <Chip>{contact.role}</Chip>
              {acc && <Chip bg={tc.bg} color={tc.color}>{acc.name}</Chip>}
              {contact.source && <Chip bg="#E6F1FB" color="#0C447C">{contact.source}</Chip>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <Btn small onClick={() => setShowCompose(true)}>&#9993; Email</Btn>
            <Btn small onClick={() => setShowLinkedInCompose(true)}>in Message</Btn>
            {contact.linkedin_url && <Btn small onClick={() => window.open(contact.linkedin_url, '_blank')}>in Profile</Btn>}
            <Btn small onClick={() => setShowEnrollPlaybook(true)}>&#128203; Playbook</Btn>
          </div>
        </div>
        <div style={{ display: "flex", borderTop: "0.5px solid #D3D1C7", marginLeft: -18, marginRight: -18, paddingLeft: 18 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "8px 12px", fontSize: 12, cursor: "pointer", background: "transparent", border: "none", borderBottom: tab === t.key ? "2px solid #378ADD" : "2px solid transparent", color: tab === t.key ? "#2C2C2A" : "#888780", fontWeight: tab === t.key ? 500 : 400, fontFamily: "inherit", whiteSpace: "nowrap" }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>

        {/* LinkedIn invite form */}
        {showInviteForm && (
          <div style={{ background: "#FFFFFF", borderRadius: 8, border: "0.5px solid #0A66C2", padding: "14px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Send LinkedIn connection invite to {contact.name}</div>
            <textarea value={inviteMessage} onChange={e => setInviteMessage(e.target.value)}
              placeholder="Add a personal message (optional)..." rows={3}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 8 }} />
            {inviteResult && inviteResult !== 'sent' && (
              <div style={{ fontSize: 11, color: "#dc2626", marginBottom: 8 }}>{inviteResult}</div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowInviteForm(false); setInviteMessage(''); setInviteResult(null); }}
                style={{ padding: "6px 14px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 11, cursor: "pointer", background: "#fff", color: "#888780", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleSendInvite} disabled={sendingInvite}
                style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 11, cursor: sendingInvite ? "wait" : "pointer", background: "#0A66C2", color: "#fff", fontFamily: "inherit", fontWeight: 500 }}>
                {sendingInvite ? 'Sending...' : 'Send invite'}
              </button>
            </div>
          </div>
        )}

        {/* Compose overlay */}
        {showCompose && (
          <div style={{ background: "#FFFFFF", borderRadius: 8, border: "0.5px solid #378ADD", padding: "14px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>New message to {contact.name}</div>
            <input value={contact.email} disabled style={{ width: "100%", padding: "7px 11px", borderRadius: 7, border: "0.5px solid #D3D1C7", fontSize: 12, background: "#F1EFE8", color: "#888780", fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box" }} />
            <input value={composeForm.subject} onChange={e => setComposeForm(p => ({ ...p, subject: e.target.value }))} placeholder="Subject" style={{ width: "100%", padding: "7px 11px", borderRadius: 7, border: "0.5px solid #D3D1C7", fontSize: 12, background: "#fff", color: "#2C2C2A", fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box", outline: "none" }} />
            <textarea value={composeForm.body} onChange={e => setComposeForm(p => ({ ...p, body: e.target.value }))} placeholder="Message..." rows={5} style={{ width: "100%", padding: "7px 11px", borderRadius: 7, border: "0.5px solid #D3D1C7", fontSize: 12, background: "#fff", color: "#2C2C2A", fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box", outline: "none", resize: "vertical" }} />
            {sendResult && sendResult !== 'sent' && <div style={{ fontSize: 11, color: "#dc2626", marginBottom: 8 }}>{sendResult}</div>}
            {sendResult === 'sent' && <div style={{ fontSize: 11, color: "#1D9E75", marginBottom: 8 }}>&#10003; Sent</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn small onClick={cancelCompose}>Cancel</Btn>
              <Btn primary small onClick={handleSendEmail}>{sending ? 'Sending...' : 'Send'}</Btn>
            </div>
          </div>
        )}

        {/* ── DETAILS TAB ──────────────────────────────────────── */}
        {tab === 'details' && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {fieldGroups.map(group => (
              <div key={group.label}>
                <div style={groupLabelStyle}>{group.label}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.fields.map(renderField)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── EMAILS TAB ───────────────────────────────────────── */}
        {tab === 'comms' && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button onClick={() => setShowCompose(true)} style={{ flex: 1, padding: "7px 12px", borderRadius: 7, border: "0.5px solid #B4B2A9", fontSize: 12, cursor: "pointer", background: "#042C53", color: "#B5D4F4", fontFamily: "inherit", fontWeight: 500 }}>&#9993; Compose message</button>
              <Btn small onClick={fetchEmails}>&#8635; Sync</Btn>
            </div>
            {emails.length > 0 && (
              <div style={{ fontSize: 11, color: "#888780", marginBottom: 8 }}>{emails.length} emails found</div>
            )}
            {emailLoading ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#888780", fontSize: 12 }}>Loading emails...</div>
            ) : !localStorage.getItem('graph_token') ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#888780", fontSize: 12 }}>Log in again to load emails</div>
            ) : emails.length === 0 ? (
              <Empty text="No emails found for this contact." />
            ) : (
              <div style={{ background: "#FFFFFF", borderRadius: 8, border: "0.5px solid #D3D1C7", overflow: "hidden" }}>
                {/* Table header */}
                <div style={{ display: "grid", gridTemplateColumns: "32px 100px 1fr 140px", gap: 0, padding: "8px 10px", background: "#F1EFE8", borderBottom: "0.5px solid #D3D1C7" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#5F5E5A" }}></div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#5F5E5A" }}>Date</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#5F5E5A" }}>Subject</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#5F5E5A" }}>From</div>
                </div>
                {emails.map((m, i) => (
                  <div key={m.id || i}>
                    <div
                      onClick={() => setExpandedEmail(expandedEmail === (m.id || i) ? null : (m.id || i))}
                      style={{ display: "grid", gridTemplateColumns: "32px 100px 1fr 140px", gap: 0, padding: "8px 10px", borderBottom: i < emails.length - 1 ? "0.5px solid #D3D1C7" : "none", cursor: "pointer", background: expandedEmail === (m.id || i) ? "#F9F8F5" : "transparent", alignItems: "center" }}
                      onMouseEnter={e => { if (expandedEmail !== (m.id || i)) e.currentTarget.style.background = "#FAFAF8"; }}
                      onMouseLeave={e => { if (expandedEmail !== (m.id || i)) e.currentTarget.style.background = "transparent"; }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: m.direction === 'outbound' ? "#E6F1FB" : "#FBEAF0", color: m.direction === 'outbound' ? "#0C447C" : "#72243E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
                        {m.direction === 'outbound' ? '\u2197' : '\u2199'}
                      </div>
                      <div style={{ fontSize: 11, color: "#888780" }}>
                        {m.date ? new Date(m.date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: '2-digit' }) : ''}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: m.isRead === false ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
                        {m.subject}
                        {!m.isRead && <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#378ADD", marginLeft: 6, verticalAlign: "middle" }} />}
                      </div>
                      <div style={{ fontSize: 11, color: "#888780", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.from}
                      </div>
                    </div>
                    {expandedEmail === (m.id || i) && (
                      <div style={{ padding: "8px 10px 12px 42px", borderBottom: i < emails.length - 1 ? "0.5px solid #D3D1C7" : "none", background: "#F9F8F5" }}>
                        {m.bodyHtml ? (
                          <div style={{ fontSize: 12, color: "#444441", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.bodyHtml) }} />
                        ) : (
                          <div style={{ fontSize: 12, color: "#444441", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.bodyPreview}</div>
                        )}
                        <EmailReply messageId={m.id} onSent={fetchEmails} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── NOTES & ACTIVITY TAB ─────────────────────────────── */}
        {tab === 'activity' && (
          <div>
            {/* Add note input */}
            <div style={{ background: "#FFFFFF", borderRadius: 8, border: "0.5px solid #D3D1C7", padding: "10px 14px", marginBottom: 12 }}>
              <div style={labelStyle}>New note</div>
              <div style={{ display: "flex", gap: 8 }}>
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
                  placeholder="Write a note..."
                  rows={2}
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit", outline: "none", resize: "vertical", background: "#fff", color: "#2C2C2A" }}
                />
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <Btn primary small onClick={handleAddNote}>{addingNote ? '...' : 'Add'}</Btn>
                </div>
              </div>
            </div>

            {/* Activity list */}
            {activitiesLoading ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#888780", fontSize: 12 }}>Loading activities...</div>
            ) : activities.length === 0 ? (
              <Empty text="No activities for this contact yet." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {activities.map(a => (
                  <div key={a.id} style={{ ...cardStyle, display: "flex", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: a.type === 'note' ? "#E6F1FB" : a.type === 'email' ? "#FBEAF0" : "#F1EFE8", color: a.type === 'note' ? "#0C447C" : a.type === 'email' ? "#72243E" : "#5F5E5A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12 }}>
                      {a.type === 'note' ? '\u270E' : a.type === 'email' ? '\u2709' : '\u25CB'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <Chip size={9}>{a.type || 'activity'}</Chip>
                        <div style={{ fontSize: 10, color: "#888780" }}>
                          {a.created_at ? new Date(a.created_at).toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#2C2C2A", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{a.note || a.description || '-'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PIPELINE TAB ─────────────────────────────────────── */}
        {tab === 'items' && (
          <div>
            {linkedItems.length === 0 ? (
              <Empty text="This contact is not linked to any pipeline items." />
            ) : (
              linkedItems.map(item => {
                const itemAcc = accounts.find(a => a.id === item.accountId);
                return (
                  <div key={item.id} style={{ background: "#FFFFFF", borderRadius: 9, border: "0.5px solid #D3D1C7", padding: "12px 14px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{itemAcc?.flag} {itemAcc?.name}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{fmt(item.value)}</div>
                        <div style={{ fontSize: 10, color: "#888780" }}>{item.funnelStage}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TEAMS TAB ───────────────────────────────────────── */}
        {tab === 'linkedin-msgs' && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#888780" }}>
                {liMessages.length > 0 ? `${liMessages.length} messages` : 'LinkedIn conversation'}
              </div>
              <button onClick={() => setShowLinkedInCompose(true)}
                style={{ padding: "6px 12px", borderRadius: 7, border: "none", fontSize: 11, cursor: "pointer", background: "#0A66C2", color: "#fff", fontFamily: "inherit", fontWeight: 500 }}>
                + New message
              </button>
            </div>
            {liMessagesLoading ? (
              <div style={{ textAlign: "center", padding: 20, color: "#888780", fontSize: 12 }}>Loading LinkedIn messages...</div>
            ) : !contact.linkedin_url ? (
              <div style={{ textAlign: "center", padding: 20, color: "#888780", fontSize: 12 }}>Add a LinkedIn URL to this contact to view messages.</div>
            ) : liMessages.length === 0 ? (
              <Empty text="No LinkedIn messages found with this contact." />
            ) : (
              liMessages.map((msg, i) => {
                const isOwn = (msg.sender?.display_name || '').toLowerCase().includes('olivier') || msg.is_sender;
                const senderName = msg.sender?.display_name || msg.sender?.name || (isOwn ? 'You' : contact.name);
                const body = (msg.text || msg.body || '').replace(/<[^>]*>/g, '');
                const date = msg.timestamp || msg.created_at || msg.date;
                return (
                  <div key={msg.id || i} style={{ display: "flex", gap: 10, marginBottom: 8, flexDirection: isOwn ? "row-reverse" : "row" }}>
                    <div style={{
                      maxWidth: "75%", padding: "10px 14px", borderRadius: isOwn ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: isOwn ? "#E6F1FB" : "#F1EFE8", color: "#2C2C2A", fontSize: 12, lineHeight: 1.5
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 500, color: isOwn ? "#0C447C" : "#5F5E5A", marginBottom: 4 }}>{senderName}</div>
                      <div>{body}</div>
                      {date && <div style={{ fontSize: 9, color: "#888780", marginTop: 4, textAlign: isOwn ? "right" : "left" }}>
                        {new Date(date).toLocaleDateString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'teams' && (
          <div>
            {chatsError === 'auth' ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#888780", fontSize: 12 }}>Log in again to load Teams chats</div>
            ) : chatsLoading ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#888780", fontSize: 12 }}>Loading Teams chats...</div>
            ) : !selectedChat ? (
              <>
                {chats.length === 0 ? (
                  <Empty text={`No Teams chats found with ${contact.name}.`} />
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: "#888780", marginBottom: 8 }}>{chats.length} chat{chats.length !== 1 ? 's' : ''} found with {contact.name}</div>
                    {chats.map(c => (
                      <div key={c.id} onClick={() => setSelectedChat(c)}
                        style={{ background: "#FFFFFF", borderRadius: 8, border: "0.5px solid #D3D1C7", padding: "10px 14px", marginBottom: 6, cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "#378ADD"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "#D3D1C7"}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{c.topic}</div>
                        <div style={{ fontSize: 11, color: "#888780", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.lastMessage ? c.lastMessage.replace(/<[^>]*>/g, '') : 'No messages'}
                        </div>
                        <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>
                          {c.lastDate ? new Date(c.lastDate).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                          {c.chatType && <span> · {c.chatType}</span>}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : (
              <>
                <button onClick={backToChats}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#378ADD", fontFamily: "inherit", padding: 0, marginBottom: 10 }}>
                  &larr; back to chats
                </button>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>{selectedChat.topic}</div>
                {chatMessagesLoading ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "#888780", fontSize: 12 }}>Loading messages...</div>
                ) : chatMessages.length === 0 ? (
                  <Empty text="No messages in this chat." />
                ) : (
                  chatMessages.map((m, i) => (
                    <div key={m.id || i} style={{ padding: "8px 0", borderBottom: i < chatMessages.length - 1 ? "0.5px solid #D3D1C7" : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>{m.from}</span>
                        <span style={{ fontSize: 10, color: "#888780" }}>{m.date ? new Date(m.date).toLocaleDateString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#4A4A47", lineHeight: 1.4 }}>{m.body.replace(/<[^>]*>/g, '')}</div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>
      <LinkedInCompose open={showLinkedInCompose} onClose={() => setShowLinkedInCompose(false)} contactName={contact.name} linkedinUrl={contact.linkedin_url} />

      {/* Enroll in Playbook modal */}
      {showEnrollPlaybook && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.3)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }} onClick={() => setShowEnrollPlaybook(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:12, padding:"24px 28px", width:420, maxHeight:"70vh", overflowY:"auto" }}>
            <div style={{ fontSize:16, fontWeight:500, marginBottom:4 }}>Enroll {contact.name} in a Playbook</div>
            <div style={{ fontSize:11, color:"#888780", marginBottom:8 }}>Select a playbook to start the outreach sequence</div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, padding:"6px 10px", background:"#F1EFE8", borderRadius:6 }}>
              <label style={{ fontSize:11, color:"#888780", whiteSpace:"nowrap" }}>Start date (optional):</label>
              <input type="date" id="enroll-start-date" style={{ padding:"4px 8px", borderRadius:6, border:"0.5px solid #D3D1C7", fontSize:11, fontFamily:"inherit", background:"#fff" }} />
            </div>
            {availablePlaybooks === null ? (
              <div style={{ textAlign:"center", padding:20, color:"#888780", fontSize:12 }}>Loading playbooks...</div>
            ) : availablePlaybooks.length === 0 ? (
              <div style={{ textAlign:"center", padding:20, color:"#888780", fontSize:12 }}>No playbooks created yet. Go to Playbooks to create one first.</div>
            ) : (
              availablePlaybooks.map(pb => (
                <div key={pb.id} style={{ background:"#FAFAF8", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px", marginBottom:6, display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
                  onClick={async () => {
                    setEnrolling(pb.id);
                    setEnrollResult(null);
                    const startDateVal = document.getElementById('enroll-start-date')?.value;
                    const now = startDateVal ? new Date(startDateVal + 'T09:00:00') : new Date();
                    const { error } = await supabase.from('playbook_enrollments').insert({
                      playbook_id: pb.id,
                      contact_id: contact.id,
                      current_step: 1,
                      status: 'active',
                      next_step_at: now.toISOString(),
                    });
                    if (!error) {
                      setEnrollResult('enrolled');
                      setTimeout(() => { setShowEnrollPlaybook(false); setEnrollResult(null); }, 1500);
                    } else {
                      setEnrollResult('error');
                    }
                    setEnrolling(null);
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="#378ADD"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="#D3D1C7"}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{pb.name}</div>
                    <div style={{ fontSize:10, color:"#888780", marginTop:2 }}>
                      {pb.step_count || '?'} steps · {pb.status} · Owner: {pb.owner || '—'}
                    </div>
                  </div>
                  {enrolling === pb.id ? (
                    <span style={{ fontSize:11, color:"#888780" }}>Enrolling...</span>
                  ) : enrollResult === 'enrolled' ? (
                    <span style={{ fontSize:11, color:"#1D9E75" }}>✓ Enrolled</span>
                  ) : (
                    <span style={{ fontSize:11, color:"#378ADD" }}>Enroll →</span>
                  )}
                </div>
              ))
            )}
            {enrollResult === 'error' && <div style={{ fontSize:11, color:"#dc2626", marginTop:8 }}>Failed to enroll. Contact may already be in this playbook.</div>}
            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
              <button onClick={() => setShowEnrollPlaybook(false)} style={{ padding:"6px 14px", borderRadius:6, border:"0.5px solid #D3D1C7", fontSize:11, cursor:"pointer", background:"#fff", color:"#888780", fontFamily:"inherit" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
