// Calendar lane — Mon-Fri week, tasks top, time grid + timezone footer, colleague overlay
(function () {
  const { useState, useMemo, useEffect } = React;
  const { WEEK, TASKS, OWNERS } = BD_DATA;

  // ---------- Shared task store (done state + new tasks) ----------
  const [getTStore, setTStore, subscribeTStore] = (() => {
    let state = {
      done: new Set(TASKS.filter(t => t.done).map(t => t.id)),
      extra: [],
    };
    const listeners = new Set();
    return [
      () => state,
      (fn) => { state = fn(state); listeners.forEach(f => f()); },
      (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    ];
  })();
  function useTaskStore() {
    const [, force] = useState(0);
    useEffect(() => subscribeTStore(() => force(x => x + 1)), []);
    return [getTStore(), setTStore];
  }
  window.BD_TASKSTORE = { getTStore, setTStore, subscribeTStore, TASKS };

  const DAYS = ['Mon','Tue','Wed','Thu','Fri'];
  const DAY_DATES = (() => {
    const now = new Date();
    const d = new Date(now);
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return [0,1,2,3,4].map(i => { const x = new Date(d); x.setDate(d.getDate()+i); return x; });
  })();
  const TODAY_IDX = (() => {
    const dow = (new Date().getDay() + 6) % 7;
    return dow >= 0 && dow <= 4 ? dow : 0;
  })();

  const START_HOUR = 6, END_HOUR = 24;
  const HOURS = [];
  for (let h = START_HOUR; h < END_HOUR; h++) HOURS.push(h);
  const HOUR_HEIGHT = 44;
  const fmtHourLabel = (h) => `${String(h % 24).padStart(2,'0')}:00`;

  // Colleague calendar overlays — synthetic busy blocks
  const COLLEAGUE_EVENTS = {
    OA: [
      { day: 0, start: 10.0, end: 11.0, title: 'Benelux intro prep' },
      { day: 1, start: 14.0, end: 15.5, title: 'Petra · MSA' },
      { day: 2, start: 9.5, end: 10.5, title: 'Standup' },
      { day: 3, start: 13.0, end: 14.0, title: 'Meridian call' },
      { day: 4, start: 11.0, end: 12.0, title: 'Forecast' },
      { day: 4, start: 15.0, end: 16.5, title: 'Pipeline 1:1' },
    ],
    YK: [
      { day: 0, start: 13.0, end: 14.0, title: 'Northwind prep' },
      { day: 1, start: 9.0, end: 10.0, title: 'Sourcing call' },
      { day: 2, start: 15.5, end: 17.0, title: 'Nordic ops' },
      { day: 3, start: 10.0, end: 11.0, title: 'Pricing review' },
      { day: 4, start: 10.0, end: 11.0, title: 'Northwind · pricing' },
    ],
  };

  function CalendarLane({ onOpenMeeting, onQuickAdd, onSelectEvent, onSelectTask }) {
    const [week, setWeek] = useState(0);
    const [overlay, setOverlay] = useState({ OA: false, YK: false });
    const [addTaskDay, setAddTaskDay] = useState(null);
    const [store, setStore] = useTaskStore();

    const allTasks = useMemo(() => [...TASKS, ...store.extra], [store.extra]);

    const toggleDone = (e, t) => {
      e.stopPropagation();
      setStore(s => {
        const next = new Set(s.done);
        next.has(t.id) ? next.delete(t.id) : next.add(t.id);
        return { ...s, done: next };
      });
    };

    const handleAddTask = (task) => {
      const newTask = { id: `t-${Date.now()}`, ...task };
      setStore(s => ({ ...s, extra: [...s.extra, newTask] }));
      setAddTaskDay(null);
    };

    return (
      <div className="lane lane-calendar">
        <div className="lane-header">
          <div className="lane-title">
            <span className="lane-title-label">Calendar</span>
            <span className="lane-title-count">Week {17 + week}</span>
          </div>
          <div className="lane-actions">
            <div className="overlay-group" title="Overlay colleague calendars">
              {['OA','YK'].map(k => {
                const o = OWNERS[k];
                const on = overlay[k];
                return (
                  <button key={k}
                    className={`overlay-chip ${on ? 'overlay-chip-on' : ''}`}
                    style={{'--owner-color': o.color}}
                    onClick={()=>setOverlay(s=>({...s, [k]: !s[k]}))}
                    title={`Show ${o.name}'s calendar`}>
                    <span className="overlay-chip-dot"/>
                    <span>{o.initials}</span>
                  </button>
                );
              })}
            </div>
            <button className="icon-btn" onClick={()=>setWeek(w=>w-1)} title="Previous week"><I.chevronR style={{transform:'rotate(180deg)'}}/></button>
            <button className="btn-ghost" onClick={()=>setWeek(0)}>Today</button>
            <button className="icon-btn" onClick={()=>setWeek(w=>w+1)} title="Next week"><I.chevronR/></button>
          </div>
        </div>

        <div className="cal-daysheader">
          <div className="cal-gutter"/>
          {DAYS.map((d,i) => {
            const date = DAY_DATES[i];
            const isToday = i === TODAY_IDX && week === 0;
            return (
              <div key={d} className={`cal-dayhead ${isToday?'cal-dayhead-today':''}`}>
                <span className="cal-dayhead-name">{d}</span>
                <span className="cal-dayhead-num">{date.getDate()}</span>
              </div>
            );
          })}
        </div>

        <div className="cal-tasksrow">
          <div className="cal-gutter cal-gutter-tasks">Tasks</div>
          {DAYS.map((_, i) => {
            const dayTasks = allTasks.filter(t => t.day === i);
            return (
              <div key={i} className="cal-taskcol">
                {dayTasks.map(t => {
                  const done = store.done.has(t.id);
                  return (
                    <div key={t.id} className={`cal-task ${done?'cal-task-done':''}`} onClick={()=>onSelectTask(t)}>
                      <span className={`task-check ${done?'task-check-on':''}`} onClick={e=>toggleDone(e,t)}>
                        {done && <I.check/>}
                      </span>
                      <span className="cal-task-title">{t.title}</span>
                      <OwnerDot id={t.owner}/>
                    </div>
                  );
                })}
                <button className="cal-task-add" onClick={()=>setAddTaskDay(i)}>
                  <I.plus style={{width:10,height:10}}/>
                  <span>Add task</span>
                </button>
              </div>
            );
          })}
        </div>

        {addTaskDay !== null && (
          <AddTaskModal
            day={addTaskDay}
            dayLabel={DAYS[addTaskDay]}
            onAdd={handleAddTask}
            onClose={()=>setAddTaskDay(null)}
          />
        )}

        <div className="cal-grid-scroll" ref={el => {
          if (el && el.dataset.scrolled !== '1') {
            el.scrollTop = (8 - START_HOUR) * HOUR_HEIGHT;
            el.dataset.scrolled = '1';
          }
        }}>
          <div className="cal-grid">
            <div className="cal-hourscol">
              {HOURS.map(h => (
                <div key={h} className="cal-hour" style={{height:HOUR_HEIGHT}}>
                  <span>{fmtHourLabel(h)}</span>
                </div>
              ))}
            </div>
            {DAYS.map((_, i) => {
              const events = WEEK.filter(e => e.day === i);
              const isToday = i === TODAY_IDX && week === 0;
              return (
                <div key={i} className={`cal-daycol ${isToday?'cal-daycol-today':''}`}>
                  {HOURS.map((h, idx) => (
                    <div key={h} className="cal-hourcell" style={{height:HOUR_HEIGHT, top: idx*HOUR_HEIGHT}}/>
                  ))}
                  {/* Colleague overlays */}
                  {Object.entries(overlay).filter(([k,v])=>v).map(([k]) =>
                    (COLLEAGUE_EVENTS[k] || []).filter(e => e.day === i).map((e,j) => (
                      <div key={`${k}-${j}`} className="cal-overlay-block"
                        style={{
                          top: (e.start - START_HOUR) * HOUR_HEIGHT,
                          height: (e.end - e.start) * HOUR_HEIGHT,
                          background: `${OWNERS[k].color}22`,
                          borderLeft: `2px dashed ${OWNERS[k].color}`,
                        }}
                        title={`${OWNERS[k].name} · ${e.title}`}>
                        <span style={{color: OWNERS[k].color, fontSize:10, fontFamily:'var(--font-mono)'}}>{OWNERS[k].initials}</span>
                      </div>
                    ))
                  )}
                  {isToday && <TimeNowLine />}
                  {events.map(e => <EventBlock key={e.id} ev={e} onOpen={onOpenMeeting} onSelect={onSelectEvent} />)}
                </div>
              );
            })}
          </div>
        </div>

        <TimezoneFooter />
      </div>
    );
  }

  function TimezoneFooter() {
    const [now, setNow] = useState(new Date());
    React.useEffect(() => {
      const t = setInterval(() => setNow(new Date()), 30_000);
      return () => clearInterval(t);
    }, []);
    // Base: Amsterdam (Europe/Amsterdam)
    // The Intl API handles DST automatically
    const zones = [
      { label: 'Los Angeles',  tz: 'America/Los_Angeles', region: 'West' },
      { label: 'Chicago',      tz: 'America/Chicago',     region: 'West' },
      { label: 'New York',     tz: 'America/New_York',    region: 'West' },
      { label: 'London',       tz: 'Europe/London',       region: 'West' },
      { label: 'Amsterdam',    tz: 'Europe/Amsterdam',    region: 'Home' },
      { label: 'Dubai',        tz: 'Asia/Dubai',          region: 'East' },
      { label: 'Singapore',    tz: 'Asia/Singapore',      region: 'East' },
      { label: 'Sydney',       tz: 'Australia/Sydney',    region: 'East' },
    ];

    const fmt = (tz) => new Intl.DateTimeFormat('en-GB', { hour:'2-digit', minute:'2-digit', timeZone: tz, hour12:false }).format(now);
    const offsetLabel = (tz) => {
      const ref = getOffset('Europe/Amsterdam', now);
      const here = getOffset(tz, now);
      const diff = Math.round((here - ref) / 30) / 2; // round to nearest 0.5h
      if (diff === 0) return '±0';
      const sign = diff > 0 ? '+' : '';
      const abs = Math.abs(diff);
      const h = Math.floor(abs);
      const m = Math.round((abs - h) * 60);
      return `${sign}${diff < 0 ? '-' : ''}${h}${m ? `:${String(m).padStart(2,'0')}` : ''}h`;
    };
    const isDay = (tz) => {
      const h = parseInt(new Intl.DateTimeFormat('en-GB', { hour:'2-digit', timeZone: tz, hour12:false }).format(now), 10);
      return h >= 7 && h < 19;
    };

    return (
      <div className="tz-footer">
        <div className="tz-label"><I.globe/><span>Time zones</span></div>
        <div className="tz-strip">
          {zones.map(z => (
            <div key={z.label} className={`tz-cell ${z.region === 'Home' ? 'tz-cell-home' : ''}`}>
              <span className={`tz-dot ${isDay(z.tz) ? 'tz-dot-day' : 'tz-dot-night'}`}/>
              <div className="tz-cell-inner">
                <div className="tz-time">{fmt(z.tz)}</div>
                <div className="tz-name">{z.label}</div>
              </div>
              <div className="tz-offset">{offsetLabel(z.tz)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function getOffset(tz, date) {
    // return offset in minutes from UTC for the given timezone at the given date
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12:false,
      year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' });
    const parts = dtf.formatToParts(date).reduce((o,p)=>{ if (p.type!=='literal') o[p.type]=parseInt(p.value,10); return o; }, {});
    const asUTC = Date.UTC(parts.year, parts.month-1, parts.day, parts.hour, parts.minute, parts.second);
    return (asUTC - date.getTime()) / 60000;
  }

  function TimeNowLine() {
    const now = new Date();
    const h = now.getHours() + now.getMinutes()/60;
    if (h < START_HOUR || h > END_HOUR) return null;
    const top = (h - START_HOUR) * HOUR_HEIGHT;
    return (
      <div className="cal-now" style={{top}}>
        <span className="cal-now-dot"/>
        <span className="cal-now-line"/>
      </div>
    );
  }

  function EventBlock({ ev, onOpen, onSelect }) {
    const top = (ev.start - START_HOUR) * HOUR_HEIGHT;
    const height = (ev.end - ev.start) * HOUR_HEIGHT;
    const isMeeting = ev.kind === 'meeting';
    const owner = BD_DATA.byId.owner(ev.owner);
    const deal = ev.deal ? BD_DATA.byId.deal(ev.deal) : null;
    const account = deal ? BD_DATA.byId.account(deal.account) : null;

    return (
      <div
        className={`cal-event cal-event-${ev.kind}`}
        style={{
          top, height: Math.max(height, 20),
          borderLeft: `3px solid ${owner?.color || 'var(--text-3)'}`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (isMeeting && ev.channel === 'teams') onOpen(ev);
          else onSelect(ev);
        }}
      >
        <div className="cal-event-title">
          {ev.channel === 'teams' && <ChannelIcon ch="teams" size={10}/>}
          <span>{ev.title}</span>
        </div>
        {height > 30 && (
          <div className="cal-event-meta">
            <span>{fmtHour(ev.start)}–{fmtHour(ev.end)}</span>
            {account && <span> · {account.name}</span>}
          </div>
        )}
      </div>
    );
  }

  function fmtHour(h) {
    const hh = Math.floor(h); const mm = Math.round((h-hh)*60);
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  }

  // ---------- Meeting takeover view ----------
  function MeetingLane({ meeting, onBack, onSummaryLinked }) {
    const deal = meeting.deal ? BD_DATA.byId.deal(meeting.deal) : null;
    const account = deal ? BD_DATA.byId.account(deal.account) : null;
    const primary = meeting.contact ? BD_DATA.byId.contact(meeting.contact) : null;
    const attendees = (meeting.attendees || []).map(id => BD_DATA.byId.contact(id)).filter(Boolean);

    const SCRIPT = [
      { who: primary?.name || 'Host', text: 'Thanks for joining. Walked through the latest pricing pass overnight — a few things to land.' },
      { who: 'You', text: 'Good. I want to close on the MDF pool carve-out and the 30-day termination clause Anja raised.' },
      { who: primary?.name || 'Host', text: 'Tier 2 carve-out we can do. Our counsel needs the termination kept at 45 days as a compromise.' },
      { who: 'You', text: 'Workable. I\'ll reflect that in v3 this afternoon. What about the exclusivity window?' },
      { who: primary?.name || 'Host', text: 'Leaving that for the board to decide — expect a view Thursday.' },
      { who: 'You', text: 'Aligned. I\'ll send the redline and a one-page summary to the board pack.' },
    ];
    const [lines, setLines] = useState([]);
    const [captured, setCaptured] = useState(false);
    React.useEffect(() => {
      setLines([]); setCaptured(false);
      let i = 0;
      const t = setInterval(() => {
        setLines(l => [...l, SCRIPT[i]]);
        i++;
        if (i >= SCRIPT.length) { clearInterval(t); setTimeout(()=>setCaptured(true), 800); }
      }, 1600);
      return () => clearInterval(t);
    }, [meeting.id]);

    React.useEffect(() => {
      if (captured && onSummaryLinked) onSummaryLinked(meeting);
    }, [captured]);

    return (
      <div className="lane lane-meeting">
        <div className="lane-header meeting-header">
          <button className="btn-ghost" onClick={onBack}><I.back/> Back to calendar</button>
          <div className="meeting-title">
            <span className="live-dot"/>
            <span>Live · {meeting.title}</span>
          </div>
          <div className="lane-actions">
            <button className="icon-btn"><I.phone/></button>
            <button className="icon-btn"><I.dots/></button>
          </div>
        </div>

        <div className="meeting-stage">
          <div className="meeting-tiles">
            {attendees.slice(0,3).map((c, i) => (
              <div key={c.id} className="meeting-tile">
                <div className="tile-avatar">
                  <Avatar name={c.name} size={44} color={`oklch(60% 0.08 ${200 + i*40})`}/>
                </div>
                <div className="tile-name">{c.name}</div>
                <div className="tile-role">{c.role}</div>
              </div>
            ))}
            <div className="meeting-tile meeting-tile-me">
              <div className="tile-avatar">
                <Avatar name="Michiel V.G." size={44} color={BD_DATA.OWNERS.MVG.color}/>
              </div>
              <div className="tile-name">You</div>
              <div className="tile-role">Host</div>
            </div>
          </div>
        </div>

        <div className="meeting-split">
          <div className="meeting-transcript">
            <div className="meeting-section-title">
              <span>Live transcript</span>
              <span className="rec-dot"><span className="live-dot"/> Recording</span>
            </div>
            <div className="transcript-scroll">
              {lines.map((l, i) => (
                <div key={i} className="transcript-line" style={{animation:'fadeSlide .4s ease'}}>
                  <span className="transcript-who">{l.who}</span>
                  <span className="transcript-text">{l.text}</span>
                </div>
              ))}
              {lines.length < SCRIPT.length && (
                <div className="transcript-typing">
                  <span className="dot"/><span className="dot"/><span className="dot"/>
                </div>
              )}
            </div>
          </div>

          <div className="meeting-summary">
            <div className="meeting-section-title">
              <I.sparkle/>
              <span>AI summary</span>
              {captured && <span className="chip chip-good">Linked · {account?.name}</span>}
            </div>
            <div className="summary-body">
              {lines.length < 3 ? (
                <div className="summary-placeholder">Listening…</div>
              ) : (
                <>
                  <div className="summary-row">
                    <div className="summary-label">Decisions</div>
                    <ul>
                      <li>Tier 2 MDF carve-out agreed</li>
                      {lines.length >= 4 && <li>Termination clause → 45 days (compromise)</li>}
                    </ul>
                  </div>
                  {lines.length >= 5 && (
                    <div className="summary-row">
                      <div className="summary-label">Action items</div>
                      <ul>
                        <li>You: send SOW v3 this afternoon</li>
                        <li>You: one-page summary for board pack</li>
                        <li>{primary?.name || 'Host'}: board view on exclusivity (Thu)</li>
                      </ul>
                    </div>
                  )}
                  {lines.length === SCRIPT.length && (
                    <div className="summary-row">
                      <div className="summary-label">Linked to</div>
                      <div className="summary-links">
                        <span className="pill">{account?.name}</span>
                        <span className="pill">{deal?.title}</span>
                        <span className="pill">{primary?.name}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Add Task Modal ----------
  function AddTaskModal({ day, dayLabel, onAdd, onClose }) {
    const [topic, setTopic] = useState('');
    const [accountId, setAccountId] = useState('');
    const [contactId, setContactId] = useState('');
    const [dealId, setDealId] = useState('');

    const accounts = BD_DATA.ACCOUNTS;
    const contacts = accountId ? BD_DATA.forAccount.contacts(accountId) : [];
    const deals = accountId ? BD_DATA.forAccount.deals(accountId) : [];

    const handleAccountChange = (id) => {
      setAccountId(id);
      setContactId('');
      setDealId('');
    };

    const handleSubmit = () => {
      if (!topic.trim()) return;
      const deal = dealId ? BD_DATA.byId.deal(dealId) : null;
      const contact = contactId ? BD_DATA.byId.contact(contactId) : null;
      const account = accountId ? BD_DATA.byId.account(accountId) : null;
      const label = [
        topic.trim(),
        contact ? `· ${contact.name}` : '',
        account && !contact ? `· ${account.name}` : '',
      ].filter(Boolean).join(' ');
      onAdd({ day, title: label, deal: dealId || null, owner: 'MVG', done: false });
    };

    const fieldStyle = {
      width:'100%', padding:'6px 8px', borderRadius:6,
      border:'0.5px solid var(--sep)', background:'var(--fill-1)',
      color:'var(--text-1)', fontSize:12, outline:'none',
      fontFamily:'var(--font)',
    };
    const labelStyle = {
      fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em',
      color:'var(--text-3)', fontFamily:'var(--font-mono)', marginBottom:5,
    };

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" style={{minWidth:340,maxWidth:420}} onClick={e=>e.stopPropagation()}>
          <div className="modal-title" style={{display:'flex',alignItems:'center',gap:8}}>
            <I.plus/>
            <span>Add task — {dayLabel}</span>
            <button className="icon-btn tiny" style={{marginLeft:'auto'}} onClick={onClose}><I.close/></button>
          </div>

          <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:10,paddingTop:4}}>
            {/* Topic */}
            <div>
              <div style={labelStyle}>Topic</div>
              <input
                autoFocus
                style={fieldStyle}
                placeholder="What needs to be done?"
                value={topic}
                onChange={e=>setTopic(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') handleSubmit(); if(e.key==='Escape') onClose(); }}
              />
            </div>

            {/* Account */}
            <div>
              <div style={labelStyle}>Account</div>
              <select style={fieldStyle} value={accountId} onChange={e=>handleAccountChange(e.target.value)}>
                <option value="">— none —</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} · {a.type} · {a.region}</option>
                ))}
              </select>
            </div>

            {/* Contact — shown only when account selected */}
            {contacts.length > 0 && (
              <div>
                <div style={labelStyle}>Contact</div>
                <select style={fieldStyle} value={contactId} onChange={e=>setContactId(e.target.value)}>
                  <option value="">— none —</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} · {c.role}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Deal / Funnel stage — shown only when account selected */}
            {deals.length > 0 && (
              <div>
                <div style={labelStyle}>Funnel item</div>
                <select style={fieldStyle} value={dealId} onChange={e=>setDealId(e.target.value)}>
                  <option value="">— none —</option>
                  {deals.map(d => (
                    <option key={d.id} value={d.id}>[{STAGE_TINT[d.stage].label}] {d.title} · {fmtMoney(d.value)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={!topic.trim()}>
              <I.plus/> Add task
            </button>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { CalendarLane, MeetingLane });
})();
