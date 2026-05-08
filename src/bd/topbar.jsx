import { useAuth } from '../lib/auth';
import { I } from './atoms';

// Email allow-list for the Admin tab. Hard-coded for now; move to a roles
// system if/when the team grows.
const ADMIN_EMAILS = new Set(['olivier@eclectik.co', 'marco@eclectik.co']);

export default function Topbar({ theme, setTheme, view, setView, leftLane, setLeftLane, layout, setLayout, search, setSearch, onOpenTweaks, onEnrich, onRefreshGraph, graphLoading }) {
  const { session, logout, reconnectMicrosoft, hasGraphToken } = useAuth();
  const userName = session?.user?.user_metadata?.full_name || session?.user?.email || '';
  const userInitials = (userName || '?').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
  const isAdmin = ADMIN_EMAILS.has((session?.user?.email || '').toLowerCase());

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <div className="brand-mark">E</div>
        <span>Eclectik BD</span>
        <span style={{
          marginLeft: 6, fontSize: 10, fontFamily: 'var(--font-mono)',
          padding: '2px 6px', borderRadius: 3,
          background: 'var(--accent-tint)', color: 'var(--accent)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>BabyDee 1.0</span>
      </div>

      <div className="topbar-sep" />

      <div className="topbar-nav">
        <button className={view === 'workspace' && leftLane === 'calendar' ? 'on' : ''}
          onClick={() => { setView('workspace'); setLeftLane('calendar'); }} title="Calendar + Comms + Accounts">
          <I.calendar /> Workspace
        </button>
        <button className={view === 'workspace' && leftLane === 'funnel' ? 'on' : ''}
          onClick={() => { setView('workspace'); setLeftLane('funnel'); }} title="Funnel + Comms + Accounts">
          <I.funnel /> Funnel
        </button>
        <button className={view === 'playbooks' ? 'on' : ''} onClick={() => setView('playbooks')} title="Playbooks">
          <I.sparkle /> Playbooks
        </button>
        <button className={view === 'tasks' ? 'on' : ''} onClick={() => setView('tasks')} title="All open tasks">
          <I.check /> Tasks
        </button>
        <button className={view === 'marketing' ? 'on' : ''}
          onClick={() => setView('marketing')} title="Marketing — segment & campaign">
          <I.send /> Marketing
        </button>
        {isAdmin && (
          <button className={view === 'admin' ? 'on' : ''}
            onClick={() => setView('admin')} title="Admin — recurring jobs & exports">
            <I.dots /> Admin
          </button>
        )}
      </div>

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
          <button className="btn-ghost tiny" onClick={onEnrich} title="Enrich companies via LinkedIn">
            ◈ Enrich
          </button>
        )}
        <button className="btn-ghost tiny" onClick={reconnectMicrosoft}
          style={{
            color: hasGraphToken ? 'var(--good)' : 'var(--warn)',
            fontWeight: hasGraphToken ? 400 : 600,
          }}
          title={hasGraphToken ? 'Microsoft connected — click to re-authenticate' : 'Microsoft not connected — click to authenticate'}>
          {hasGraphToken ? '● MS' : '⚠ Reconnect MS'}
        </button>
        {onRefreshGraph && hasGraphToken && (
          <button className="icon-btn" onClick={onRefreshGraph} disabled={graphLoading}
            title={graphLoading ? 'Refreshing email & calendar…' : 'Refresh email & calendar (auto every 10 min)'}
            style={{ cursor: graphLoading ? 'wait' : 'pointer' }}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3"
              style={graphLoading ? { animation: 'spin 0.8s linear infinite' } : {}}>
              <path d="M13.5 8a5.5 5.5 0 11-1.6-3.9M13.5 2v3h-3"/>
            </svg>
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
