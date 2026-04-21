import { useState } from 'react';
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

export default function BDApp() {
  const [theme, setTheme] = useLocal('bd_theme', 'light');
  const [view, setView] = useLocal('bd_view', 'workspace');
  const [layout, setLayout] = useLocal('bd_layout', 'fixed');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ owners: [], types: [] });

  // Cross-lane state
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [selectedComm, setSelectedComm] = useState(null);
  const [accountScope, setAccountScope] = useState(null);
  const [rightContext, setRightContext] = useState(null); // { type, id }
  const [composeCtx, setComposeCtx] = useState(null);

  const { session } = useAuth();
  const userName = session?.user?.user_metadata?.full_name || session?.user?.email || '';

  const { deals, accounts, contacts, comms, events, tasks, loading, refetch } = useBDData();

  const unreadCount = comms.filter(c => c.unread && !c.archived).length;
  const openDeals = deals.filter(d => ['qualify', 'develop', 'proposal', 'close'].includes(d.stage)).length;
  const totalValue = deals.filter(d => ['qualify', 'develop', 'proposal', 'close'].includes(d.stage))
                          .reduce((s, d) => s + d.value, 0);

  // Handlers
  const pickAccount = (acc) => {
    if (!acc) { setRightContext(null); return; }
    setRightContext({ type: 'account', id: acc.id });
  };
  const selectDeal = (d) => {
    setSelectedDeal(d);
    setRightContext({ type: 'deal', id: d.id });
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
                layout={layout} setLayout={setLayout} search={search} setSearch={setSearch} />
        <div className="lanes" style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
          Loading…
        </div>
        <Statusbar userName={userName} />
      </div>
    );
  }

  const leftLane = view === 'funnel' ? (
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
  ) : (
    <CalendarLane
      events={events}
      tasks={tasks}
      deals={deals}
      accounts={accounts}
      refetch={refetch}
      onSelectEvent={(e) => setRightContext({ type: 'event', id: e.id })}
    />
  );

  return (
    <div className={`app theme-${theme}`} data-layout={layout}>
      <Topbar theme={theme} setTheme={setTheme} view={view} setView={setView}
              layout={layout} setLayout={setLayout} search={search} setSearch={setSearch} />
      <div className="lanes">
        {view === 'funnel' ? (
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
        ) : (
          <>
            {leftLane}
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
        )}
      </div>
      <Statusbar userName={userName} unreadCount={unreadCount} openDeals={openDeals} totalValue={totalValue} />

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
    </div>
  );
}
