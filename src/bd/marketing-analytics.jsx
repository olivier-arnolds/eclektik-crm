import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../lib/apiFetch';

// Analytics-tab onder Marketing. Leest GA4 via api/analytics.js.
//
// Bewust geen grafiekbibliotheek: de twee vormen die we nodig hebben (een lijn
// over de tijd en een balkje per rij) zijn met gewone SVG een paar regels, en
// een dependency erbij kost meer dan hij hier oplevert.
//
// Ook bewust geen kopie van GA. Dit beantwoordt de vraag die je in het CRM stelt:
// komt er bezoek, waar komt het vandaan, en welke uiting bracht het.

const RANGES = [
  { days: 7, label: '7 dagen' },
  { days: 28, label: '28 dagen' },
  { days: 90, label: '90 dagen' },
];

const nf = new Intl.NumberFormat('nl-NL');

function Delta({ pct }) {
  if (pct === null || pct === undefined) return <span style={{ color: 'var(--text-3)', fontSize: 11 }}>geen vergelijking</span>;
  const op = pct >= 0;
  return (
    <span style={{ fontSize: 11, color: op ? '#16a34a' : '#dc2626' }}>
      {op ? '▲' : '▼'} {Math.abs(pct)}% vs. vorige periode
    </span>
  );
}

