import { useState, useMemo, useEffect } from 'react';
import { I, ChannelIcon, Avatar, fmtRelative, fmtFull } from './atoms';
import { graphGet, getEmailAttachments } from '../lib/graph';
import { supabase } from '../supabase';
import DOMPurify from 'dompurify';
import TaskFromEmailModal from './task-from-email-modal';
import AddAccountModal from './add-account-modal';
import AddContactModal from './add-contact-modal';

const CHANNEL_OPTIONS = ['all', 'email', 'teams'];

export default function CommsLane({ comms, accounts, contacts, graphEmails: rawGraphEmails, refetch, refetchGraph, onCompose, selectedId, onSelect, accountScope, onClearScope, search: globalSearch }) {
  const [channel, setChannel] = useState('all');
  const [folder, setFolder] = useState('inbox');
  const [localSearch, setLocalSearch] = useState('');

  // Adapt graphEmails from BDApp into internal shape with account linkage
  const graphEmails = useMemo(() => {
    const mapped = (rawGraphEmails || []).map(e => ({
      id: e.id,
      channel: 'email',
      dir: 'in',
      from: e.from,
      fromAddress: e.fromAddress,
      subject: e.subject,
      preview: e.bodyPreview || '',
      unread: !e.isRead,
      ts: e.date,
      hasAttach: e.hasAttachments,
      archived: false,
      source: 'graph',
    }));
    const contactByEmail = new Map((contacts || []).filter(c => c.email).map(c => [c.email.toLowerCase(), c]));
    mapped.forEach(m => {
      const contact = contactByEmail.get((m.fromAddress || '').toLowerCase());
      if (contact) {
        m.accountId = contact.accountId;
        const acc = (accounts || []).find(a => a.id === contact.accountId);
        if (acc) m.account = acc.name;
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
      if (folder === 'inbox' && c.archived) return false;
      if (folder === 'archived' && !c.archived) return false;
      if (folder === 'sent' && c.dir !== 'out') return false;
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

  const counts = useMemo(() => ({
    inbox: allComms.filter(c => !c.archived && c.dir !== 'out').length,
    sent: allComms.filter(c => c.dir === 'out').length,
    archived: allComms.filter(c => c.archived).length,
  }), [allComms]);

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

function ReadingPane({ comm, accounts, contacts, refetch, refetchGraph, onCompose }) {
  const [fullBody, setFullBody] = useState(null);
  const [loadingBody, setLoadingBody] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [pendingAccountForContact, setPendingAccountForContact] = useState(null);

  const isGraphMessage = comm?.id && /^[A-Za-z0-9=+/_-]{40,}$/.test(comm.id);

  useEffect(() => {
    setFullBody(null);
    setAttachments([]);
    if (!comm || comm.channel !== 'email' || !isGraphMessage) return;
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
  }, [comm?.id, isGraphMessage, comm?.hasAttach]);

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

      <div className="rp-body">
        {loadingBody && <div style={{ color: 'var(--text-3)' }}>Loading message…</div>}
        {fullBody ? (
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
    </div>
  );
}
