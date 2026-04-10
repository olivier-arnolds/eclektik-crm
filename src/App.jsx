import { useState, useMemo } from "react";
import { C, sc, COLS, FUNNEL_STAGES, LEAD_SUB, MS_STATUS_C, pepC, TEAM, typeColors, docIcon, fmt } from './lib/constants';
import { usePipelineData } from './hooks/usePipelineData';
import { updateRow } from './hooks/useSupabase';

// ─── ATOMS ───────────────────────────────────────────────────────────────────
function Chip({ children, bg="#F1EFE8", color="#5F5E5A", size=11 }) {
  return <span style={{ display:"inline-flex", alignItems:"center", fontSize:size, padding:"2px 8px", borderRadius:10, border:"0.5px solid #D3D1C7", background:bg, color, whiteSpace:"nowrap" }}>{children}</span>;
}
function Avatar({ initials, bg, color, size=28 }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:bg, color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:500, flexShrink:0 }}>{initials}</div>;
}
function Btn({ children, primary, small, onClick }) {
  return <button onClick={onClick} style={{ padding:small?"3px 8px":"6px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:small?11:12, cursor:"pointer", background:primary?"#042C53":"#FFFFFF", color:primary?"#B5D4F4":"#2C2C2A", fontFamily:"inherit" }}>{children}</button>;
}
function SLabel({ children }) {
  return <div style={{ padding:"10px 14px 4px", fontSize:10, fontWeight:500, color:"#888780", letterSpacing:"0.08em", textTransform:"uppercase" }}>{children}</div>;
}
function HDivider() { return <div style={{ height:"0.5px", background:"#D3D1C7", margin:"6px 14px" }} />; }
function Empty({ text }) {
  return <div style={{ textAlign:"center", padding:"32px 20px", color:"#888780", fontSize:13 }}><div style={{ fontSize:18, opacity:0.3, marginBottom:8 }}>◌</div>{text}</div>;
}
function SubBar({ current }) {
  const idx = LEAD_SUB.indexOf(current);
  return (
    <div style={{ display:"flex", gap:2, alignItems:"center" }}>
      {LEAD_SUB.map((s,i) => {
        const c=sc(s); const isA=s===current; const past=i<idx;
        return (
          <div key={s} style={{ display:"flex", alignItems:"center", gap:2 }}>
            <div style={{ padding:"2px 8px", borderRadius:12, fontSize:11, fontWeight:isA?500:400, background:isA?c.bg:past?"#E1F5EE":"#F1EFE8", color:isA?c.color:past?"#085041":"#888780", border:`0.5px solid ${isA?c.border:past?"#5DCAA5":"#D3D1C7"}`, textTransform:"capitalize" }}>{s}</div>
            {s!=="close" && <div style={{ width:6, height:1, background:past||isA?"#1D9E75":"#D3D1C7" }} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── ITEM CARD ────────────────────────────────────────────────────────────────
function ItemCard({ item, onClick, compact, accounts, contacts, followUps }) {
  const getAcc = (id) => accounts.find(a => a.id === id);
  const getCts = (ids) => contacts.filter(c => ids && ids.includes(c.id));
  const rappelsFor = (id) => followUps.filter(r => r.itemIds.includes(id));
  const acc = getAcc(item.accountId);
  const stC = sc(item.subStatus||item.funnelStage);
  const isFin = item.funnelStage === 'lead' || item.funnelStage === 'opportunity';
  const pendingRappels = rappelsFor(item.id).filter(r => r.status==="no-reply").length;
  return (
    <div onClick={() => onClick(item)}
      style={{ background:"#FFFFFF", borderRadius:9, border:`0.5px solid ${stC.border}`, padding:compact?"9px 11px":"12px 14px", cursor:"pointer", marginBottom:compact?5:8, position:"relative" }}
      onMouseEnter={e => e.currentTarget.style.background="#FAFAF8"}
      onMouseLeave={e => e.currentTarget.style.background="#FFFFFF"}
    >
      {pendingRappels > 0 && !compact && <div style={{ position:"absolute", top:10, right:10, width:6, height:6, borderRadius:"50%", background:"#E24B4A" }} />}
      <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:stC.dot, marginTop:4, flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:compact?12:13, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</div>
          <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{acc?.flag} {acc?.name}</div>
          {isFin && item.subStatus && !compact && <div style={{ marginTop:6 }}><SubBar current={item.subStatus} /></div>}
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:compact?12:13, fontWeight:500 }}>{fmt(item.value)}</div>
          {isFin && <div style={{ fontSize:10, color:"#888780" }}>{item.probability}%</div>}
        </div>
      </div>
      {!compact && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8 }}>
          <div style={{ display:"flex", gap:3 }}>
            {getCts(item.contactIds).slice(0,3).map(c => (
              <div key={c.id} style={{ width:20, height:20, borderRadius:"50%", background:c.avatarBg, color:c.avatarColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:500 }}>{c.initials}</div>
            ))}
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {item.funderId && <Chip bg="#FAEEDA" color="#633806" size={10}>ECIF</Chip>}
            {item.partnerIds?.length > 0 && <Chip bg="#E6F1FB" color="#0C447C" size={10}>+ partner</Chip>}
            <Chip bg={stC.bg} color={stC.color} size={10}>{item.subStatus||item.funnelStage}</Chip>
            <Chip size={10}>{item.owner}</Chip>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ITEM-LEVEL FOLLOW-UPS MINI PANEL ────────────────────────────────────────
function ItemRappelTab({ itemId, followUps, contacts, refetch }) {
  const [done, setDone] = useState({});
  const related = followUps.filter(r => r.itemIds.includes(itemId));
  const pending = related.filter(r => r.status==="no-reply");
  const replied = related.filter(r => r.status==="replied");
  if (related.length === 0) return <Empty text="No follow-ups for this item." />;

  const handleMarkReplied = async (r) => {
    setDone(p => ({ ...p, [r.id]: true }));
    await updateRow('follow_ups', r.id, { status: 'replied' });
    refetch();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {pending.map(r => {
        const contact = contacts.find(c => c.id===r.contactId);
        const pep = pepC[r.pepPriority] || pepC["schedule"];
        const isDone = done[r.id];
        return (
          <div key={r.id} style={{ background:isDone?"#F1EFE8":"#FFFFFF", borderRadius:9, border:`0.5px solid ${isDone?"#D3D1C7":pep.dot}44`, padding:"10px 12px", opacity:isDone?0.6:1 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:5 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:pep.dot, marginTop:4 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500 }}>{contact?.name}</div>
                <div style={{ fontSize:11, color:"#888780" }}>{r.subject}</div>
              </div>
              <Chip bg={pep.bg} color={pep.color} size={10}>{pep.label}</Chip>
            </div>
            <div style={{ fontSize:11, color:"#888780", marginBottom:isDone?0:8, paddingLeft:14 }}>
              {r.type==="email"?"✉":"◎"} Sent {r.sentDate}
              {r.daysWithoutReply>0 && <span style={{ color:r.daysWithoutReply>7?"#D85A30":"#888780" }}> · {r.daysWithoutReply}d no reply</span>}
            </div>
            {!isDone && (
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", paddingLeft:14 }}>
                <Btn small onClick={() => handleMarkReplied(r)}>Replied ✓</Btn>
                <Btn small>Schedule call</Btn>
                <Btn small>Send reminder</Btn>
                <Btn small>Snooze 3d</Btn>
              </div>
            )}
            {isDone && <div style={{ fontSize:11, color:"#1D9E75", paddingLeft:14 }}>✓ Marked as replied</div>}
          </div>
        );
      })}
      {replied.map(r => {
        const contact = contacts.find(c => c.id===r.contactId);
        return (
          <div key={r.id} style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #5DCAA5", padding:"10px 12px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#1D9E75" }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500 }}>{contact?.name}</div>
                <div style={{ fontSize:11, color:"#888780" }}>{r.subject}</div>
              </div>
              <Chip bg="#E1F5EE" color="#085041" size={10}>replied {r.replyDate}</Chip>
            </div>
            {r.note && <div style={{ fontSize:11, color:"#5F5E5A", marginTop:5, paddingLeft:14 }}>{r.note}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── PROJECT PLAN TAB ─────────────────────────────────────────────────────────
function ProjectPlanTab({ item }) {
  const done = (item.milestones||[]).filter(m => m.status==="done").length;
  const total = (item.milestones||[]).length;
  const pct = total ? Math.round((done/total)*100) : 0;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {item.sow && (
        <div style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px" }}>
          <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Statement of Work</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:8, background:"#E6F1FB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{docIcon[item.sow.docType]||"📄"}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{item.sow.name}</div>
              <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>Signed {item.sow.signedDate} · {item.sow.value}</div>
            </div>
            <Chip bg="#E1F5EE" color="#085041" size={10}>Signed ✓</Chip>
          </div>
        </div>
      )}
      {item.assignedTeam && item.assignedTeam.length > 0 && (
        <div style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px" }}>
          <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Assigned from Eclectik</div>
          {item.assignedTeam.map((m,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:i<item.assignedTeam.length-1?8:0 }}>
              <Avatar initials={m.initials} bg={m.avatarBg} color={m.avatarColor} size={32} />
              <div>
                <div style={{ fontSize:13, fontWeight:500 }}>{m.name}</div>
                <div style={{ fontSize:11, color:"#888780" }}>{m.projectRole} · {m.role}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {item.milestones && item.milestones.length > 0 && (
        <div style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em" }}>Milestones</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:70, height:5, borderRadius:3, background:"#D3D1C7", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, borderRadius:3, background:"#1D9E75" }} />
              </div>
              <span style={{ fontSize:11, color:"#888780" }}>{pct}%</span>
            </div>
          </div>
          {item.milestones.map((m,i) => {
            const msc = MS_STATUS_C[m.status]||MS_STATUS_C.pending;
            return (
              <div key={i} style={{ display:"flex", gap:12, marginBottom:i<item.milestones.length-1?10:0, position:"relative" }}>
                {i < item.milestones.length-1 && <div style={{ position:"absolute", left:8, top:18, bottom:-10, width:"0.5px", background:"#D3D1C7" }} />}
                <div style={{ width:17, height:17, borderRadius:"50%", background:msc.bg, border:`0.5px solid ${msc.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:msc.color, flexShrink:0, zIndex:1 }}>
                  {m.status==="done"?"✓":m.status==="active"?"▶":i+1}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ fontSize:13, fontWeight:m.status==="active"?500:400 }}>{m.title}</div>
                    <Chip bg={msc.bg} color={msc.color} size={10}>{msc.label}</Chip>
                  </div>
                  <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{m.startDate} → {m.endDate}</div>
                  {m.notes && m.status!=="pending" && <div style={{ fontSize:11, color:"#5F5E5A", marginTop:2, lineHeight:1.4 }}>{m.notes}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ITEM DETAIL ─────────────────────────────────────────────────────────────
function ItemDetail({ item, onBack, extraTimeline, addNote, noteText, setNoteText, accounts, contacts, followUps, comms, tasks, calEvents, refetch }) {
  const getAcc = (id) => accounts.find(a => a.id === id);
  const getCts = (ids) => contacts.filter(c => ids && ids.includes(c.id));
  const rappelsFor = (id) => followUps.filter(r => r.itemIds.includes(id));
  const commsFor = (id) => comms.filter(c => c.itemIds.includes(id)).sort((a,b) => (b.date||'').localeCompare(a.date||''));
  const tasksFor = (id) => tasks.filter(t => t.itemIds.includes(id));
  const calFor = (id) => {
    const evs = calEvents.filter(e => e.itemIds.includes(id));
    const groups = {};
    evs.forEach(e => { if (!groups[e.dateLabel]) groups[e.dateLabel] = []; groups[e.dateLabel].push(e); });
    return Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]));
  };

  const isProj = ['onboarding','active','inactive','past'].includes(item.funnelStage);
  const [tab, setTab] = useState(isProj ? "project plan" : "overview");
  const acc = getAcc(item.accountId);
  const isLD = !isProj;
  const stC = sc(item.subStatus||item.funnelStage);
  const partners = (item.partnerIds||[]).map(getAcc).filter(Boolean);
  const funder = item.funderId ? getAcc(item.funderId) : null;
  const timeline = [...(extraTimeline||[]), ...(item.timeline||[])];

  const tabs = isProj
    ? ["project plan","overview","follow-ups","comms","tasks","calendar","documents","timeline"]
    : ["overview","follow-ups","comms","tasks","calendar","documents","timeline"];

  const pendingR = rappelsFor(item.id).filter(r => r.status==="no-reply").length;

  const handleToggleTask = async (t) => {
    await updateRow('tasks', t.id, { status: t.done ? 'pending' : 'done' });
    refetch();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ background:"#FFFFFF", borderBottom:"0.5px solid #D3D1C7", padding:"12px 18px 0", flexShrink:0 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#888780", fontFamily:"inherit", padding:0, marginBottom:10 }}>← back</button>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, paddingBottom:12 }}>
          <div style={{ width:44, height:44, borderRadius:10, background:stC.bg, color:stC.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
            {item.funnelStage==="lead"?"◈":item.funnelStage==="opportunity"?"◉":"●"}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:500 }}>{item.title}</div>
            <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
              <Chip>{acc?.flag} {acc?.name}</Chip>
              <Chip bg={stC.bg} color={stC.color}>{item.funnelStage}</Chip>
              {item.productLine && <Chip>{item.productLine}</Chip>}
              <Chip>Owner: {item.owner}</Chip>
              {funder && <Chip bg="#FAEEDA" color="#633806">ECIF {fmt(item.fundingAmount||0)}</Chip>}
            </div>
            {isLD && item.subStatus && <div style={{ marginTop:10 }}><SubBar current={item.subStatus} /></div>}
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:22, fontWeight:500 }}>{fmt(item.value)}</div>
            {isLD && <div style={{ fontSize:12, color:"#888780", marginTop:2 }}>{item.probability}% · closes {item.closeDate}</div>}
            {item.startDate && <div style={{ fontSize:12, color:"#888780", marginTop:2 }}>{item.startDate}{item.endDate?` → ${item.endDate}`:""}</div>}
          </div>
        </div>
        <div style={{ display:"flex", borderTop:"0.5px solid #D3D1C7", marginLeft:-18, marginRight:-18, paddingLeft:18, overflowX:"auto" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding:"8px 12px", fontSize:11, cursor:"pointer", background:"transparent", border:"none", borderBottom:tab===t?"2px solid #378ADD":"2px solid transparent", color:tab===t?"#2C2C2A":"#888780", fontWeight:tab===t?500:400, fontFamily:"inherit", textTransform:"capitalize", whiteSpace:"nowrap", flexShrink:0 }}>
              {t}
              {t==="follow-ups" && pendingR>0 && <span style={{ marginLeft:3, background:"#E24B4A", color:"#fff", fontSize:9, padding:"1px 4px", borderRadius:6 }}>{pendingR}</span>}
              {t==="comms" && commsFor(item.id).filter(c=>c.unread).length>0 && <span style={{ marginLeft:3, background:"#378ADD", color:"#fff", fontSize:9, padding:"1px 4px", borderRadius:6 }}>{commsFor(item.id).filter(c=>c.unread).length}</span>}
              {t==="tasks" && tasksFor(item.id).filter(t=>!t.done).length>0 && <span style={{ marginLeft:3, background:"#888780", color:"#fff", fontSize:9, padding:"1px 4px", borderRadius:6 }}>{tasksFor(item.id).filter(t=>!t.done).length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"16px 18px" }}>
        {tab==="project plan" && <ProjectPlanTab item={item} />}
        {tab==="overview" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px" }}>
              <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Parties</div>
              {[{ label:"Client", a:acc }, ...partners.map(p=>({ label:"Partner", a:p })), funder?{ label:item.funderLabel||"Funder", a:funder, funding:item.fundingAmount }:null].filter(Boolean).map((p,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"0.5px solid #F1EFE8" }}>
                  <span style={{ fontSize:18 }}>{p.a?.flag}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500 }}>{p.a?.name}</div>
                    <div style={{ fontSize:11, color:"#888780" }}>{p.label}</div>
                  </div>
                  {p.funding && <Chip bg="#FAEEDA" color="#633806" size={10}>€{(p.funding/1000).toFixed(0)}k ECIF</Chip>}
                </div>
              ))}
            </div>
            <div style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px" }}>
              <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Contacts</div>
              {getCts(item.contactIds).map(c => (
                <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <Avatar initials={c.initials} bg={c.avatarBg} color={c.avatarColor} size={32} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{c.name}</div>
                    <div style={{ fontSize:11, color:"#888780" }}>{c.role} · {getAcc(c.accountId)?.name}</div>
                    {c.source && <div style={{ fontSize:10, color:"#378ADD", marginTop:2 }}>Source: {c.source}</div>}
                  </div>
                  <div style={{ display:"flex", gap:5 }}><Btn small>✉</Btn><Btn small>◎</Btn></div>
                </div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[["Value",fmt(item.value)], isLD?["Probability",`${item.probability}%`]:["Owner",item.owner], isLD?["Close date",item.closeDate]:["Period",item.startDate||"—"]].map(([l,v]) => (
                <div key={l} style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"10px 12px" }}>
                  <div style={{ fontSize:10, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:500, marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:14, fontWeight:500 }}>{v}</div>
                </div>
              ))}
            </div>
            {item.notes && (
              <div style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px" }}>
                <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Notes</div>
                <div style={{ fontSize:13, color:"#5F5E5A", lineHeight:1.6 }}>{item.notes}</div>
              </div>
            )}
          </div>
        )}
        {tab==="follow-ups" && <ItemRappelTab itemId={item.id} followUps={followUps} contacts={contacts} refetch={refetch} />}
        {tab==="comms" && (
          <div>
            <button style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", marginBottom:10, justifyContent:"center", fontWeight:500 }}>✉ Compose message</button>
            {commsFor(item.id).length === 0 ? <Empty text="No communications for this item." /> :
              commsFor(item.id).map((m,i) => (
                <div key={m.id} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:i<commsFor(item.id).length-1?"0.5px solid #D3D1C7":"none", cursor:"pointer" }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:m.bg, color:m.tc, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:11 }}>{m.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500 }}>{m.from}</div>
                    <div style={{ fontSize:11, color:"#888780", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.sub}</div>
                    <div style={{ fontSize:10, color:"#888780", marginTop:1 }}>{m.time}</div>
                  </div>
                  {m.unread && <div style={{ width:5, height:5, borderRadius:"50%", background:"#378ADD", marginTop:6, flexShrink:0 }} />}
                </div>
              ))
            }
          </div>
        )}
        {tab==="tasks" && (
          <div>
            <button style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", marginBottom:10, justifyContent:"center", fontWeight:500 }}>+ Add task</button>
            {tasksFor(item.id).length === 0 ? <Empty text="No tasks for this item." /> :
              tasksFor(item.id).map((t,i,arr) => (
                <div key={t.id} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:i<arr.length-1?"0.5px solid #D3D1C7":"none", alignItems:"flex-start" }}>
                  <div onClick={() => handleToggleTask(t)} style={{ width:16, height:16, borderRadius:4, border:`0.5px solid ${t.done?"#1D9E75":"#888780"}`, background:t.done?"#1D9E75":"transparent", flexShrink:0, marginTop:1, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                    {t.done && <span style={{ color:"#fff", fontSize:9, fontWeight:700 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:t.done?"#888780":"#2C2C2A", textDecoration:t.done?"line-through":"none" }}>{t.text}</div>
                    <div style={{ fontSize:10, color:t.overdue?"#D85A30":"#888780", marginTop:2 }}>{t.due}</div>
                  </div>
                </div>
              ))
            }
          </div>
        )}
        {tab==="calendar" && (
          <div>
            <button style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", marginBottom:10, justifyContent:"center", fontWeight:500 }}>+ Schedule meeting</button>
            {calFor(item.id).length === 0 ? <Empty text="No scheduled meetings for this item." /> :
              calFor(item.id).map(([dateLabel, evs]) => (
                <div key={dateLabel} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>{dateLabel}</div>
                  {evs.map(ev => (
                    <div key={ev.id} style={{ display:"flex", gap:8, padding:"7px 10px", borderRadius:7, border:"0.5px solid #D3D1C7", marginBottom:5, cursor:"pointer" }}>
                      <div style={{ width:3, borderRadius:2, background:ev.color, flexShrink:0 }} />
                      <div>
                        <div style={{ fontSize:12, fontWeight:500 }}>{ev.title}</div>
                        <div style={{ fontSize:11, color:"#888780" }}>{ev.time}</div>
                        <div style={{ fontSize:10, color:"#888780", marginTop:1 }}>{ev.who}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            }
          </div>
        )}
        {tab==="documents" && (
          <div>
            {(item.documents||[]).length > 0
              ? (item.documents||[]).map((doc,i) => (
                <div key={i} style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"11px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="#888780"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="#D3D1C7"}
                >
                  <div style={{ width:34, height:34, borderRadius:7, background:"#F1EFE8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{docIcon[doc.type]||"📄"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{doc.name}</div>
                    <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>Added {doc.date}</div>
                  </div>
                  <span style={{ fontSize:11, color:"#888780" }}>↓</span>
                </div>
              ))
              : <Empty text="No documents yet." />
            }
            <button style={{ display:"flex", alignItems:"center", gap:6, marginTop:4, padding:"8px 14px", borderRadius:7, border:"0.5px dashed #B4B2A9", fontSize:12, cursor:"pointer", background:"transparent", color:"#888780", fontFamily:"inherit", width:"100%" }}>+ Upload document</button>
          </div>
        )}
        {tab==="timeline" && timeline.map((e,i) => (
          <div key={i} style={{ display:"flex", gap:12, marginBottom:12, position:"relative" }}>
            {i < timeline.length-1 && <div style={{ position:"absolute", left:9, top:22, bottom:-12, width:"0.5px", background:"#D3D1C7" }} />}
            <div style={{ width:20, height:20, borderRadius:"50%", background:stC.bg, color:stC.color, border:`0.5px solid ${stC.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, flexShrink:0, zIndex:1 }}>{e.icon}</div>
            <div style={{ flex:1, background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"9px 12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <div style={{ fontSize:12, fontWeight:500 }}>{e.type}</div>
                <div style={{ fontSize:11, color:"#888780" }}>{e.time}</div>
              </div>
              <div style={{ fontSize:12, color:"#5F5E5A", lineHeight:1.5 }}>{e.text}</div>
              <div style={{ fontSize:10, color:"#888780", marginTop:5 }}>→ {e.owner}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, padding:"10px 18px", borderTop:"0.5px solid #D3D1C7", background:"#FFFFFF", flexShrink:0 }}>
        <input value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key==="Enter" && addNote(item.id)}
          placeholder="Log activity, note, or update…"
          style={{ flex:1, padding:"7px 11px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, background:"#F1EFE8", color:"#2C2C2A", fontFamily:"inherit", outline:"none" }} />
        <Btn onClick={() => addNote(item.id)}>Log</Btn>
        <Btn primary>Analyse ↗</Btn>
      </div>
    </div>
  );
}

// ─── LIST VIEW ───────────────────────────────────────────────────────────────
function ListView({ stageKey, onSelectItem, search, allItems, accounts, contacts, followUps }) {
  const getAcc = (id) => accounts.find(a => a.id === id);
  const stage = FUNNEL_STAGES.find(s => s.key===stageKey);
  const stC = sc(stageKey);
  const activeInStage = ["lead","opportunity"].includes(stageKey);
  const allInStage = allItems.filter(i => i.funnelStage===stageKey);
  const applySearch = (arr) => !search ? arr : arr.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || (getAcc(i.accountId)?.name||"").toLowerCase().includes(search.toLowerCase()));
  const sorted = (arr) => [...arr].sort((a,b) => (b.sortDate||"").localeCompare(a.sortDate||""));

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ background:"#FFFFFF", borderBottom:"0.5px solid #D3D1C7", padding:"14px 18px 12px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:stC.dot }} />
          <div style={{ fontSize:16, fontWeight:500 }}>{stage?.label}</div>
          <Chip bg={stC.bg} color={stC.color}>{allInStage.length} item{allInStage.length!==1?"s":""}</Chip>
          {allInStage.length>0 && <Chip bg="#F1EFE8" color="#2C2C2A">{fmt(allInStage.reduce((s,i)=>s+i.value,0))}</Chip>}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 18px" }}>
        {activeInStage ? (
          LEAD_SUB.map(sub => {
            const colItems = applySearch(sorted(allInStage.filter(i => i.subStatus===sub)));
            const colC = sc(sub);
            if (colItems.length === 0 && search) return null;
            return (
              <div key={sub} style={{ marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:colC.dot }} />
                  <span style={{ fontSize:12, fontWeight:500, color:colC.color, textTransform:"capitalize" }}>{sub}</span>
                  <span style={{ fontSize:11, color:colC.color, background:colC.bg, padding:"1px 7px", borderRadius:8, border:`0.5px solid ${colC.border}` }}>{colItems.length}</span>
                  {colItems.length>0 && <span style={{ fontSize:11, color:"#888780" }}>{fmt(colItems.reduce((s,i)=>s+i.value,0))}</span>}
                </div>
                {colItems.length === 0
                  ? <div style={{ fontSize:12, color:"#B4B2A9", paddingLeft:15, marginBottom:8 }}>no items</div>
                  : colItems.map(item => <ItemCard key={item.id} item={item} onClick={onSelectItem} accounts={accounts} contacts={contacts} followUps={followUps} />)
                }
              </div>
            );
          })
        ) : (
          applySearch(sorted(allInStage)).length === 0
            ? <Empty text={search?`No results for "${search}".`:`No items in ${stage?.label.toLowerCase()}.`} />
            : applySearch(sorted(allInStage)).map(item => <ItemCard key={item.id} item={item} onClick={onSelectItem} accounts={accounts} contacts={contacts} followUps={followUps} />)
        )}
        {!search && (
          <button style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:7, border:"0.5px dashed #B4B2A9", fontSize:12, cursor:"pointer", background:"transparent", color:"#888780", fontFamily:"inherit", width:"100%", marginTop:4 }}>
            + Add {stageKey==="lead"?"lead":stageKey==="opportunity"?"opportunity":"project"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SWIMLANE ────────────────────────────────────────────────────────────────
function SwimlaneView({ onSelectItem, search, allItems, accounts, contacts, followUps }) {
  const getAcc = (id) => accounts.find(a => a.id === id);
  const applySearch = (arr) => !search ? arr : arr.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || (getAcc(i.accountId)?.name||"").toLowerCase().includes(search.toLowerCase()));
  const sorted = (arr) => [...arr].sort((a,b) => (b.sortDate||"").localeCompare(a.sortDate||""));
  const activeItems = allItems.filter(i => ["lead","opportunity","onboarding","active"].includes(i.funnelStage));
  const totalVal = activeItems.reduce((s,i)=>s+i.value,0);

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"#FFFFFF", borderBottom:"0.5px solid #D3D1C7", padding:"12px 18px", flexShrink:0, display:"flex", gap:10, alignItems:"center" }}>
        <div style={{ fontSize:14, fontWeight:500 }}>Pipeline swimlane</div>
        <Chip>{applySearch(activeItems).length} items</Chip>
        <Chip bg="#FAEEDA" color="#633806">{fmt(totalVal)}</Chip>
        {search && <Chip bg="#E6F1FB" color="#0C447C">filtering: "{search}"</Chip>}
        <div style={{ fontSize:11, color:"#888780", marginLeft:"auto" }}>newest on top</div>
      </div>
      <div style={{ flex:1, overflowX:"auto", overflowY:"hidden", display:"flex", padding:"12px 14px", gap:10 }}>
        {COLS.map(col => {
          const stC = sc(col.key);
          const raw = col.subStatus
            ? allItems.filter(i => col.funnelStages.includes(i.funnelStage) && i.subStatus===col.subStatus)
            : allItems.filter(i => col.funnelStages.includes(i.funnelStage));
          const colItems = applySearch(sorted(raw));
          const colVal = raw.reduce((s,i)=>s+i.value,0);
          return (
            <div key={col.key} style={{ flexShrink:0, width:195, display:"flex", flexDirection:"column" }}>
              <div style={{ background:stC.bg, borderRadius:"8px 8px 0 0", padding:"8px 10px", border:`0.5px solid ${stC.border}`, borderBottom:"none" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:stC.dot }} />
                    <span style={{ fontSize:12, fontWeight:500, color:stC.color }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize:10, color:stC.color, padding:"1px 6px", borderRadius:8, border:`0.5px solid ${stC.border}` }}>{colItems.length}</span>
                </div>
                {colVal > 0 && <div style={{ fontSize:11, color:stC.color, marginTop:2, opacity:0.8 }}>{fmt(colVal)}</div>}
              </div>
              <div style={{ flex:1, overflowY:"auto", background:"#FAFAF8", border:`0.5px solid ${stC.border}`, borderTop:"none", borderRadius:"0 0 8px 8px", padding:8 }}>
                {colItems.length===0
                  ? <div style={{ textAlign:"center", padding:"16px 8px", fontSize:11, color:"#B4B2A9" }}>empty</div>
                  : colItems.map(item => <ItemCard key={item.id} item={item} onClick={onSelectItem} compact accounts={accounts} contacts={contacts} followUps={followUps} />)
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TIMELINE VIEW ────────────────────────────────────────────────────────────
const TIME_RANGES = [
  { key:"month",   label:"Month"  },
  { key:"quarter", label:"Quarter"},
  { key:"half",    label:"Half yr"},
  { key:"year",    label:"Year"   },
  { key:"all",     label:"All"    },
];

function TimelineView({ onSelectItem, allItems, accounts }) {
  const getAcc = (id) => accounts.find(a => a.id === id);
  const [range, setRange] = useState("quarter");
  const TODAY = new Date("2026-04-10");
  const getWindow = () => {
    if (range==="month")   return { start: new Date("2026-04-01"), end: new Date("2026-04-30") };
    if (range==="quarter") return { start: new Date("2026-04-01"), end: new Date("2026-06-30") };
    if (range==="half")    return { start: new Date("2026-01-01"), end: new Date("2026-06-30") };
    if (range==="year")    return { start: new Date("2026-01-01"), end: new Date("2026-12-31") };
    return { start: new Date("2025-06-01"), end: new Date("2026-12-31") };
  };
  const { start, end } = getWindow();
  const totalDays = (end - start) / 86400000;
  const parseDate = (str) => {
    if (!str) return null;
    const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
    const parts = str.split(" ");
    if (parts.length === 2) return new Date(parseInt(parts[1]), months[parts[0]], 1);
    const p2 = str.split("-");
    if (p2.length === 3) return new Date(parseInt(p2[0]), parseInt(p2[1])-1, parseInt(p2[2]));
    return null;
  };
  const toX = (d) => { if (!d) return 0; const days = (d - start) / 86400000; return Math.max(0, Math.min(100, (days / totalDays) * 100)); };
  const projectsWithDates = allItems.filter(item => {
    const s = parseDate(item.startDate || item.closeDate);
    const e2 = parseDate(item.endDate || item.closeDate);
    if (!s && !e2) return false;
    const itemEnd = e2 || s;
    const itemStart = s || e2;
    return itemEnd >= start && itemStart <= end;
  });
  const ticks = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) { ticks.push({ date: new Date(cur), pct: toX(cur) }); cur.setMonth(cur.getMonth() + 1); }
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const todayPct = toX(TODAY);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ background:"#FFFFFF", borderBottom:"0.5px solid #D3D1C7", padding:"12px 18px", flexShrink:0, display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ fontSize:14, fontWeight:500 }}>Timeline</div>
        <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
          {TIME_RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              style={{ padding:"4px 10px", borderRadius:6, border:"0.5px solid", borderColor:range===r.key?"#185FA5":"#D3D1C7", background:range===r.key?"#E6F1FB":"transparent", color:range===r.key?"#0C447C":"#888780", cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 18px" }}>
        <div style={{ position:"relative", height:24, marginBottom:8, marginLeft:160 }}>
          {ticks.map((t,i) => (
            <div key={i} style={{ position:"absolute", left:`${t.pct}%`, fontSize:10, color:"#888780", transform:"translateX(-50%)", whiteSpace:"nowrap" }}>
              {monthNames[t.date.getMonth()]} {t.date.getFullYear()!==2026?t.date.getFullYear():""}
            </div>
          ))}
        </div>
        <div style={{ position:"relative" }}>
          {ticks.map((t,i) => (
            <div key={i} style={{ position:"absolute", left:`calc(160px + ${t.pct}% * (100% - 160px) / 100)`, top:0, bottom:0, width:"0.5px", background:"#F1EFE8", zIndex:0 }} />
          ))}
          <div style={{ position:"absolute", left:`calc(160px + ${todayPct}% * (100% - 160px) / 100)`, top:0, bottom:0, width:1, background:"#E24B4A", zIndex:2, opacity:0.6 }} />
          {projectsWithDates.length === 0
            ? <Empty text="No items with dates in this range." />
            : projectsWithDates.map((item) => {
              const s = parseDate(item.startDate||item.closeDate);
              const e2 = parseDate(item.endDate||item.closeDate);
              const xStart = toX(s);
              const xEnd = toX(e2||s);
              const width = Math.max(1.5, xEnd - xStart);
              const stC = sc(item.subStatus||item.funnelStage);
              const acc = getAcc(item.accountId);
              return (
                <div key={item.id} onClick={() => onSelectItem(item)} style={{ display:"flex", alignItems:"center", marginBottom:8, cursor:"pointer", minHeight:32 }}>
                  <div style={{ width:160, flexShrink:0, paddingRight:12 }}>
                    <div style={{ fontSize:11, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title.split(" — ")[0]}</div>
                    <div style={{ fontSize:10, color:"#888780", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{acc?.flag} {acc?.name}</div>
                  </div>
                  <div style={{ flex:1, position:"relative", height:28 }}>
                    <div style={{ position:"absolute", left:`${xStart}%`, width:`${width}%`, top:"50%", transform:"translateY(-50%)", height:18, borderRadius:4, background:stC.bg, border:`0.5px solid ${stC.border}`, display:"flex", alignItems:"center", padding:"0 6px", overflow:"hidden", minWidth:6 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:stC.dot, flexShrink:0, marginRight:4 }} />
                      {width > 8 && <span style={{ fontSize:10, color:stC.color, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{fmt(item.value)}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
        <div style={{ display:"flex", gap:12, marginTop:16, paddingTop:12, borderTop:"0.5px solid #D3D1C7", flexWrap:"wrap" }}>
          {COLS.map(col => {
            const stC = sc(col.key);
            return <div key={col.key} style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:10, height:10, borderRadius:2, background:stC.bg, border:`0.5px solid ${stC.border}` }} /><span style={{ fontSize:11, color:"#888780" }}>{col.label}</span></div>;
          })}
          <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:1, height:12, background:"#E24B4A", opacity:0.6 }} /><span style={{ fontSize:11, color:"#888780" }}>Today</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── SEARCH RESULTS ──────────────────────────────────────────────────────────
function SearchResults({ results, onSelectItem, onSelectAccount, accounts }) {
  const getAcc = (id) => accounts.find(a => a.id === id);
  if (!results) return null;
  const { items, accounts: accs, contacts: cts } = results;
  const total = items.length + accs.length + cts.length;
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ background:"#FFFFFF", borderBottom:"0.5px solid #D3D1C7", padding:"14px 18px 12px", flexShrink:0 }}>
        <div style={{ fontSize:16, fontWeight:500 }}>Search results</div>
        <div style={{ fontSize:12, color:"#888780", marginTop:2 }}>{total} result{total!==1?"s":""}</div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 18px" }}>
        {total === 0 && <Empty text="No results found." />}
        {items.length > 0 && (
          <>
            <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Pipeline ({items.length})</div>
            {items.map(item => <ItemCard key={item.id} item={item} onClick={onSelectItem} accounts={accounts} contacts={[]} followUps={[]} />)}
          </>
        )}
        {accs.length > 0 && (
          <>
            <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8, marginTop:16 }}>Accounts ({accs.length})</div>
            {accs.map(acc => {
              const tc = typeColors[acc.type]||typeColors.Klant;
              return (
                <div key={acc.id} onClick={() => onSelectAccount(acc)}
                  style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #D3D1C7", padding:"11px 14px", marginBottom:6, cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}
                  onMouseEnter={e => e.currentTarget.style.background="#FAFAF8"}
                  onMouseLeave={e => e.currentTarget.style.background="#FFFFFF"}
                >
                  <div style={{ width:32, height:32, borderRadius:8, background:acc.avatarBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{acc.flag}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{acc.name}</div>
                    <div style={{ fontSize:11, color:"#888780" }}>{acc.city}, {acc.country} · {acc.industry}</div>
                  </div>
                  <Chip bg={tc.bg} color={tc.color} size={10}>{acc.type}</Chip>
                </div>
              );
            })}
          </>
        )}
        {cts.length > 0 && (
          <>
            <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8, marginTop:16 }}>Contacts ({cts.length})</div>
            {cts.map(c => (
              <div key={c.id} style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #D3D1C7", padding:"10px 14px", marginBottom:6, display:"flex", alignItems:"center", gap:10 }}>
                <Avatar initials={c.initials} bg={c.avatarBg} color={c.avatarColor} size={32} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{c.name}</div>
                  <div style={{ fontSize:11, color:"#888780" }}>{c.role} · {getAcc(c.accountId)?.name}</div>
                </div>
                <div style={{ display:"flex", gap:5 }}><Btn small>✉</Btn><Btn small>◎</Btn></div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── ACCOUNTS ────────────────────────────────────────────────────────────────
function AccountsList({ onSelect, search, accounts, contacts }) {
  const filtered = [...accounts].sort((a,b) => a.name.localeCompare(b.name)).filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.country.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ background:"#FFFFFF", borderBottom:"0.5px solid #D3D1C7", padding:"16px 18px 14px", flexShrink:0 }}>
        <div style={{ fontSize:16, fontWeight:500 }}>Accounts</div>
        <div style={{ fontSize:12, color:"#888780", marginTop:2 }}>{filtered.length} accounts · A–Z</div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 18px" }}>
        {filtered.map(acc => {
          const tc = typeColors[acc.type]||typeColors.Klant;
          const cnt = contacts.filter(c => c.accountId===acc.id);
          return (
            <div key={acc.id} onClick={() => onSelect(acc)}
              style={{ background:"#FFFFFF", borderRadius:10, border:"0.5px solid #D3D1C7", padding:"13px 16px", marginBottom:8, cursor:"pointer", display:"flex", alignItems:"center", gap:13 }}
              onMouseEnter={e => e.currentTarget.style.borderColor="#888780"}
              onMouseLeave={e => e.currentTarget.style.borderColor="#D3D1C7"}
            >
              <div style={{ width:40, height:40, borderRadius:9, background:acc.avatarBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{acc.flag}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:500 }}>{acc.name}</div>
                <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{acc.city}, {acc.country} · {acc.industry}</div>
                <div style={{ display:"flex", gap:5, marginTop:5 }}>
                  <Chip bg={tc.bg} color={tc.color} size={10}>{acc.type}</Chip>
                </div>
              </div>
              <div style={{ display:"flex" }}>
                {cnt.slice(0,3).map((c,i) => (
                  <div key={c.id} style={{ width:26, height:26, borderRadius:"50%", background:c.avatarBg, color:c.avatarColor, border:"2px solid #FFFFFF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:500, marginLeft:i>0?-8:0 }}>{c.initials}</div>
                ))}
              </div>
              <div style={{ color:"#B4B2A9", fontSize:16 }}>›</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccountDetail({ account, onBack, onSelectItem, allItems, accounts, contacts, followUps }) {
  const getAcc = (id) => accounts.find(a => a.id === id);
  const [tab, setTab] = useState("details");
  const tc = typeColors[account.type]||typeColors.Klant;
  const accC = contacts.filter(c => c.accountId===account.id).sort((a,b)=>a.name.localeCompare(b.name));
  const accL = allItems.filter(i => i.funnelStage==='lead' && (i.accountId===account.id||(i.partnerIds||[]).includes(account.id)));
  const accO = allItems.filter(i => i.funnelStage==='opportunity' && (i.accountId===account.id||(i.partnerIds||[]).includes(account.id)));
  const accP = allItems.filter(i => ['onboarding','active','inactive','past'].includes(i.funnelStage) && (i.accountId===account.id||(i.partnerIds||[]).includes(account.id)));
  const tabs = [{key:"details",label:"Details"},{key:"leads",label:`Leads${accL.length?` (${accL.length})`:""}`},{key:"opps",label:`Opps${accO.length?` (${accO.length})`:""}`},{key:"projects",label:`Projects${accP.length?` (${accP.length})`:""}`},{key:"contacts",label:`Contacts${accC.length?` (${accC.length})`:""}`}];
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ background:"#FFFFFF", borderBottom:"0.5px solid #D3D1C7", padding:"12px 18px 0", flexShrink:0 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#888780", fontFamily:"inherit", padding:0, marginBottom:10 }}>← all accounts</button>
        <div style={{ display:"flex", gap:12, paddingBottom:12 }}>
          <div style={{ width:44, height:44, borderRadius:10, background:account.avatarBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{account.flag}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:500 }}>{account.name}</div>
            <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
              <Chip bg={tc.bg} color={tc.color}>{account.type}</Chip><Chip>{account.country}</Chip><Chip>{account.industry}</Chip><Chip>Since {account.since}</Chip>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", borderTop:"0.5px solid #D3D1C7", marginLeft:-18, marginRight:-18, paddingLeft:18 }}>
          {tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} style={{ padding:"8px 12px", fontSize:12, cursor:"pointer", background:"transparent", border:"none", borderBottom:tab===t.key?"2px solid #378ADD":"2px solid transparent", color:tab===t.key?"#2C2C2A":"#888780", fontWeight:tab===t.key?500:400, fontFamily:"inherit", whiteSpace:"nowrap" }}>{t.label}</button>)}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 18px" }}>
        {tab==="details" && <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>{[["City / Country",`${account.city}, ${account.country}`],["Industry",account.industry],["Size",`${account.size} employees`],["Website",account.website],["Type",account.type],["Since",account.since]].map(([l,v]) => <div key={l} style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"10px 14px" }}><div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{l}</div><div style={{ fontSize:13 }}>{v}</div></div>)}</div>}
        {tab==="leads"    && (accL.length===0?<Empty text="No leads."/>:accL.map(i=><ItemCard key={i.id} item={i} onClick={onSelectItem} accounts={accounts} contacts={contacts} followUps={followUps}/>))}
        {tab==="opps"     && (accO.length===0?<Empty text="No opportunities."/>:accO.map(i=><ItemCard key={i.id} item={i} onClick={onSelectItem} accounts={accounts} contacts={contacts} followUps={followUps}/>))}
        {tab==="projects" && (accP.length===0?<Empty text="No projects."/>:accP.map(i=><ItemCard key={i.id} item={i} onClick={onSelectItem} accounts={accounts} contacts={contacts} followUps={followUps}/>))}
        {tab==="contacts" && accC.map(c => (
          <div key={c.id} style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px", marginBottom:6, display:"flex", alignItems:"center", gap:12 }}>
            <Avatar initials={c.initials} bg={c.avatarBg} color={c.avatarColor} size={36} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{c.name}</div>
              <div style={{ fontSize:11, color:"#888780" }}>{c.role} · {c.email}</div>
              {c.source && <div style={{ fontSize:10, color:"#378ADD", marginTop:2 }}>Met at: {c.source}</div>}
            </div>
            <div style={{ display:"flex", gap:5 }}><Btn small>✉</Btn><Btn small>◎</Btn></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RIGHT PANEL ─────────────────────────────────────────────────────────────
function RightPanel({ tab, setTab, followUps, comms, tasks, calEvents, contacts, refetch }) {
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
            {[...comms].sort((a,b) => (b.date||'').localeCompare(a.date||'')).map((m,i,arr) => (
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
          </div>
        )}
        {tab==="tasks" && (
          <div style={{ padding:14 }}>
            <button style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", marginBottom:10, justifyContent:"center", fontWeight:500 }}>+ Add task</button>
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
        {tab==="calendar" && (
          <div style={{ padding:14 }}>
            <button style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", marginBottom:10, justifyContent:"center", fontWeight:500 }}>+ Schedule meeting</button>
            {calGroups.map(([dateLabel, evs]) => (
              <div key={dateLabel} style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:500, color:"#888780", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>{dateLabel}</div>
                {evs.map(ev => (
                  <div key={ev.id} style={{ display:"flex", gap:8, padding:"7px 10px", borderRadius:7, border:"0.5px solid #D3D1C7", marginBottom:5, cursor:"pointer" }}>
                    <div style={{ width:3, borderRadius:2, background:ev.color, flexShrink:0 }} />
                    <div><div style={{ fontSize:12, fontWeight:500 }}>{ev.title}</div><div style={{ fontSize:11, color:"#888780" }}>{ev.time}</div><div style={{ fontSize:10, color:"#888780", marginTop:1 }}>{ev.who}</div></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function BDDashboard() {
  const { accounts, contacts, allItems, followUps, tasks, comms, calEvents, loading, refetch } = usePipelineData();

  const [sidebarMode,        setSidebarMode]        = useState("funnel");
  const [activeFunnelStage,  setActiveFunnelStage]  = useState("lead");
  const [viewMode,           setViewMode]           = useState("list");
  const [selectedItem,       setSelectedItem]       = useState(null);
  const [selectedAccount,    setSelectedAccount]    = useState(null);
  const [rightTab,           setRightTab]           = useState("rappel");
  const [noteText,           setNoteText]           = useState("");
  const [extraTimeline,      setExtraTimeline]      = useState({});
  const [search,             setSearch]             = useState("");

  const getAcc = (id) => accounts.find(a => a.id === id);

  const globalSearch = (q) => {
    if (!q || q.trim().length < 2) return null;
    const t = q.toLowerCase();
    const matchedItems = allItems.filter(i =>
      i.title.toLowerCase().includes(t) ||
      (getAcc(i.accountId)?.name||"").toLowerCase().includes(t) ||
      (i.productLine||"").toLowerCase().includes(t) ||
      (i.notes||"").toLowerCase().includes(t)
    );
    const matchedAccs = accounts.filter(a =>
      a.name.toLowerCase().includes(t) ||
      a.industry.toLowerCase().includes(t) ||
      a.country.toLowerCase().includes(t)
    );
    const matchedContacts = contacts.filter(c =>
      c.name.toLowerCase().includes(t) ||
      c.role.toLowerCase().includes(t) ||
      (getAcc(c.accountId)?.name||"").toLowerCase().includes(t)
    );
    return { items: matchedItems, accounts: matchedAccs, contacts: matchedContacts };
  };

  const searchResults = useMemo(() => globalSearch(search), [search, allItems, accounts, contacts]);
  const isSearching = search.trim().length >= 2;

  const addNote = async (itemId) => {
    if (!noteText.trim()) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
    setExtraTimeline(prev => ({ ...prev, [itemId]: [{ type:"Note", icon:"◆", time: dateStr, text:noteText, owner:"You" }, ...(prev[itemId]||[])] }));
    setNoteText("");
  };

  const stageCounts = FUNNEL_STAGES.reduce((acc, s) => {
    acc[s.key] = allItems.filter(i => i.funnelStage===s.key).length; return acc;
  }, {});
  const totalPipeline = allItems.filter(i => ['lead','opportunity'].includes(i.funnelStage)).reduce((s,i) => s+i.value, 0);
  const leadsCount = allItems.filter(i => i.funnelStage==='lead').length;
  const activeProjectsCount = allItems.filter(i => i.funnelStage==='active').length;
  const pendingRappels = followUps.filter(r => r.status==="no-reply").length;

  const handleSelectAccount = (acc) => {
    setSidebarMode("accounts");
    setSelectedAccount(acc);
    setSearch("");
  };

  if (loading) {
    return (
      <div style={{ fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif", display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#F1EFE8", color:"#888780", fontSize:16 }}>
        Laden...
      </div>
    );
  }

  let mainContent;
  if (selectedItem) {
    mainContent = <ItemDetail item={selectedItem} onBack={() => setSelectedItem(null)} extraTimeline={extraTimeline[selectedItem.id]} addNote={addNote} noteText={noteText} setNoteText={setNoteText} accounts={accounts} contacts={contacts} followUps={followUps} comms={comms} tasks={tasks} calEvents={calEvents} refetch={refetch} />;
  } else if (isSearching) {
    mainContent = <SearchResults results={searchResults} onSelectItem={setSelectedItem} onSelectAccount={handleSelectAccount} accounts={accounts} />;
  } else if (sidebarMode==="funnel") {
    if (viewMode==="swimlane") mainContent = <SwimlaneView onSelectItem={setSelectedItem} search="" allItems={allItems} accounts={accounts} contacts={contacts} followUps={followUps} />;
    else if (viewMode==="timeline") mainContent = <TimelineView onSelectItem={setSelectedItem} allItems={allItems} accounts={accounts} />;
    else mainContent = <ListView stageKey={activeFunnelStage} onSelectItem={setSelectedItem} search="" allItems={allItems} accounts={accounts} contacts={contacts} followUps={followUps} />;
  } else {
    mainContent = selectedAccount
      ? <AccountDetail account={selectedAccount} onBack={() => setSelectedAccount(null)} onSelectItem={setSelectedItem} allItems={allItems} accounts={accounts} contacts={contacts} followUps={followUps} />
      : <AccountsList onSelect={setSelectedAccount} search="" accounts={accounts} contacts={contacts} />;
  }

  return (
    <div style={{ fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize:13, color:"#2C2C2A", display:"flex", flexDirection:"column", height:"100vh", background:"#F1EFE8" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 16px", background:"#FFFFFF", borderBottom:"0.5px solid #D3D1C7", flexShrink:0 }}>
        <div style={{ width:7, height:7, borderRadius:"50%", background:"#1D9E75", flexShrink:0 }} />
        <div style={{ fontWeight:500, fontSize:13, letterSpacing:"0.03em", flexShrink:0 }}>eclectik · BD</div>
        <div style={{ display:"flex", gap:14, marginLeft:8 }}>
          {[[fmt(totalPipeline),"pipeline"],[String(leadsCount),"leads"],[String(activeProjectsCount),"active"]].map(([v,l]) => (
            <div key={l} style={{ fontSize:12, color:"#888780", flexShrink:0 }}><span style={{ fontWeight:500, color:"#2C2C2A" }}>{v}</span> {l}</div>
          ))}
          {pendingRappels > 0 && (
            <div style={{ fontSize:12, color:"#D85A30", cursor:"pointer", flexShrink:0 }} onClick={() => setRightTab("rappel")}>
              <span style={{ fontWeight:500 }}>{pendingRappels}</span> pending follow-ups
            </div>
          )}
        </div>
        <div style={{ flex:1, maxWidth:280, position:"relative", marginLeft:10 }}>
          <span style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#888780", pointerEvents:"none" }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search pipeline, accounts, contacts…"
            style={{ width:"100%", padding:"5px 28px 5px 28px", borderRadius:7, border:"0.5px solid #D3D1C7", fontSize:12, background:"#F1EFE8", color:"#2C2C2A", fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
          {search && <button onClick={() => setSearch("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#888780", lineHeight:1 }}>×</button>}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:4, alignItems:"center" }}>
          {sidebarMode==="funnel" && !selectedItem && !isSearching && (
            <>
              {[["list","≡ List"],["swimlane","⊞ Swim"],["timeline","◫ Timeline"]].map(([k,l]) => (
                <button key={k} onClick={() => setViewMode(k)}
                  style={{ padding:"4px 9px", borderRadius:6, border:"0.5px solid", borderColor:viewMode===k?"#185FA5":"#D3D1C7", background:viewMode===k?"#E6F1FB":"transparent", color:viewMode===k?"#0C447C":"#888780", cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>{l}</button>
              ))}
              <div style={{ width:"0.5px", height:16, background:"#D3D1C7" }} />
            </>
          )}
          <button onClick={() => { setSidebarMode("funnel"); setSelectedItem(null); setSelectedAccount(null); }}
            style={{ padding:"4px 9px", borderRadius:6, border:"0.5px solid", borderColor:sidebarMode==="funnel"?"#185FA5":"#D3D1C7", background:sidebarMode==="funnel"?"#E6F1FB":"transparent", color:sidebarMode==="funnel"?"#0C447C":"#888780", cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>Funnel</button>
          <button onClick={() => { setSidebarMode("accounts"); setSelectedItem(null); }}
            style={{ padding:"4px 9px", borderRadius:6, border:"0.5px solid", borderColor:sidebarMode==="accounts"?"#185FA5":"#D3D1C7", background:sidebarMode==="accounts"?"#E6F1FB":"transparent", color:sidebarMode==="accounts"?"#0C447C":"#888780", cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>🏢 Accounts</button>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"200px 1fr 265px", flex:1, minHeight:0 }}>
        <div style={{ background:"#FFFFFF", borderRight:"0.5px solid #D3D1C7", overflowY:"auto" }}>
          {sidebarMode==="funnel" && (
            <>
              <SLabel>Pipeline stages</SLabel>
              {FUNNEL_STAGES.map(s => {
                const stC = sc(s.key);
                const isA = activeFunnelStage===s.key && viewMode==="list" && !selectedItem && !isSearching;
                return (
                  <div key={s.key} onClick={() => { setActiveFunnelStage(s.key); setViewMode("list"); setSelectedItem(null); setSearch(""); }}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:isA?"#F1EFE8":"transparent" }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:stC.dot, flexShrink:0 }} />
                    <div style={{ flex:1, fontSize:13 }}>{s.label}</div>
                    <div style={{ fontSize:11, background:isA?stC.bg:"#F1EFE8", color:isA?stC.color:"#888780", padding:"1px 7px", borderRadius:10, border:"0.5px solid #D3D1C7" }}>{stageCounts[s.key]||0}</div>
                  </div>
                );
              })}
              <HDivider />
              <SLabel>Pipeline value</SLabel>
              {FUNNEL_STAGES.filter(s => ["lead","opportunity"].includes(s.key)).map(s => {
                const stC = sc(s.key);
                const val = allItems.filter(i => i.funnelStage===s.key).reduce((sum,i) => sum+i.value, 0);
                if (!val) return null;
                return (
                  <div key={s.key} style={{ padding:"5px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:stC.dot }} />
                      <span style={{ fontSize:12, color:"#888780" }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:500 }}>{fmt(val)}</span>
                  </div>
                );
              })}
            </>
          )}
          {sidebarMode==="accounts" && (
            <>
              <SLabel>Accounts A–Z</SLabel>
              {[...accounts].sort((a,b)=>a.name.localeCompare(b.name)).map(acc => {
                const tc = typeColors[acc.type]||typeColors.Klant;
                return (
                  <div key={acc.id} onClick={() => setSelectedAccount(acc)}
                    style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 14px", cursor:"pointer", background:selectedAccount?.id===acc.id?"#F1EFE8":"transparent" }}>
                    <div style={{ fontSize:17, flexShrink:0 }}>{acc.flag}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{acc.name}</div>
                      <div style={{ fontSize:11, color:"#888780" }}>{acc.city}</div>
                    </div>
                    <Chip bg={tc.bg} color={tc.color} size={9}>{acc.type}</Chip>
                  </div>
                );
              })}
            </>
          )}
        </div>
        <div style={{ display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>{mainContent}</div>
        <RightPanel tab={rightTab} setTab={setRightTab} followUps={followUps} comms={comms} tasks={tasks} calEvents={calEvents} contacts={contacts} refetch={refetch} />
      </div>
    </div>
  );
}
