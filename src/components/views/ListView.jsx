import { useState } from 'react';
import { sc, FUNNEL_STAGES, LEAD_SUB, fmt } from '../../lib/constants';
import Chip from '../atoms/Chip';
import Empty from '../atoms/Empty';
import ItemCard from '../cards/ItemCard';
import AddLeadModal from '../forms/AddLeadModal';

export default function ListView({ stageKey, onSelectItem, search, allItems, accounts, contacts, followUps, refetch }) {
  const [modalOpen, setModalOpen] = useState(false);
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
          <button
            onClick={() => setModalOpen(true)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:7, border:"0.5px dashed #B4B2A9", fontSize:12, cursor:"pointer", background:"transparent", color:"#888780", fontFamily:"inherit", width:"100%", marginTop:4 }}
          >
            + Add {stageKey==="lead"?"lead":stageKey==="opportunity"?"opportunity":"project"}
          </button>
        )}
      </div>
      <AddLeadModal open={modalOpen} onClose={() => setModalOpen(false)} refetch={refetch} stageKey={stageKey} />
    </div>
  );
}
