import { useAuth } from '../lib/auth';
import { I } from './atoms';

export default function Topbar({ theme, setTheme, view, setView, layout, setLayout, search, setSearch, onOpenTweaks, onEnrich }) {
  const { session, logout, reconnectMicrosoft, hasGraphToken } = useAuth();
  const userName = session?.user?.user_metadata?.full_name || session?.user?.email || '';
  const userInitials = (userName || '?').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
  const toggleLayout = () => setLayout(layout === 'fixed' ? 'focused' : 'fixed');

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <div className="brand-mark">E</div>
        <span>Eclectik BD</span>
      </div>

      <div className="topbar-sep" />

      <div className="topbar-nav">
        <button className={view === 'workspace' ? 'on' : ''} onClick={() => setView('workspace')} title="Workspace">
          <I.inbox /> Workspace
        </button>
        <button className={view === 'funnel' ? 'on' : ''} onClick={() => setView('funnel')} title="Funnel">
          <I.funnel /> Funnel
        </button>
        <button className={view === 'playbooks' ? 'on' : ''} onClick={() => setView('playbooks')} title="Playbooks">
          <I.sparkle /> Playbooks
        </button>
      </div>

      <button className="btn-ghost" onClick={toggleLayout} title="Toggle focus layout">
        {layout === 'fixed' ? 'Focus' : 'Fixed'}
      </button>

      <div className="topbar-search">
        <div className="searchfield">
          <I.search />
          <input
            type="text"
            placeholder="Search deals, accounts, contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="icon-btn tiny" onClick={() => setSearch('')}><I.close /></button>}
        </div>
      </div>

      <div className="topbar-right">
        {onEnrich && (
          <button className="btn-ghost tiny" onClick={onEnrich} title="Enrich via Surfe">
            ◈ Enrich
          </button>
        )}
        {!hasGraphToken && (
          <button className="btn-ghost" onClick={reconnectMicrosoft} style={{ color: 'var(--warn)' }} title="Microsoft token expired">
            ⚠ Reconnect
          </button>
        )}
        <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'light' ? <I.moon /> : <I.sun />}
        </button>
        {onOpenTweaks && (
          <button className="icon-btn" onClick={onOpenTweaks} title="Settings">
            <I.dots />
          </button>
        )}
        <div className="user-switch" title={userName}>
          <button className="on">{userInitials}</button>
        </div>
        <button className="btn-ghost tiny" onClick={logout} title="Log out">Log out</button>
      </div>
    </div>
  );
}
