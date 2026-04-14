import { sc, fmt } from '../../lib/constants';
import Chip from '../atoms/Chip';
import SubBar from '../atoms/SubBar';

export default function ItemCard({ item, onClick, compact, accounts, contacts, followUps, draggable, onDragStart }) {
  const getAcc = (id) => accounts.find(a => a.id === id);
  const getCts = (ids) => contacts.filter(c => ids && ids.includes(c.id));
  const rappelsFor = (id) => followUps.filter(r => r.itemIds.includes(id));
  const acc = getAcc(item.accountId);
  const stC = sc(item.subStatus||item.funnelStage);
  const isFin = item.funnelStage === 'lead' || item.funnelStage === 'opportunity';
  const pendingRappels = rappelsFor(item.id).filter(r => r.status==="no-reply").length;
  return (
    <div onClick={() => onClick(item)}
      draggable={draggable}
      onDragStart={onDragStart}
      style={{ background:"#FFFFFF", borderRadius:9, border:`0.5px solid ${stC.border}`, padding:compact?"9px 11px":"12px 14px", cursor:draggable?"grab":"pointer", marginBottom:compact?5:8, position:"relative" }}
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