function TegelTekst({ label, waarde, pct, toelichting }) {
  return (
    <div style={{ flex: '1 1 150px', border: '0.5px solid var(--sep)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>{waarde}</div>
      <Delta pct={pct} />
      {toelichting && <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{toelichting}</div>}
    </div>
  );
}

function Tegel({ label, value, pct, suffix }) {
  return (
    <div style={{ flex: '1 1 150px', border: '0.5px solid var(--sep)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>{nf.format(value || 0)}{suffix || ''}</div>
      <Delta pct={pct} />
    </div>
  );
}

// Lijngrafiek. viewBox in vaste eenheden met preserveAspectRatio uit, zodat hij
// meeschaalt met de breedte zonder dat we de pixelbreedte hoeven te meten.
function Lijn({ series }) {
  const { pad, punten, maxY, eerste, laatste } = useMemo(() => {
    const w = 1000, h = 220, pad = 28;
    const vals = series.map(s => s.sessions || 0);
    const maxY = Math.max(1, ...vals);
    const stap = series.length > 1 ? (w - pad * 2) / (series.length - 1) : 0;
    const punten = series.map((s, i) => {
      const x = pad + i * stap;
      const y = h - pad - ((s.sessions || 0) / maxY) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { pad, punten, maxY, eerste: series[0]?.date, laatste: series[series.length - 1]?.date };
  }, [series]);

  if (series.length === 0) return <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Geen data in deze periode.</div>;

  return (
    <div>
      <svg viewBox="0 0 1000 220" preserveAspectRatio="none" style={{ width: '100%', height: 220, display: 'block' }}>
        <line x1={pad} y1={220 - pad} x2={1000 - pad} y2={220 - pad} stroke="var(--sep)" strokeWidth="1" />
        <polyline points={punten.join(' ')} fill="none" stroke="#2563eb" strokeWidth="2"
          vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
        <span>{eerste}</span>
        <span>piek {nf.format(maxY)} sessies per dag</span>
        <span>{laatste}</span>
      </div>
    </div>
  );
}

function Balken({ rows, labelKey, valueKey, leeg }) {
  const max = Math.max(1, ...rows.map(r => r[valueKey] || 0));
  if (rows.length === 0) return <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{leeg}</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <div style={{ width: '42%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={r[labelKey] || '(onbekend)'}>
            {r[labelKey] || '(onbekend)'}
          </div>
          <div style={{ flex: 1, background: 'var(--fill-1)', borderRadius: 3, height: 14, position: 'relative' }}>
            <div style={{
              width: `${Math.max(2, ((r[valueKey] || 0) / max) * 100)}%`,
              background: '#2563eb', opacity: 0.75, height: '100%', borderRadius: 3,
            }} />
          </div>
          <div style={{ width: 56, textAlign: 'right', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
            {nf.format(r[valueKey] || 0)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Kader({ titel, toelichting, children }) {
  return (
    <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{titel}</div>
        {toelichting && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{toelichting}</div>}
      </div>
      {children}
    </div>
  );
}

export default function MarketingAnalytics() {
  const [days, setDays] = useState(28);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [setup, setSetup] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const resp = await apiFetch(`/api/analytics?days=${days}`);
      const d = await resp.json();
      if (!resp.ok) { setSetup(!!d?.setup); throw new Error(d?.error || `HTTP ${resp.status}`); }
      setSetup(false);
      setData(d);
    } catch (e) {
      setErr(e.message);
      setData(null);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Website</span>
        <div style={{ display: 'inline-flex', border: '0.5px solid var(--sep)', borderRadius: 6, overflow: 'hidden' }}>
          {RANGES.map(r => (
            <button key={r.days} type="button" style={{ borderRadius: 0 }}
              className={days === r.days ? 'btn-primary tiny' : 'btn-ghost tiny'}
              onClick={() => setDays(r.days)}>
              {r.label}
            </button>
          ))}
        </div>
        <button className="btn-ghost tiny" onClick={load} disabled={loading}>
          {loading ? 'Laden…' : 'Ververs'}
        </button>
        {data?.range && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
            {data.range.startDate} tot {data.range.endDate}
          </span>
        )}
      </div>

      {setup && (
        <div style={{ border: '0.5px solid rgba(217,119,6,0.5)', background: 'rgba(217,119,6,0.08)', borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.7 }}>
          <strong>Nog niet gekoppeld.</strong> Zet in de Vercel-omgeving <code>GA_PROPERTY_ID</code>,
          {' '}<code>GA_CLIENT_EMAIL</code> en <code>GA_PRIVATE_KEY</code>, en voeg dat serviceaccount
          in GA4 toe als Viewer op de property. Daarna hier verversen.
        </div>
      )}

      {err && !setup && (
        <div style={{ fontSize: 12, color: '#dc2626', lineHeight: 1.6 }}>
          Kon Analytics niet lezen: {err}
        </div>
      )}

      {loading && !data && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Laden…</div>}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tegel label="Sessies" value={data.totals.sessions} pct={data.change.sessions} />
            <Tegel label="Bezoekers" value={data.totals.users} pct={data.change.users} />
            <Tegel label="Paginaweergaven" value={data.totals.pageviews} pct={data.change.pageviews} />
            <Tegel label="Betrokkenheid" value={data.totals.engagement} pct={data.change.engagement} suffix="%" />
            {data.session_duration && (
              <TegelTekst label="Sessieduur" waarde={data.session_duration}
                pct={data.change.session_seconds} toelichting="gemiddeld per sessie" />
            )}
            {data.registrations && (
              <Tegel label="Aanmeldingen" value={data.registrations.total} pct={data.registrations.change} />
            )}
          </div>

          <Kader titel="Sessies per dag">
            <Lijn series={data.series} />
          </Kader>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
            <Kader titel="Waar komt het vandaan" toelichting="Kanaal volgens Google">
              <Balken rows={data.channels} labelKey="channel" valueKey="sessions"
                leeg="Geen verkeer in deze periode." />
            </Kader>

            <Kader titel="Aanmeldingen per bron"
              toelichting="Inschrijvingen voor een event, toegerekend aan waar de bezoeker vandaan kwam">
              <Balken
                rows={(data.registrations?.by_campaign || []).map(c => ({
                  ...c,
                  label: [c.source, c.medium].filter(Boolean).join(' / ')
                    + (c.campaign && c.campaign !== '(not set)' ? ` · ${c.campaign}` : ''),
                }))}
                labelKey="label" valueKey="registrations"
                leeg="Nog geen aanmeldingen in deze periode." />
            </Kader>

{data.scorecard?.steps?.[0] && (
            <Kader titel="Scorecard"
              toelichting={`Van starten tot doorklikken, in bezoekers${
                data.scorecard.answered ? ` · ${nf.format(data.scorecard.answered)} vragen beantwoord` : ''}`}>
              {data.scorecard.steps.every(s => s.users === 0) ? (
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Niemand heeft de scorecard in deze periode gestart.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.scorecard.steps.map(s => (
                    <div key={s.key}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12 }}>
                        <span>{s.label}</span>
                        {s.uitval !== null && (
                          <span style={{ fontSize: 11, color: '#b45309' }}>{s.uitval}% valt af</span>
                        )}
                        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>
                          {nf.format(s.users)}{s.pctVanStart !== null ? ` · ${s.pctVanStart}%` : ''}
                        </span>
                      </div>
                      <div style={{ background: 'var(--fill-1)', borderRadius: 3, height: 10, marginTop: 3 }}>
                        <div style={{
                          width: `${Math.max(2, s.pctVanStart ?? 0)}%`,
                          background: '#2563eb', opacity: 0.75, height: '100%', borderRadius: 3,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Kader>

            )}

            <Kader titel="Campagnes"
              toelichting="Bron, medium en campagne uit de UTM-tags van je links">
              <Balken
                rows={data.campaigns.map(c => ({
                  ...c,
                  label: [c.source, c.medium].filter(Boolean).join(' / ')
                    + (c.campaign && c.campaign !== '(not set)' ? ` · ${c.campaign}` : ''),
                }))}
                labelKey="label" valueKey="sessions"
                leeg="Geen campagneverkeer gevonden." />
            </Kader>
          </div>

          <Kader titel="Best bezochte pagina's">
            {/* GA levert de startpagina als kaal '/'. Dat leest als een gat in de
                data terwijl het gewoon de homepage is. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {data.pages.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Geen paginaweergaven.</div>
              )}
              {data.pages.map((p, i) => {
                const max = Math.max(1, ...data.pages.map(x => x.views || 0));
                const naam = p.path === '/' ? '/ (homepage)' : p.path;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ width: '38%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={naam}>{naam}</div>
                    <div style={{ flex: 1, background: 'var(--fill-1)', borderRadius: 3, height: 14 }}>
                      <div style={{ width: `${Math.max(2, ((p.views || 0) / max) * 100)}%`, background: '#2563eb', opacity: 0.75, height: '100%', borderRadius: 3 }} />
                    </div>
                    <div style={{ width: 56, textAlign: 'right', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                      {nf.format(p.views || 0)}
                    </div>
                    <div style={{ width: 64, textAlign: 'right', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}
                      title="gemiddelde betrokken tijd per bezoeker op deze pagina">
                      {p.avg_time}
                    </div>
                  </div>
                );
              })}
            </div>
          </Kader>

          <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
            Tijd telt in GA4 alleen als het tabblad op de voorgrond staat. Een bezoeker die leest
            en wegklikt zonder te scrollen of te klikken kan dus op nul seconden uitkomen. Lees een
            lage tijd daarom als een aanwijzing, niet als een oordeel.
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
            Staat er bij Campagnes weinig, dan dragen de links in je mails en posts waarschijnlijk
            geen UTM-tags. Zonder die tags ziet Google verkeer uit een e-mail meestal als direct
            verkeer, en valt de koppeling met de campagne weg.
          </div>
        </>
      )}
    </div>
  );
}
