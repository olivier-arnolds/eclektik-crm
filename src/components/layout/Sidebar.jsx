import { useState } from 'react';
import { sc, FUNNEL_STAGES, typeColors, fmt } from '../../lib/constants';
import Chip from '../atoms/Chip';
import SLabel from '../atoms/SLabel';
import HDivider from '../atoms/HDivider';

export default function Sidebar({ sidebarMode, setSidebarMode, activeFunnelStage, viewMode, selectedItem, isSearching, setActiveFunnelStage, setViewMode, setSelectedItem, setSearch, setSelectedAccount, selectedAccount, allItems, accounts, contacts, stageCounts, unreadInboxCount, collapsed, setCollapsed }) {
  const [accountSort, setAccountSort] = useState('az');

  // Track recently visited accounts in localStorage
  const trackVisit = (acc) => {
    try {
      const recent = JSON.parse(localStorage.getItem('recent_accounts') || '[]');
      const filtered = recent.filter(id => id !== acc.id);
      filtered.unshift(acc.id);
      localStorage.setItem('recent_accounts', JSON.stringify(filtered.slice(0, 20)));
    } catch (e) {}
    setSelectedAccount(acc);
  };

  const sortedAccounts = (() => {
    if (accountSort === 'recent') {
      try {
        const recent = JSON.parse(localStorage.getItem('recent_accounts') || '[]');
        const recentAccounts = recent.map(id => accounts.find(a => a.id === id)).filter(Boolean);
        const rest = accounts.filter(a => !recent.includes(a.id)).sort((a, b) => a.name.localeCompare(b.name));
        return [...recentAccounts, ...rest];
      } catch (e) {}
    }
    return [...accounts].sort((a, b) => a.name.localeCompare(b.name));
  })();
  const contactsCount = contacts?.length || 0;
  const companiesCount = accounts?.length || 0;

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_collapsed', JSON.stringify(next));
  };

  // Icons for collapsed sidebar nav items
  const navItems = [
    { key: 'accounts', icon: '\uD83C\uDFE2', label: 'Companies', count: companiesCount },
    { key: 'contacts', icon: '\uD83D\uDC64', label: 'Contacts', count: contactsCount },
    { key: 'inbox', icon: '\uD83D\uDCE5', label: 'Inbox', badge: unreadInboxCount },
    { key: 'playbooks', icon: '\uD83D\uDCCB', label: 'Playbooks' },
  ];

  if (collapsed) {
    return (
      <div style={{ background:"#FFFFFF", borderRight:"0.5px solid #D3D1C7", overflowY:"auto", width:50 }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"8px 0" }}>
          <button onClick={toggleCollapse} style={{ background:"none", border:"none", cursor:"pointer", fontSize:14, color:"#888780", fontFamily:"inherit", padding:"4px 6px" }} title="Expand sidebar">{"\u00BB"}</button>
        </div>
        {navItems.map(n => (
          <div key={n.key} onClick={() => setSidebarMode(n.key)} title={n.label}
            style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"10px 0", cursor:"pointer", background:sidebarMode===n.key?"#F1EFE8":"transparent", position:"relative" }}>
            <div style={{ fontSize:16 }}>{n.icon}</div>
            {n.badge > 0 && <div style={{ position:"absolute", top:6, right:6, fontSize:8, background:"#378ADD", color:"#fff", padding:"1px 4px", borderRadius:6, minWidth:10, textAlign:"center" }}>{n.badge}</div>}
          </div>
        ))}
        <div style={{ height:"0.5px", background:"#D3D1C7", margin:"4px 8px" }} />
        {FUNNEL_STAGES.map(s => {
          const stC = sc(s.key);
          const isA = activeFunnelStage===s.key && sidebarMode==="funnel" && !selectedItem && !isSearching;
          return (
            <div key={s.key} onClick={() => { setSidebarMode("funnel"); setActiveFunnelStage(s.key); setViewMode("swimlane"); setSelectedItem(null); setSearch(""); }} title={s.label}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"10px 0", cursor:"pointer", background:isA?"#F1EFE8":"transparent" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:stC.dot }} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ background:"#FFFFFF", borderRight:"0.5px solid #D3D1C7", overflowY:"auto" }}>
      <div style={{ display:"flex", justifyContent:"flex-end", padding:"6px 8px 0" }}>
        <button onClick={toggleCollapse} style={{ background:"none", border:"none", cursor:"pointer", fontSize:14, color:"#888780", fontFamily:"inherit", padding:"2px 6px" }} title="Collapse sidebar">{"\u00AB"}</button>
      </div>
      {sidebarMode==="funnel" && (
        <>
          <SLabel>Directory</SLabel>
          <div onClick={() => setSidebarMode("accounts")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>🏢</div>
            <div style={{ flex:1, fontSize:13 }}>Companies</div>
            <div style={{ fontSize:11, background:"#F1EFE8", color:"#888780", padding:"1px 7px", borderRadius:10, border:"0.5px solid #D3D1C7" }}>{companiesCount}</div>
          </div>
          <div onClick={() => setSidebarMode("contacts")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>👤</div>
            <div style={{ flex:1, fontSize:13 }}>Contacts</div>
            <div style={{ fontSize:11, background:"#F1EFE8", color:"#888780", padding:"1px 7px", borderRadius:10, border:"0.5px solid #D3D1C7" }}>{contactsCount}</div>
          </div>
          <div onClick={() => setSidebarMode("inbox")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>{"\uD83D\uDCE5"}</div>
            <div style={{ flex:1, fontSize:13 }}>Inbox</div>
            {unreadInboxCount > 0 && <div style={{ fontSize:11, background:"#378ADD", color:"#fff", padding:"1px 7px", borderRadius:10 }}>{unreadInboxCount}</div>}
          </div>
          <div onClick={() => setSidebarMode("playbooks")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>{"\uD83D\uDCCB"}</div>
            <div style={{ flex:1, fontSize:13 }}>Playbooks</div>
          </div>
          <HDivider />
          <SLabel>Pipeline stages</SLabel>
          {FUNNEL_STAGES.map(s => {
            const stC = sc(s.key);
            const isA = activeFunnelStage===s.key && !selectedItem && !isSearching;
            return (
              <div key={s.key} onClick={() => { setActiveFunnelStage(s.key); setViewMode("swimlane"); setSelectedItem(null); setSearch(""); }}
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
      {sidebarMode==="contacts" && (
        <>
          <SLabel>Directory</SLabel>
          <div onClick={() => setSidebarMode("accounts")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>🏢</div>
            <div style={{ flex:1, fontSize:13 }}>Companies</div>
            <div style={{ fontSize:11, background:"#F1EFE8", color:"#888780", padding:"1px 7px", borderRadius:10, border:"0.5px solid #D3D1C7" }}>{companiesCount}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"#F1EFE8" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>👤</div>
            <div style={{ flex:1, fontSize:13, fontWeight:500 }}>Contacts</div>
            <div style={{ fontSize:11, background:"#059669", color:"#fff", padding:"1px 7px", borderRadius:10 }}>{contactsCount}</div>
          </div>
          <div onClick={() => setSidebarMode("inbox")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>{"\uD83D\uDCE5"}</div>
            <div style={{ flex:1, fontSize:13 }}>Inbox</div>
            {unreadInboxCount > 0 && <div style={{ fontSize:11, background:"#378ADD", color:"#fff", padding:"1px 7px", borderRadius:10 }}>{unreadInboxCount}</div>}
          </div>
          <div onClick={() => setSidebarMode("playbooks")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>{"\uD83D\uDCCB"}</div>
            <div style={{ flex:1, fontSize:13 }}>Playbooks</div>
          </div>
          <HDivider />
          <SLabel>Pipeline stages</SLabel>
          {FUNNEL_STAGES.map(s => {
            const stC = sc(s.key);
            return (
              <div key={s.key} onClick={() => { setSidebarMode("funnel"); setActiveFunnelStage(s.key); setViewMode("swimlane"); setSelectedItem(null); setSearch(""); }}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:stC.dot, flexShrink:0 }} />
                <div style={{ flex:1, fontSize:13 }}>{s.label}</div>
                <div style={{ fontSize:11, background:"#F1EFE8", color:"#888780", padding:"1px 7px", borderRadius:10, border:"0.5px solid #D3D1C7" }}>{stageCounts[s.key]||0}</div>
              </div>
            );
          })}
        </>
      )}
      {sidebarMode==="accounts" && (
        <>
          <SLabel>Directory</SLabel>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"#F1EFE8" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>🏢</div>
            <div style={{ flex:1, fontSize:13, fontWeight:500 }}>Companies</div>
            <div style={{ fontSize:11, background:"#059669", color:"#fff", padding:"1px 7px", borderRadius:10 }}>{companiesCount}</div>
          </div>
          <div onClick={() => setSidebarMode("contacts")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>👤</div>
            <div style={{ flex:1, fontSize:13 }}>Contacts</div>
            <div style={{ fontSize:11, background:"#F1EFE8", color:"#888780", padding:"1px 7px", borderRadius:10, border:"0.5px solid #D3D1C7" }}>{contactsCount}</div>
          </div>
          <div onClick={() => setSidebarMode("inbox")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>{"\uD83D\uDCE5"}</div>
            <div style={{ flex:1, fontSize:13 }}>Inbox</div>
            {unreadInboxCount > 0 && <div style={{ fontSize:11, background:"#378ADD", color:"#fff", padding:"1px 7px", borderRadius:10 }}>{unreadInboxCount}</div>}
          </div>
          <div onClick={() => setSidebarMode("playbooks")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>{"\uD83D\uDCCB"}</div>
            <div style={{ flex:1, fontSize:13 }}>Playbooks</div>
          </div>
          <HDivider />
          <SLabel>Pipeline stages</SLabel>
          {FUNNEL_STAGES.map(s => {
            const stC = sc(s.key);
            return (
              <div key={s.key} onClick={() => { setSidebarMode("funnel"); setActiveFunnelStage(s.key); setViewMode("swimlane"); setSelectedItem(null); setSearch(""); }}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:stC.dot, flexShrink:0 }} />
                <div style={{ flex:1, fontSize:13 }}>{s.label}</div>
                <div style={{ fontSize:11, background:"#F1EFE8", color:"#888780", padding:"1px 7px", borderRadius:10, border:"0.5px solid #D3D1C7" }}>{stageCounts[s.key]||0}</div>
              </div>
            );
          })}
          <HDivider />
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px 4px" }}>
            <span style={{ fontSize:10, fontWeight:500, color:"#888780", letterSpacing:"0.08em", textTransform:"uppercase" }}>Accounts</span>
            <span style={{ display:"flex", gap:3 }}>
              <button onClick={() => setAccountSort('az')}
                style={{ padding:"1px 6px", borderRadius:4, border:"0.5px solid", borderColor:accountSort==='az'?"#185FA5":"#D3D1C7", background:accountSort==='az'?"#E6F1FB":"transparent", color:accountSort==='az'?"#0C447C":"#888780", cursor:"pointer", fontFamily:"inherit", fontSize:9 }}>A–Z</button>
              <button onClick={() => setAccountSort('recent')}
                style={{ padding:"1px 6px", borderRadius:4, border:"0.5px solid", borderColor:accountSort==='recent'?"#185FA5":"#D3D1C7", background:accountSort==='recent'?"#E6F1FB":"transparent", color:accountSort==='recent'?"#0C447C":"#888780", cursor:"pointer", fontFamily:"inherit", fontSize:9 }}>Recent</button>
            </span>
          </div>
          {sortedAccounts.map(acc => {
            const tc = typeColors[acc.type]||typeColors.Klant;
            return (
              <div key={acc.id} onClick={() => trackVisit(acc)}
                style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 14px", cursor:"pointer", background:selectedAccount?.id===acc.id?"#F1EFE8":"transparent" }}>
                <div style={{ fontSize:17, flexShrink:0 }}>{acc.flag}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{acc.name}</div>
                </div>
                <Chip bg={tc.bg} color={tc.color} size={9}>{acc.type}</Chip>
              </div>
            );
          })}
        </>
      )}
      {sidebarMode==="playbooks" && (
        <>
          <SLabel>Directory</SLabel>
          <div onClick={() => setSidebarMode("accounts")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>🏢</div>
            <div style={{ flex:1, fontSize:13 }}>Companies</div>
            <div style={{ fontSize:11, background:"#F1EFE8", color:"#888780", padding:"1px 7px", borderRadius:10, border:"0.5px solid #D3D1C7" }}>{companiesCount}</div>
          </div>
          <div onClick={() => setSidebarMode("contacts")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>👤</div>
            <div style={{ flex:1, fontSize:13 }}>Contacts</div>
            <div style={{ fontSize:11, background:"#F1EFE8", color:"#888780", padding:"1px 7px", borderRadius:10, border:"0.5px solid #D3D1C7" }}>{contactsCount}</div>
          </div>
          <div onClick={() => setSidebarMode("inbox")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>{"\uD83D\uDCE5"}</div>
            <div style={{ flex:1, fontSize:13 }}>Inbox</div>
            {unreadInboxCount > 0 && <div style={{ fontSize:11, background:"#378ADD", color:"#fff", padding:"1px 7px", borderRadius:10 }}>{unreadInboxCount}</div>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"#F1EFE8" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>{"\uD83D\uDCCB"}</div>
            <div style={{ flex:1, fontSize:13, fontWeight:500 }}>Playbooks</div>
          </div>
          <HDivider />
          <SLabel>Pipeline stages</SLabel>
          {FUNNEL_STAGES.map(s => {
            const stC = sc(s.key);
            return (
              <div key={s.key} onClick={() => { setSidebarMode("funnel"); setActiveFunnelStage(s.key); setViewMode("swimlane"); setSelectedItem(null); setSearch(""); }}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:stC.dot, flexShrink:0 }} />
                <div style={{ flex:1, fontSize:13 }}>{s.label}</div>
                <div style={{ fontSize:11, background:"#F1EFE8", color:"#888780", padding:"1px 7px", borderRadius:10, border:"0.5px solid #D3D1C7" }}>{stageCounts[s.key]||0}</div>
              </div>
            );
          })}
        </>
      )}
      {sidebarMode==="inbox" && (
        <>
          <SLabel>Directory</SLabel>
          <div onClick={() => setSidebarMode("accounts")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>{"\uD83C\uDFE2"}</div>
            <div style={{ flex:1, fontSize:13 }}>Companies</div>
            <div style={{ fontSize:11, background:"#F1EFE8", color:"#888780", padding:"1px 7px", borderRadius:10, border:"0.5px solid #D3D1C7" }}>{companiesCount}</div>
          </div>
          <div onClick={() => setSidebarMode("contacts")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>{"\uD83D\uDC64"}</div>
            <div style={{ flex:1, fontSize:13 }}>Contacts</div>
            <div style={{ fontSize:11, background:"#F1EFE8", color:"#888780", padding:"1px 7px", borderRadius:10, border:"0.5px solid #D3D1C7" }}>{contactsCount}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"#F1EFE8" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>{"\uD83D\uDCE5"}</div>
            <div style={{ flex:1, fontSize:13, fontWeight:500 }}>Inbox</div>
            {unreadInboxCount > 0 && <div style={{ fontSize:11, background:"#378ADD", color:"#fff", padding:"1px 7px", borderRadius:10 }}>{unreadInboxCount}</div>}
          </div>
          <div onClick={() => setSidebarMode("playbooks")}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
            <div style={{ fontSize:14, flexShrink:0 }}>{"\uD83D\uDCCB"}</div>
            <div style={{ flex:1, fontSize:13 }}>Playbooks</div>
          </div>
          <HDivider />
          <SLabel>Pipeline stages</SLabel>
          {FUNNEL_STAGES.map(s => {
            const stC = sc(s.key);
            return (
              <div key={s.key} onClick={() => { setSidebarMode("funnel"); setActiveFunnelStage(s.key); setViewMode("swimlane"); setSelectedItem(null); setSearch(""); }}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", background:"transparent" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:stC.dot, flexShrink:0 }} />
                <div style={{ flex:1, fontSize:13 }}>{s.label}</div>
                <div style={{ fontSize:11, background:"#F1EFE8", color:"#888780", padding:"1px 7px", borderRadius:10, border:"0.5px solid #D3D1C7" }}>{stageCounts[s.key]||0}</div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
