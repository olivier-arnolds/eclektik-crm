import { useState } from 'react';
import { sc, COLS, fmt } from '../../lib/constants';
import { updateRow } from '../../hooks/useSupabase';
import Chip from '../atoms/Chip';
import ItemCard from '../cards/ItemCard';
import AddLeadModal from '../forms/AddLeadModal';

export default function SwimlaneView({ onSelectItem, search, allItems, accounts, contacts, followUps, refetch, stageFilter }) {
  const [showAddLead, setShowAddLead] = useState(false);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [productLineFilter, setProductLineFilter] = useState('All types');
  const getAcc = (id) => accounts.find(a => a.id === id);
  const applyProductFilter = (arr) => productLineFilter === 'All types' ? arr : arr.filter(i => (i.productLine || "").split(",").map(s=>s.trim()).includes(productLineFilter));
  const applyStageFilter = (arr) => {
    if (!stageFilter || stageFilter === 'all') return arr;
    return arr.filter(i => i.funnelStage === stageFilter);
  };
  const applySearch = (arr) => !search ? arr : arr.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || (getAcc(i.accountId)?.name||"").toLowerCase().includes(search.toLowerCase()));
  const applyFilters = (arr) => applySearch(applyProductFilter(applyStageFilter(arr)));
  const sorted = (arr) => [...arr].sort((a,b) => (b.sortDate||"").localeCompare(a.sortDate||""));
  const filteredItems = applyStageFilter(applyProductFilter(allItems));
  const activeItems = filteredItems.filter(i => ["lead","opportunity","onboarding","active"].includes(i.funnelStage));
  const totalVal = activeItems.reduce((s,i)=>s+i.value,0);
  const stageLabelMap = { lead:'Leads', opportunity:'Opportunities', onboarding:'Onboarding', active:'Active clients', inactive:'Inactive', past:'Past clients' };
  const stageLabel = stageFilter && stageFilter !== 'all' ? (stageLabelMap[stageFilter] || stageFilter) : 'Pipeline';
  const productLines = ['All types', 'Glint', 'ROI', 'ROE', 'Other'];
  const stageMatchedCols = COLS.filter(col => col.funnelStages.includes(stageFilter));
  const visibleCols = (!stageFilter || stageFilter === 'all' || stageMatchedCols.length === 0) ? COLS : stageMatchedCols;

  const handleDragStart = (e, item) => {
    const table = item.funnelStage === 'lead' ? 'leads' : 'opportunities';
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, table }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colKey);
  };

  const handleDragLeave = (e, colKey) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverCol(null);
    }
  };

  const handleDrop = async (e, col) => {
    e.preventDefault();
    setDragOverCol(null);
    try {
      const { id, table } = JSON.parse(e.dataTransfer.getData('text/plain'));
      let updates = {};
      if (col.subStatus) {
        // Qualify, Develop, Proposal, Close columns
        updates.sub_status = col.subStatus;
        if (table === 'opportunities') {
          updates.stage = 'opportunity';
        }
      } else if (col.key === 'onboarding') {
        updates.stage = 'onboarding';
        updates.sub_status = null;
      } else if (col.key === 'active') {
        updates.stage = 'active';
        updates.sub_status = null;
      }
      await updateRow(table, id, updates);
      refetch();
    } catch (err) {
      console.error('Drop failed:', err);
    }
  };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"#FFFFFF", borderBottom:"0.5px solid #D3D1C7", padding:"12px 18px", flexShrink:0, display:"flex", gap:10, alignItems:"center" }}>
        <div style={{ fontSize:14, fontWeight:500 }}>{stageLabel}</div>
        <Chip>{applyFilters(activeItems).length} items</Chip>
        <Chip bg="#FAEEDA" color="#633806">{fmt(totalVal)}</Chip>
        <select value={productLineFilter} onChange={e => setProductLineFilter(e.target.value)}
          style={{ padding:"4px 8px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:11, fontFamily:"inherit", background:"#fff", color:productLineFilter === 'All types' ? "#888780" : "#2C2C2A", cursor:"pointer", outline:"none" }}>
          {productLines.map(pl => <option key={pl} value={pl}>{pl}</option>)}
        </select>
        {search && <Chip bg="#E6F1FB" color="#0C447C">filtering: "{search}"</Chip>}
        <button onClick={() => setShowAddLead(true)} style={{ marginLeft:"auto", padding:"4px 12px", borderRadius:6, border:"none", fontSize:11, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", fontWeight:500 }}>+ Add Lead</button>
      </div>
      <div style={{ flex:1, overflowX:"auto", overflowY:"hidden", display:"flex", padding:"12px 14px", gap:10 }}>
        {visibleCols.map(col => {
          const stC = sc(col.key);
          const rawAll = col.subStatus
            ? filteredItems.filter(i => col.funnelStages.includes(i.funnelStage) && i.subStatus===col.subStatus)
            : filteredItems.filter(i => col.funnelStages.includes(i.funnelStage));
          const colItems = applySearch(sorted(rawAll));
          const colVal = rawAll.reduce((s,i)=>s+i.value,0);
          return (
            <div key={col.key} style={{ flex:1, minWidth:180, maxWidth:300, display:"flex", flexDirection:"column" }}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={(e) => handleDragLeave(e, col.key)}
              onDrop={(e) => handleDrop(e, col)}
            >
              <div style={{ background: dragOverCol===col.key ? stC.border : stC.bg, borderRadius:"8px 8px 0 0", padding:"8px 10px", border:`0.5px solid ${stC.border}`, borderBottom:"none", transition:"background 0.15s ease" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:stC.dot }} />
                    <span style={{ fontSize:12, fontWeight:500, color:stC.color }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize:10, color:stC.color, padding:"1px 6px", borderRadius:8, border:`0.5px solid ${stC.border}` }}>{colItems.length}</span>
                </div>
                {colVal > 0 && <div style={{ fontSize:11, color:stC.color, marginTop:2, opacity:0.8 }}>{fmt(colVal)}</div>}
              </div>
              <div style={{ flex:1, overflowY:"auto", background: dragOverCol===col.key ? "#F0F0EC" : "#FAFAF8", border:`0.5px solid ${stC.border}`, borderTop:"none", borderRadius:"0 0 8px 8px", padding:8, transition:"background 0.15s ease" }}>
                {colItems.length===0
                  ? <div style={{ textAlign:"center", padding:"16px 8px", fontSize:11, color:"#B4B2A9" }}>empty</div>
                  : colItems.map(item => <ItemCard key={item.id} item={item} onClick={onSelectItem} compact accounts={accounts} contacts={contacts} followUps={followUps} draggable onDragStart={(e) => handleDragStart(e, item)} />)
                }
              </div>
            </div>
          );
        })}
      </div>
      <AddLeadModal open={showAddLead} onClose={() => setShowAddLead(false)} refetch={refetch} stageKey="lead" />
    </div>
  );
}
