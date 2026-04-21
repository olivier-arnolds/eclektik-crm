// Root app — wires lanes together
// Layout (chat2 update): left = Calendar/Funnel/Meeting, mid = Comms, right = Accounts 360
(function () {
  const { useState, useEffect, useRef, useMemo } = React;

  function App() {
    // Global UI state
    const [theme, setTheme] = useLocal('bd.theme', 'light');
    const [user, setUser] = useLocal('bd.user', 'MVG');
    const [layout, setLayout] = useLocal('bd.layout', 'fixed'); // fixed | focused
    const [view, setView] = useLocal('bd.view', 'workspace'); // workspace | funnel
    const [showTweaks, setShowTweaks] = useState(false);
    const [showFunnelBand, setShowTweakFunnelBand] = useLocal('bd.funnelBand', true);
    const [showTweaksButton, setShowTweaksButton] = useState(false);

    // Lane widths (fractions)
    const [widths, onDragDivider] = useResizableLanes([0.30, 0.42, 0.28], [280, 340, 300]);

    // Selection state
    const [selectedComm, setSelectedComm] = useState('m1');
    const [accountScope, setAccountScope] = useState(null);
    const [rightContext, setRightContext] = useState({ type: 'comm', id: 'm1' });
    const [meeting, setMeeting] = useState(null); // when open, left lane shows meeting view
    const [composeCtx, setComposeCtx] = useState(null);
    const [toast, setToast] = useState(null);
    const [focusLane, setFocusLane] = useState('comms'); // for 'focused' layout

    // Funnel filters
    const [funnelFilters, setFunnelFilters] = useState({ owners: [], types: [] });

    // Tweaks bridge
    useEffect(() => {
      const handler = (e) => {
        const d = e.data || {};
        if (d.type === '__activate_edit_mode') setShowTweaksButton(true);
        if (d.type === '__deactivate_edit_mode') { setShowTweaksButton(false); setShowTweaks(false); }
      };
      window.addEventListener('message', handler);
      window.parent.postMessage({ type: '__edit_mode_available' }, '*');
      return () => window.removeEventListener('message', handler);
    }, []);

    // Apply theme
    useEffect(() => {
      document.body.className = theme === 'dark' ? 'theme-dark' : 'theme-light';
    }, [theme]);

    // Select handlers
    const selectComm = (id) => {
      setSelectedComm(id);
      setRightContext({ type: 'comm', id });
      if (layout === 'focused') setFocusLane('comms');
    };
    const selectEvent = (ev) => {
      setRightContext({ type: 'event', event: ev });
    };
    const selectTask = (t) => {
      setRightContext({ type: 'task', task: t });
    };
    const openMeeting = (ev) => {
      setMeeting(ev);
      if (layout === 'focused') setFocusLane('calendar');
    };
    const pickAccount = (id) => {
      setAccountScope(id);
      if (id) setRightContext({ type: 'account', id });
      else setRightContext(null);
    };
    const openDeal = (id) => {
      setRightContext({ type: 'deal', id });
      if (layout === 'focused') setFocusLane('accounts');
    };
    const composeTo = (ctx) => setComposeCtx(ctx || {});
    const handleSend = (payload) => {
      setComposeCtx(null);
      setToast(`Draft ready · ${payload.channel === 'email' ? 'Opening Outlook' : payload.channel === 'teams' ? 'Posting to Teams' : 'Sending'}…`);
      setTimeout(() => setToast(null), 2400);
    };
    const convertToAction = (ctx) => {
      setComposeCtx(null);
      const title = ctx?.title || 'New action';
      setToast(`Scheduled: "${title}" — 1 week from today`);
      setTimeout(() => setToast(null), 2600);
    };

    // Lane flex styles
    const laneStyle = (idx) => {
      if (layout === 'focused') {
        const laneKey = ['calendar','comms','accounts'][idx];
        const isFocus = laneKey === focusLane;
        return { flex: isFocus ? '1 1 0' : '0 0 180px' };
      }
      return { flex: `${widths[idx]} 1 0`, minWidth: 0 };
    };

    const leftIsFunnel = view === 'funnel';

    return (
      <div className="app" data-layout={layout}>
        {/* ---------- Topbar ---------- */}
        <div className="topbar">
          <div className="topbar-brand">
            <span className="brand-mark">Ek</span>
            <span>Eclectik</span>
            <span style={{color:'var(--text-3)', fontWeight:400, fontSize:12}}>BD</span>
          </div>
          <div className="topbar-sep"/>

          <div className="topbar-nav">
            <button className={view==='workspace' ? 'on' : ''} onClick={()=>{ setView('workspace'); setMeeting(null); }}>
              <I.calendar/><span>Calendar</span>
            </button>
            <button className={view==='funnel' ? 'on' : ''} onClick={()=>{ setView('funnel'); setMeeting(null); }}>
              <I.funnel/><span>Funnel</span>
            </button>
          </div>

          <div className="topbar-sep"/>

          <div className="topbar-nav">
            <button className={layout==='fixed' ? 'on' : ''} onClick={()=>setLayout('fixed')}>3 lanes</button>
            <button className={layout==='focused' ? 'on' : ''} onClick={()=>setLayout('focused')}>Focus mode</button>
          </div>

          <div className="topbar-search">
            <div className="searchfield" style={{width:'100%'}}>
              <I.search style={{color:'var(--text-3)'}}/>
              <input placeholder="Search accounts, deals, contacts, messages…" />
              <span className="pill pill-muted" style={{fontFamily:'var(--font-mono)', fontSize:10}}>⌘K</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="user-switch" title="Switch user view">
              {['MVG','OA','YK'].map(k => (
                <button key={k} className={user===k ? 'on' : ''}
                  onClick={()=>setUser(k)}
                  style={{color: user===k ? BD_DATA.OWNERS[k].color : undefined}}>
                  {BD_DATA.OWNERS[k].initials}
                </button>
              ))}
            </div>
            <button className="icon-btn" onClick={()=>setTheme(theme==='dark' ? 'light' : 'dark')} title="Toggle theme">
              {theme==='dark' ? <I.sun/> : <I.moon/>}
            </button>
            {showTweaksButton && (
              <button className="icon-btn" onClick={()=>setShowTweaks(s=>!s)} title="Tweaks"><I.dots/></button>
            )}
          </div>
        </div>

        {/* ---------- Lanes ---------- */}
        <div className="lanes">
          {/* Left: Calendar / Funnel / Meeting */}
          <div className={`lane-wrap ${focusLane==='calendar' ? 'lane-focused' : ''}`} style={{...laneStyle(0), display:'flex'}}>
            {leftIsFunnel ? (
              <FunnelLane
                onSelectDeal={openDeal}
                filters={funnelFilters}
                setFilters={setFunnelFilters}
                onClose={()=>setView('workspace')}
              />
            ) : meeting ? (
              <MeetingLane meeting={meeting} onBack={()=>setMeeting(null)}
                onSummaryLinked={(m)=>{
                  const deal = m.deal ? BD_DATA.byId.deal(m.deal) : null;
                  if (deal) setRightContext({ type: 'deal', id: deal.id });
                }}
              />
            ) : (
              <CalendarLane
                onOpenMeeting={openMeeting}
                onQuickAdd={(day) => setToast(`Quick-add task to ${['Mon','Tue','Wed','Thu','Fri'][day]}`)}
                onSelectEvent={selectEvent}
                onSelectTask={selectTask}
              />
            )}
          </div>
          {layout === 'fixed' && <div className="divider" onMouseDown={onDragDivider(0)}/>}

          {/* Middle: Comms */}
          <div className={`lane-wrap ${focusLane==='comms' ? 'lane-focused' : ''}`} style={{...laneStyle(1), display:'flex'}}>
            <CommsLane
              selectedId={selectedComm}
              accountScope={accountScope}
              onClearScope={()=>setAccountScope(null)}
              onSelect={selectComm}
              onCompose={composeTo}
            />
          </div>
          {layout === 'fixed' && <div className="divider" onMouseDown={onDragDivider(1)}/>}

          {/* Right: Accounts 360 */}
          <div className={`lane-wrap ${focusLane==='accounts' ? 'lane-focused' : ''}`} style={{...laneStyle(2), display:'flex'}}>
            <AccountsLane
              context={rightContext}
              onPickAccount={pickAccount}
              onComposeTo={composeTo}
              onConvertToAction={convertToAction}
              onOpenDeal={openDeal}
              onSelectComm={selectComm}
            />
          </div>
        </div>

        {/* ---------- Statusbar ---------- */}
        <div className="statusbar">
          <span>Eclectik BD · partner sales + advisory</span>
          <span className="sep">·</span>
          <span>Signed in as <b style={{color:'var(--text-2)'}}>{BD_DATA.OWNERS[user].name}</b></span>
          <span className="sep">·</span>
          <span>{BD_DATA.COMMS.filter(m=>m.unread).length} unread</span>
          <span className="sep">·</span>
          <span>{BD_DATA.DEALS.filter(d=>!['won','lost'].includes(d.stage)).length} open deals · {fmtMoney(BD_DATA.DEALS.filter(d=>!['won','lost'].includes(d.stage)).reduce((s,d)=>s+d.value,0))}</span>
          <span style={{flex:1}}/>
          <span>Claude Cowork · connected</span>
        </div>

        {/* ---------- Compose modal ---------- */}
        {composeCtx && (
          <ComposeModal
            ctx={composeCtx}
            onClose={()=>setComposeCtx(null)}
            onSend={handleSend}
            onConvertToAction={convertToAction}
          />
        )}

        {/* ---------- Toast ---------- */}
        {toast && <div className="toast">{toast}</div>}

        {/* ---------- Tweaks ---------- */}
        {showTweaks && (
          <div className="tweaks-panel">
            <div className="tweaks-head">
              <span>Tweaks</span>
              <button className="icon-btn tiny" onClick={()=>setShowTweaks(false)}><I.close/></button>
            </div>
            <div className="tweaks-body">
              <div className="tweak-row">
                <label>Dark mode</label>
                <div className={`switch ${theme==='dark'?'on':''}`} onClick={()=>setTheme(theme==='dark'?'light':'dark')}/>
              </div>
              <div className="tweak-row">
                <label>Show funnel band</label>
                <div className={`switch ${showFunnelBand?'on':''}`} onClick={()=>setShowTweakFunnelBand(!showFunnelBand)}/>
              </div>
              <div className="tweak-row">
                <label>Layout</label>
                <div style={{display:'flex', gap:4}}>
                  <button className={`chip ${layout==='fixed'?'chip-on':''}`} onClick={()=>setLayout('fixed')}>Fixed</button>
                  <button className={`chip ${layout==='focused'?'chip-on':''}`} onClick={()=>setLayout('focused')}>Focus</button>
                </div>
              </div>
              {layout === 'focused' && (
                <div className="tweak-row">
                  <label>Focus on</label>
                  <div style={{display:'flex', gap:4}}>
                    <button className={`chip ${focusLane==='calendar'?'chip-on':''}`} onClick={()=>setFocusLane('calendar')}>Cal</button>
                    <button className={`chip ${focusLane==='comms'?'chip-on':''}`} onClick={()=>setFocusLane('comms')}>Comms</button>
                    <button className={`chip ${focusLane==='accounts'?'chip-on':''}`} onClick={()=>setFocusLane('accounts')}>360</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // mount
  ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
})();
