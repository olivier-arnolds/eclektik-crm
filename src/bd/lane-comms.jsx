import { useState, useMemo, useEffect } from 'react';
import { I, ChannelIcon, Avatar, fmtRelative, fmtFull } from './atoms';
import { graphGet, getInboxEmails } from '../lib/graph';
import { supabase } from '../supabase';
import DOMPurify from 'dompurify';

const CHANNEL_OPTIONS = ['all', 'email', 'teams'];

export default function CommsLane({ comms, accounts, contacts, refetch, onCompose, selectedId, onSelect, accountScope, onClearScope, search: globalSearch }) {
  const [channel, setChannel] = useState('all');
  const [folder, setFolder] = useState('inbox');
  const [localSearch, setLocalSearch] = useState('');
  const [graphEmails, setGraphEmails] = useState([]);

  // Fetch Graph inbox emails
  useEffect(() => {
    if (!localStorage.getItem('graph_token')) return;
    getInboxEmails(50).then(emails => {
      const mapped = emails.map(e => ({
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
      // Try to match email-address → contact → account
      const contactByEmail = new Map((contacts || []).filter(c => c.email).map(c => [c.email.toLowerCase(), c]));
      mapped.forEach(m => {
        const contact = contactByEmail.get((m.fromAddress || '').toLowerCase());
        if (contact) {
          m.accountId = contact.accountId;
          const acc = (accounts || []).find(a => a.id === contact.accountId);
          if (acc) m.account = acc.name;
        }
      });
      setGraphEmails(mapped);
    }).catch(e => console.warn('Graph inbox fetch failed:', e));
  }, [contacts, accounts]);

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

        <ReadingPane comm={selected} accounts={accounts} refetch={refetch} onCompose={onCompose} />
      </div>
    </div>
  );
}

function ReadingPane({ comm, accounts, refetch, onCompose }) {
  const [fullBody, setFullBody] = useState(null);
  const [loadingBody, setLoadingBody] = useState(false);

  useEffect(() => {
    setFullBody(null);
    if (!comm || comm.channel !== 'email' || !comm.id) return;
    // Only try to fetch if we have a real Graph/Outlook message ID (not a UUID)
    if (!/^[A-Za-z0-9=+/_-]{40,}$/.test(comm.id)) return;
    setLoadingBody(true);
    graphGet(`/me/messages/${comm.id}?$select=body,from,toRecipients,subject`)
      .then(res => setFullBody(res?.body?.content || null))
      .catch(() => {})
      .finally(() => setLoadingBody(false));
  }, [comm?.id]);

  if (!comm) {
    return (
      <div className="reading-pane reading-empty">
        <span>Select a message to read</span>
      </div>
    );
  }

  const account = accounts.find(a => a.id === comm.accountId);
  const archive = async () => {
    await supabase.from('comms').update({ archived: !comm.archived }).eq('id', comm.id);
    if (refetch) refetch();
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
          <button className="btn-ghost tiny" onClick={archive}>
            <I.archive /> {comm.archived ? 'Unarchive' : 'Archive'}
          </button>
        </div>
        <div className="rp-subject">{comm.subject}</div>
        <div className="rp-meta">
          <ChannelIcon ch={comm.channel} size={14} />
          <div className="rp-meta-main">
            <div className="rp-from">{comm.from || 'Unknown sender'}</div>
          </div>
          <div className="rp-time">{fmtFull(comm.ts)}</div>
        </div>
        <div className="rp-tags">
          {account && <span className="pill">{account.name}</span>}
          {comm.flagged && <span className="pill">⚑ Flagged</span>}
        </div>
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
            {comm.channel === 'email' && !loadingBody && (
              <p className="rp-p" style={{ color: 'var(--text-3)', fontSize: 11 }}>
                Full message body requires opening via Outlook (Graph token expired or message archived).
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
