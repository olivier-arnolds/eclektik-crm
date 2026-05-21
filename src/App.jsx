import { useState, useMemo, useEffect } from "react";
import { FUNNEL_STAGES, fmt } from './lib/constants';
import { usePipelineData } from './hooks/usePipelineData';
import { useAuth } from './lib/auth';

// Layout
import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import RightPanel from './components/layout/RightPanel';

// Views
import ListView from './components/views/ListView';
import SwimlaneView from './components/views/SwimlaneView';
import TimelineView from './components/views/TimelineView';
import SearchResults from './components/views/SearchResults';

// Detail
import ItemDetail from './components/detail/ItemDetail';

// Accounts
import AccountsList from './components/accounts/AccountsList';
import AccountDetail from './components/accounts/AccountDetail';

// Contacts
import ContactsList from './components/contacts/ContactsList';
import ContactDetail from './components/contacts/ContactDetail';

// Inbox
import UnifiedInbox from './components/inbox/UnifiedInbox';

export default function BDDashboard() {
  const { accounts, contacts, allItems, followUps, tasks, comms, calEvents, loading, refetch } = usePipelineData();
  const { logout, session, reconnectMicrosoft, hasGraphToken } = useAuth();

  const [sidebarCollapsed,   setSidebarCollapsed]   = useState(() => { try { return JSON.parse(localStorage.getItem('sidebar_collapsed')) || false; } catch { return false; } });
  const [sidebarMode,        setSidebarMode]        = useState("funnel");
  const [activeFunnelStage,  setActiveFunnelStage]  = useState("all");
  const [viewMode,           setViewMode]           = useState("swimlane");
  const [selectedItem,       setSelectedItem]       = useState(null);
  const [selectedAccount,    setSelectedAccount]    = useState(null);
  const [selectedContact,    setSelectedContact]    = useState(null);
  const [rightTab,           setRightTab]           = useState("rappel");
  const [noteText,           setNoteText]           = useState("");
  const [extraTimeline,      setExtraTimeline]      = useState({});
  const [search,             setSearch]             = useState("");

  // Keep selectedItem in sync with fresh data after refetch
  useEffect(() => {
    if (selectedItem && allItems.length > 0) {
      const fresh = allItems.find(i => i.id === selectedItem.id);
      if (fresh && fresh !== selectedItem) setSelectedItem(fresh);
    }
  }, [allItems]);

  const getAcc = (id) => accounts.find(a => a.id === id);

  const globalSearch = (q) => {
    if (!q || q.trim().length < 2) return null;
    const t = q.toLowerCase();
    const matchedItems = allItems.filter(i =>
      i.title.toLowerCase().includes(t) ||
      (getAcc(i.accountId)?.name||"").toLowerCase().includes(t) ||
      (i.productLine||"").toLowerCase().includes(t) ||
      (i.notes||"").toLowerCase().includes(t)
    );
    const matchedAccs = accounts.filter(a =>
      a.name.toLowerCase().includes(t) ||
      a.industry.toLowerCase().includes(t) ||
      a.country.toLowerCase().includes(t)
    );
    const matchedContacts = contacts.filter(c =>
      c.name.toLowerCase().includes(t) ||
      c.role.toLowerCase().includes(t) ||
      (getAcc(c.accountId)?.name||"").toLowerCase().includes(t)
    );
    return { items: matchedItems, accounts: matchedAccs, contacts: matchedContacts };
  };

  const searchResults = useMemo(() => globalSearch(search), [search, allItems, accounts, contacts]);
  const isSearching = search.trim().length >= 2;

  const addNote = async (itemId) => {
    if (!noteText.trim()) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
    setExtraTimeline(prev => ({ ...prev, [itemId]: [{ type:"Note", icon:"◆", time: dateStr, text:noteText, owner:"You" }, ...(prev[itemId]||[])] }));
    setNoteText("");
  };

  const stageCounts = FUNNEL_STAGES.reduce((acc, s) => {
    acc[s.key] = allItems.filter(i => i.funnelStage===s.key).length; return acc;
  }, {});
  const totalPipeline = allItems.filter(i => ['lead','opportunity'].includes(i.funnelStage)).reduce((s,i) => s+i.value, 0);
  const leadsCount = allItems.filter(i => i.funnelStage==='lead').length;
  const activeProjectsCount = allItems.filter(i => i.funnelStage==='active').length;
  const pendingRappels = followUps.filter(r => r.status==="no-reply").length;

  const handleSelectAccount = (acc) => {
    setSidebarMode("accounts");
    setSelectedAccount(acc);
    setSearch("");
    // Track visit for recent sorting
    try {
      const recent = JSON.parse(localStorage.getItem('recent_accounts') || '[]');
      const filtered = recent.filter(id => id !== acc.id);
      filtered.unshift(acc.id);
      localStorage.setItem('recent_accounts', JSON.stringify(filtered.slice(0, 20)));
    } catch (e) {}
  };

  if (loading) {
    return (
      <div style={{ fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif", display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#F1EFE8", color:"#888780", fontSize:16 }}>
        Loading...
      </div>
    );
  }

  let mainContent;
  if (selectedItem) {
    mainContent = <ItemDetail item={selectedItem} onBack={() => setSelectedItem(null)} onSelectContact={(c) => { setSidebarMode('contacts'); setSelectedContact(c); setSelectedItem(null); }} extraTimeline={extraTimeline[selectedItem.id]} addNote={addNote} noteText={noteText} setNoteText={setNoteText} accounts={accounts} contacts={contacts} followUps={followUps} comms={comms} tasks={tasks} calEvents={calEvents} refetch={refetch} />;
  } else if (isSearching) {
    mainContent = <SearchResults results={searchResults} onSelectItem={setSelectedItem} onSelectAccount={handleSelectAccount} accounts={accounts} />;
  } else if (sidebarMode==="funnel") {
    if (viewMode==="swimlane") mainContent = <SwimlaneView onSelectItem={setSelectedItem} search="" allItems={allItems} accounts={accounts} contacts={contacts} followUps={followUps} refetch={refetch} stageFilter={activeFunnelStage} />;
    else if (viewMode==="timeline") mainContent = <TimelineView onSelectItem={setSelectedItem} allItems={allItems} accounts={accounts} />;
    else mainContent = <ListView stageKey={activeFunnelStage} onSelectItem={setSelectedItem} search="" allItems={allItems} accounts={accounts} contacts={contacts} followUps={followUps} refetch={refetch} />;
  } else if (sidebarMode==="inbox") {
    mainContent = <UnifiedInbox contacts={contacts} accounts={accounts} onSwitchMode={setSidebarMode} />;
  } else if (sidebarMode==="contacts") {
    mainContent = selectedContact
      ? <ContactDetail contact={selectedContact} accounts={accounts} allItems={allItems} onBack={() => setSelectedContact(null)} refetch={refetch} />
      : <ContactsList contacts={contacts} accounts={accounts} onSelectContact={setSelectedContact} refetch={refetch} />;
  } else {
    const freshAccount = selectedAccount ? (accounts.find(a => a.id === selectedAccount.id) || selectedAccount) : null;
    mainContent = freshAccount
      ? <AccountDetail account={freshAccount} onBack={() => setSelectedAccount(null)} onSelectItem={setSelectedItem} onSelectContact={(c) => { setSidebarMode('contacts'); setSelectedContact(c); setSelectedAccount(null); }} allItems={allItems} accounts={accounts} contacts={contacts} followUps={followUps} refetch={refetch} />
      : <AccountsList onSelect={handleSelectAccount} search="" accounts={accounts} contacts={contacts} refetch={refetch} />;
  }

  return (
    <div style={{ fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize:13, color:"#2C2C2A", display:"flex", flexDirection:"column", height:"100vh", background:"#F1EFE8" }}>
      <TopBar
        totalPipeline={totalPipeline}
        leadsCount={leadsCount}
        activeProjectsCount={activeProjectsCount}
        pendingRappels={pendingRappels}
        search={search}
        setSearch={setSearch}
        sidebarMode={sidebarMode}
        setSidebarMode={setSidebarMode}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedItem={selectedItem}
        isSearching={isSearching}
        setSelectedItem={setSelectedItem}
        setSelectedAccount={setSelectedAccount}
        setRightTab={setRightTab}
        logout={logout}
        refetch={refetch}
        contacts={contacts}
        accounts={accounts}
        reconnectMicrosoft={reconnectMicrosoft}
        hasGraphToken={hasGraphToken}
        setActiveFunnelStage={setActiveFunnelStage}
      />
      <div style={{ display:"grid", gridTemplateColumns:sidebarCollapsed?"50px 1fr 380px":"200px 1fr 265px", flex:1, minHeight:0 }}>
        <Sidebar
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
          activeFunnelStage={activeFunnelStage}
          viewMode={viewMode}
          selectedItem={selectedItem}
          isSearching={isSearching}
          setActiveFunnelStage={setActiveFunnelStage}
          setViewMode={setViewMode}
          setSelectedItem={setSelectedItem}
          setSearch={setSearch}
          setSelectedAccount={setSelectedAccount}
          selectedAccount={selectedAccount}
          allItems={allItems}
          accounts={accounts}
          contacts={contacts}
          stageCounts={stageCounts}
          unreadInboxCount={comms.filter(c => c.unread).length}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
        <div style={{ display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>{mainContent}</div>
        <RightPanel tab={rightTab} setTab={setRightTab} followUps={followUps} comms={comms} tasks={tasks} calEvents={calEvents} contacts={contacts} refetch={refetch} onOpenInbox={() => setSidebarMode('inbox')} selectedItem={selectedItem} />
      </div>
    </div>
  );
}
