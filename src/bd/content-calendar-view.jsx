import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';

// Content Calendar — gedrafte content-items per kanaal (GLINT/SEER/ROI/ROE) met
// verplichte menselijke goedkeuring; na goedkeuring + geplande tijd publiceert een
// cron automatisch. Stap 4 = week-view (read-only) + maand-toggle. Goedkeuren +
// plannen (detail-modal) volgt in stap 5.

export const CHANNELS = [
  { key: 'glint', label: 'GLINT', color: '#7c3aed' },
  { key: 'seer',  label: 'SEER',  color: '#0891b2' },
  { key: 'roi',   label: 'ROI',   color: '#16a34a' },
  { key: 'roe',   label: 'ROE',   color: '#ea580c' },
];

// Type-badge boven de kaart-titel.
const TYPE_BADGE = { email: 'Mail', linkedin_post: 'Post', linkedin_dm: 'DM' };

// Achtergrond-tint per status (kleur = achtergrond, tekst blijft leesbaar/donker).
const STATUS_STYLE = {
  draft:     { bg: 'rgba(148,163,184,0.18)', border: 'rgba(148,163,184,0.55)', label: 'Draft' },
  approved:  { bg: 'rgba(37,99,235,0.16)',   border: 'rgba(37,99,235,0.55)',   label: 'Goedgekeurd' },
  scheduled: { bg: 'rgba(217,119,6,0.18)',   border: 'rgba(217,119,6,0.6)',    label: 'Gepland' },
  published: { bg: 'rgba(22,163,74,0.16)',   border: 'rgba(22,163,74,0.55)',   label: 'Gepubliceerd' },
};

const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const MONTHS_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

// --- datum-helpers (weekstart = maandag, lokale tijd) ---
function startOfWeek(d) {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // ma=0 … zo=6
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function ContentCalendarView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('week');          // 'week' | 'month'
  const [anchor, setAnchor] = useState(() => new Date()); // een datum binnen de zichtbare periode

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('content_calendar_items')
      .select('*')
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else { setItems(data || []); setError(null); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Scheduled items met een geldige datum; unscheduled = draft zonder scheduled_at.
  const scheduled = useMemo(() => items.filter(it => it.scheduled_at), [items]);
  const unscheduled = useMemo(() => items.filter(it => !it.scheduled_at), [items]);

  // Items voor de zichtbare week, geïndexeerd op kanaal + dag-index.
  const weekIndex = useMemo(() => {
    const map = {}; // `${channel}|${dayIdx}` -> [items]
    for (const it of scheduled) {
      const d = new Date(it.scheduled_at);
      const idx = weekDays.findIndex(wd => sameDay(wd, d));
      if (idx === -1) continue;
      const k = `${it.channel}|${idx}`;
      (map[k] = map[k] || []).push(it);
    }
    return map;
  }, [scheduled, weekDays]);

  const weekLabel = `${weekDays[0].getDate()} ${MONTHS_NL[weekDays[0].getMonth()].slice(0, 3)} – ${weekDays[6].getDate()} ${MONTHS_NL[weekDays[6].getMonth()].slice(0, 3)} ${weekDays[6].getFullYear()}`;
  const today = new Date();

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      {/* Kop + navigatie + view-toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Content Calendar</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn-ghost tiny" onClick={() => setAnchor(mode === 'week' ? addDays(anchor, -7) : new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}>‹</button>
          <button className="btn-ghost tiny" onClick={() => setAnchor(new Date())}>Vandaag</button>
          <button className="btn-ghost tiny" onClick={() => setAnchor(mode === 'week' ? addDays(anchor, 7) : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}>›</button>
          <span style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 150, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            {mode === 'week' ? weekLabel : `${MONTHS_NL[anchor.getMonth()]} ${anchor.getFullYear()}`}
          </span>
          <div style={{ display: 'inline-flex', border: '0.5px solid var(--sep)', borderRadius: 6, overflow: 'hidden' }}>
            <button className={mode === 'week' ? 'btn-primary tiny' : 'btn-ghost tiny'} style={{ borderRadius: 0 }} onClick={() => setMode('week')}>Week</button>
            <button className={mode === 'month' ? 'btn-primary tiny' : 'btn-ghost tiny'} style={{ borderRadius: 0 }} onClick={() => setMode('month')}>Maand</button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 8, background: 'var(--fill-1)', color: '#dc2626', fontSize: 12, marginBottom: 12 }}>
          Kon items niet laden: {error}
        </div>
      )}
      {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>Laden…</div>}

      {!loading && !error && (
        <>
          {/* Kanaal-samenvatting: aantal deze week; waarschuwing bij 0 (balans moet bewust zijn) */}
          {mode === 'week' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {CHANNELS.map(ch => {
                const count = weekDays.reduce((n, _, i) => n + (weekIndex[`${ch.key}|${i}`]?.length || 0), 0);
                const zero = count === 0;
                return (
                  <span key={ch.key} title={zero ? `${ch.label}: geen content deze week` : `${ch.label}: ${count} item(s) deze week`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 10px', borderRadius: 999,
                      border: `1px solid ${zero ? 'rgba(217,119,6,0.7)' : ch.color}`,
                      background: zero ? 'rgba(217,119,6,0.12)' : 'transparent',
                      color: 'var(--text-1)', fontWeight: zero ? 600 : 500,
                    }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: ch.color, display: 'inline-block' }} />
                    {ch.label} {zero ? '⚠ 0' : count}
                  </span>
                );
              })}
            </div>
          )}

          {mode === 'week' ? (
            <WeekGrid channels={CHANNELS} weekDays={weekDays} weekIndex={weekIndex} today={today} />
          ) : (
            <MonthGrid anchor={anchor} scheduled={scheduled} today={today}
              onPickDay={(d) => { setAnchor(d); setMode('week'); }} />
          )}

          {/* Nog in te plannen (drafts zonder datum) */}
          <UnscheduledTray items={unscheduled} />
        </>
      )}
    </div>
  );
}

