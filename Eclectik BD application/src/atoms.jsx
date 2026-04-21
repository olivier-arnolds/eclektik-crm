// Shared UI atoms and utilities
(function () {
  const { useState, useEffect, useRef, useLayoutEffect, useCallback } = React;

  // ---------- time helpers ----------
  function fmtRelative({ days, hour, minute }) {
    if (days === 0) return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
    if (days === 1) return `Yesterday`;
    if (days < 7) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][(new Date().getDay() - days + 7) % 7];
    return `${days}d ago`;
  }
  function fmtFull({ days, hour, minute }) {
    const d = new Date(); d.setDate(d.getDate() - days); d.setHours(hour, minute, 0, 0);
    return d.toLocaleString(undefined, { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  }
  function fmtMoney(v) {
    if (v >= 1_000_000) return `€${(v/1_000_000).toFixed(2)}M`;
    if (v >= 1_000)     return `€${Math.round(v/1000)}k`;
    return `€${v}`;
  }

  // ---------- channel icons (SVG only: circle/square/rounded shapes, no brand glyphs) ----------
  function ChannelIcon({ ch, size = 14 }) {
    const s = size;
    const label = { email: 'E', teams: 'T', whatsapp: 'W', linkedin: 'L', 'in-person':'·' }[ch] || '·';
    const bg = {
      email: 'var(--chip-email)',
      teams: 'var(--chip-teams)',
      whatsapp: 'var(--chip-whatsapp)',
      linkedin: 'var(--chip-linkedin)',
      'in-person': 'var(--chip-inperson)',
    }[ch] || 'var(--fill-3)';
    return (
      <span style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        width: s, height: s, borderRadius: 4, background: bg,
        color: '#fff', fontSize: Math.max(8, s - 6), fontWeight: 600, fontFamily: 'var(--font-mono)',
        letterSpacing: '-0.02em', lineHeight: 1,
      }}>{label}</span>
    );
  }

  function OwnerDot({ id, size = 8, ring = false }) {
    const o = BD_DATA.OWNERS[id];
    if (!o) return null;
    return (
      <span title={o.name} style={{
        display:'inline-block', width:size, height:size, borderRadius:'50%',
        background: o.color, boxShadow: ring ? `0 0 0 2px var(--bg-1)` : 'none',
        flex: '0 0 auto',
      }}/>
    );
  }

  function OwnerChip({ id }) {
    const o = BD_DATA.OWNERS[id];
    if (!o) return null;
    return (
      <span style={{
        display:'inline-flex', alignItems:'center', gap:4, fontSize:10,
        fontFamily:'var(--font-mono)', color:'var(--text-2)', letterSpacing:'0.02em',
      }}>
        <span style={{width:6, height:6, borderRadius:'50%', background:o.color}}/>
        {o.id}
      </span>
    );
  }

  function Avatar({ name, color, size = 20 }) {
    const initials = (name || '?').split(' ').map(n=>n[0]).slice(0,2).join('');
    return (
      <span style={{
        width:size, height:size, borderRadius:'50%',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        background: color || 'var(--fill-3)',
        color:'#fff', fontSize: Math.max(9, size*0.42), fontWeight:600,
        letterSpacing:'-0.02em', flex:'0 0 auto',
      }}>{initials}</span>
    );
  }

  function AccountMark({ account, size = 18 }) {
    if (!account) return null;
    const h = account.logoHue ?? 220;
    return (
      <span style={{
        width:size, height:size, borderRadius:4,
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        background:`oklch(88% 0.05 ${h})`,
        color:`oklch(30% 0.08 ${h})`,
        fontSize: Math.max(8, size*0.45), fontWeight: 700, fontFamily:'var(--font-mono)',
        letterSpacing:'-0.02em',
      }}>{account.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</span>
    );
  }

  function StaleDot({ days }) {
    const color = days >= 10 ? 'var(--danger)' : days >= 5 ? 'var(--warn)' : days >= 2 ? 'var(--text-3)' : 'var(--good)';
    return <span title={`${days}d since activity`} style={{ width:6, height:6, borderRadius:'50%', background:color, display:'inline-block'}}/>;
  }

  // ---------- stage colors ----------
  const STAGE_TINT = {
    lead:        { hue: 220, label:'Lead' },
    qualified:   { hue: 200, label:'Qualified' },
    proposal:    { hue: 260, label:'Proposal' },
    negotiation: { hue: 40,  label:'Negotiation' },
    won:         { hue: 150, label:'Won' },
    lost:        { hue: 10,  label:'Lost' },
  };

  // ---------- icons (minimal outline set) ----------
  const I = {
    search: (p={}) => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>,
    plus: (p={}) => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M8 3v10M3 8h10"/></svg>,
    close: (p={}) => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M4 4l8 8M12 4l-8 8"/></svg>,
    send: (p={}) => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M2 8l12-5-4 12-2-5-6-2z"/></svg>,
    sparkle: (p={}) => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M8 2l1.4 3.6L13 7l-3.6 1.4L8 12 6.6 8.4 3 7l3.6-1.4L8 2zM13 11l.6 1.4L15 13l-1.4.6L13 15l-.6-1.4L11 13l1.4-.6z"/></svg>,
    paperclip: (p={}) => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M13 7l-5 5a3 3 0 01-4-4l5-5a2 2 0 013 3l-5 5a1 1 0 01-1-1l4-4"/></svg>,
    funnel: (p={}) => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M2 3h12l-4.5 6v4l-3 1.5V9L2 3z"/></svg>,
    calendar: (p={}) => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6h12M5 2v3M11 2v3"/></svg>,
    inbox: (p={}) => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M2 9l2-6h8l2 6v4H2V9zM2 9h4l1 2h2l1-2h4"/></svg>,
    chevronR: (p={}) => <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M6 4l4 4-4 4"/></svg>,
    chevronD: (p={}) => <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M4 6l4 4 4-4"/></svg>,
    sun: (p={}) => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3"/></svg>,
    moon: (p={}) => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M13 9.5A6 6 0 017 3a6 6 0 106 6.5z"/></svg>,
    phone: (p={}) => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M3 3h3l1 3-2 1a8 8 0 004 4l1-2 3 1v3a1 1 0 01-1 1 11 11 0 01-10-10 1 1 0 011-1z"/></svg>,
    arrow: (p={}) => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M3 8h10M9 4l4 4-4 4"/></svg>,
    check: (p={}) => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M3 8l3 3 7-7"/></svg>,
    pin: (p={}) => <svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor" {...p}><circle cx="8" cy="8" r="3"/></svg>,
    dots: (p={}) => <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" {...p}><circle cx="4" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="12" cy="8" r="1"/></svg>,
    star: (p={}) => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M8 2l1.8 3.8L14 6.5l-3 3 .8 4.2L8 11.7 4.2 13.7 5 9.5l-3-3 4.2-.7L8 2z"/></svg>,
    back: (p={}) => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M13 8H3M7 4L3 8l4 4"/></svg>,
    archive: (p={}) => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><rect x="2" y="3" width="12" height="3"/><path d="M3 6v7h10V6M6.5 9h3"/></svg>,
    reply: (p={}) => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M6 4L2 8l4 4M2 8h7a4 4 0 014 4v1"/></svg>,
    forward: (p={}) => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><path d="M10 4l4 4-4 4M14 8H7a4 4 0 00-4 4v1"/></svg>,
    globe: (p={}) => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}><circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c2 2 3 4 3 6s-1 4-3 6c-2-2-3-4-3-6s1-4 3-6z"/></svg>,
  };

  // ---------- resizable divider hook ----------
  function useResizableLanes(initial, min = [280, 320, 300]) {
    const [widths, setWidths] = useState(initial); // [left, middle, right] fractions
    const onDrag = (i) => (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const container = e.currentTarget.parentElement;
      const total = container.getBoundingClientRect().width;
      const startW = [...widths];
      const move = (ev) => {
        const dx = (ev.clientX - startX) / total;
        const next = [...startW];
        next[i] = Math.max(min[i]/total, startW[i] + dx);
        next[i+1] = Math.max(min[i+1]/total, startW[i+1] - dx);
        const sum = next.reduce((a,b)=>a+b,0);
        setWidths(next.map(w => w/sum));
      };
      const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    };
    return [widths, onDrag, setWidths];
  }

  // ---------- mini store (event-free, just setState in root) ----------
  function useLocal(key, initial) {
    const [v, setV] = useState(() => {
      try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; } catch { return initial; }
    });
    useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
    return [v, setV];
  }

  Object.assign(window, {
    fmtRelative, fmtFull, fmtMoney,
    ChannelIcon, OwnerDot, OwnerChip, Avatar, AccountMark, StaleDot,
    STAGE_TINT, I, useResizableLanes, useLocal,
  });
})();
