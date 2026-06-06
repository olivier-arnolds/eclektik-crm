import { useState, useEffect } from 'react';

// Minutes that `tz` is ahead of UTC at the given moment.
function getOffset(tz, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(date).reduce((o, p) => { if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10); return o; }, {});
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return (asUTC - date.getTime()) / 60000;
}

const ZONES = [
  { label: 'Los Angeles', tz: 'America/Los_Angeles' },
  { label: 'Chicago', tz: 'America/Chicago' },
  { label: 'New York', tz: 'America/New_York' },
  { label: 'London', tz: 'Europe/London' },
  { label: 'Amsterdam', tz: 'Europe/Amsterdam', home: true },
  { label: 'Dubai', tz: 'Asia/Dubai' },
  { label: 'Singapore', tz: 'Asia/Singapore' },
  { label: 'Sydney', tz: 'Australia/Sydney' },
];

export default function Statusbar({ userName = '' }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const fmt = (tz) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz, hour12: false }).format(now);
  const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Amsterdam' }).format(now);
  const offsetLabel = (tz) => {
    const diff = Math.round((getOffset(tz, now) - getOffset('Europe/Amsterdam', now)) / 30) / 2;
    if (diff === 0) return '±0';
    const sign = diff > 0 ? '+' : '-';
    const abs = Math.abs(diff);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    return `${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}h`;
  };
  const isDay = (tz) => {
    const h = parseInt(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', timeZone: tz, hour12: false }).format(now), 10);
    return h >= 7 && h < 19;
  };

  return (
    <div className="statusbar">
      <span>Eclectik BD</span>
      <span className="sep">·</span>
      <span>{userName}</span>
      <span className="sep">·</span>
      <span>{dateLabel}</span>
      <div className="tz-strip" style={{ marginLeft: 'auto' }}>
        {ZONES.map(z => (
          <div key={z.label} className={`tz-cell ${z.home ? 'tz-cell-home' : ''}`}>
            <span className={`tz-dot ${isDay(z.tz) ? 'tz-dot-day' : 'tz-dot-night'}`} />
            <div className="tz-cell-inner">
              <div className="tz-time">{fmt(z.tz)}</div>
              <div className="tz-name">{z.label}</div>
            </div>
            <div className="tz-offset">{offsetLabel(z.tz)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
