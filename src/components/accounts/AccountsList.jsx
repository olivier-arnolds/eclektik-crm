import { useState } from 'react';
import { typeColors } from '../../lib/constants';
import Chip from '../atoms/Chip';
import AddCompanyModal from '../forms/AddCompanyModal';

export default function AccountsList({ onSelect, search, accounts, contacts, refetch }) {
  const [showAdd, setShowAdd] = useState(false);
  const filtered = [...accounts].sort((a,b) => a.name.localeCompare(b.name)).filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.country.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ background:"#FFFFFF", borderBottom:"0.5px solid #D3D1C7", padding:"16px 18px 14px", flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:500 }}>Accounts</div>
            <div style={{ fontSize:12, color:"#888780", marginTop:2 }}>{filtered.length} accounts · A–Z</div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ padding:"6px 14px", borderRadius:7, border:"none", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", fontWeight:500 }}>+ Company</button>
        </div>
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
      <AddCompanyModal open={showAdd} onClose={() => setShowAdd(false)} refetch={refetch} />
    </div>
  );
}
