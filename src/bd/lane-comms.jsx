import { useState, useMemo, useEffect } from 'react';
import { I, ChannelIcon, Avatar, fmtRelative, fmtFull } from './atoms';
import { graphGet, getEmailAttachments, getChatMessages } from '../lib/graph';
import { supabase } from '../supabase';
import DOMPurify from 'dompurify';
import TaskFromEmailModal from './task-from-email-modal';
import AddAccountModal from './add-account-modal';
import AddContactModal from './add-contact-modal';
import CreateNoteModal from './create-note-modal';

const CHANNEL_OPTIONS = ['all', 'email', 'teams'];

export default function CommsLane({ comms, accounts, contacts, graphEmails: rawGraphEmails, refetch, refetchGraph, onCompose, selectedId, onSelect, accountScope, onClearScope, search: globalSearch }) {
  const [channel, setChannel] = useState('all');
  const [folder, setFolder] = useState('inbox');
  const [localSearch, setLocalSearch] = useState('');

  // Adapt graphEmails from BDApp into internal shape with account linkage
  const graphEmails = useMemo(() => {
    const mapped = (rawGraphEmails || []).map(e => ({
      id: e.id,
      // channel comes from the fetch: 'email' for mail, 'teams' for chats
      channel: e.channel || 'email',
      dir: e.dir || 'in',
      from: e.from,
      fromAddress: e.fromAddress,
      to: e.to,
      toAddresses: e.toAddresses,
      subject: e.subject,
      preview: e.bodyPreview || '',
      unread: !e.isRead,
      ts: e.date,
      hasAttach: e.hasAttachments,
      archived: !!e.archived,
      folder: e.folder,
      chatType: e.chatType,
      participantEmails: e.participantEmails,
      source: 'graph',
    }));
    const contactByEmail = new Map((contacts || []).filter(c => c.email).map(c => [c.email.toLowerCase(), c]));
    mapped.forEach(m => {
      // For incoming: match on sender. For sent: match on recipients.
      // For Teams chats: check all participants (excluding me).
      let candidates;
      if (m.channel === 'teams') {
        candidates = (m.participantEmails || []).map(a => (a || '').toLowerCase());
      } else if (m.dir === 'out') {
        candidates = (m.toAddresses || []).map(a => (a || '').toLowerCase());
      } else {
        candidates = [(m.fromAddress || '').toLowerCase()];
      }
      for (const addr of candidates) {
        if (!addr) continue;
        const contact = contactByEmail.get(addr);
        if (contact) {
          m.accountId = contact.accountId;
          const acc = (accounts || []).find(a => a.id === contact.accountId);
          if (acc) m.account = acc.name;
          break;
        }
      }
    });
    return mapped;
  }, [rawGraphEmails, contacts, accounts]);

  // Merge DB comms + Graph emails (dedupe by id)
  const allComms = useMemo(() => {
    const ids = new Set((comms || []).map(c => c.id));
    return [...(comms || []), ...graphEmails.filter(e => !ids.has(e.id))];
  }, [comms, graphEmails]);

  const q = (localSearch || globalSearch || '').toLowerCase();

  const filtered = useMemo(() => {
    return allComms.filter(c => {
      if (channel !== 'all' && c.channel !== channel) return false;
      // Folder filtering: prefer Graph's `folder` when present, else fall back
      // to our DB flags (dir/archived).
      const inboxHit = c.folder === 'Inbox' || (!c.folder && !c.archived && c.dir !== 'out');
      const sentHit = c.folder === 'SentItems' || (!c.folder && c.dir === 'out');
      const archivedHit = c.folder === 'Archive' || (!c.folder && c.archived);
      if (folder === 'inbox' && !inboxHit) return false;
      if (folder === 'sent' && !sentHit) return false;
      if (folder === 'archived' && !archivedHit) return false;
      if (accountScope && c.accountId !== accountScope) return false;
      if (q && !(
        (c.subject || '').toLowerCase().includes(q) ||
        (c.preview || '').toLowerCase().includes(q) ||
        (c.from || '').toLowerCase().includes(q) ||
        (c.account || '').toLowerCase().includes(q)
      )) return false;
      return true;
    }).sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
  }, [comms, channel, folder, q, accountScope]);

  const selected = allComms.find(c => c.id === selectedId);

  const counts = useMemo(() => {
    const matchFolder = (c, target) => {
      if (target === 'inbox') return c.folder === 'Inbox' || (!c.folder && !c.archived && c.dir !== 'out');
      if (target === 'sent') return c.folder === 'SentItems' || (!c.folder && c.dir === 'out');
      if (target === 'archived') return c.folder === 'Archive' || (!c.folder && c.archived);
      return false;
    };
    return {
      inbox: allComms.filter(c => matchFolder(c, 'inbox')).length,
      sent: allComms.filter(c => matchFolder(c, 'sent')).length,
      archived: allComms.filter(c => matchFolder(c, 'archived')).length,
    };
  }, [allComms]);

  return (
    <div className="lane lane-comms">
      <div className="lane-header">
        <div className="lane-title">
          <span className="lane-title-label">Comms</span>
          <span className="lane-title-count">{filtered.length} items</span>
        </div>
        <div className="lane-actions">
          {onCompose && (
            <button className="btn-primary tiny" onClick={() => onCompose({})}>
              <I.plus /> New
            </button>
          )}
        </div>
      </div>

      <div className="comms-searchrow">
        <div className="searchfield">
          <I.search />
          <input value={localSearch} onChange={e => setLocalSearch(e.target.value)} placeholder="Search comms…" />
        </div>
      </div>

      <div className="comms-channelrow">
        {CHANNEL_OPTIONS.map(c => (
          <button key={c}
            className={`chip ${channel === c ? 'chip-on' : ''}`}
            style={{ fontSize: 11, textTransform: 'capitalize' }}
            onClick={() => setChannel(c)}>
            {c !== 'all' && <ChannelIcon ch={c} size={10} />}
            {c}
          </button>
        ))}
      </div>

      <div className="comms-folders">
        {['inbox', 'sent', 'archived'].map(f => (
          <button key={f}
            className={`folder ${folder === f ? 'folder-on' : ''}`}
            onClick={() => setFolder(f)}>
            <span style={{ textTransform: 'capitalize' }}>{f}</span>
            <span className="folder-count">{counts[f] || 0}</span>
          </button>
        ))}
      </div>

      {accountScope && (
        <div className="scope-banner">
          <span>Filtered by account: {accounts.find(a => a.id === accountScope)?.name}</span>
          <button className="icon-btn tiny" onClick={onClearScope}><I.close /></button>
        </div>
      )}

      <div className="comms-split">
        <div className="comms-list">
          {filtered.length === 0 ? (
            <div className="empty">No messages</div>
          ) : (
            filtered.map(c => (
              <div key={c.id}
                className={`comm-row ${c.unread ? 'comm-row-unread' : ''} ${selectedId === c.id ? 'comm-row-on' : ''}`}
                onClick={() => onSelect && onSelect(c.id)}>
                <div className="comm-row-top">
                  <div className="comm-row-left">
                    {c.unread && <span className="unread-dot" />}
                    <ChannelIcon ch={c.channel} size={11} />
                    <span className="comm-from">{c.from || c.account}</span>
                  </div>
                  <div className="comm-row-right">
                    {c.hasAttach && <I.paperclip />}
                    <span className="comm-time">{fmtRelative(c.ts)}</span>
                  </div>
                </div>
                <div className="comm-subject">{c.subject}</div>
                {c.preview && <div className="comm-preview">{c.preview}</div>}
                {c.account && (
                  <div className="comm-row-bottom">
                    <span className="comm-account">{c.account}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <ReadingPane comm={selected} accounts={accounts} contacts={contacts} refetch={refetch} refetchGraph={refetchGraph} onCompose={onCompose} />
      </div>
    </div>
  );
}

// Parse a chunk of free-form text (e.g. from an email signature) and try to
// extract contact fields: name, email, linkedin URL, phone, role.
function parseContactFromText(text) {
  const out = { fullName: '', email: '', linkedinUrl: '', phone: '', role: '' };
  if (!text) return out;
  const clean = text.replace(/\s+/g, ' ').trim();

  // Email
  const emailMatch = clean.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) out.email = emailMatch[1];

  // LinkedIn
  const liMatch = clean.match(/https?:\/\/(?:[a-z]+\.)?linkedin\.com\/(?:in|pub)\/[^\s<>"']+/i);
  if (liMatch) out.linkedinUrl = liMatch[0].replace(/[,.;:]+$/, '');

  // Phone — sequences of digits, dashes, spaces, parens, +; at least 7 digits total
  const phoneMatch = clean.match(/(?:\+?\d[\d\s().-]{6,}\d)/);
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7) out.phone = phoneMatch[0].trim();

  // Name: first line of the selection, take up to 4 words that look name-like
  // (no @, no digits, no common role words, starts with capital)
  const firstLine = text.split(/[\n\r]/)[0].trim();
  const candidates = firstLine.split(/\s+/).filter(w => {
    if (!w) return false;
    if (w.includes('@')) return false;
    if (/^\d/.test(w)) return false;
    if (['the', 'a', 'at', 'van', 'de', 'der', 'ter', 'von', 'mr', 'ms', 'mrs'].includes(w.toLowerCase())) return true;
    return /^[A-ZÀ-Ý][A-Za-zÀ-ÿ'.-]+/.test(w) || /^[A-ZÀ-Ý]+$/.test(w); // also MCBREEN style
  }).slice(0, 4);
  if (candidates.length >= 1) out.fullName = candidates.join(' ');

  // Role: look for a line that looks like a title (no @, includes words like
  // Manager/Director/Lead/CEO/CTO/HR/etc., or contains "at")
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  const roleLine = lines.find(l => {
    if (l.includes('@')) return false;
    if (l.includes('linkedin.com')) return false;
    if (/\+?\d[\d\s().-]{6,}/.test(l)) return false;
    return /(manager|director|lead|head|chief|officer|ceo|cto|cfo|chro|hr|engagement|consultant|specialist|analyst|architect|executive|partner|president|vice|vp)/i.test(l);
  });
  if (roleLine && roleLine !== out.fullName) {
    out.role = roleLine.length > 80 ? roleLine.slice(0, 80) : roleLine;
  }

  return out;
}

// Parse a chunk of text and extract account fields.
function parseAccountFromText(text) {
  const out = { name: '', website: '', linkedinUrl: '', phone: '', address: '' };
  if (!text) return out;

  // LinkedIn company URL
  const liMatch = text.match(/https?:\/\/(?:[a-z]+\.)?linkedin\.com\/company\/[^\s<>"']+/i);
  if (liMatch) out.linkedinUrl = liMatch[0].replace(/[,.;:]+$/, '');

  // Website: any http(s) URL that's NOT linkedin
  const urls = text.match(/https?:\/\/[^\s<>"']+/gi) || [];
  const website = urls.find(u => !/linkedin\.com/i.test(u));
  if (website) out.website = website.replace(/[,.;:]+$/, '');
  // Fallback: bare domain (foo.com)
  if (!out.website) {
    const domMatch = text.match(/\b([a-zA-Z0-9][a-zA-Z0-9-]*\.(?:com|nl|be|de|co|io|org|net|eu|co\.uk|ch|fr|es|it|us))\b/i);
    if (domMatch) out.website = 'https://' + domMatch[1];
  }

  // Phone
  const phoneMatch = text.match(/(?:\+?\d[\d\s().-]{6,}\d)/);
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7) out.phone = phoneMatch[0].trim();

  // Name: first non-empty line (unless it looks like a URL/email/phone)
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  const nameLine = lines.find(l =>
    !l.includes('@')
    && !/^https?:/i.test(l)
    && !/^\+?\d[\d\s().-]{6,}/.test(l)
  );
  if (nameLine) out.name = nameLine.length > 80 ? nameLine.slice(0, 80) : nameLine;

  // Address: lines that aren't the name and contain street-like patterns (numbers + letters, or postcodes)
  const addressLines = lines.filter(l =>
    l !== out.name
    && !l.includes('@')
    && !/^https?:/i.test(l)
    && /\d/.test(l) // has numbers (house number / postcode)
  );
  if (addressLines.length) out.address = addressLines.join(', ').slice(0, 200);

  return out;
}

function ReadingPane({ comm, accounts, contacts, refetch, refetchGraph, onCompose }) {
  const [fullBody, setFullBody] = useState(null);
  const [loadingBody, setLoadingBody] = useState(false);
  const [chatMessages, setChatMessages] = useState(null); // for Teams chats
  const [attachments, setAttachments] = useState([]);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [pendingAccountForContact, setPendingAccountForContact] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, text }
  const [selectionContactPrefill, setSelectionContactPrefill] = useState(null);
  const [selectionAccountPrefill, setSelectionAccountPrefill] = useState(null);
  const [noteModal, setNoteModal] = useState(null); // { text, defaultAccount }

  // Close context menu on any outside click
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = () => setCtxMenu(null);
    document.addEventListener('click', handler);
    document.addEventListener('scroll', handler, true);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('scroll', handler, true);
    };
  }, [ctxMenu]);

  const isGraphMessage = comm?.id && /^[A-Za-z0-9=+/_-]{40,}$/.test(comm.id);

  useEffect(() => {
    setFullBody(null);
    setAttachments([]);
    setChatMessages(null);
    if (!comm) return;

    // Teams chat: fetch full message thread.
    // Chat IDs (e.g. "19:abc...@thread.v2") don't match the email-message
    // regex, so we trigger purely on channel === 'teams'.
    if (comm.channel === 'teams' && comm.id) {
      setLoadingBody(true);
      getChatMessages(comm.id, 50)
        .then(msgs => {
          // Graph returns newest-first; show oldest-first like a normal chat
          setChatMessages((msgs || []).slice().reverse());
        })
        .catch(err => { console.error('chat fetch failed', err); setChatMessages([]); })
        .finally(() => setLoadingBody(false));
      return;
    }

    if (comm.channel !== 'email' || !isGraphMessage) return;
    setLoadingBody(true);
    graphGet(`/me/messages/${comm.id}?$select=body,from,toRecipients,subject,hasAttachments`)
      .then(res => setFullBody(res?.body?.content || null))
      .catch(() => {})
      .finally(() => setLoadingBody(false));

    // Fetch attachments if flagged
    if (comm.hasAttach) {
      setLoadingAtt(true);
      getEmailAttachments(comm.id)
        .then(atts => setAttachments(atts || []))
        .catch(() => {})
        .finally(() => setLoadingAtt(false));
    }
  }, [comm?.id, comm?.channel, isGraphMessage, comm?.hasAttach]);

  if (!comm) {
    return (
      <div className="reading-pane reading-empty">
        <span>Select a message to read</span>
      </div>
    );
  }

  const account = accounts.find(a => a.id === comm.accountId);
  // Find matching contact by email
  const senderContact = (contacts || []).find(c =>
    c.email && comm.fromAddress && c.email.toLowerCase() === comm.fromAddress.toLowerCase()
  );
  // Unmatched if no contact and no account
  const isUnmatched = !senderContact && !account && comm.fromAddress;

  // Derive suggested account name from email domain
  const suggestedCompany = (() => {
    if (!comm.fromAddress) return { name: '', domain: '' };
    const domain = (comm.fromAddress.split('@')[1] || '').toLowerCase();
    if (!domain) return { name: '', domain: '' };
    // Strip common TLDs to build a suggested name
    const base = domain.replace(/\.(com|nl|be|de|eu|org|io|co\.uk|co|net)$/i, '').replace(/\./g, ' ');
    const name = base.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { name, domain };
  })();

  const archive = async () => {
    if (!isGraphMessage) {
      await supabase.from('comms').update({ archived: !comm.archived }).eq('id', comm.id);
      if (refetch) refetch();
    } else {
      alert('Archive for Graph emails coming soon. Use Outlook directly for now.');
    }
  };

  return (
    <div className="reading-pane">
      <div className="rp-head">
        <div className="rp-actions">
          <button className="btn-ghost tiny" onClick={() => onCompose && onCompose({ replyTo: comm })}>
            <I.reply /> Reply
          </button>
          <button className="btn-ghost tiny" onClick={() => onCompose && onCompose({ forwardOf: comm })}>
            <I.forward /> Forward
          </button>
          <button className="btn-ghost tiny" onClick={() => setShowTaskModal(true)} title="Create task from this email">
            <I.check /> Task
          </button>
          <button className="btn-ghost tiny" onClick={archive}>
            <I.archive /> {comm.archived ? 'Unarchive' : 'Archive'}
          </button>
        </div>
        <div className="rp-subject">{comm.subject}</div>
        <div className="rp-meta">
          <ChannelIcon ch={comm.channel} size={14} />
          <div className="rp-meta-main">
            <div className="rp-from">{comm.from || 'Unknown sender'}</div>
            {comm.fromAddress && <div className="rp-email">{comm.fromAddress}</div>}
          </div>
          <div className="rp-time">{fmtFull(comm.ts)}</div>
        </div>
        <div className="rp-tags">
          {account && <span className="pill">{account.name}</span>}
          {senderContact && !account && <span className="pill">{senderContact.name}</span>}
          {comm.flagged && <span className="pill">⚑ Flagged</span>}
        </div>

        {isUnmatched && suggestedCompany.name && (
          <div style={{
            marginTop: 10, padding: '8px 10px',
            background: 'var(--warn-tint)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11,
          }}>
            <span>📇</span>
            <span style={{ flex: 1 }}>
              <b>{suggestedCompany.name || comm.fromAddress}</b> isn't in your CRM yet.
            </span>
            <button className="btn-primary tiny" onClick={() => setShowAddAccount(true)}>
              + Create account
            </button>
          </div>
        )}
      </div>

      <div className="rp-body"
        onContextMenu={(e) => {
          const sel = window.getSelection();
          const txt = sel ? sel.toString().trim() : '';
          if (!txt) { setCtxMenu(null); return; } // no selection → native menu
          e.preventDefault();
          setCtxMenu({ x: e.clientX, y: e.clientY, text: txt });
        }}>
        {loadingBody && <div style={{ color: 'var(--text-3)' }}>Loading message…</div>}
        {comm.channel === 'teams' && chatMessages ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chatMessages.length === 0 && (
              <p className="rp-p" style={{ color: 'var(--text-3)' }}>No messages in this chat.</p>
            )}
            {chatMessages.map(m => (
              <div key={m.id} style={{
                padding: 10, borderRadius: 6, background: 'var(--fill-1)',
                border: '0.5px solid var(--sep)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6, display: 'flex', gap: 8 }}>
                  <b style={{ color: 'var(--text-1)' }}>{m.from}</b>
                  <span>{m.date ? new Date(m.date).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                {m.contentType === 'html'
                  ? <div style={{ fontSize: 13, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.body) }} />
                  : <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.body}</div>}
              </div>
            ))}
          </div>
        ) : fullBody ? (
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullBody) }} />
        ) : (
          <>
            {comm.preview ? (
              <p className="rp-p">{comm.preview}</p>
            ) : (
              <p className="rp-p" style={{ color: 'var(--text-3)' }}>No preview available.</p>
            )}
            {comm.channel === 'email' && !loadingBody && !isGraphMessage && (
              <p className="rp-p" style={{ color: 'var(--text-3)', fontSize: 11 }}>
                Full message body only available for live Graph-sourced emails.
              </p>
            )}
          </>
        )}
      </div>

      {(attachments.length > 0 || loadingAtt) && (
        <div className="rp-attachments">
          <div className="rp-attachments-title">
            <I.paperclip />
            <span>{loadingAtt ? 'Loading attachments…' : `Attachments · ${attachments.length}`}</span>
          </div>
          {!loadingAtt && (
            <div className="rp-attachments-grid">
              {attachments.map(a => {
                const ext = (a.name || '').split('.').pop()?.toLowerCase() || '';
                const thumbCls =
                  ['pdf'].includes(ext) ? 'attachment-thumb-pdf' :
                  ['doc', 'docx'].includes(ext) ? 'attachment-thumb-doc' :
                  ['xls', 'xlsx', 'csv'].includes(ext) ? 'attachment-thumb-xls' :
                  ['ppt', 'pptx'].includes(ext) ? 'attachment-thumb-ppt' : '';
                const kb = a.size ? Math.round(a.size / 1024) : 0;
                return (
                  <div key={a.id} className="attachment-card" title={a.name}>
                    <div className={`attachment-thumb ${thumbCls}`} style={!thumbCls ? { background: '#888' } : {}}>
                      {ext.slice(0, 4).toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <div className="attachment-name">{a.name}</div>
                      <div className="attachment-size">{kb ? `${kb} KB` : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showTaskModal && (
        <TaskFromEmailModal
          comm={comm}
          contacts={contacts}
          accounts={accounts}
          onClose={() => setShowTaskModal(false)}
          onCreated={() => { setShowTaskModal(false); if (refetch) refetch(); }}
        />
      )}

      {showAddAccount && (
        <AddAccountModal
          initialName={suggestedCompany.name}
          initialWebsite={suggestedCompany.domain ? `https://${suggestedCompany.domain}` : ''}
          onClose={() => setShowAddAccount(false)}
          onCreated={(newAcc) => {
            setShowAddAccount(false);
            setPendingAccountForContact(newAcc);
            setShowAddContact(true);
            if (refetch) refetch();
          }}
        />
      )}

      {showAddContact && pendingAccountForContact && (
        <AddContactModal
          account={{ id: pendingAccountForContact.id, name: pendingAccountForContact.name }}
          initialName={comm.from}
          initialEmail={comm.fromAddress}
          onClose={() => { setShowAddContact(false); setPendingAccountForContact(null); }}
          onCreated={() => { setShowAddContact(false); setPendingAccountForContact(null); if (refetch) refetch(); }}
        />
      )}

      {/* Context menu on text selection in email body */}
      {ctxMenu && (
        <div style={{
          position: 'fixed', top: ctxMenu.y, left: ctxMenu.x,
          background: 'var(--bg-1)', border: '0.5px solid var(--sep)',
          borderRadius: 8, boxShadow: 'var(--shadow-2)',
          padding: 4, minWidth: 240, zIndex: 1000,
        }}>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              const parsed = parseContactFromText(ctxMenu.text);
              setSelectionContactPrefill(parsed);
              setCtxMenu(null);
            }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', fontSize: 12, color: 'var(--text-1)', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <I.plus /> Create contact from selection
          </button>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              const parsed = parseAccountFromText(ctxMenu.text);
              setSelectionAccountPrefill(parsed);
              setCtxMenu(null);
            }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', fontSize: 12, color: 'var(--text-1)', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <I.plus /> Create account from selection
          </button>
          <div style={{ borderTop: '0.5px solid var(--sep)', margin: '4px 0' }} />
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              setNoteModal({ text: ctxMenu.text, defaultAccount: account || null });
              setCtxMenu(null);
            }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', fontSize: 12, color: 'var(--text-1)', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            📝 Create note on {account ? account.name : 'account…'}
          </button>
        </div>
      )}

      {noteModal && (
        <CreateNoteModal
          text={noteModal.text}
          accounts={accounts}
          defaultAccount={noteModal.defaultAccount}
          onClose={() => setNoteModal(null)}
          onCreated={() => { setNoteModal(null); if (refetch) refetch(); }}
        />
      )}

      {/* Contact modal prefilled from text selection */}
      {selectionContactPrefill && (
        <AddContactModal
          initialName={selectionContactPrefill.fullName}
          initialEmail={selectionContactPrefill.email}
          initialRole={selectionContactPrefill.role}
          initialLinkedIn={selectionContactPrefill.linkedinUrl}
          initialPhone={selectionContactPrefill.phone}
          onClose={() => setSelectionContactPrefill(null)}
          onCreated={() => { setSelectionContactPrefill(null); if (refetch) refetch(); }}
        />
      )}

      {/* Account modal prefilled from text selection */}
      {selectionAccountPrefill && (
        <AddAccountModal
          initialName={selectionAccountPrefill.name}
          initialWebsite={selectionAccountPrefill.website}
          initialLinkedIn={selectionAccountPrefill.linkedinUrl}
          onClose={() => setSelectionAccountPrefill(null)}
          onCreated={() => { setSelectionAccountPrefill(null); if (refetch) refetch(); }}
        />
      )}
    </div>
  );
}
