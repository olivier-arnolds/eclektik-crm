import { typeColors } from '../../lib/constants';
import Chip from '../atoms/Chip';
import Avatar from '../atoms/Avatar';
import Btn from '../atoms/Btn';
import Empty from '../atoms/Empty';
import ItemCard from '../cards/ItemCard';

export default function SearchResults({ results, onSelectItem, onSelectAccount, accounts }) {
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
