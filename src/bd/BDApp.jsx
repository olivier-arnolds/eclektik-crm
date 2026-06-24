import { useState, useEffect, useCallback, useRef } from 'react';
import './styles.css';
import { useLocal } from './atoms';
import { useAuth } from '../lib/auth';
import { useBDData } from './useBDData';
import { getInboxEmails, getAllMailFolders, getCalendarEventsRange, getTeamsConversations, getTeamsChannelConversations } from '../lib/graph';
import { syncMyCalendar } from './sync-events';
import { supabase } from '../supabase';
import Topbar from './topbar';
import Statusbar from './statusbar';
import FunnelLane from './lane-funnel';
import CalendarLane from './lane-calendar';
import CommsLane from './lane-comms';
import ReportingLane from './lane-reporting';
import WarRoomLane from './lane-warroom';
import AccountsLane from './lane-accounts';
import ComposeModal from './compose';
import DealDetailModal from './deal-detail-modal';
import ContactDetailModal from './contact-detail-modal';
import SearchResultsPanel from './search-results-panel';
import EnrichModal from '../components/forms/EnrichModal';
import PlaybooksHub from '../components/playbooks/PlaybooksHub';
import TasksView from './tasks-view';
import MarketingView from './marketing-view';
import AdminView from './admin-view';
import LogView from './log-view';
import FeedbackModal from './feedback-modal';
import OnepagerModal from './onepager-modal';

// The single set of left-pane views. The Account 360 always sits to the right.
const NAV_VIEWS = ['reporting', 'funnel', 'warroom', 'tasks', 'meetings', 'comms', 'marketing', 'playbooks', 'admin', 'log'];
// Views whose left pane scrolls as one block (vs. lanes that manage their own scroll).
const SCROLL_VIEWS = ['warroom', 'reporting', 'marketing', 'admin', 'log'];

