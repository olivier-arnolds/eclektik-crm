import { useAuth } from '../lib/auth';
import { I } from './atoms';
import TopbarSuggestions from './topbar-suggestions';

// Email allow-list for the Admin tab. Hard-coded for now; move to a roles
// system if/when the team grows.
const ADMIN_EMAILS = new Set(['olivier@eclectik.co', 'marco@eclectik.co']);

export default function Topbar({ theme, setTheme, view, setView, layout, setLayout, search, setSearch, onOpenTweaks, onEnrich, onRefreshGraph, graphLoading, onOpenFeedback, onOpenPlaybooks }) {
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
      </div>

      <div className="topbar-sep" />

      <div className="topbar-nav">
        <button className={view === 'funnel' ? 'on' : ''}
          onClick={() => setView('funnel')} title="Funnel — deal pipeline">
          <I.funnel /> Funnel
        </button>
        <button className={view === 'warroom' ? 'on' : ''}
          onClick={() => setView('warroom')} title="War room — pipeline & running projects">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
            <path d="M8 .5v2M8 13.5v2M.5 8h2M13.5 8h2" strokeLinecap="round" />
          </svg> War room
        </button>
        <button className={view === 'tasks' ? 'on' : ''} onClick={() => setView('tasks')} title="All open tasks">
          <I.check /> Tasks
        </button>
        <button className={view === 'reporting' ? 'on' : ''}
          onClick={() => setView('reporting')} title="Reporting — revenue & pipeline">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M2 14h12M4 14V8M8 14V4M12 14v-7" strokeLinecap="round" />
          </svg> Reporting
        </button>
        <button className={view === 'meetings' ? 'on' : ''}
          onClick={() => setView('meetings')} title="Meetings — calendar & agenda">
          <I.calendar /> Meetings
        </button>
        <button className={view === 'comms' ? 'on' : ''}
          onClick={() => setView('comms')} title="Comms — email, Teams & LinkedIn">
          <I.inbox /> Comms
        </button>
        <button className={view === 'marketing' ? 'on' : ''}
          onClick={() => setView('marketing')} title="Marketing — segment & campaign">
          <I.send /> Marketing
        </button>
        <button className={view === 'playbooks' ? 'on' : ''} onClick={() => setView('playbooks')} title="Playbooks">
          <I.sparkle /> Playbooks
        </button>
        {isAdmin && (
          <button className={view === 'admin' ? 'on' : ''}
            onClick={() => setView('admin')} title="Admin — recurring jobs & exports">
            <I.dots /> Admin
          </button>
        )}
        <button className={view === 'log' ? 'on' : ''}
          onClick={() => setView('log')} title="Change log — version history & rollback">
          <I.history /> Log
        </button>
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
        {onOpenPlaybooks && <TopbarSuggestions onOpenHub={onOpenPlaybooks} />}
        {onOpenFeedback && (
          <button className="btn-ghost tiny" onClick={onOpenFeedback} title="Submit feedback or feature request">
            💡 Feedback
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
