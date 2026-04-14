import { useState } from "react";
import { sc, COLS, fmt } from '../../lib/constants';
import Empty from '../atoms/Empty';

export const TIME_RANGES = [
  { key:"month",   label:"Month"  },
  { key:"quarter", label:"Quarter"},
  { key:"half",    label:"Half yr"},
  { key:"year",    label:"Year"   },
  { key:"all",     label:"All"    },
];

export default function TimelineView({ onSelectItem, allItems, accounts }) {
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
