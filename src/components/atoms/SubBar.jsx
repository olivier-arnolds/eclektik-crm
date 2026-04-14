import { LEAD_SUB, sc } from '../../lib/constants';

export default function SubBar({ current }) {
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
