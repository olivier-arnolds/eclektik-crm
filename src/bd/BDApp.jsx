import { useState, useEffect } from 'react';
import './styles.css';
import { useLocal } from './atoms';
import { useAuth } from '../lib/auth';
import { useBDData } from './useBDData';
import Topbar from './topbar';
import Statusbar from './statusbar';
import FunnelLane from './lane-funnel';
import CalendarLane from './lane-calendar';
import CommsLane from './lane-comms';
import AccountsLane from './lane-accounts';
import ComposeModal from './compose';
import DealDetailModal from './deal-detail-modal';
import EnrichModal from '../components/forms/EnrichModal';
import PlaybooksList from '../components/playbooks/PlaybooksList';
import PlaybookDetail from '../components/playbooks/PlaybookDetail';

export default function BDApp() {
  const [theme, setTheme] = useLocal('bd_theme', 'light');
  // Apply theme class to body so CSS custom props resolve correctly everywhere
  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    return () => {
      document.body.classList.remove('theme-light', 'theme-dark');
    };
  }, [theme]);
  const [view, setView] = useLocal('bd_view', 'workspace');
  const [layout, setLayout] = useLocal('bd_layout', 'fixed');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ owners: [], types: [] });

  // Cross-lane state
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [openDeal, setOpenDeal] = useState(null); // deal detail modal
  const [selectedComm, setSelectedComm] = useState(null);
  const [accountScope, setAccountScope] = useState(null);
  const [rightContext, setRightContext] = useState(null);
  const [composeCtx, setComposeCtx] = useState(null);
  const [showEnrich, setShowEnrich] = useState(false);
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);

  const { session } = useAuth();
  const userName = session?.user?.user_metadata?.full_name || session?.user?.email || '';

  const { deals, accounts, contacts, comms, events, tasks, loading, refetch, rawAllItems, rawAccounts, rawContacts } = useBDData();

  const unreadCount = comms.filter(c => c.unread && !c.archived).length;
  const openDealsCount = deals.filter(d => ['qualify', 'develop', 'proposal', 'close'].includes(d.stage)).length;
  const totalValue = deals.filter(d => ['qualify', 'develop', 'proposal', 'close'].includes(d.stage))
                          .reduce((s, d) => s + d.value, 0);

  const pickAccount = (acc) => {
    if (!acc) { setRightContext(null); return; }
    setRightContext({ type: 'account', id: acc.id });
  };
  const selectDeal = (d) => {
    setSelectedDeal(d);
    setRightContext({ type: 'deal', id: d.id });
    setOpenDeal(d);
  };
  const selectCommHandler = (id) => {
    setSelectedComm(id);
    setRightContext({ type: 'comm', id });
  };
  const openCompose = (ctx) => setComposeCtx(ctx || {});

  if (loading) {
    return (
      <div className={`app theme-${theme}`}>
        <Topbar theme={theme} setTheme={setTheme} view={view} setView={setView}
                layout={layout} setLayout={setLayout} search={search} setSearch={setSearch}
                onEnrich={() => setShowEnrich(true)} />
        <div className="lanes" style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
          Loading…
        </div>
        <Statusbar userName={userName} />
      </div>
    );
  }

  const renderMainContent = () => {
    if (view === 'playbooks') {
      return (
        <div className="lane" style={{ flex: 1, overflowY: 'auto' }}>
          {selectedPlaybook ? (
            <PlaybookDetail playbook={selectedPlaybook} onBack={() => setSelectedPlaybook(null)} contacts={rawContacts} accounts={rawAccounts} />
          ) : (
            <PlaybooksList onSelectPlaybook={setSelectedPlaybook} />
          )}
        </div>
      );
    }

    if (view === 'funnel') {
      return (
        <FunnelLane
          deals={deals}
          accounts={accounts}
          contacts={contacts}
          filters={filters}
          setFilters={setFilters}
          search={search}
          onSelectDeal={selectDeal}
          refetch={refetch}
        />
      );
    }

    // workspace view: 3 lanes
    return (
      <>
        <CalendarLane
          events={events}
          tasks={tasks}
          deals={deals}
          accounts={accounts}
          refetch={refetch}
          onSelectEvent={(e) => setRightContext({ type: 'event', id: e.id })}
        />
        <div className="divider" />
        <CommsLane
          comms={comms}
          accounts={accounts}
          contacts={contacts}
          refetch={refetch}
          onCompose={openCompose}
          selectedId={selectedComm}
          onSelect={selectCommHandler}
          accountScope={accountScope}
          onClearScope={() => setAccountScope(null)}
          search={search}
        />
        <div className="divider" />
        <AccountsLane
          context={rightContext}
          accounts={accounts}
          contacts={contacts}
          deals={deals}
          comms={comms}
          events={events}
          tasks={tasks}
          search={search}
          onPickAccount={pickAccount}
          onCompose={openCompose}
          onOpenDeal={selectDeal}
          onSelectComm={selectCommHandler}
        />
      </>
    );
  };

  return (
    <div className={`app theme-${theme}`} data-layout={layout}>
      <Topbar theme={theme} setTheme={setTheme} view={view} setView={setView}
              layout={layout} setLayout={setLayout} search={search} setSearch={setSearch}
              onEnrich={() => setShowEnrich(true)} />
      <div className="lanes">
        {renderMainContent()}
      </div>
      <Statusbar userName={userName} unreadCount={unreadCount} openDeals={openDealsCount} totalValue={totalValue} />

      {composeCtx && (
        <ComposeModal
          ctx={composeCtx}
          accounts={accounts}
          contacts={contacts}
          deals={deals}
          onClose={() => setComposeCtx(null)}
          onSent={() => { refetch(); setComposeCtx(null); }}
        />
      )}

      {openDeal && (
        <DealDetailModal
          deal={openDeal}
          accounts={accounts}
          contacts={contacts}
          rawItems={rawAllItems}
          refetch={refetch}
          onCompose={openCompose}
          onClose={() => setOpenDeal(null)}
        />
      )}

      {showEnrich && (
        <EnrichModal
          open={showEnrich}
          onClose={() => setShowEnrich(false)}
          contacts={rawContacts}
          accounts={rawAccounts}
          refetch={refetch}
        />
      )}
    </div>
  );
}
