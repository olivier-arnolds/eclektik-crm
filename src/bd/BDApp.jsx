import { useState, useEffect, useCallback } from 'react';
import './styles.css';
import { useLocal } from './atoms';
import { useAuth } from '../lib/auth';
import { useBDData } from './useBDData';
import { getInboxEmails, getCalendarEventsRange } from '../lib/graph';
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
  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    return () => { document.body.classList.remove('theme-light', 'theme-dark'); };
  }, [theme]);

  // view = which top-level area ('workspace' = 3-lane, 'playbooks' = full)
  // leftLane = for workspace: 'calendar' or 'funnel'
  const [view, setView] = useLocal('bd_view', 'workspace');
  const [leftLane, setLeftLane] = useLocal('bd_leftlane', 'calendar');
  const [layout, setLayout] = useLocal('bd_layout', 'fixed');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ owners: [], types: [] });

  // Cross-lane state
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [openDeal, setOpenDeal] = useState(null);
  const [selectedComm, setSelectedComm] = useState(null);
  const [accountScope, setAccountScope] = useState(null);
  const [rightContext, setRightContext] = useState(null);
  const [composeCtx, setComposeCtx] = useState(null);
  const [showEnrich, setShowEnrich] = useState(false);
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);

  // Inbox emails + calendar events lifted to BDApp so they survive view switches
  const [graphEmails, setGraphEmails] = useState([]);
  const [graphEvents, setGraphEvents] = useState([]);
  const [graphLoading, setGraphLoading] = useState(false);

  const { session } = useAuth();
  const userName = session?.user?.user_metadata?.full_name || session?.user?.email || '';
  const { deals, accounts, contacts, comms, events, tasks, loading, refetch, rawAllItems, rawAccounts, rawContacts } = useBDData();

  // ---- Graph fetches (once, cached in state) ----
  const fetchGraphData = useCallback(async () => {
    if (!localStorage.getItem('graph_token')) return;
    setGraphLoading(true);

    // Inbox (50 latest)
    try {
      const emails = await getInboxEmails(50);
      setGraphEmails(emails || []);
    } catch (e) { console.warn('Graph inbox fetch failed:', e); }

    // Calendar: full year (Jan 1 → Dec 31)
    try {
      const year = new Date().getFullYear();
      const startISO = new Date(year, 0, 1).toISOString();
      const endISO = new Date(year, 11, 31, 23, 59, 59).toISOString();
      const evs = await getCalendarEventsRange(startISO, endISO);
      setGraphEvents(evs || []);
    } catch (e) { console.warn('Graph calendar fetch failed:', e); }

    setGraphLoading(false);
  }, []);

  useEffect(() => { fetchGraphData(); }, [fetchGraphData]);

  const unreadCount = comms.filter(c => c.unread && !c.archived).length + graphEmails.filter(e => !e.isRead).length;
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
                leftLane={leftLane} setLeftLane={setLeftLane}
                layout={layout} setLayout={setLayout} search={search} setSearch={setSearch}
                onEnrich={() => setShowEnrich(true)} />
        <div className="lanes" style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
          Loading…
        </div>
        <Statusbar userName={userName} />
      </div>
    );
  }

  if (view === 'playbooks') {
    return (
      <div className={`app theme-${theme}`} data-layout={layout}>
        <Topbar theme={theme} setTheme={setTheme} view={view} setView={setView}
                leftLane={leftLane} setLeftLane={setLeftLane}
                layout={layout} setLayout={setLayout} search={search} setSearch={setSearch}
                onEnrich={() => setShowEnrich(true)} />
        <div className="lanes">
          <div className="lane" style={{ flex: 1, overflowY: 'auto' }}>
            {selectedPlaybook ? (
              <PlaybookDetail playbook={selectedPlaybook} onBack={() => setSelectedPlaybook(null)} contacts={rawContacts} accounts={rawAccounts} />
            ) : (
              <PlaybooksList onSelectPlaybook={setSelectedPlaybook} />
            )}
          </div>
        </div>
        <Statusbar userName={userName} unreadCount={unreadCount} openDeals={openDealsCount} totalValue={totalValue} />
      </div>
    );
  }

  return (
    <div className={`app theme-${theme}`} data-layout={layout}>
      <Topbar theme={theme} setTheme={setTheme} view={view} setView={setView}
              leftLane={leftLane} setLeftLane={setLeftLane}
              layout={layout} setLayout={setLayout} search={search} setSearch={setSearch}
              onEnrich={() => setShowEnrich(true)} />
      <div className="lanes">
        {/* LEFT LANE: Calendar OR Funnel */}
        {leftLane === 'funnel' ? (
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
            contacts={contacts}
            graphEvents={graphEvents}
            refetch={refetch}
            refetchGraph={fetchGraphData}
            onSelectEvent={(e) => setRightContext({ type: 'event', id: e.id })}
          />
        )}

        <div className="divider" />

        {/* MIDDLE LANE: Comms */}
        <CommsLane
          comms={comms}
          accounts={accounts}
          contacts={contacts}
          graphEmails={graphEmails}
          refetch={refetch}
          refetchGraph={fetchGraphData}
          onCompose={openCompose}
          selectedId={selectedComm}
          onSelect={selectCommHandler}
          accountScope={accountScope}
          onClearScope={() => setAccountScope(null)}
          search={search}
        />

        <div className="divider" />

        {/* RIGHT LANE: Accounts 360 */}
        <AccountsLane
          context={rightContext}
          accounts={accounts}
          contacts={contacts}
          deals={deals}
          comms={comms}
          events={events}
          graphEvents={graphEvents}
          tasks={tasks}
          search={search}
          refetch={refetch}
          onPickAccount={pickAccount}
          onCompose={openCompose}
          onOpenDeal={selectDeal}
          onSelectComm={selectCommHandler}
        />
      </div>
      <Statusbar userName={userName} unreadCount={unreadCount} openDeals={openDealsCount} totalValue={totalValue} />

      {composeCtx && (
        <ComposeModal
          ctx={composeCtx}
          accounts={accounts}
          contacts={contacts}
          deals={deals}
          onClose={() => setComposeCtx(null)}
          onSent={() => { refetch(); fetchGraphData(); setComposeCtx(null); }}
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
