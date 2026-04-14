import { MS_STATUS_C, docIcon } from '../../lib/constants';
import Chip from '../atoms/Chip';
import Avatar from '../atoms/Avatar';

export default function ProjectPlanTab({ item }) {
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