function ItemCard({ it }) {
  const ch = CHANNELS.find(c => c.key === it.channel);
  const st = STATUS_STYLE[it.status] || STATUS_STYLE.draft;
  return (
    <div title={`${st.label}${it.subject ? ' · ' + it.subject : ''}`}
      style={{
        background: st.bg, border: `1px solid ${st.border}`, borderRadius: 6,
        padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0,
      }}>
      <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', color: ch?.color || 'var(--text-2)', fontWeight: 700 }}>
        {TYPE_BADGE[it.type] || it.type}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {it.subject || it.body?.slice(0, 60) || '(geen inhoud)'}
      </span>
    </div>
  );
}

function WeekGrid({ channels, weekDays, weekIndex, today }) {
  return (
    <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, overflow: 'hidden' }}>
      {/* Kop-rij met dagen */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', background: 'var(--fill-1)' }}>
        <div style={{ padding: '6px 8px' }} />
        {weekDays.map((d, i) => {
          const isToday = sameDay(d, today);
          return (
            <div key={i} style={{ padding: '6px 8px', textAlign: 'center', borderLeft: '0.5px solid var(--sep)', fontSize: 11, color: isToday ? 'var(--accent)' : 'var(--text-2)', fontWeight: isToday ? 700 : 500 }}>
              {DAY_LABELS[i]} {d.getDate()}
            </div>
          );
        })}
      </div>
      {/* Kanaal-rijen */}
      {channels.map(ch => (
        <div key={ch.key} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderTop: '0.5px solid var(--sep)', minHeight: 56 }}>
          <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-1)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: ch.color, display: 'inline-block' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)' }}>{ch.label}</span>
          </div>
          {weekDays.map((_, i) => {
            const cell = weekIndex[`${ch.key}|${i}`] || [];
            return (
              <div key={i} style={{ borderLeft: '0.5px solid var(--sep)', padding: 4, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                {cell.slice(0, 1).map(it => <ItemCard key={it.id} it={it} />)}
                {cell.length > 1 && (
                  <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>+{cell.length - 1} meer</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MonthGrid({ anchor, scheduled, today, onPickDay }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)); // 6 weken
  // Kanalen per dag (voor de gekleurde stipjes).
  const byDay = useMemo(() => {
    const m = {}; // 'y-m-d' -> Set(channel)
    for (const it of scheduled) {
      const d = new Date(it.scheduled_at);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      (m[k] = m[k] || new Set()).add(it.channel);
    }
    return m;
  }, [scheduled]);

  return (
    <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--fill-1)' }}>
        {DAY_LABELS.map(l => (
          <div key={l} style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11, color: 'var(--text-2)', borderLeft: '0.5px solid var(--sep)' }}>{l}</div>
        ))}
      </div>
      {Array.from({ length: 6 }, (_, w) => (
        <div key={w} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '0.5px solid var(--sep)' }}>
          {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
            const inMonth = d.getMonth() === anchor.getMonth();
            const isToday = sameDay(d, today);
            const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const chans = byDay[k] ? [...byDay[k]] : [];
            return (
              <div key={i} onClick={() => onPickDay(d)}
                title="Klik om naar deze week te springen"
                style={{
                  borderLeft: '0.5px solid var(--sep)', minHeight: 64, padding: 6, cursor: 'pointer',
                  background: inMonth ? 'transparent' : 'var(--fill-1)', opacity: inMonth ? 1 : 0.5,
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                <span style={{ fontSize: 11, color: isToday ? 'var(--accent)' : 'var(--text-2)', fontWeight: isToday ? 700 : 400 }}>{d.getDate()}</span>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {chans.map(ck => {
                    const ch = CHANNELS.find(c => c.key === ck);
                    return <span key={ck} title={ch?.label} style={{ width: 7, height: 7, borderRadius: '50%', background: ch?.color || 'var(--text-3)', display: 'inline-block' }} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function UnscheduledTray({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
        Nog in te plannen ({items.length})
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {items.map(it => (
          <div key={it.id} style={{ width: 180 }}>
            <ItemCard it={it} />
          </div>
        ))}
      </div>
    </div>
  );
}
