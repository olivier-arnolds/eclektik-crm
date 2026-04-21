import { useState } from 'react';
import './styles.css';
import { useLocal } from './atoms';
import { useAuth } from '../lib/auth';
import { useBDData } from './useBDData';
import Topbar from './topbar';
import Statusbar from './statusbar';
import FunnelLane from './lane-funnel';

export default function BDApp() {
  const [theme, setTheme] = useLocal('bd_theme', 'light');
  const [view, setView] = useLocal('bd_view', 'workspace');
  const [layout, setLayout] = useLocal('bd_layout', 'fixed');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ owners: [], types: [] });
  const [selectedDeal, setSelectedDeal] = useState(null);

  const { session } = useAuth();
  const userName = session?.user?.user_metadata?.full_name || session?.user?.email || '';

  const { deals, accounts, contacts, comms, events, tasks, loading, refetch } = useBDData();

  const unreadCount = comms.filter(c => c.unread && !c.archived).length;
  const openDeals = deals.filter(d => ['qualify', 'develop', 'proposal', 'close'].includes(d.stage)).length;
  const totalValue = deals.filter(d => ['qualify', 'develop', 'proposal', 'close'].includes(d.stage))
                          .reduce((s, d) => s + d.value, 0);

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
            onSelectDeal={setSelectedDeal}
            refetch={refetch}
          />
        ) : (
          <>
            <FunnelLane
              deals={deals}
              accounts={accounts}
              contacts={contacts}
              filters={filters}
              setFilters={setFilters}
              search={search}
              onSelectDeal={setSelectedDeal}
              refetch={refetch}
            />
            <div className="divider" />
            <div className="lane" style={{ padding: 20, flex: 1, color: 'var(--text-3)', fontSize: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-1)', marginBottom: 8, fontWeight: 500 }}>Comms lane</div>
              Coming in next step
            </div>
            <div className="divider" />
            <div className="lane" style={{ padding: 20, flex: 1, color: 'var(--text-3)', fontSize: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-1)', marginBottom: 8, fontWeight: 500 }}>Accounts 360°</div>
              {selectedDeal ? (
                <div>
                  <b>{selectedDeal.title}</b><br />
                  {selectedDeal.account} · {selectedDeal.contact}<br />
                  {selectedDeal.stage} · {selectedDeal.owner}<br />
                  <button className="btn-ghost tiny" onClick={() => setSelectedDeal(null)}>Clear</button>
                </div>
              ) : 'Select a deal to see context'}
            </div>
          </>
        )}
      </div>
      <Statusbar userName={userName} unreadCount={unreadCount} openDeals={openDeals} totalValue={totalValue} />
    </div>
  );
}
