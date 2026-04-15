import React from 'react';
import { fmt } from '../../lib/constants';
import EnrichModal from '../forms/EnrichModal';

export default function TopBar({ totalPipeline, leadsCount, activeProjectsCount, pendingRappels, search, setSearch, sidebarMode, setSidebarMode, viewMode, setViewMode, selectedItem, isSearching, setSelectedItem, setSelectedAccount, setRightTab, logout, refetch, contacts, accounts, reconnectMicrosoft, hasGraphToken }) {
  const [syncing, setSyncing] = React.useState(false);
  const [syncDone, setSyncDone] = React.useState(false);

  const surfeSync = async () => {
    setSyncing(true);
    try {
      await fetch('https://script.google.com/macros/s/AKfycbyfOyxwB9mIFII1gYJ9xJEZ2-_zcHfCW5pN3PUCvhv7dNyBA8-3i9kDVo9oGHRR_zI/exec', { mode: 'no-cors' });
      await new Promise(r => setTimeout(r, 3000));
      if (refetch) await refetch();
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 2000);
    } catch (e) {
      console.error('Surfe sync error:', e);
    }
    setSyncing(false);
  };

  const [showEnrich, setShowEnrich] = React.useState(false);

  return (
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
            {[["swimlane","Pipeline"]].map(([k,l]) => (
              <button key={k} onClick={() => setViewMode(k)}
                style={{ padding:"4px 9px", borderRadius:6, border:"0.5px solid", borderColor:viewMode===k?"#185FA5":"#D3D1C7", background:viewMode===k?"#E6F1FB":"transparent", color:viewMode===k?"#0C447C":"#888780", cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>{l}</button>
            ))}
            <div style={{ width:"0.5px", height:16, background:"#D3D1C7" }} />
          </>
        )}
        <button onClick={() => { setSidebarMode("funnel"); setViewMode("swimlane"); setSelectedItem(null); setSelectedAccount(null); }}
          style={{ padding:"4px 9px", borderRadius:6, border:"0.5px solid", borderColor:sidebarMode==="funnel"?"#185FA5":"#D3D1C7", background:sidebarMode==="funnel"?"#E6F1FB":"transparent", color:sidebarMode==="funnel"?"#0C447C":"#888780", cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>Funnel</button>
        <button onClick={() => { setSidebarMode("accounts"); setSelectedItem(null); }}
          style={{ padding:"4px 9px", borderRadius:6, border:"0.5px solid", borderColor:sidebarMode==="accounts"?"#185FA5":"#D3D1C7", background:sidebarMode==="accounts"?"#E6F1FB":"transparent", color:sidebarMode==="accounts"?"#0C447C":"#888780", cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>🏢 Accounts</button>
        <div style={{ width:"0.5px", height:16, background:"#D3D1C7" }} />
        <button onClick={() => setShowEnrich(true)}
          style={{ padding:"4px 9px", borderRadius:6, border:"0.5px solid #D3D1C7", background:"transparent", color:"#888780", cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>
          ◈ Enrich contacts
        </button>
        <button onClick={surfeSync} disabled={syncing}
          style={{ padding:"4px 9px", borderRadius:6, border:"0.5px solid", borderColor:syncDone?"#1D9E75":"#D3D1C7", background:syncDone?"#E1F5EE":"transparent", color:syncDone?"#085041":"#888780", cursor:syncing?"wait":"pointer", fontFamily:"inherit", fontSize:11 }}>
          {syncing ? '⟳ Syncing...' : syncDone ? '✓ Synced' : '⟳ Surfe Sync'}
        </button>
        <button onClick={logout}
          style={{ padding:"4px 9px", borderRadius:6, border:"0.5px solid #D3D1C7", background:"transparent", color:"#888780", cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>Log out</button>
        {!hasGraphToken && (
          <button onClick={reconnectMicrosoft}
            style={{ padding:"4px 9px", borderRadius:6, border:"0.5px solid #EF9F27", background:"#FAEEDA", color:"#633806", cursor:"pointer", fontFamily:"inherit", fontSize:11 }}>
            ⚠ Reconnect Microsoft
          </button>
        )}
      </div>
      <EnrichModal open={showEnrich} onClose={() => setShowEnrich(false)} contacts={contacts || []} accounts={accounts || []} refetch={refetch} />
    </div>
  );
}
