// Accounts 360 lane — right-hand detail panel, follows selection
(function () {
  const { useState, useEffect } = React;
  const { ACCOUNTS } = BD_DATA;

  function useTaskStore() {
    const [, force] = useState(0);
    useEffect(() => {
      if (window.BD_TASKSTORE) return window.BD_TASKSTORE.subscribeTStore(() => force(x => x + 1));
    }, []);
    return window.BD_TASKSTORE ? window.BD_TASKSTORE.getTStore() : { done: new Set(), extra: [] };
  }

  function getAttachments(msg) {
    if (!msg.hasAttach) return [];
    const known = {
      m1: [{ name: 'SOW_v2_OrbitalSystems.docx', size: '342 kB', type: 'doc' }, { name: 'MDF_pool_model.xlsx', size: '1.1 MB', type: 'xls' }],
      m6: [{ name: 'MSA_redlines_v2.pdf', size: '820 kB', type: 'pdf' }],
      m9: [{ name: 'Partner_tier_split.pdf', size: '2.4 MB', type: 'pdf' }, { name: 'Deck_MDF.pptx', size: '6.8 MB', type: 'ppt' }],
    };
    return known[msg.id] || [{ name: 'attachment.pdf', size: '—', type: 'pdf' }];
  }

  const DOC_COLOR = { pdf: '#e55', doc: '#4a90d9', xls: '#27ae60', ppt: '#e67e22', default: '#888' };

  function AccountsLane({ context, onPickAccount, onComposeTo, onConvertToAction, onOpenDeal, onSelectComm }) {
    const resolved = resolveContext(context);
    const account  = resolved.account;
    const [lastAccount, setLastAccount] = React.useState(null);

    React.useEffect(() => {
      if (account) setLastAccount(account);
    }, [account?.id]);

    if (!account) return <AccountsList onPick={onPickAccount} lastAccount={lastAccount}/>;

    return (
      <div className="lane lane-accounts">
        <div className="lane-header">
          <div className="lane-title">
            <span className="lane-title-label">Account 360</span>
          </div>
          <div className="lane-actions">
            <button className="btn-ghost" onClick={()=>onPickAccount(null)}>All accounts</button>
          </div>
        </div>

        <div className="acc-hero" style={{cursor:'pointer'}} onClick={()=>onPickAccount(account.id)}
          title="View account">
          <AccountMark account={account} size={40}/>
          <div style={{flex:1, minWidth:0}}>
            <div className="acc-hero-name">{account.name}</div>
            <div className="acc-hero-meta">
              <span>{account.type}</span><span className="sep">·</span>
              <span>{account.tier}</span><span className="sep">·</span>
              <span>{account.region}</span><span className="sep">·</span>
              <span>ARR {fmtMoney(account.arr)}</span>
            </div>
          </div>
          <OwnerDot id={account.owner} size={10} ring/>
        </div>

        {resolved.highlight && (
          <HighlightStrip h={resolved.highlight} onCompose={onComposeTo}
            onOpenDeal={onOpenDeal} onConvertToAction={onConvertToAction}/>
        )}

        <div className="acc-scroll">
          <Section title="Contacts" count={BD_DATA.forAccount.contacts(account.id).length}>
            <div className="contacts-grid">
              {BD_DATA.forAccount.contacts(account.id).map((c,i) => (
                <ContactCard key={c.id} contact={c} idx={i} accountId={account.id}
                  onComposeTo={onComposeTo} onSelectComm={onSelectComm} onOpenDeal={onOpenDeal}/>
              ))}
            </div>
          </Section>

          <Section title="Open deals" count={BD_DATA.forAccount.deals(account.id).filter(d => !['won','lost'].includes(d.stage)).length}>
            <div className="deals-list">
              {BD_DATA.forAccount.deals(account.id).map(d => (
                <DealDetailRow key={d.id} deal={d} onOpenDeal={onOpenDeal}/>
              ))}
            </div>
          </Section>

          <MeetingsSection account={account}/>

          <Section title="Recent comms" count={BD_DATA.forAccount.comms(account.id).length}>
            <div className="acc-comms">
              {BD_DATA.forAccount.comms(account.id).slice(0,6).map(m => (
                <div key={m.id} className="acc-comm-row"
                  style={{cursor:'pointer', borderRadius:'var(--radius-sm)', padding:'4px 4px'}}
                  onClick={()=>onSelectComm && onSelectComm(m.id)}
                  title="Open in Comms">
                  <ChannelIcon ch={m.channel} size={10}/>
                  <span className="acc-comm-subj">{m.subject || m.preview.slice(0,40)+'…'}</span>
                  <span className="acc-comm-ts">{fmtRelative(m.ts)}</span>
                </div>
              ))}
            </div>
          </Section>

          <DocumentsSection account={account} onSelectComm={onSelectComm}/>

          <TasksSection account={account} onConvertToAction={onConvertToAction} onSelectComm={onSelectComm}/>
        </div>
      </div>
    );
  }

  // ── Contacts: expandable with email, deals, last comm ──────────────────────
  function ContactCard({ contact, idx, accountId, onComposeTo, onSelectComm, onOpenDeal }) {
    const [exp, setExp] = useState(false);
    const deals   = BD_DATA.DEALS.filter(d => d.contact === contact.id);
    const lastComm= BD_DATA.COMMS.find(m => m.from === contact.id);

    return (
      <div style={{borderRadius:'var(--radius-sm)', overflow:'hidden', background:'var(--fill-1)'}}>
        <div className="contact-card" style={{background:'transparent', cursor:'pointer'}} onClick={()=>setExp(e=>!e)}>
          <Avatar name={contact.name} color={`oklch(62% 0.08 ${200 + idx*35})`} size={24}/>
          <div style={{minWidth:0, flex:1}}>
            <div className="contact-name">{contact.name}</div>
            <div className="contact-role">{contact.role}</div>
          </div>
          <button className="icon-btn tiny" title="Email" onClick={e=>{e.stopPropagation(); onComposeTo({contactId:contact.id, accountId, channel:'email'});}}>
            <ChannelIcon ch="email" size={10}/>
          </button>
          <span style={{color:'var(--text-3)', fontSize:8}}>{exp?'▲':'▼'}</span>
        </div>
        {exp && (
          <div style={{borderTop:'0.5px solid var(--sep)', padding:'6px 8px 8px', display:'flex', flexDirection:'column', gap:4}}>
            {contact.email && (
              <div style={{fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)'}}>{contact.email}</div>
            )}
            {deals.map(d => (
              <div key={d.id}
                style={{display:'flex', alignItems:'center', gap:6, padding:'3px 0', cursor:'pointer', fontSize:11}}
                onClick={()=>onOpenDeal(d.id)}>
                <span className={`stage-pill stage-${d.stage}`}>{STAGE_TINT[d.stage].label}</span>
                <span style={{color:'var(--text-2)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{d.title}</span>
                <span style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)'}}>{fmtMoney(d.value)}</span>
              </div>
            ))}
            {lastComm && (
              <div style={{display:'flex', alignItems:'center', gap:6, padding:'3px 0', cursor:'pointer', borderTop:'0.5px solid var(--sep)', marginTop:2, paddingTop:6}}
                onClick={()=>onSelectComm && onSelectComm(lastComm.id)}>
                <ChannelIcon ch={lastComm.channel} size={9}/>
                <span style={{flex:1, fontSize:10, color:'var(--text-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {lastComm.subject || lastComm.preview.slice(0,40)+'…'}
                </span>
                <span style={{fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-3)'}}>{fmtRelative(lastComm.ts)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Meetings: calendar events linked to account ────────────────────────────
  function MeetingsSection({ account }) {
    const meetings = BD_DATA.WEEK.filter(ev => {
      if (!ev.deal) return false;
      const deal = BD_DATA.byId.deal(ev.deal);
      return deal?.account === account.id;
    });
    if (meetings.length === 0) return null;
    const days = ['Mon','Tue','Wed','Thu','Fri'];
    const fmt  = (h) => { const hh = Math.floor(h); const mm = Math.round((h%1)*60); return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; };
    const channelDot = { teams:'#6264a7', 'in-person':'#27ae60', zoom:'#2d8cff', default:'var(--text-3)' };

    return (
      <Section title="Meetings" count={meetings.length}>
        <div style={{display:'flex', flexDirection:'column', gap:4}}>
          {meetings.map(ev => {
            const contact = ev.contact ? BD_DATA.byId.contact(ev.contact) : null;
            return (
              <div key={ev.id} style={{display:'flex', gap:8, padding:'6px 8px', background:'var(--fill-1)', borderRadius:'var(--radius-sm)'}}>
                <div style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)', whiteSpace:'nowrap', paddingTop:1, minWidth:32, textAlign:'center'}}>
                  <div>{days[ev.day]}</div>
                  <div>{fmt(ev.start)}</div>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12, fontWeight:500, color:'var(--text-1)', marginBottom:2}}>{ev.title}</div>
                  <div style={{fontSize:10, color:'var(--text-3)', display:'flex', gap:5, alignItems:'center'}}>
                    <span>{fmt(ev.start)}–{fmt(ev.end)}</span>
                    {ev.channel && <>
                      <span>·</span>
                      <span style={{color: channelDot[ev.channel] || channelDot.default}}>{ev.channel}</span>
                    </>}
                    {contact && <><span>·</span><span>{contact.name}</span></>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    );
  }

  // ── Documents: attachments from account comms ──────────────────────────────
  function DocumentsSection({ account, onSelectComm }) {
    const commsWithAttach = BD_DATA.COMMS.filter(m => m.account === account.id && m.hasAttach);
    if (commsWithAttach.length === 0) return null;

    const docs = commsWithAttach.flatMap(m =>
      getAttachments(m).map(a => ({
        ...a,
        commId: m.id,
        deal:   m.deal,
        ts:     m.ts,
        from:   BD_DATA.byId.contact(m.from)?.name || 'You',
      }))
    );

    return (
      <Section title="Documents" count={docs.length}>
        <div style={{display:'flex', flexDirection:'column', gap:4}}>
          {docs.map((doc, i) => {
            const deal  = doc.deal ? BD_DATA.byId.deal(doc.deal) : null;
            const color = DOC_COLOR[doc.type] || DOC_COLOR.default;
            return (
              <div key={i}
                style={{display:'flex', alignItems:'center', gap:8, padding:'5px 6px', background:'var(--fill-1)', borderRadius:'var(--radius-sm)', cursor:'pointer'}}
                onClick={()=>onSelectComm && onSelectComm(doc.commId)}
                title="Open source message">
                <div style={{width:28, height:28, borderRadius:4, background:color, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontSize:8, fontWeight:700, color:'#fff', flexShrink:0}}>
                  {doc.type.toUpperCase()}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:11, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{doc.name}</div>
                  <div style={{fontSize:10, color:'var(--text-3)', marginTop:1}}>
                    {doc.size}
                    {deal && <span> · {deal.title}</span>}
                    <span> · {fmtRelative(doc.ts)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    );
  }

  // ── Tasks (was "Next actions") ─────────────────────────────────────────────
  function TasksSection({ account, onConvertToAction, onSelectComm }) {
    const taskStore = useTaskStore();
    const allTasks  = window.BD_TASKSTORE
      ? [...window.BD_TASKSTORE.TASKS, ...taskStore.extra]
      : BD_DATA.INBOX_TASKS;

    const calLinked  = allTasks.filter(t => { const d = BD_DATA.byId.deal(t.deal); return d?.account === account.id; });
    const openCal    = calLinked.filter(t => !taskStore.done.has(t.id));
    const closedCal  = calLinked.filter(t =>  taskStore.done.has(t.id));
    const inboxOpen  = BD_DATA.INBOX_TASKS.filter(t => t.account === account.id);

    const [showAll,    setShowAll]    = useState(false);
    const [activeTask, setActiveTask] = useState(null);
    const [showClosed, setShowClosed] = useState(false);

    const accountTasks = [...inboxOpen, ...openCal];
    const allOpen      = allTasks.filter(t => !taskStore.done.has(t.id));
    const display      = showAll ? allOpen : accountTasks;

    const handleComms = (t) => {
      const dealId    = t.deal;
      const accountId = t.account || BD_DATA.byId.deal(dealId)?.account;
      let comm = dealId    ? BD_DATA.COMMS.find(m => m.deal    === dealId)    : null;
      if (!comm) comm = accountId ? BD_DATA.COMMS.find(m => m.account === accountId) : null;
      if (comm && onSelectComm) onSelectComm(comm.id);
      setActiveTask(null);
    };

    return (
      <Section title="Tasks" count={display.length}>
        <div className="actions-list">
          <div style={{display:'flex', alignItems:'center', marginBottom:5}}>
            <span style={{flex:1, fontSize:10, color:'var(--text-3)', fontFamily:'var(--font-mono)'}}>
              {showAll ? 'All tasks' : account.name}
            </span>
            <button className={`chip ${showAll?'chip-on':''}`} style={{fontSize:9,padding:'2px 7px'}}
              onClick={()=>{ setShowAll(s=>!s); setActiveTask(null); }}>
              All tasks
            </button>
          </div>

          {display.map(t => {
            const deal = t.deal ? BD_DATA.byId.deal(t.deal) : null;
            return (
              <div key={t.id}>
                <div className="action-row"
                  style={{cursor:'pointer', background:activeTask===t.id?'var(--fill-2)':undefined, borderRadius:'var(--radius-sm)'}}
                  onClick={()=>setActiveTask(activeTask===t.id ? null : t.id)}>
                  <span className="task-check"/>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:12}}>{t.title}</div>
                    {deal && <div style={{fontSize:10, color:'var(--text-3)', fontFamily:'var(--font-mono)', marginTop:1}}>
                      <span className={`stage-pill stage-${deal.stage}`} style={{fontSize:8}}>{STAGE_TINT[deal.stage].label}</span>
                      {' '}{deal.title}
                    </div>}
                  </div>
                  {activeTask !== t.id && (
                    <button className="btn-ghost tiny" onClick={e=>{e.stopPropagation(); onConvertToAction({title:t.title, accountId:account.id});}}>
                      Schedule
                    </button>
                  )}
                </div>
                {activeTask === t.id && (
                  <div style={{display:'flex', gap:4, padding:'3px 4px 5px 20px', background:'var(--fill-1)', borderRadius:'0 0 var(--radius-sm) var(--radius-sm)', marginBottom:2}}>
                    <button className="btn-primary tiny" onClick={()=>handleComms(t)}><I.send/> Comms</button>
                    <button className="btn-ghost tiny" onClick={()=>{onConvertToAction({title:t.title, accountId:account.id}); setActiveTask(null);}}><I.calendar/> Schedule</button>
                    {deal && <button className="btn-ghost tiny" onClick={()=>{onConvertToAction({title:t.title, accountId:account.id}); setActiveTask(null);}}><I.arrow/> Deal</button>}
                    <button className="icon-btn tiny" onClick={()=>setActiveTask(null)}><I.close/></button>
                  </div>
                )}
              </div>
            );
          })}

          {display.length === 0 && <div style={{fontSize:11,color:'var(--text-3)',padding:'4px 0'}}>No open tasks</div>}

          <button className="action-add" onClick={()=>onConvertToAction({accountId:account.id})}>
            <I.plus/> New task
          </button>

          {!showAll && closedCal.length > 0 && (
            <div style={{marginTop:6, borderTop:'0.5px solid var(--sep)', paddingTop:6}}>
              <button
                style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'var(--text-3)',fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:showClosed?6:0}}
                onClick={()=>setShowClosed(s=>!s)}>
                {showClosed ? <I.chevronD/> : <I.chevronR/>}
                Completed ({closedCal.length})
              </button>
              {showClosed && closedCal.map(t => (
                <div key={t.id} className="action-row" style={{opacity:0.5}}>
                  <span className="task-check task-check-on"><I.check/></span>
                  <span style={{flex:1,textDecoration:'line-through',color:'var(--text-3)'}}>{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    );
  }

  // ── Highlight strip (event/task/comm/deal context banner) ──────────────────
  function HighlightStrip({ h, onCompose, onOpenDeal, onConvertToAction }) {
    return (
      <div className="acc-highlight">
        <div className="acc-highlight-label">{h.label}</div>
        <div className="acc-highlight-body">{h.body}</div>
        <div className="acc-highlight-actions">
          {h.canReply    && <button className="btn-primary tiny" onClick={()=>onCompose(h.replyCtx)}><I.send/> Reply</button>}
          {h.canSchedule && <button className="btn-ghost tiny"   onClick={()=>onConvertToAction(h.actionCtx)}><I.calendar/> Add task</button>}
          {h.dealId      && <button className="btn-ghost tiny"   onClick={()=>onOpenDeal(h.dealId)}><I.arrow/> Open deal</button>}
        </div>
      </div>
    );
  }

  // ── Collapsible section wrapper ────────────────────────────────────────────
  function Section({ title, count, children }) {
    const [open, setOpen] = useState(true);
    return (
      <div className="acc-section">
        <button className="acc-section-head" onClick={()=>setOpen(!open)}>
          {open ? <I.chevronD/> : <I.chevronR/>}
          <span>{title}</span>
          {count !== undefined && <span className="acc-section-count">{count}</span>}
        </button>
        {open && <div className="acc-section-body">{children}</div>}
      </div>
    );
  }

  // ── Accounts list (no selection) ───────────────────────────────────────────
  function AccountsList({ onPick }) {
    const [q, setQ] = useState('');
    const list = ACCOUNTS.filter(a => !q || a.name.toLowerCase().includes(q.toLowerCase()));
    return (
      <div className="lane lane-accounts">
        <div className="lane-header">
          <div className="lane-title">
            <span className="lane-title-label">Accounts</span>
            <span className="lane-title-count">{ACCOUNTS.length}</span>
          </div>
          <div className="lane-actions">
            <button className="icon-btn"><I.plus/></button>
          </div>
        </div>
        <div className="comms-searchrow">
          <div className="searchfield">
            <I.search style={{color:'var(--text-3)'}}/>
            <input placeholder="Search accounts" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
        </div>
        <div className="accounts-grid">
          {list.map(a => (
            <div key={a.id} className="account-card" onClick={()=>onPick(a.id)}>
              <AccountMark account={a} size={28}/>
              <div style={{flex:1, minWidth:0}}>
                <div className="account-card-name">{a.name}</div>
                <div className="account-card-meta">
                  <span>{a.type}</span><span className="sep">·</span>
                  <span>{a.region}</span><span className="sep">·</span>
                  <span>{fmtMoney(a.arr)}</span>
                </div>
              </div>
              <OwnerDot id={a.owner}/>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Deal row with expandable detail ───────────────────────────────────────
  function DealDetailRow({ deal, onOpenDeal }) {
    const [exp, setExp] = useState(false);
    const m = { color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 10, marginBottom: 1 };
    const v = { color: 'var(--text-2)', fontWeight: 500, fontSize: 11 };
    return (
      <div style={{borderRadius:'var(--radius-sm)', overflow:'hidden', marginBottom:2}}>
        <div className="deal-row"
          style={{borderRadius: exp ? 'var(--radius-sm) var(--radius-sm) 0 0' : 'var(--radius-sm)', background: exp ? 'var(--fill-1)' : undefined}}
          onClick={()=>setExp(e=>!e)}>
          <div className="deal-row-left">
            <span className={`stage-pill stage-${deal.stage}`}>{STAGE_TINT[deal.stage].label}</span>
            <span className="deal-row-title">{deal.title}</span>
          </div>
          <div className="deal-row-right">
            <StaleDot days={deal.staleDays}/>
            <span className="deal-row-value">{fmtMoney(deal.value)}</span>
            <OwnerDot id={deal.owner}/>
            <span style={{color:'var(--text-3)', fontSize:8, marginLeft:2}}>{exp?'▲':'▼'}</span>
          </div>
        </div>
        {exp && (
          <div style={{background:'var(--fill-1)', padding:'8px 10px 10px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 16px'}}>
            <div><div style={m}>Type</div><div style={v}>{deal.dealType||'—'}</div></div>
            <div><div style={m}>Source</div><div style={v}>{deal.source||'—'}</div></div>
            <div><div style={m}>Close</div><div style={v}>{deal.closeDate||'—'}</div></div>
            <div><div style={m}>Amount</div><div style={v}>{fmtMoney(deal.value)}</div></div>
            {deal.description && (
              <div style={{gridColumn:'1/-1', marginTop:2, color:'var(--text-2)', fontSize:11, lineHeight:1.45}}>
                {deal.description}
              </div>
            )}
            <div style={{gridColumn:'1/-1', marginTop:4}}>
              <button className="btn-ghost tiny" onClick={e=>{e.stopPropagation(); onOpenDeal(deal.id);}}>
                <I.arrow/> Full view
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Context resolver ───────────────────────────────────────────────────────
  function resolveContext(ctx) {
    if (!ctx) return {};
    if (ctx.type === 'account') {
      return { account: BD_DATA.byId.account(ctx.id) };
    }
    if (ctx.type === 'comm') {
      const m = BD_DATA.byId.comm(ctx.id);
      if (!m) return {};
      const account = BD_DATA.byId.account(m.account);
      const from    = m.dir === 'in' ? BD_DATA.byId.contact(m.from) : null;
      return {
        account,
        highlight: {
          label: `${m.channel.toUpperCase()} · ${m.dir === 'in' ? 'from '+from?.name : 'sent by you'} · ${fmtRelative(m.ts)}`,
          body: m.subject ? `${m.subject} — ${m.preview}` : m.preview,
          canReply:   m.dir === 'in',
          replyCtx:   { contactId: m.from, accountId: m.account, channel: m.channel, dealId: m.deal, commId: m.id },
          canSchedule: true,
          actionCtx:  { title: `Follow up: ${m.subject || 'thread'}`, accountId: m.account, dealId: m.deal },
          dealId: m.deal,
        },
      };
    }
    if (ctx.type === 'event') {
      const e   = ctx.event; if (!e) return {};
      const deal    = e.deal ? BD_DATA.byId.deal(e.deal) : null;
      const account = deal   ? BD_DATA.byId.account(deal.account) : null;
      const contact = e.contact ? BD_DATA.byId.contact(e.contact) : null;
      return {
        account,
        highlight: {
          label: `MEETING · ${e.channel || 'calendar'} · ${['Mon','Tue','Wed','Thu','Fri'][e.day] || ''}`,
          body: e.title + (contact ? ` · ${contact.name}` : ''),
          canReply:    !!deal,
          replyCtx:    deal ? { contactId: e.contact, accountId: account?.id, dealId: deal.id, channel: e.channel === 'email' ? 'email' : 'email' } : null,
          canSchedule: true,
          actionCtx:   { title: `Follow-up: ${e.title}`, accountId: account?.id, dealId: deal?.id },
          dealId: deal?.id,
        }
      };
    }
    if (ctx.type === 'task') {
      const t   = ctx.task; if (!t) return {};
      const deal    = t.deal ? BD_DATA.byId.deal(t.deal) : null;
      const account = deal   ? BD_DATA.byId.account(deal.account) : (t.account ? BD_DATA.byId.account(t.account) : null);
      return {
        account,
        highlight: {
          label: `TASK${deal ? ' · '+deal.title : ''}`,
          body: t.title,
          canReply:    !!deal,
          replyCtx:    deal ? { accountId: account?.id, dealId: deal.id, channel: 'email' } : null,
          canSchedule: true,
          actionCtx:   { title: t.title, accountId: account?.id, dealId: deal?.id },
          dealId: deal?.id,
        }
      };
    }
    if (ctx.type === 'deal') {
      const deal    = BD_DATA.byId.deal(ctx.id);
      if (!deal) return {};
      const account = BD_DATA.byId.account(deal.account);
      return {
        account,
        highlight: {
          label: `DEAL · ${STAGE_TINT[deal.stage].label} · ${fmtMoney(deal.value)}`,
          body: deal.title,
          canReply:    true,
          replyCtx:    { accountId: deal.account, dealId: deal.id, contactId: deal.contact, channel: 'email' },
          canSchedule: true,
          actionCtx:   { title: deal.nextTask, accountId: deal.account, dealId: deal.id },
          dealId: deal.id,
        }
      };
    }
    return {};
  }

  Object.assign(window, { AccountsLane });
})();
