import { useState, useMemo, useEffect, useRef } from 'react';
import { I, fmtMoney, OwnerDot, ChannelIcon, OWNERS } from './atoms';
import { supabase } from '../supabase';
import { deleteCalendarEvent } from '../lib/graph';
import NewMeetingModal from './new-meeting-modal';
import TaskDetailModal from './task-detail-modal';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const START_HOUR = 0, END_HOUR = 24; // full day — Marco wants "hele dag over de hele panel"
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);
const HOUR_HEIGHT = 44;

function getMondayOfWeek(offset = 0) {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayDatesForWeek(offset = 0) {
  const mon = getMondayOfWeek(offset);
  return [0, 1, 2, 3, 4].map(i => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

// Parse an ISO-ish string as local time. Handles:
//  - "2026-04-22T10:00:00" (no Z, from Graph with Prefer header → local)
//  - "2026-04-22T10:00:00.0000000" (Graph high-precision)
//  - "2026-04-22T10:00:00Z" (UTC, legacy)
// Avoids browser inconsistencies for ISO-without-TZ.
function parseLocalDateTime(str) {
  if (!str) return null;
  const s = String(str).trim();
  // If ends with Z or has explicit +/-HH:MM offset, use standard parser (UTC/zoned)
  if (/Z$|[+-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  // Otherwise parse as LOCAL time manually
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?/);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const [, y, mo, d, hh, mm, ss] = m;
  return new Date(+y, +mo - 1, +d, +hh, +mm, ss ? Math.floor(parseFloat(ss)) : 0);
}

function eventPosition(ev) {
  if (!ev.startISO) return null;
  const s = parseLocalDateTime(ev.startISO);
  if (!s || isNaN(s.getTime())) return null;
  const dayIdx = (s.getDay() + 6) % 7;
  if (dayIdx > 4) return null;
  const start = s.getHours() + s.getMinutes() / 60;
  const e = ev.endISO ? parseLocalDateTime(ev.endISO) : new Date(s.getTime() + 3600000);
  const end = e.getHours() + e.getMinutes() / 60 + (e.getDate() !== s.getDate() ? 24 : 0);
  // LOCAL date string (not UTC) so it matches our grid's local dates
  const dateStr = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
  return { dayIdx, start, end, dateStr };
}

// Build a local YYYY-MM-DD string from a Date (avoids UTC shift)
const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtHour = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h - Math.floor(h)) * 60)).padStart(2, '0')}`;

export default function CalendarLane({ events: dbEvents, tasks: dbTasks, deals, accounts, contacts, graphEvents: rawGraphEvents, refetch, refetchGraph, onSelectEvent, onSelectTask, expanded, onToggleExpand }) {
  const [week, setWeek] = useState(0);
  const [overlay, setOverlay] = useState({ OA: false, YK: false });
  const [addTaskDay, setAddTaskDay] = useState(null);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);
  const scrollRef = useRef(null);
  const didScrollRef = useRef(false);

  // Adapt graphEvents from BDApp into our internal shape.
  // Split into (a) all-day events — shown as chips at top of each day,
  // and (b) timed events — rendered in the hour-grid.
  const graphEvents = useMemo(() => (rawGraphEvents || []).map(e => ({
    id: 'graph:' + e.id,
    kind: 'meeting',
    title: e.title,
    startISO: e.startAt ? e.startAt.replace(/Z$/, '') : null,
    endISO: e.endAt ? e.endAt.replace(/Z$/, '') : null,
    attendees: e.attendees,
    attendeesEmails: e.attendeesEmails,
    channel: e.isOnline ? 'teams' : null,
    meetingUrl: e.meetingUrl,
    isAllDay: !!e.isAllDay,
    bodyPreview: e.bodyPreview || '',
    owner: 'MVG',
    source: 'graph',
  })), [rawGraphEvents]);

  const timedGraphEvents = useMemo(() => graphEvents.filter(e => !e.isAllDay), [graphEvents]);
  const allDayGraphEvents = useMemo(() => graphEvents.filter(e => e.isAllDay), [graphEvents]);

  const dates = useMemo(() => dayDatesForWeek(week), [week]);
  const weekStart = dates[0];
  const weekEnd = new Date(dates[4]); weekEnd.setDate(weekEnd.getDate() + 1);
  // ISO week number
  const weekNumber = useMemo(() => {
    const d = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }, [weekStart.getTime()]);

  const todayIdx = useMemo(() => {
    const d = new Date();
    const i = (d.getDay() + 6) % 7;
    return (i >= 0 && i <= 4 && week === 0) ? i : -1;
  }, [week]);

  // Merge DB events + graph events
  // Only TIMED events go into the hour-grid. All-day events are shown separately.
  const allEvents = useMemo(() => {
    const dbIds = new Set((dbEvents || []).map(e => e.id));
    return [...(dbEvents || []), ...timedGraphEvents.filter(e => !dbIds.has(e.id))];
  }, [dbEvents, timedGraphEvents]);

  // Tasks grouped by day in this week
  const tasksByDay = useMemo(() => {
    const map = [[], [], [], [], []];
    (dbTasks || []).forEach(t => {
      if (!t.dueDate) return;
      const d = new Date(t.dueDate);
      const dayIdx = (d.getDay() + 6) % 7;
      if (dayIdx > 4) return;
      // Only if this date falls in the current week
      if (d >= weekStart && d < weekEnd) {
        map[dayIdx].push(t);
      }
    });
    return map;
  }, [dbTasks, weekStart.getTime()]);

  // Auto-scroll to 8AM on mount
  useEffect(() => {
    if (scrollRef.current && !didScrollRef.current) {
      scrollRef.current.scrollTop = (8 - START_HOUR) * HOUR_HEIGHT;
      didScrollRef.current = true;
    }
  }, []);

  const toggleTaskDone = async (task) => {
    await supabase.from('tasks').update({ status: task.done ? 'pending' : 'done' }).eq('id', task.id);
    if (refetch) refetch();
  };

  // Drag-drop state for tasks between days
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const moveTaskToDate = async (taskId, newDateStr) => {
    setDraggingTaskId(null);
    await supabase.from('tasks').update({ due_date: newDateStr }).eq('id', taskId);
    if (refetch) refetch();
  };

  return (
    <div className="lane lane-calendar">
      <div className="lane-header">
        <div className="lane-title">
          <span className="lane-title-label">Calendar</span>
          <span className="lane-title-count">
            Week {weekNumber} · {weekStart.toLocaleDateString('en', { day: 'numeric', month: 'short' })} – {dates[4].toLocaleDateString('en', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="lane-actions">
          <div className="overlay-group" title="Overlay colleague calendars">
            {['OA', 'YK'].map(k => {
              const o = OWNERS[k];
              const on = overlay[k];
              return (
                <button key={k}
                  className={`overlay-chip ${on ? 'overlay-chip-on' : ''}`}
                  style={{ '--owner-color': o.color }}
                  onClick={() => setOverlay(s => ({ ...s, [k]: !s[k] }))}
                  title={`Show ${o.name}'s calendar`}>
                  <span className="overlay-chip-dot" />
                  <span>{o.initials}</span>
                </button>
              );
            })}
          </div>
          <button className="btn-primary tiny" onClick={() => setShowNewMeeting(true)} title="Create a new meeting">
            <I.plus /> New meeting
          </button>
          {onToggleExpand && (
            <button className="icon-btn" onClick={onToggleExpand} title={expanded ? 'Collapse to 3-lane view' : 'Expand full width'}>
              <span style={{ fontSize: 14, display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                ›
              </span>
            </button>
          )}
          <input type="date"
            value={weekStart.toISOString().split('T')[0]}
            onChange={(e) => {
              if (!e.target.value) return;
              const target = new Date(e.target.value);
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const monToday = new Date(today);
              monToday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
              const monTarget = new Date(target);
              monTarget.setDate(target.getDate() - ((target.getDay() + 6) % 7));
              const diffWeeks = Math.round((monTarget - monToday) / (7 * 86400000));
              setWeek(diffWeeks);
            }}
            title="Jump to date"
            style={{
              padding: '3px 6px', borderRadius: 5, fontSize: 11,
              border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
              color: 'var(--text-1)', outline: 'none', fontFamily: 'var(--font)',
            }} />
          <button className="icon-btn" onClick={() => setWeek(w => w - 1)} title="Previous week">
            <I.chevronR style={{ transform: 'rotate(180deg)' }} />
          </button>
          <button className="btn-ghost tiny" onClick={() => setWeek(0)}>Today</button>
          <button className="icon-btn" onClick={() => setWeek(w => w + 1)} title="Next week"><I.chevronR /></button>
        </div>
      </div>

      <div className="cal-daysheader">
        <div className="cal-gutter" />
        {DAYS.map((d, i) => {
          const isToday = i === todayIdx;
          return (
            <div key={d} className={`cal-dayhead ${isToday ? 'cal-dayhead-today' : ''}`}>
              <span className="cal-dayhead-name">{d}</span>
              <span className="cal-dayhead-num">{dates[i].getDate()}</span>
            </div>
          );
        })}
      </div>

      <div className="cal-tasksrow">
        <div className="cal-gutter cal-gutter-tasks">Tasks</div>
        {DAYS.map((_, i) => {
          // All-day events for this day (shown as compact chips at top, not in grid)
          const dayAllDay = allDayGraphEvents.filter(e => {
            if (!e.startISO) return false;
            const d = parseLocalDateTime(e.startISO);
            if (!d) return false;
            return localDateStr(d) === localDateStr(dates[i]);
          });
          return (
          <div key={i} className="cal-taskcol"
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = 'var(--fill-2)'; }}
            onDragLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.background = 'transparent';
              const taskId = e.dataTransfer.getData('text/task-id');
              if (taskId) moveTaskToDate(taskId, localDateStr(dates[i]));
            }}>
            {dayAllDay.map(e => (
              <div key={e.id} className="cal-task" title={e.title}
                onClick={() => onSelectEvent && onSelectEvent(e)}
                style={{ cursor: 'pointer', borderLeft: '2px solid var(--accent)' }}>
                <I.calendar />
                <span className="cal-task-title">{e.title}</span>
              </div>
            ))}
            {tasksByDay[i].map(t => (
              <div key={t.id} className={`cal-task ${t.done ? 'cal-task-done' : ''}`}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('text/task-id', t.id); setDraggingTaskId(t.id); }}
                onDragEnd={() => setDraggingTaskId(null)}
                onClick={() => {
                  if (onSelectTask) onSelectTask(t);
                  else setOpenTaskId(t.id);
                }}
                style={{ cursor: 'pointer', opacity: draggingTaskId === t.id ? 0.5 : 1 }}>
                <span className={`task-check ${t.done ? 'task-check-on' : ''}`} onClick={(e) => { e.stopPropagation(); toggleTaskDone(t); }}>
                  {t.done && <I.check />}
                </span>
                <span className="cal-task-title">{t.title}</span>
                {t.owner && <OwnerDot id={t.owner} />}
              </div>
            ))}
            <button className="cal-task-add" onClick={() => setAddTaskDay(i)}>
              <I.plus style={{ width: 10, height: 10 }} />
              <span>Add task</span>
            </button>
          </div>
          );
        })}
      </div>

      {addTaskDay !== null && (
        <AddTaskModal
          day={addTaskDay}
          dayDate={dates[addTaskDay]}
          accounts={accounts}
          deals={deals}
          onClose={() => setAddTaskDay(null)}
          onCreated={() => { setAddTaskDay(null); if (refetch) refetch(); }}
        />
      )}

      <div className="cal-grid-scroll" ref={scrollRef}>
        <div className="cal-grid">
          <div className="cal-hourscol">
            {HOURS.map(h => (
              <div key={h} className="cal-hour" style={{ height: HOUR_HEIGHT }}>
                <span>{String(h % 24).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          {DAYS.map((_, i) => {
            const isToday = i === todayIdx;
            const dayEvents = allEvents.filter(e => {
              const p = eventPosition(e);
              if (!p) return false;
              // Match by local date string
              return p.dateStr === localDateStr(dates[i]);
            });
            return (
              <div key={i} className={`cal-daycol ${isToday ? 'cal-daycol-today' : ''}`}>
                {HOURS.map((h, idx) => (
                  <div key={h} className="cal-hourcell" style={{ height: HOUR_HEIGHT, top: idx * HOUR_HEIGHT }} />
                ))}
                {isToday && <TimeNowLine />}
                {dayEvents.map(e => {
                  const p = eventPosition(e);
                  if (!p) return null;
                  return (
                    <EventBlock key={e.id} ev={e} pos={p} deals={deals} accounts={accounts}
                      onSelect={() => onSelectEvent && onSelectEvent(e)}
                      onDelete={async (ev) => {
                        const graphId = String(ev.id).replace(/^graph:/, '');
                        if (!confirm(`Delete "${ev.title}" from your Outlook calendar?`)) return;
                        try {
                          await deleteCalendarEvent(graphId);
                          if (refetchGraph) refetchGraph();
                        } catch (err) {
                          alert('Delete failed: ' + err.message);
                        }
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <TimezoneFooter />

      {showNewMeeting && (
        <NewMeetingModal
          dayDate={new Date()}
          contacts={contacts}
          deals={deals}
          accounts={accounts}
          onClose={() => setShowNewMeeting(false)}
          onCreated={() => {
            setShowNewMeeting(false);
            if (refetchGraph) refetchGraph();
          }}
        />
      )}

      {openTaskId && (
        <TaskDetailModal
          taskId={openTaskId}
          accounts={accounts}
          onClose={() => setOpenTaskId(null)}
          refetch={refetch}
        />
      )}
    </div>
  );
}

function EventBlock({ ev, pos, deals, accounts, onSelect, onDelete }) {
  const top = (pos.start - START_HOUR) * HOUR_HEIGHT;
  const height = Math.max(20, (pos.end - pos.start) * HOUR_HEIGHT);
  const owner = OWNERS[ev.owner];
  const deal = ev.deal ? deals.find(d => d.id === ev.deal) : null;
  const account = deal ? accounts.find(a => a.id === deal.accountId) : null;
  const isGraph = ev.source === 'graph' || (typeof ev.id === 'string' && ev.id.startsWith('graph:'));
  return (
    <div className="cal-event"
      style={{
        top, height,
        borderLeft: `3px solid ${owner?.color || 'var(--text-3)'}`,
      }}
      onClick={(e) => { e.stopPropagation(); onSelect && onSelect(); }}
    >
      <div className="cal-event-title">
        {ev.channel === 'teams' && <ChannelIcon ch="teams" size={10} />}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
        {isGraph && onDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(ev); }}
            title="Delete event"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 0, fontSize: 12, opacity: 0.6 }}>
            ×
          </button>
        )}
      </div>
      {height > 30 && (
        <div className="cal-event-meta">
          <span>{fmtHour(pos.start)}–{fmtHour(pos.end)}</span>
          {account && <span> · {account.name}</span>}
        </div>
      )}
    </div>
  );
}

function TimeNowLine() {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < START_HOUR || h > END_HOUR) return null;
  const top = (h - START_HOUR) * HOUR_HEIGHT;
  return (
    <div className="cal-now" style={{ top }}>
      <span className="cal-now-dot" />
      <span className="cal-now-line" />
    </div>
  );
}

function AddTaskModal({ day, dayDate, accounts, deals, onClose, onCreated }) {
  const [topic, setTopic] = useState('');
  const [accountId, setAccountId] = useState('');
  const [dealId, setDealId] = useState('');
  const [saving, setSaving] = useState(false);

  const accountDeals = accountId ? deals.filter(d => d.accountId === accountId) : [];

  const handleSubmit = async () => {
    if (!topic.trim()) return;
    setSaving(true);
    const deal = dealId ? deals.find(d => d.id === dealId) : null;
    const row = {
      title: topic.trim(),
      due_date: dayDate.toISOString().split('T')[0],
      status: 'pending',
      company_id: accountId || null,
      [deal?.table === 'opportunities' ? 'opportunity_id' : 'lead_id']: dealId || null,
    };
    const { error } = await supabase.from('tasks').insert(row);
    setSaving(false);
    if (error) {
      alert('Failed to add task: ' + error.message);
      return;
    }
    if (onCreated) onCreated();
  };

  const fieldStyle = {
    width: '100%', padding: '6px 8px', borderRadius: 6,
    border: '0.5px solid var(--sep)', background: 'var(--fill-1)',
    color: 'var(--text-1)', fontSize: 12, outline: 'none',
    fontFamily: 'var(--font)', boxSizing: 'border-box',
  };
  const labelStyle = {
    fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 5,
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ minWidth: 340, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <I.plus />
          <span>Add task — {DAYS[day]} {dayDate.getDate()}</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          <div>
            <div style={labelStyle}>Topic</div>
            <input autoFocus style={fieldStyle}
              placeholder="What needs to be done?"
              value={topic} onChange={e => setTopic(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }} />
          </div>
          <div>
            <div style={labelStyle}>Link to account (makes it visible in Account 360)</div>
            <select style={fieldStyle} value={accountId} onChange={e => { setAccountId(e.target.value); setDealId(''); }}>
              <option value="">— none —</option>
              {[...accounts].sort((a, b) => a.name.localeCompare(b.name)).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          {accountDeals.length > 0 && (
            <div>
              <div style={labelStyle}>Linked deal (optional)</div>
              <select style={fieldStyle} value={dealId} onChange={e => setDealId(e.target.value)}>
                <option value="">— none —</option>
                {accountDeals.map(d => (
                  <option key={d.id} value={d.id}>[{d.stage}] {d.title} · {fmtMoney(d.value)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={!topic.trim() || saving}>
            {saving ? 'Adding…' : 'Add task'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TimezoneFooter() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const zones = [
    { label: 'Los Angeles', tz: 'America/Los_Angeles' },
    { label: 'Chicago', tz: 'America/Chicago' },
    { label: 'New York', tz: 'America/New_York' },
    { label: 'London', tz: 'Europe/London' },
    { label: 'Amsterdam', tz: 'Europe/Amsterdam', home: true },
    { label: 'Dubai', tz: 'Asia/Dubai' },
    { label: 'Singapore', tz: 'Asia/Singapore' },
    { label: 'Sydney', tz: 'Australia/Sydney' },
  ];

  const fmt = (tz) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz, hour12: false }).format(now);
  const offsetLabel = (tz) => {
    const ref = getOffset('Europe/Amsterdam', now);
    const here = getOffset(tz, now);
    const diff = Math.round((here - ref) / 30) / 2;
    if (diff === 0) return '±0';
    const sign = diff > 0 ? '+' : '-';
    const abs = Math.abs(diff);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    return `${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}h`;
  };
  const isDay = (tz) => {
    const h = parseInt(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', timeZone: tz, hour12: false }).format(now), 10);
    return h >= 7 && h < 19;
  };

  return (
    <div className="tz-footer">
      <div className="tz-label"><I.globe /><span>Time zones</span></div>
      <div className="tz-strip">
        {zones.map(z => (
          <div key={z.label} className={`tz-cell ${z.home ? 'tz-cell-home' : ''}`}>
            <span className={`tz-dot ${isDay(z.tz) ? 'tz-dot-day' : 'tz-dot-night'}`} />
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
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const parts = dtf.formatToParts(date).reduce((o, p) => { if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10); return o; }, {});
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return (asUTC - date.getTime()) / 60000;
}
