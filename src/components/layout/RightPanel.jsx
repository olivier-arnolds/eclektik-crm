import { useState, useMemo, useEffect, useCallback } from "react";
import { pepC } from '../../lib/constants';
import { updateRow, insertRow } from '../../hooks/useSupabase';
import { getCalendarEvents, createCalendarEvent } from '../../lib/graph';
import Chip from '../atoms/Chip';
import Btn from '../atoms/Btn';

function DaySection({ label, hasItems, dayEvents, dayTasks, dayFollowUps, fmtCalTime, evColors, contacts }) {
  const [collapsed, setCollapsed] = useState(false);
  const isToday = label === 'Today';
  return (
    <div style={{ marginBottom:10 }}>
      <div onClick={() => setCollapsed(c => !c)} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"4px 0", userSelect:"none" }}>
        <span style={{ fontSize:9, color:"#888780", transition:"transform 0.15s", transform:collapsed?"rotate(-90deg)":"rotate(0deg)", display:"inline-block" }}>{"\u25BC"}</span>
        <span style={{ fontSize:10, fontWeight:600, color:isToday?"#185FA5":"#888780", textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</span>
        {hasItems && <span style={{ fontSize:9, color:"#888780", background:"#F1EFE8", padding:"1px 5px", borderRadius:6 }}>{dayEvents.length + dayTasks.length + dayFollowUps.length}</span>}
      </div>
      {!collapsed && (
        <div style={{ paddingLeft:4 }}>
          {!hasItems && <div style={{ fontSize:11, color:"#B4B2A9", padding:"4px 0 2px", fontStyle:"italic" }}>No events</div>}
          {dayEvents.map((ev, idx) => (
            <div key={ev.id} style={{ display:"flex", gap:8, padding:"6px 8px", borderRadius:7, border:"0.5px solid #D3D1C7", marginBottom:4 }}>
              <div style={{ width:3, borderRadius:2, background:evColors[idx % evColors.length], flexShrink:0, alignSelf:"stretch" }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ fontSize:11, fontWeight:500 }}>{ev.title}</div>
                  {ev.isOnline && <span style={{ fontSize:8, background:"#E8F0FE", color:"#378ADD", padding:"1px 4px", borderRadius:3, fontWeight:500 }}>Teams</span>}
                </div>
                <div style={{ fontSize:10, color:"#888780" }}>{fmtCalTime(ev.startAt)} - {fmtCalTime(ev.endAt)}</div>
              </div>
            </div>
          ))}
          {dayTasks.map(t => (
            <div key={t.id} style={{ display:"flex", gap:6, padding:"5px 8px", borderRadius:6, background:"#FFFBEB", border:"0.5px solid #FDE68A", marginBottom:4, alignItems:"center" }}>
              <span style={{ fontSize:10, flexShrink:0 }}>{"\u2713"}</span>
              <div style={{ fontSize:11, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.text}</div>
              <span style={{ fontSize:9, color:"#92400E", flexShrink:0 }}>Task</span>
            </div>
          ))}
          {dayFollowUps.map(f => {
            const contact = contacts.find(c => c.id === f.contactId);
            return (
              <div key={f.id} style={{ display:"flex", gap:6, padding:"5px 8px", borderRadius:6, background:"#FEF2F2", border:"0.5px solid #FECACA", marginBottom:4, alignItems:"center" }}>
                <span style={{ fontSize:10, flexShrink:0 }}>{"\u23F0"}</span>
                <div style={{ fontSize:11, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{contact?.name || f.subject}</div>
                <span style={{ fontSize:9, color:"#991B1B", flexShrink:0 }}>Follow-up</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RightPanel({ tab, setTab, followUps, comms, tasks, calEvents, contacts, refetch, onOpenInbox }) {
  const pendingR = followUps.filter(r => r.status==="no-reply").length;
  const pendingT = tasks.filter(t => !t.done).length;
  const unreadC  = comms.filter(c => c.unread).length;
  const PTABS = [["rappel","Follow-ups"],["comms","Comms"],["tasks","Tasks"],["calendar","Calendar"]];
  const calGroups = useMemo(() => {
    const g = {};
    calEvents.forEach(e => { if (!g[e.dateLabel]) g[e.dateLabel]=[];  g[e.dateLabel].push(e); });
    return Object.entries(g).sort(([a],[b]) => a.localeCompare(b));
  }, [calEvents]);
  const [rappelDone, setRappelDone] = useState({});
  const [localTasksDone, setLocalTasksDone] = useState({});
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ title: '', priority: 'schedule', due_date: new Date().toISOString().slice(0,10), description: '' });
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', due_date: '', description: '' });
  const [savingTask, setSavingTask] = useState(false);

  // Graph calendar state
  const [graphEvents, setGraphEvents] = useState([]);
  const [graphCalLoading, setGraphCalLoading] = useState(false);
  const [graphCalError, setGraphCalError] = useState(null);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ subject: '', date: '', startTime: '09:00', endTime: '09:30', attendees: '', isOnline: true });
  const [savingMeeting, setSavingMeeting] = useState(false);

  const fetchGraphCal = useCallback(async () => {
    setGraphCalLoading(true);
    setGraphCalError(null);
    try {
      const evs = await getCalendarEvents(7);
      setGraphEvents(evs);
    } catch (e) {
      setGraphCalError(e.message);
    }
    setGraphCalLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'calendar') fetchGraphCal();
  }, [tab, fetchGraphCal]);

  const handleCreateMeetingRP = async () => {
    if (!meetingForm.subject.trim() || !meetingForm.date) return;
    setSavingMeeting(true);
    const startDT = meetingForm.date + 'T' + meetingForm.startTime + ':00';
    const endDT = meetingForm.date + 'T' + meetingForm.endTime + ':00';
    const emails = meetingForm.attendees.split(',').map(s => s.trim()).filter(Boolean);
    const result = await createCalendarEvent({
      subject: meetingForm.subject.trim(),
      startTime: startDT,
      endTime: endDT,
      attendeeEmails: emails,
      isOnline: meetingForm.isOnline,
    });
    if (result.success) {
      await insertRow('calendar_events', {
        title: meetingForm.subject.trim(),
        start_at: startDT,
        end_at: endDT,
        location: meetingForm.isOnline ? 'Teams meeting' : '',
        attendees: meetingForm.attendees,
      });
      setMeetingForm({ subject: '', date: '', startTime: '09:00', endTime: '09:30', attendees: '', isOnline: true });
      setShowMeetingForm(false);
      await fetchGraphCal();
      refetch();
    } else {
      setGraphCalError(result.error);
    }
    setSavingMeeting(false);
  };

  const fmtCalTime = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const fmtDateLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (d.getTime() === today.getTime()) return 'Today, ' + d.getDate() + ' ' + months[d.getMonth()];
    if (d.getTime() === tomorrow.getTime()) return 'Tomorrow, ' + d.getDate() + ' ' + months[d.getMonth()];
    return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()];
  };

  const groupedGraphEvents = useMemo(() => {
    const groups = {};
    graphEvents.forEach(ev => {
      const dateKey = ev.startAt ? ev.startAt.slice(0, 10) : 'unknown';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(ev);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [graphEvents]);

  const evColors = ['#378ADD','#1D9E75','#D85A30','#7C5CFC','#E24B4A','#DAA520'];

  const handleMarkReplied = async (r) => {
    setRappelDone(p => ({ ...p, [r.id]: true }));
    await updateRow('follow_ups', r.id, { status: 'replied' });
    refetch();
  };

  const handleToggleTask = async (t) => {
    const newDone = !localTasksDone[t.id] && !t.done;
    setLocalTasksDone(p => ({ ...p, [t.id]: newDone }));
    await updateRow('tasks', t.id, { status: newDone ? 'done' : 'pending' });
    refetch();
  };

  const handleCreateFollowUp = async () => {
    if (!followUpForm.title.trim()) return;
    setSavingFollowUp(true);
    await insertRow('follow_ups', {
      title: followUpForm.title.trim(),
      priority: followUpForm.priority,
      status: 'pending',
      due_date: followUpForm.due_date || null,
      description: followUpForm.description.trim() || null,
      contact_id: null,
      opportunity_id: null,
      lead_id: null,
      owner: null,
    });
    setFollowUpForm({ title: '', priority: 'schedule', due_date: new Date().toISOString().slice(0,10), description: '' });
    setShowFollowUpForm(false);
    setSavingFollowUp(false);
    refetch();
  };

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) return;
    setSavingTask(true);
    await insertRow('tasks', {
      title: taskForm.title.trim(),
      status: 'pending',
      due_date: taskForm.due_date || null,
      description: taskForm.description.trim() || null,
      contact_id: null,
      opportunity_id: null,
      lead_id: null,
      owner: null,
    });
    setTaskForm({ title: '', due_date: '', description: '' });
    setShowTaskForm(false);
    setSavingTask(false);
    refetch();
  };

  return (
    <div style={{ background:"#FFFFFF", borderLeft:"0.5px solid #D3D1C7", display:"flex", flexDirection:"column", minHeight:0 }}>
      <div style={{ display:"flex", borderBottom:"0.5px solid #D3D1C7", flexShrink:0 }}>
        {PTABS.map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex:1, padding:"9px 2px", fontSize:11, cursor:"pointer", background:"transparent", border:"none", borderBottom:tab===key?"2px solid #378ADD":"2px solid transparent", color:tab===key?"#2C2C2A":"#888780", fontWeight:tab===key?500:400, fontFamily:"inherit" }}>
            {label}
            {key==="rappel" && pendingR>0 && <span style={{ marginLeft:3, background:"#E24B4A", color:"#fff", fontSize:9, padding:"1px 4px", borderRadius:6 }}>{pendingR}</span>}
            {key==="comms"  && unreadC>0  && <span style={{ marginLeft:3, background:"#378ADD", color:"#fff", fontSize:9, padding:"1px 4px", borderRadius:6 }}>{unreadC}</span>}
            {key==="tasks"  && pendingT>0  && <span style={{ marginLeft:3, background:"#888780", color:"#fff", fontSize:9, padding:"1px 4px", borderRadius:6 }}>{pendingT}</span>}
          </button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        {tab==="rappel" && (
          <div style={{ padding:14 }}>
            <button onClick={() => setShowFollowUpForm(f => !f)} style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", marginBottom:10, justifyContent:"center", fontWeight:500 }}>+ Add follow-up</button>
            {showFollowUpForm && (
              <div style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #378ADD", padding:"12px 14px", marginBottom:10, display:"flex", flexDirection:"column", gap:8 }}>
                <input placeholder="Title *" value={followUpForm.title} onChange={e => setFollowUpForm(f => ({ ...f, title: e.target.value }))} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                <div style={{ display:"flex", gap:8 }}>
                  <select value={followUpForm.priority} onChange={e => setFollowUpForm(f => ({ ...f, priority: e.target.value }))} style={{ flex:1, padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }}>
                    <option value="do_now">Do now</option>
                    <option value="schedule">Schedule</option>
                  </select>
                  <input type="date" value={followUpForm.due_date} onChange={e => setFollowUpForm(f => ({ ...f, due_date: e.target.value }))} style={{ flex:1, padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                </div>
                <textarea placeholder="Description (optional)" value={followUpForm.description} onChange={e => setFollowUpForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8", resize:"vertical" }} />
                <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                  <Btn small onClick={() => setShowFollowUpForm(false)}>Cancel</Btn>
                  <Btn small primary onClick={handleCreateFollowUp} disabled={savingFollowUp}>{savingFollowUp ? 'Saving...' : 'Create'}</Btn>
                </div>
              </div>
            )}
            <div style={{ fontSize:11, color:"#888780", marginBottom:12 }}>All pending follow-ups across pipeline</div>
            {followUps.filter(r => r.status==="no-reply").map(r => {
              const contact = contacts.find(c => c.id===r.contactId);
              const pep = pepC[r.pepPriority]||pepC["schedule"];
              const isDone = rappelDone[r.id];
              return (
                <div key={r.id} style={{ background:isDone?"#F1EFE8":"#FFFFFF", borderRadius:9, border:`0.5px solid ${isDone?"#D3D1C7":pep.dot}44`, padding:"10px 12px", marginBottom:8, opacity:isDone?0.6:1 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:5 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:pep.dot, marginTop:4 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:500 }}>{contact?.name}</div>
                      <div style={{ fontSize:11, color:"#888780" }}>{r.subject}</div>
                    </div>
                    <Chip bg={pep.bg} color={pep.color} size={10}>{pep.label}</Chip>
                  </div>
                  <div style={{ fontSize:11, color:"#888780", marginBottom:isDone?0:8, paddingLeft:14 }}>
                    {r.type==="email"?"✉":"◎"} {r.sentDate}
                    {r.daysWithoutReply>0 && <span style={{ color:r.daysWithoutReply>7?"#D85A30":"#888780" }}> · {r.daysWithoutReply}d</span>}
                  </div>
                  {!isDone && <div style={{ display:"flex", gap:5, paddingLeft:14 }}>
                    <Btn small onClick={() => handleMarkReplied(r)}>Replied ✓</Btn>
                    <Btn small>Snooze</Btn>
                  </div>}
                  {isDone && <div style={{ fontSize:11, color:"#1D9E75", paddingLeft:14 }}>✓ Done</div>}
                </div>
              );
            })}
            {followUps.filter(r => r.status==="replied").map(r => {
              const contact = contacts.find(c => c.id===r.contactId);
              return (
                <div key={r.id} style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #5DCAA5", padding:"9px 12px", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:"#1D9E75" }} />
                    <div style={{ flex:1 }}><div style={{ fontSize:12, fontWeight:500 }}>{contact?.name}</div><div style={{ fontSize:11, color:"#888780" }}>{r.subject}</div></div>
                    <Chip bg="#E1F5EE" color="#085041" size={10}>replied ✓</Chip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab==="comms" && (
          <div style={{ padding:14 }}>
            <button style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", marginBottom:10, justifyContent:"center", fontWeight:500 }}>✉ Compose message</button>
            {comms.length === 0 && (
              <div style={{ background:"#F1EFE8", borderRadius:7, padding:"10px 12px", fontSize:12, color:"#888780", textAlign:"center", marginBottom:10 }}>
                Email sync available per item
              </div>
            )}
            {[...comms].sort((a,b) => (b.date||'').localeCompare(a.date||'')).slice(0, 10).map((m,i,arr) => (
              <div key={m.id} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:i<arr.length-1?"0.5px solid #D3D1C7":"none", cursor:"pointer" }}>
                <div style={{ width:28, height:28, borderRadius:7, background:m.bg, color:m.tc, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:11 }}>{m.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500 }}>{m.from}</div>
                  <div style={{ fontSize:11, color:"#888780", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.sub}</div>
                  <div style={{ fontSize:10, color:"#888780", marginTop:1 }}>{m.time}</div>
                </div>
                {m.unread && <div style={{ width:5, height:5, borderRadius:"50%", background:"#378ADD", marginTop:6, flexShrink:0 }} />}
              </div>
            ))}
            <div
              onClick={onOpenInbox}
              style={{ textAlign:"center", padding:"12px 0 4px", cursor:"pointer", fontSize:12, color:"#378ADD", fontWeight:500 }}
            >
              {"View all in Inbox \u2192"}
            </div>
          </div>
        )}
        {tab==="tasks" && (
          <div style={{ padding:14 }}>
            <button onClick={() => setShowTaskForm(f => !f)} style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", marginBottom:10, justifyContent:"center", fontWeight:500 }}>+ Add task</button>
            {showTaskForm && (
              <div style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #378ADD", padding:"12px 14px", marginBottom:10, display:"flex", flexDirection:"column", gap:8 }}>
                <input placeholder="Title *" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                <textarea placeholder="Description (optional)" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8", resize:"vertical" }} />
                <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                  <Btn small onClick={() => setShowTaskForm(false)}>Cancel</Btn>
                  <Btn small primary onClick={handleCreateTask} disabled={savingTask}>{savingTask ? 'Saving...' : 'Create'}</Btn>
                </div>
              </div>
            )}
            {tasks.map((t,i) => {
              const isDone = localTasksDone[t.id] !== undefined ? localTasksDone[t.id] : t.done;
              return (
                <div key={t.id} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:i<tasks.length-1?"0.5px solid #D3D1C7":"none", alignItems:"flex-start" }}>
                  <div onClick={() => handleToggleTask(t)}
                    style={{ width:16, height:16, borderRadius:4, border:`0.5px solid ${isDone?"#1D9E75":"#888780"}`, background:isDone?"#1D9E75":"transparent", flexShrink:0, marginTop:1, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {isDone && <span style={{ color:"#fff", fontSize:9, fontWeight:700 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:isDone?"#888780":"#2C2C2A", textDecoration:isDone?"line-through":"none" }}>{t.text}</div>
                    <div style={{ fontSize:10, color:t.overdue?"#D85A30":"#888780", marginTop:2 }}>{t.due}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab==="calendar" && (() => {
          // Build a combined day-by-day view: calendar events + tasks + follow-ups
          const today = new Date(); today.setHours(0,0,0,0);
          const daySlots = [];
          for (let i = 0; i < 21; i++) {
            const d = new Date(today); d.setDate(today.getDate() + i);
            const key = d.toISOString().slice(0,10);
            let label;
            const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            if (i === 0) label = 'Today';
            else if (i === 1) label = 'Tomorrow';
            else label = days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()];
            daySlots.push({ key, label, date: d });
          }
          // Group graph events by date
          const evsByDate = {};
          graphEvents.forEach(ev => { const dk = ev.startAt ? ev.startAt.slice(0,10) : ''; if (dk) { if (!evsByDate[dk]) evsByDate[dk]=[]; evsByDate[dk].push(ev); }});
          // Group tasks by due date
          const tasksByDate = {};
          tasks.forEach(t => { if (t.dueDate && !t.done) { const dk = t.dueDate.slice(0,10); if (!tasksByDate[dk]) tasksByDate[dk]=[]; tasksByDate[dk].push(t); }});
          // Group follow-ups by due date
          const fuByDate = {};
          followUps.forEach(f => { if (f.sentDate && f.status==='no-reply') { const dk = f.sentDate.slice(0,10); if (!fuByDate[dk]) fuByDate[dk]=[]; fuByDate[dk].push(f); }});

          return (
          <div style={{ padding:14 }}>
            <button onClick={() => setShowMeetingForm(f => !f)} style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", marginBottom:10, justifyContent:"center", fontWeight:500 }}>+ Schedule meeting</button>
            {showMeetingForm && (
              <div style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #378ADD", padding:"12px 14px", marginBottom:10, display:"flex", flexDirection:"column", gap:8 }}>
                <input placeholder="Subject *" value={meetingForm.subject} onChange={e => setMeetingForm(f => ({ ...f, subject: e.target.value }))} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                <input type="date" value={meetingForm.date} onChange={e => setMeetingForm(f => ({ ...f, date: e.target.value }))} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                <div style={{ display:"flex", gap:8 }}>
                  <input type="time" value={meetingForm.startTime} onChange={e => setMeetingForm(f => ({ ...f, startTime: e.target.value }))} style={{ flex:1, padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                  <span style={{ alignSelf:"center", fontSize:12, color:"#888780" }}>-</span>
                  <input type="time" value={meetingForm.endTime} onChange={e => setMeetingForm(f => ({ ...f, endTime: e.target.value }))} style={{ flex:1, padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                </div>
                <input placeholder="Attendees (emails, comma-separated)" value={meetingForm.attendees} onChange={e => setMeetingForm(f => ({ ...f, attendees: e.target.value }))} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#5F5E5A", cursor:"pointer" }}>
                  <input type="checkbox" checked={meetingForm.isOnline} onChange={e => setMeetingForm(f => ({ ...f, isOnline: e.target.checked }))} />
                  Online meeting (Teams)
                </label>
                {graphCalError && <div style={{ fontSize:11, color:"#E24B4A" }}>{graphCalError}</div>}
                <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                  <Btn small onClick={() => setShowMeetingForm(false)}>Cancel</Btn>
                  <Btn small primary onClick={handleCreateMeetingRP} disabled={savingMeeting}>{savingMeeting ? 'Creating...' : 'Create'}</Btn>
                </div>
              </div>
            )}
            {graphCalLoading && <div style={{ fontSize:12, color:"#888780", textAlign:"center", padding:16 }}>Loading calendar...</div>}
            {!graphCalLoading && !localStorage.getItem('graph_token') && graphEvents.length === 0 && (
              <div style={{ background:"#F1EFE8", borderRadius:7, padding:"10px 12px", fontSize:12, color:"#888780", textAlign:"center", marginBottom:10 }}>Log in again to load calendar</div>
            )}
            {daySlots.map(slot => {
              const dayEvents = evsByDate[slot.key] || [];
              const dayTasks = tasksByDate[slot.key] || [];
              const dayFollowUps = fuByDate[slot.key] || [];
              const hasItems = dayEvents.length > 0 || dayTasks.length > 0 || dayFollowUps.length > 0;
              return (
                <DaySection key={slot.key} label={slot.label} hasItems={hasItems} dayEvents={dayEvents} dayTasks={dayTasks} dayFollowUps={dayFollowUps} fmtCalTime={fmtCalTime} evColors={evColors} contacts={contacts} />
              );
            })}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
