// Funnel swimlane view — replaces the middle Calendar lane
(function () {
  const { useState } = React;
  const { STAGES, DEALS } = BD_DATA;

  function FunnelLane({ onSelectDeal, filters, setFilters, onClose }) {
    const [collapsed, setCollapsed] = useState(false);
    const [draggingId, setDraggingId] = useState(null);
    const [overStage, setOverStage] = useState(null);
    const [confirmMove, setConfirmMove] = useState(null); // {dealId, toStage}
    const [localDeals, setLocalDeals] = useState(DEALS);
    const [showNewDeal, setShowNewDeal] = useState(false);

    const filteredDeals = localDeals.filter(d => {
      if (filters.owners.length && !filters.owners.includes(d.owner)) return false;
      if (filters.types.length) {
        const acc = BD_DATA.byId.account(d.account);
        if (!filters.types.includes(acc?.type)) return false;
      }
      return true;
    });

    const byStage = STAGES.map(s => ({
      stage: s,
      deals: filteredDeals.filter(d => d.stage === s.id),
    }));

    const doMove = (dealId, toStage) => {
      setLocalDeals(ds => ds.map(d => d.id === dealId ? { ...d, stage: toStage } : d));
      setConfirmMove(null);
    };

    return (
      <div className="lane lane-funnel">
        <div className="lane-header">
          <div className="lane-title">
            <span className="lane-title-label">Funnel</span>
            <span className="lane-title-count">{filteredDeals.length} deals · {fmtMoney(filteredDeals.reduce((s,d)=>s+d.value,0))}</span>
          </div>
          <div className="lane-actions">
            <button className="btn-primary tiny" onClick={()=>setShowNewDeal(true)}>
              <I.plus/> New deal
            </button>
            <button className="btn-ghost" onClick={()=>setCollapsed(c=>!c)}>
              {collapsed ? 'Expand all' : 'Collapse all'}
            </button>
            <button className="icon-btn" onClick={onClose} title="Close funnel"><I.close/></button>
          </div>
        </div>

        <div className="funnel-filters">
          <div className="filter-group">
            <span className="filter-label">Owner</span>
            {Object.values(BD_DATA.OWNERS).map(o => (
              <button key={o.id}
                className={`chip ${filters.owners.includes(o.id) ? 'chip-on' : ''}`}
                onClick={()=>setFilters({...filters, owners: toggle(filters.owners, o.id)})}>
                <span className="owner-mini-dot" style={{background:o.color}}/>
                {o.id}
              </button>
            ))}
          </div>
          <div className="filter-group">
            <span className="filter-label">Type</span>
            {['Partner','Direct','Advisory'].map(t => (
              <button key={t}
                className={`chip ${filters.types.includes(t) ? 'chip-on' : ''}`}
                onClick={()=>setFilters({...filters, types: toggle(filters.types, t)})}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="funnel-lanes">
          {byStage.map(({stage, deals}) => {
            const total = deals.reduce((s,d)=>s+d.value,0);
            const isOver = overStage === stage.id;
            return (
              <div key={stage.id} className={`swimlane ${isOver?'swimlane-over':''} ${collapsed?'swimlane-collapsed':''}`}
                onDragOver={(e)=>{ e.preventDefault(); setOverStage(stage.id); }}
                onDragLeave={()=>setOverStage(null)}
                onDrop={(e)=>{
                  e.preventDefault();
                  setOverStage(null);
                  if (draggingId) {
                    const d = localDeals.find(x=>x.id===draggingId);
                    if (d && d.stage !== stage.id) {
                      setConfirmMove({ dealId: draggingId, toStage: stage.id });
                    }
                    setDraggingId(null);
                  }
                }}>
                <div className="swimlane-head" style={{'--stage-hue': STAGE_TINT[stage.id].hue}}>
                  <div className="swimlane-head-top">
                    <span className="swimlane-dot"/>
                    <span className="swimlane-label">{stage.label}</span>
                    <span className="swimlane-count">{deals.length}</span>
                  </div>
                  <div className="swimlane-value">{fmtMoney(total)}</div>
                </div>
                {!collapsed && (
                  <div className="swimlane-body">
                    {deals.map(d => (
                      <DealCard key={d.id} deal={d} dragging={draggingId===d.id}
                        onDragStart={()=>setDraggingId(d.id)}
                        onDragEnd={()=>setDraggingId(null)}
                        onClick={()=>onSelectDeal(d.id)} />
                    ))}
                    {deals.length === 0 && <div className="swimlane-empty">No deals</div>}
                  </div>
                )}
                {collapsed && (
                  <div className="swimlane-summary">
                    {deals.slice(0,3).map(d => (
                      <div key={d.id} className="swimlane-summary-row" onClick={()=>onSelectDeal(d.id)}>
                        <OwnerDot id={d.owner}/>
                        <span>{d.title}</span>
                        <span className="swimlane-summary-value">{fmtMoney(d.value)}</span>
                      </div>
                    ))}
                    {deals.length > 3 && <div className="swimlane-more">+{deals.length - 3} more</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showNewDeal && (
          <NewDealModal
            onClose={()=>setShowNewDeal(false)}
            onAdd={(deal)=>setLocalDeals(ds=>[...ds, deal])}
          />
        )}

        {confirmMove && (
          <div className="modal-backdrop" onClick={()=>setConfirmMove(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">Move deal to {STAGE_TINT[confirmMove.toStage].label}?</div>
              <div className="modal-body">
                <div className="modal-body-strong">{localDeals.find(d=>d.id===confirmMove.dealId)?.title}</div>
                <div className="modal-body-sub">
                  From <b>{STAGE_TINT[localDeals.find(d=>d.id===confirmMove.dealId)?.stage].label}</b> → <b>{STAGE_TINT[confirmMove.toStage].label}</b>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-ghost" onClick={()=>setConfirmMove(null)}>Cancel</button>
                <button className="btn-primary" onClick={()=>doMove(confirmMove.dealId, confirmMove.toStage)}>Confirm move</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function NewDealModal({ onClose, onAdd }) {
    const [title,     setTitle]     = useState('');
    const [accountId, setAccountId] = useState('');
    const [contacts,  setContacts]  = useState([]);
    const [dealType,  setDealType]  = useState('ROI');
    const [source,    setSource]    = useState('Inbound');
    const [stage,     setStage]     = useState('lead');
    const [value,     setValue]     = useState('');

    const accountContacts = accountId ? BD_DATA.CONTACTS.filter(c => c.account === accountId) : [];

    const toggleContact = (id) =>
      setContacts(cs => cs.includes(id) ? cs.filter(x => x !== id) : [...cs, id]);

    // Reset contacts when account changes
    const pickAccount = (id) => { setAccountId(id); setContacts([]); };

    const canSave = title.trim() && accountId;

    const handleAdd = () => {
      if (!canSave) return;
      onAdd({
        id: 'nd_' + Date.now(),
        title: title.trim(),
        account: accountId,
        contact: contacts[0] || null,
        value: parseInt(value.replace(/\D/g, '')) || 0,
        stage,
        owner: 'MVG',
        staleDays: 0,
        nextTask: 'Initial outreach',
        dueIn: 7,
        dealType,
        source,
        closeDate: '',
        description: '',
      });
      onClose();
    };

    const F = ({ label, children }) => (
      <div style={{display:'flex',flexDirection:'column',gap:5}}>
        <span style={{fontSize:10,fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text-3)'}}>{label}</span>
        {children}
      </div>
    );

    const chipRow = (options, selected, onToggle, single) => (
      <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
        {options.map(o => {
          const id  = typeof o === 'string' ? o : o.id;
          const lbl = typeof o === 'string' ? o : o.label;
          const on  = single ? selected === id : selected.includes(id);
          return (
            <button key={id} className={`chip ${on ? 'chip-on' : ''}`}
              style={{fontSize:11}}
              onClick={()=> single ? onToggle(id) : onToggle(id)}>
              {lbl}
            </button>
          );
        })}
      </div>
    );

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" style={{width:380,maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}>
          <div className="modal-title">New deal</div>
          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>

            <F label="Client">
              <select
                value={accountId}
                onChange={e=>pickAccount(e.target.value)}
                style={{background:'var(--fill-1)',border:'0.5px solid var(--sep)',borderRadius:'var(--radius-sm)',padding:'6px 8px',color:'var(--text-1)',fontSize:12,width:'100%'}}>
                <option value="">Select account…</option>
                {BD_DATA.ACCOUNTS.map(a=>(
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </F>

            <F label="Topic">
              <input
                placeholder="Deal title…"
                value={title}
                onChange={e=>setTitle(e.target.value)}
                style={{background:'var(--fill-1)',border:'0.5px solid var(--sep)',borderRadius:'var(--radius-sm)',padding:'6px 8px',color:'var(--text-1)',fontSize:12,width:'100%',boxSizing:'border-box'}}
              />
            </F>

            {accountContacts.length > 0 && (
              <F label={`Contact${contacts.length > 1 ? 's' : ''}`}>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                  {accountContacts.map(c => (
                    <button key={c.id}
                      className={`chip ${contacts.includes(c.id) ? 'chip-on' : ''}`}
                      style={{fontSize:11}}
                      onClick={()=>toggleContact(c.id)}>
                      {c.name}
                      <span style={{fontSize:9,opacity:0.6,marginLeft:3}}>{c.role}</span>
                    </button>
                  ))}
                </div>
              </F>
            )}

            <F label="Type">
              {chipRow(['ROI','ROE','GLINT','Other'], dealType, setDealType, true)}
            </F>

            <F label="Source">
              {chipRow(['Inbound','Outbound','Referral','Renewal','Platform'], source, setSource, true)}
            </F>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <F label="Stage">
                <select
                  value={stage}
                  onChange={e=>setStage(e.target.value)}
                  style={{background:'var(--fill-1)',border:'0.5px solid var(--sep)',borderRadius:'var(--radius-sm)',padding:'6px 8px',color:'var(--text-1)',fontSize:12}}>
                  {STAGES.filter(s=>!['won','lost'].includes(s.id)).map(s=>(
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </F>
              <F label="Value (€)">
                <input
                  placeholder="0"
                  value={value}
                  onChange={e=>setValue(e.target.value)}
                  style={{background:'var(--fill-1)',border:'0.5px solid var(--sep)',borderRadius:'var(--radius-sm)',padding:'6px 8px',color:'var(--text-1)',fontSize:12,width:'100%',boxSizing:'border-box'}}
                />
              </F>
            </div>

          </div>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={!canSave} onClick={handleAdd}>
              Add deal
            </button>
          </div>
        </div>
      </div>
    );
  }

  function DealCard({ deal, dragging, onDragStart, onDragEnd, onClick }) {
    const account = BD_DATA.byId.account(deal.account);
    const contact = BD_DATA.byId.contact(deal.contact);
    return (
      <div className={`deal-card ${dragging?'deal-card-dragging':''}`}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onClick}>
        <div className="deal-card-top">
          <AccountMark account={account} size={14}/>
          <span className="deal-card-account">{account?.name}</span>
          <OwnerDot id={deal.owner}/>
        </div>
        <div className="deal-card-title">{deal.title}</div>
        <div className="deal-card-meta">
          <span className="deal-card-contact">{contact?.name}</span>
        </div>
        <div className="deal-card-bottom">
          <span className="deal-card-value">{fmtMoney(deal.value)}</span>
          <div className="deal-card-flags">
            <StaleDot days={deal.staleDays}/>
            <span className={`next-task ${deal.dueIn === 0 ? 'next-task-urgent' : ''}`}>
              {deal.dueIn === 0 ? 'Today' : `${deal.dueIn}d`} · {deal.nextTask}
            </span>
          </div>
        </div>
      </div>
    );
  }

  function toggle(arr, v) { return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]; }

  Object.assign(window, { FunnelLane });
})();
