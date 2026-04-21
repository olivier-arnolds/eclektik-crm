// Comms lane — Outlook-style: list + reading pane + archive
(function () {
  const { useState, useMemo, useEffect, useRef } = React;
  const { COMMS } = BD_DATA;

  // Internal store so Archive and Read state persist during session
  const [getStore, setStore, subscribe] = (() => {
    const initial = {
      archived: new Set(),
      read: new Set(),
      extra: [], // outbound sent items from Reply
    };
    let state = initial;
    const listeners = new Set();
    return [
      () => state,
      (next) => { state = typeof next === 'function' ? next(state) : next; listeners.forEach(f=>f()); },
      (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    ];
  })();
  function useCommStore() {
    const [, force] = useState(0);
    useEffect(() => subscribe(() => force(x=>x+1)), []);
    return [getStore(), setStore];
  }
  window.BD_COMMSTORE = { getStore, setStore, subscribe };

  function CommsLane({ selectedId, onSelect, accountScope, onClearScope, onCompose, onConvertToAction }) {
    const [q, setQ] = useState('');
    const [channel, setChannel] = useState('all');
    const [folder, setFolder] = useState('inbox');
    const [store, setS] = useCommStore();
    const [showNewPicker, setShowNewPicker] = useState(false);
    const pickerRef = useRef(null);

    useEffect(() => {
      if (!showNewPicker) return;
      const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowNewPicker(false); };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [showNewPicker]);

    const ALL = useMemo(() => {
      return [...COMMS, ...store.extra].sort((a,b) => {
        const ao = a.ts.days * 10000 + (24 - a.ts.hour) * 60 + a.ts.minute;
        const bo = b.ts.days * 10000 + (24 - b.ts.hour) * 60 + b.ts.minute;
        return ao - bo;
      });
    }, [store.extra]);

    const visible = useMemo(() => {
      let list = ALL;
      if (accountScope) list = list.filter(m => m.account === accountScope);
      if (folder === 'archived') list = list.filter(m => store.archived.has(m.id));
      else                       list = list.filter(m => !store.archived.has(m.id));
      if (folder === 'sent')     list = list.filter(m => m.dir === 'out');
      else if (folder === 'inbox') list = list.filter(m => m.dir === 'in');
      if (channel !== 'all') list = list.filter(m => m.channel === channel);
      if (q) {
        const qq = q.toLowerCase();
        list = list.filter(m =>
          (m.subject||'').toLowerCase().includes(qq) ||
          m.preview.toLowerCase().includes(qq) ||
          (BD_DATA.byId.contact(m.from)?.name.toLowerCase().includes(qq)) ||
          (BD_DATA.byId.account(m.account)?.name.toLowerCase().includes(qq))
        );
      }
      return list;
    }, [ALL, folder, channel, q, accountScope, store.archived]);

    const counts = useMemo(() => ({
      inbox:    ALL.filter(m => m.dir==='in'  && !store.archived.has(m.id)).length,
      sent:     ALL.filter(m => m.dir==='out' && !store.archived.has(m.id)).length,
      archived: ALL.filter(m => store.archived.has(m.id)).length,
    }), [ALL, store.archived]);

    const groups = useMemo(() => {
      const byDay = {};
      visible.forEach(m => {
        const key = m.ts.days === 0 ? 'Today'
                  : m.ts.days === 1 ? 'Yesterday'
                  : m.ts.days < 7 ? `${m.ts.days} days ago`
                  : 'Earlier';
        (byDay[key] ||= []).push(m);
      });
      return Object.entries(byDay);
    }, [visible]);

    const selectedMsg = ALL.find(m => m.id === selectedId);

    const archive = (id) => {
      setS(s => ({ ...s, archived: new Set([...s.archived, id]) }));
      // if archiving current selection, pick the next one
      if (id === selectedId) {
        const remaining = visible.filter(m => m.id !== id);
        if (remaining.length) onSelect(remaining[0].id);
      }
    };
    const unarchive = (id) => {
      setS(s => { const a = new Set(s.archived); a.delete(id); return { ...s, archived: a }; });
    };
    const markRead = (id) => {
      setS(s => ({ ...s, read: new Set([...s.read, id]) }));
    };

    return (
      <div className="lane lane-comms">
        <div className="lane-header">
          <div className="lane-title">
            <span className="lane-title-label">Comms</span>
            <span className="lane-title-count">{counts.inbox + counts.sent}</span>
          </div>
          <div className="lane-actions">
            <div style={{position:'relative'}} ref={pickerRef}>
              <button className="btn-primary tiny" onClick={()=>setShowNewPicker(s=>!s)}>
                <I.plus/> New
              </button>
              {showNewPicker && (
                <div style={{position:'absolute',top:'calc(100% + 6px)',right:0,background:'var(--bg-1)',border:'0.5px solid var(--sep)',borderRadius:'var(--radius-md)',boxShadow:'0 6px 20px rgba(0,0,0,0.25)',padding:4,zIndex:200,minWidth:148}}>
                  {['email','teams','whatsapp','linkedin'].map(ch => (
                    <button key={ch}
                      style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 10px',borderRadius:'var(--radius-sm)',fontSize:12,color:'var(--text-1)',textTransform:'capitalize'}}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--fill-1)'}
                      onMouseLeave={e=>e.currentTarget.style.background=''}
                      onClick={()=>{ onCompose({channel:ch}); setShowNewPicker(false); }}>
                      <ChannelIcon ch={ch} size={13}/>
                      {ch}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="comms-searchrow">
          <div className="searchfield">
            <I.search style={{color:'var(--text-3)'}}/>
            <input placeholder="Search all comms" value={q} onChange={e=>setQ(e.target.value)} />
            {q && <button className="icon-btn tiny" onClick={()=>setQ('')}><I.close/></button>}
          </div>
        </div>

        <div className="comms-channelrow">
          {['all','email','teams','whatsapp','linkedin'].map(c => (
            <button key={c} className={`chip ${channel===c ? 'chip-on' : ''}`} onClick={()=>setChannel(c)}>
              {c !== 'all' && <ChannelIcon ch={c} size={10}/>}
              <span>{c === 'all' ? 'All channels' : c}</span>
            </button>
          ))}
        </div>

        <div className="comms-folders">
          {[
            ['inbox',    'Inbox',    counts.inbox],
            ['sent',     'Sent',     counts.sent],
            ['archived', 'Archived', counts.archived],
          ].map(([k,label,n]) => (
            <button key={k} className={`folder ${folder===k ? 'folder-on' : ''}`} onClick={()=>setFolder(k)}>
              <span>{label}</span>
              <span className="folder-count">{n}</span>
            </button>
          ))}
        </div>

        {accountScope && (
          <div className="scope-banner">
            <span>Scoped to <b>{BD_DATA.byId.account(accountScope)?.name}</b></span>
            <button className="icon-btn tiny" onClick={onClearScope}><I.close/></button>
          </div>
        )}

        <div className="comms-split">
          <div className="comms-list">
            {groups.length === 0 && <div className="empty">No messages match.</div>}
            {groups.map(([label, items]) => (
              <div key={label}>
                <div className="group-header">{label}</div>
                {items.map(m => (
                  <CommRow key={m.id} msg={m}
                    isRead={store.read.has(m.id) || !m.unread}
                    selected={m.id === selectedId}
                    onClick={()=>{ onSelect(m.id); markRead(m.id); }} />
                ))}
              </div>
            ))}
          </div>

          <ReadingPane
            msg={selectedMsg}
            isArchived={selectedMsg && store.archived.has(selectedMsg.id)}
            onArchive={()=>selectedMsg && archive(selectedMsg.id)}
            onUnarchive={()=>selectedMsg && unarchive(selectedMsg.id)}
            onReply={(kind)=> selectedMsg && onCompose({
              kind,
              contactId: selectedMsg.dir === 'in' ? selectedMsg.from : null,
              accountId: selectedMsg.account,
              dealId: selectedMsg.deal,
              channel: selectedMsg.channel,
              commId: selectedMsg.id,
              replyTo: selectedMsg,
            })}
            onConvertToAction={()=>selectedMsg && onConvertToAction({
              title: `Follow-up: ${selectedMsg.subject || 'thread'}`,
              accountId: selectedMsg.account, dealId: selectedMsg.deal,
            })}
          />
        </div>
      </div>
    );
  }

  function CommRow({ msg, selected, isRead, onClick }) {
    const from = msg.dir === 'in' ? BD_DATA.byId.contact(msg.from) : { name: 'You' };
    const account = BD_DATA.byId.account(msg.account);
    return (
      <div className={`comm-row ${selected ? 'comm-row-on' : ''} ${!isRead ? 'comm-row-unread' : ''}`} onClick={onClick}>
        <div className="comm-row-top">
          <div className="comm-row-left">
            {!isRead && <span className="unread-dot"/>}
            <ChannelIcon ch={msg.channel} size={12}/>
            <span className="comm-from">{msg.dir === 'out' ? `→ ${account?.name}` : from?.name}</span>
          </div>
          <div className="comm-row-right">
            {msg.hasAttach && <I.paperclip style={{color:'var(--text-3)'}}/>}
            <span className="comm-time">{fmtRelative(msg.ts)}</span>
          </div>
        </div>
        <div className="comm-subject">{msg.subject || <em style={{color:'var(--text-3)'}}>(no subject)</em>}</div>
        <div className="comm-preview">{msg.preview}</div>
        <div className="comm-row-bottom">
          <span className="comm-account">
            <AccountMark account={account} size={12}/>
            {account?.name}
          </span>
          {msg.deal && (
            <span className="comm-deal">· {BD_DATA.byId.deal(msg.deal)?.title}</span>
          )}
        </div>
      </div>
    );
  }

  function ReadingPane({ msg, isArchived, onArchive, onUnarchive, onReply, onConvertToAction }) {
    if (!msg) {
      return <div className="reading-pane reading-empty">Select a message</div>;
    }
    const from = msg.dir === 'in' ? BD_DATA.byId.contact(msg.from) : { name: 'You (Michiel V.G.)', role: '', email: 'mvg@eclectik.io' };
    const account = BD_DATA.byId.account(msg.account);
    const deal = msg.deal ? BD_DATA.byId.deal(msg.deal) : null;
    const attachments = buildAttachments(msg);
    const body = msg.body || buildBody(msg);

    return (
      <div className="reading-pane">
        <div className="rp-head">
          <div className="rp-actions">
            <button className="btn-primary tiny" onClick={()=>onReply('reply')} disabled={msg.dir==='out'}>
              <I.reply/> Reply
            </button>
            <button className="btn-ghost tiny" onClick={()=>onReply('reply-all')} disabled={msg.dir==='out'}>Reply all</button>
            <button className="btn-ghost tiny" onClick={()=>onReply('forward')}><I.forward/> Forward</button>
            <span style={{flex:1}}/>
            <button className="btn-ghost tiny" onClick={onConvertToAction}><I.calendar/> Add task</button>
            {isArchived ? (
              <button className="btn-ghost tiny" onClick={onUnarchive}>Unarchive</button>
            ) : (
              <button className="btn-ghost tiny" onClick={onArchive} title="Archive"><I.archive/> Archive</button>
            )}
          </div>

          <div className="rp-subject">{msg.subject || <em style={{color:'var(--text-3)'}}>(no subject)</em>}</div>

          <div className="rp-meta">
            <Avatar name={from?.name} size={28} color={`oklch(62% 0.08 ${(account?.logoHue ?? 220)})`}/>
            <div className="rp-meta-main">
              <div className="rp-from">
                <b>{from?.name}</b>
                {from?.email && <span className="rp-email"> · {from.email}</span>}
              </div>
              <div className="rp-to">
                <span className="rp-dim">To:</span>{' '}
                {msg.dir === 'in' ? 'me' : `${BD_DATA.byId.contact(msg.from)?.name || account?.name || ''}`}
                {msg.cc && <><span className="rp-dim"> · Cc:</span> {msg.cc}</>}
              </div>
            </div>
            <div className="rp-time">
              <ChannelIcon ch={msg.channel} size={12}/>
              <span>{fmtFull(msg.ts)}</span>
            </div>
          </div>

          <div className="rp-tags">
            <span className="pill"><AccountMark account={account} size={10}/> {account?.name}</span>
            {deal && <span className={`stage-pill stage-${deal.stage}`}>{deal.title} · {fmtMoney(deal.value)}</span>}
            <span className="pill pill-muted" style={{fontFamily:'var(--font-mono)', fontSize:10}}>Saved · DB</span>
          </div>
        </div>

        <div className="rp-body">
          {body.split('\n').map((line, i) => (
            line.trim() === '' ? <div key={i} className="rp-p-spacer"/> : <p key={i} className="rp-p">{line}</p>
          ))}
        </div>

        {attachments.length > 0 && (
          <div className="rp-attachments">
            <div className="rp-attachments-title">
              <I.paperclip/> {attachments.length} attachment{attachments.length>1?'s':''}
            </div>
            <div className="rp-attachments-grid">
              {attachments.map(a => (
                <div key={a.name} className="attachment-card">
                  <div className={`attachment-thumb attachment-thumb-${a.type}`}>
                    <span>{a.type.toUpperCase()}</span>
                  </div>
                  <div className="attachment-meta">
                    <div className="attachment-name">{a.name}</div>
                    <div className="attachment-size">{a.size}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function buildBody(msg) {
    // full-text body drawn from preview + a bit more context
    const from = BD_DATA.byId.contact(msg.from);
    const firstName = (from?.name || 'there').split(' ')[0];
    const greet = msg.channel === 'email' ? `Hi Michiel,` : msg.channel === 'teams' ? `@Michiel` : '';
    const sig = msg.channel === 'email' ? `\n\nKind regards,\n${from?.name || 'Sender'}\n${from?.role || ''}` : '';
    const ext = {
      m1: `\n\nThe structural piece is fine — the MDF pool split between Tier 1 and Tier 2 is workable at 60/40, but our legal team has pushed back on the 60-day termination clause. They want 30 days to mirror the framework we run with the other two partners.\n\nI suggested 45 days as a compromise. Could you confirm whether that lands on your side? If so, I'd like to get v3 of the SOW circulated by Friday so we can brief the board on Monday.`,
      m2: `\n\nThe chair wants to see our position on the retainer structure before Thursday's board. 15 minutes should be enough — I'll drive.`,
      m4: `\n\nProposed agenda:\n• 09:00 — Intros, scope refresher\n• 09:15 — Current procurement landscape\n• 10:00 — Category deep dive (IT, facilities, logistics)\n• 11:15 — Consolidation scenarios\n• 11:45 — Next steps + owners\n\nWe'll bring Ilse and one of our sourcing directors. Let me know if two hours is enough or you'd rather block three.`,
      m6: `\n\nHeadline open items remaining:\n\n4.2 — Liability cap. Our position: 2x annual fees. Your position: 1x. Proposing 1.5x with an uplift for IP-related claims.\n\n7.1 — IP carve-out. We need to protect the pre-existing partner-ops framework; happy to grant you a perpetual non-exclusive licence for internal use.\n\n11 — Governing law. Defaulting to English law + London seat as per prior deals.\n\nFull redline attached. Would be good to land these by end of week.`,
    }[msg.id] || `\n\n${msg.preview}`;

    return `${greet}${greet ? '\n\n' : ''}${msg.preview}${ext}${sig}`;
  }

  function buildAttachments(msg) {
    if (!msg.hasAttach) return [];
    return {
      m1: [{ name: 'SOW_v2_OrbitalSystems.docx', size: '342 kB', type: 'doc' }, { name: 'MDF_pool_model.xlsx', size: '1.1 MB', type: 'xls' }],
      m6: [{ name: 'MSA_redlines_v2.pdf', size: '820 kB', type: 'pdf' }],
      m9: [{ name: 'Partner_tier_split.pdf', size: '2.4 MB', type: 'pdf' }, { name: 'Deck_MDF.pptx', size: '6.8 MB', type: 'ppt' }],
    }[msg.id] || [{ name: 'attachment.pdf', size: '—', type: 'pdf' }];
  }

  Object.assign(window, { CommsLane });
})();