export default function BDApp() {
  const [theme, setTheme] = useLocal('bd_theme', 'light');
  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    return () => { document.body.classList.remove('theme-light', 'theme-dark'); };
  }, [theme]);

  // Esc closes the topmost open modal. Every modal in the app closes on
  // backdrop click, so clicking the last .modal-backdrop is behavior-
  // equivalent — one listener covers all 20+ modals, present and future.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const backdrops = document.querySelectorAll('.modal-backdrop');
      if (backdrops.length) backdrops[backdrops.length - 1].click();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Restore persisted Account-lane width on mount
  useEffect(() => {
    try {
      const w = localStorage.getItem('acc-lane-width');
      if (w) document.documentElement.style.setProperty('--acc-lane-width', w);
    } catch (_) {}
  }, []);

  // view = which left-pane area is active (see NAV_VIEWS). The Account 360
  // pane is always shown on the right. `leftLane` is only read to migrate the
  // old 'workspace' value into the new flat view model.
  const [view, setView] = useLocal('bd_view', 'meetings');
  const [leftLane] = useLocal('bd_leftlane', 'calendar');
  const [layout, setLayout] = useLocal('bd_layout', 'fixed');
  const [search, setSearchRaw] = useState('');
  const setSearch = (v) => { setSearchRaw(v); setSearchPanelDismissed(false); };
  const [filters, setFilters] = useState({ owners: [], types: [] });

  // Cross-lane state
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [openDeal, setOpenDeal] = useState(null);
  const [selectedComm, setSelectedComm] = useState(null);
  const [accountScope, setAccountScope] = useState(null);
  const [rightContext, setRightContext] = useState(null);
  const [composeCtx, setComposeCtx] = useState(null);
  const [showEnrich, setShowEnrich] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showOnepager, setShowOnepager] = useState(false);
  const [openContactId, setOpenContactId] = useState(null);
  const [searchPanelDismissed, setSearchPanelDismissed] = useState(false);
  // Account-ids van de gefilterde contacten in de Marketing-tab. Laat de
  // accountlijst (rechterpaneel) live meebewegen. null = niet filteren.
  const [marketingAccountIds, setMarketingAccountIds] = useState(null);
  // When 'left', the left pane expands full-width and the Account 360 hides.
  const [expandedLane, setExpandedLane] = useState(null); // 'left' | null

  // Normalize legacy/unknown persisted view into the new flat model.
  const activeView = NAV_VIEWS.includes(view)
    ? view
    : (view === 'workspace' && leftLane === 'funnel') ? 'funnel' : 'meetings';
  useEffect(() => {
    if (!NAV_VIEWS.includes(view)) setView(activeView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset cross-view selection state when switching views. Without this, a
  // deal picked in Funnel kept the right pane (and a hidden "filtered by
  // account" scope on Comms) pinned to that account several views later
  // (live-clickthrough finding, v1.38.0). Skip the initial mount so a
  // restored session keeps its state.
  const viewMountedRef = useRef(false);
  useEffect(() => {
    if (!viewMountedRef.current) { viewMountedRef.current = true; return; }
    setRightContext(null);
    setAccountScope(null);
    setSelectedDeal(null);
    setSelectedComm(null);
  }, [activeView]);

  // Inbox emails + calendar events lifted to BDApp so they survive view switches
  const [graphEmails, setGraphEmails] = useState([]);
  const [graphEvents, setGraphEvents] = useState([]);
  const [graphLoading, setGraphLoading] = useState(false);

  const { session, hasGraphToken } = useAuth();
  const userName = session?.user?.user_metadata?.full_name || session?.user?.email || '';
  const { deals, accounts, contacts, comms, events, tasks, loading, refetch, rawAllItems, rawAccounts, rawContacts, allTags, truncated } = useBDData();
  // Only blank the screen for the FIRST load. Later refetches (e.g. after editing
  // a field in Account 360) keep the current view mounted so the active tab and
  // place aren't lost.
  const loadedOnceRef = useRef(false);
  if (!loading) loadedOnceRef.current = true;
  const [truncWarnDismissed, setTruncWarnDismissed] = useState(false);

  // ---- Graph fetches (once, cached in state) ----
  const fetchGraphData = useCallback(async () => {
    if (!localStorage.getItem('graph_token')) return;
    setGraphLoading(true);

    // Fetch Inbox + Sent + Archived + Teams chats in parallel.
    // All merged into one comms list; folder/channel tags drive UI filtering.
    try {
      const [mails, teams] = await Promise.all([
        getAllMailFolders(1000).catch(e => { console.warn('mail:', e); return { inbox: [], sent: [], archived: [] }; }),
        getTeamsConversations(500).catch(e => { console.warn('teams chats:', e); return []; }),
        // Team channels disabled: requires admin-consent scopes that broke
        // the Supabase OAuth flow. Re-enable later via a separate auth path.
      ]);
      const { inbox, sent, archived } = mails;
      const merged = [
        ...inbox.map(e => ({ ...e, dir: 'in', archived: false })),
        ...sent.map(e => ({ ...e, dir: 'out', archived: false })),
        ...archived.map(e => ({ ...e, dir: 'in', archived: true })),
        ...teams,
      ];
      setGraphEmails(merged);
    } catch (e) { console.warn('Graph fetch failed:', e); }

    // Calendar: full year (Jan 1 → Dec 31)
    try {
      const year = new Date().getFullYear();
      const startISO = new Date(year, 0, 1).toISOString();
      const endISO = new Date(year, 11, 31, 23, 59, 59).toISOString();
      const evs = await getCalendarEventsRange(startISO, endISO);
      setGraphEvents(evs || []);
    } catch (e) { console.warn('Graph calendar fetch failed:', e); }

    // Also sync my calendar into shared synced_events so Account 360 sees
    // my meetings right away (not just when I click an account).
    const userEmail = session?.user?.email;
    const userName = session?.user?.user_metadata?.full_name || '';
    if (userEmail) {
      try {
        const { data: rawAccs } = await supabase.from('companies').select('id, name, website');
        const { data: rawCs } = await supabase.from('contacts').select('id, email, company_id').not('email', 'is', null);
        await syncMyCalendar({
          userEmail, userName,
          accounts: rawAccs || [],
          contacts: rawCs || [],
          skipIfRecent: true,
        });
      } catch (e) { console.warn('Shared events sync failed:', e); }
    }

    setGraphLoading(false);
  }, [session?.user?.email, session?.user?.user_metadata?.full_name, hasGraphToken]);

  // Runs on mount, when the session/user changes, AND the moment the Microsoft
  // token actually arrives (hasGraphToken flips true after connecting) — so the
  // user sees their mail/Teams/calendar without extra clicks or a manual refresh.
  useEffect(() => { fetchGraphData(); }, [fetchGraphData]);

  // Auto-refresh Graph data every 10 minutes while the tab is visible.
  // Skips silently when the tab is in the background — Chrome throttles
  // setInterval there anyway and we shouldn't burn Graph quota for an
  // unattended session.
  useEffect(() => {
    const REFRESH_MS = 10 * 60 * 1000;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchGraphData();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchGraphData]);

  const unreadCount = comms.filter(c => c.unread && !c.archived).length + graphEmails.filter(e => !e.isRead).length;
  const openDealsCount = deals.filter(d => ['qualify', 'develop', 'proposal', 'close'].includes(d.stage)).length;
  const totalValue = deals.filter(d => ['qualify', 'develop', 'proposal', 'close'].includes(d.stage))
                          .reduce((s, d) => s + d.value, 0);

  const pickAccount = (acc) => {
    if (!acc) { setRightContext(null); setAccountScope(null); return; }
    setRightContext({ type: 'account', id: acc.id });
    // Auto-filter Comms to this account: matching emails (by contact / domain)
    // and explicitly linked Teams chats only.
    setAccountScope(acc.id);
  };
  const selectDeal = (d) => {
    setSelectedDeal(d);
    setRightContext({ type: 'deal', id: d.id });
    // Auto-filter Comms to the deal's account if linked, otherwise clear scope
    setAccountScope(d.accountId || null);
    // Popup is suppressed when the deal has an account (Account 360 covers it).
    // Open the modal if either:
    //  - the deal has no account at all (typical qualify-stage lead), or
    //  - the linked account isn't in the active accounts list (inactive /
    //    filtered out), so the right pane would otherwise be empty.
    const accExists = d.accountId && accounts.some(a => a.id === d.accountId);
    if (!accExists) setOpenDeal(d);
  };
  const selectCommHandler = (id) => {
    setSelectedComm(id);
    setRightContext({ type: 'comm', id });
  };
  const openCompose = (ctx) => setComposeCtx(ctx || {});

  const topbar = (
    <Topbar theme={theme} setTheme={setTheme} view={activeView} setView={setView}
            layout={layout} setLayout={setLayout} search={search} setSearch={setSearch}
            onSearchFocus={() => setSearchPanelDismissed(false)}
            onEnrich={() => setShowEnrich(true)}
            onRefreshGraph={fetchGraphData} graphLoading={graphLoading}
            onOpenFeedback={() => setShowFeedback(true)}
            onOpenPlaybooks={() => setView('playbooks')} />
  );

  if (loading && !loadedOnceRef.current) {
    return (
      <div className={`app theme-${theme}`}>
        {topbar}
        <div className="lanes" style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
          Loading…
        </div>
        <Statusbar userName={userName} />
      </div>
    );
  }

  const expandToggleProps = {
    expanded: expandedLane === 'left',
    onToggleExpand: () => setExpandedLane(expandedLane === 'left' ? null : 'left'),
  };

  // ---- LEFT PANE: one of the NAV_VIEWS ----
  let leftPane = null;
  if (activeView === 'funnel') {
    leftPane = (
      <FunnelLane
        deals={deals} accounts={accounts} contacts={contacts}
        filters={filters} setFilters={setFilters} search={search}
        onSelectDeal={selectDeal} onEditDeal={(d) => setOpenDeal(d)} refetch={refetch}
        {...expandToggleProps}
      />
    );
  } else if (activeView === 'meetings') {
    leftPane = (
      <CalendarLane
        events={events} tasks={tasks} deals={deals} accounts={accounts} contacts={contacts}
        graphEvents={graphEvents} refetch={refetch} refetchGraph={fetchGraphData}
        onSelectEvent={(e) => setRightContext({ type: 'event', id: e.id })}
        onSelectTask={(t) => setRightContext({ type: 'task', id: t.id, focusTaskId: t.id })}
        {...expandToggleProps}
      />
    );
  } else if (activeView === 'tasks') {
    leftPane = (
      <TasksView accounts={accounts} contacts={contacts}
        onSelectTask={(t) => {
          setRightContext({ type: 'task', id: t.id });
          if (t.company_id) setAccountScope(t.company_id); else setAccountScope(null);
        }}
        onPickAccount={(acc) => { pickAccount(acc); }}
        {...expandToggleProps}
      />
    );
  } else if (activeView === 'comms') {
    leftPane = (
      <CommsLane
        comms={comms} accounts={accounts} contacts={contacts} graphEmails={graphEmails}
        refetch={refetch} refetchGraph={fetchGraphData} onCompose={openCompose}
        selectedId={selectedComm} onSelect={selectCommHandler}
        accountScope={accountScope} onClearScope={() => setAccountScope(null)} search={search}
      />
    );
  } else if (activeView === 'reporting') {
    leftPane = <ReportingLane onPickAccount={pickAccount} accounts={accounts} />;
  } else if (activeView === 'warroom') {
    leftPane = <WarRoomLane accounts={accounts} deals={deals} onPickAccount={pickAccount} onOpenOnepager={() => setShowOnepager(true)} />;
  } else if (activeView === 'playbooks') {
    leftPane = <div className="lane" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}><PlaybooksHub /></div>;
  } else if (activeView === 'marketing') {
    leftPane = (
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <MarketingView contacts={contacts} accounts={accounts} deals={deals} allTags={allTags} refetch={refetch} onFilteredAccountsChange={setMarketingAccountIds} />
      </div>
    );
  } else if (activeView === 'admin') {
    leftPane = <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}><AdminView /></div>;
  } else if (activeView === 'log') {
    leftPane = <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}><LogView /></div>;
  }

  const showRight = expandedLane !== 'left';

  return (
    <div className={`app theme-${theme}`} data-layout={layout}>
      {topbar}

      {/* Data-truncation warning: a table hit its fetch cap, so the UI is
          showing an incomplete dataset (oldest rows missing). Raise the cap
          in FETCH_LIMITS (usePipelineData.js) or add pagination. */}
      {truncated.length > 0 && !truncWarnDismissed && (
        <div role="alert" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '4px 12px', fontSize: 12,
          background: 'color-mix(in srgb, orange 18%, var(--bg-1))',
          borderBottom: '0.5px solid var(--sep)', color: 'var(--text-1)',
        }}>
          <span aria-hidden="true">⚠️</span>
          <span style={{ flex: 1 }}>
            Niet alle data is geladen — limiet bereikt voor: {truncated.map(t => `${t.table} (${t.limit})`).join(', ')}.
            Oudere records zijn niet zichtbaar in de app.
          </span>
          <button onClick={() => setTruncWarnDismissed(true)} aria-label="Waarschuwing sluiten"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 14 }}>
            ✕
          </button>
        </div>
      )}

      <div className="lanes">
        {leftPane}

        {/* RIGHT PANE: Account 360 — always visible unless the left pane is expanded */}
        {showRight && (
          <>
            <div className="divider" />
            <AccountsLane
              onToggleCollapse={() => setExpandedLane('left')}
              context={rightContext}
              accounts={accounts}
              contacts={contacts}
              deals={deals}
              rawItems={rawAllItems}
              comms={comms}
              graphEmails={graphEmails}
              events={events}
              graphEvents={graphEvents}
              tasks={tasks}
              search={search}
              refetch={refetch}
              refetchGraph={fetchGraphData}
              onPickAccount={pickAccount}
              accountFilterIds={activeView === 'marketing' ? marketingAccountIds : null}
              onCompose={openCompose}
              onOpenDeal={(d) => {
                // Explicit "open" intent (Open deal button / deal row in the
                // Account 360): ALWAYS open the modal. selectDeal suppresses
                // it when the account is visible, which made the Open deal
                // button a silent no-op (live-clickthrough bug, v1.37.0).
                setSelectedDeal(d);
                setRightContext({ type: 'deal', id: d.id });
                setAccountScope(d.accountId || null);
                setOpenDeal(d);
              }}
              onSelectComm={selectCommHandler}
              allTags={allTags}
            />
          </>
        )}

        {/* Floating re-open button — visible when right pane (Account 360) is collapsed */}
        {!showRight && (
          <button
            onClick={() => setExpandedLane(null)}
            title="Account-paneel weer openen"
            style={{
              position: 'fixed',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 22,
              height: 44,
              padding: 0,
              background: 'var(--bg-1)',
              border: '0.5px solid var(--sep)',
              borderRight: 'none',
              borderRadius: '4px 0 0 4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              color: 'var(--text-3)',
              zIndex: 50,
              boxShadow: '-2px 0 6px rgba(0,0,0,0.06)',
            }}>
            ‹
          </button>
        )}

        {/* Global search results overlay (only when user is typing ≥2 chars) */}
        {search.trim().length >= 2 && !searchPanelDismissed && (
          <SearchResultsPanel
            query={search}
            accounts={accounts}
            contacts={contacts}
            deals={deals}
            events={events}
            graphEvents={graphEvents}
            tasks={tasks}
            onPickAccount={(acc) => { pickAccount(acc); setSearchPanelDismissed(true); }}
            onOpenContact={(id) => { setOpenContactId(id); setSearchPanelDismissed(true); }}
            onOpenDeal={(d) => { selectDeal(d); }}
            onSelectEvent={(e) => { setRightContext({ type: 'event', id: e.id }); }}
            onClose={() => setSearchPanelDismissed(true)}
            onClearSearch={() => { setSearchRaw(''); setSearchPanelDismissed(false); }}
          />
        )}
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

      {openContactId && (
        <ContactDetailModal
          contactId={openContactId}
          onClose={() => setOpenContactId(null)}
          refetch={refetch}
          onCompose={openCompose}
        />
      )}

      <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />
      <OnepagerModal open={showOnepager} onClose={() => setShowOnepager(false)} />
    </div>
  );
}
