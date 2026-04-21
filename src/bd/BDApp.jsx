import './styles.css';
import { useLocal, ChannelIcon, OwnerDot, OwnerChip, Avatar, AccountMark, StaleDot, fmtMoney, fmtRelative, I } from './atoms';

export default function BDApp() {
  const [theme, setTheme] = useLocal('bd_theme', 'light');
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <div className={`app theme-${theme}`}>
      <div className="topbar">
        <div className="topbar-brand">
          <div className="brand-mark">E</div>
          <span>Eclectik BD</span>
        </div>
        <div className="topbar-sep" />
        <button className="btn-ghost" style={{ marginLeft:'auto' }} onClick={toggleTheme}>
          {theme === 'light' ? <I.moon /> : <I.sun />}
        </button>
      </div>
      <div className="lanes" style={{ padding: 20, color: 'var(--text-1)' }}>
        <div className="lane" style={{ padding: 20, display:'flex', flexDirection:'column', gap:12 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Atoms smoke test</h2>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <ChannelIcon ch="email" />
            <ChannelIcon ch="teams" />
            <ChannelIcon ch="linkedin" />
            <ChannelIcon ch="whatsapp" />
            <div className="topbar-sep" />
            <OwnerDot id="MVG" />
            <OwnerDot id="OA" />
            <OwnerDot id="YK" />
            <OwnerChip id="MVG" />
            <OwnerChip id="OA" />
            <OwnerChip id="YK" />
            <div className="topbar-sep" />
            <Avatar name="Olivier Arnolds" color="#30b47a" />
            <AccountMark account={{ name: 'Eclectik Insights', logoHue: 220 }} size={28} />
            <StaleDot days={1} />
            <StaleDot days={5} />
            <StaleDot days={12} />
          </div>
          <div style={{ fontSize: 12, color:'var(--text-3)' }}>
            {fmtMoney(125000)} · {fmtMoney(2_450_000)} · {fmtRelative(new Date(Date.now() - 3600000))} · {fmtRelative(new Date(Date.now() - 3*86400000))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <span className="stage-pill stage-lead">Qualify</span>
            <span className="stage-pill stage-qualified">Develop</span>
            <span className="stage-pill stage-proposal">Proposal</span>
            <span className="stage-pill stage-negotiation">Close</span>
            <span className="stage-pill stage-won">Active</span>
            <span className="stage-pill stage-lost">Lost</span>
          </div>
        </div>
      </div>
      <div className="statusbar">
        <span>Eclectik BD · scaffold</span>
      </div>
    </div>
  );
}
