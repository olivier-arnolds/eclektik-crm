import { useState, useEffect, useMemo } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

// ── Eclectik One-pager — presentatie-overzicht 2026 ──
// Full-screen modal, bedoeld voor een informele meeting (bv. met contractors).
// Leest live uit Supabase via de ingelogde sessie en toont:
//   • kerncijfers 2026 (afgerond / lopend / onboarding / offerte / gevallen)
//   • de delivery-funnel met projectnamen (klanten) per fase
//   • new vs recurring business 2025 → 2026 (alleen totalen)
// Definities zijn 1-op-1 met de Reporting-tab: won = status 'Won',
// omzet = COALESCE(actual_revenue, est_revenue, 0), jaar uit
// actual_close_date || close_date, en new = eerste gewonnen deal per klant.

const num = (v) => (v == null || v === '' || isNaN(+v)) ? null : +v;
const revenueOf = (o) => { const a = num(o.actual_revenue); if (a !== null) return a; const e = num(o.est_revenue); return e !== null ? e : 0; };
const yearOf = (o) => { const d = o.actual_close_date || o.close_date; return d ? String(d).slice(0, 4) : null; };
const eurK = (v) => '€' + Math.round((v || 0) / 1000).toLocaleString('en-US') + 'k';

const CUR_YEAR = '2026';
const PREV_YEAR = '2025';

export default function OnepagerModal({ open, onClose }) {
  const [opps, setOpps] = useState([]);
  const [companyById, setCompanyById] = useState(new Map());
  const [leadCount, setLeadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true); setError(null);
    (async () => {
      try {
        const [o, c, l] = await Promise.all([
          supabase.from('opportunities')
            .select('id,topic,company_id,company_name,status,stage,sub_status,product_line,est_revenue,actual_revenue,close_date,actual_close_date')
            .limit(2000),
          supabase.from('companies').select('id,name').limit(2000),
          supabase.from('leads').select('id', { count: 'exact', head: true }),
        ]);
        if (cancelled) return;
        if (o.error) throw o.error;
        setOpps(o.data || []);
        setCompanyById(new Map((c.data || []).map((r) => [r.id, r.name])));
        setLeadCount(l.count || 0);
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const m = useMemo(() => {
    const nameOf = (o) => o.company_name || companyById.get(o.company_id) || '— onbekend —';

    // ── Funnel-categorie per opportunity ──
    const catOf = (o) => {
      const st = (o.status || '').toLowerCase();
      const ss = (o.sub_status || '').toLowerCase();
      if (o.stage === 'past' && st === 'lost') return 'lost';
      if (o.stage === 'past' && st === 'won') return 'done';
      if (o.stage === 'onboarding') return 'onboarding';
      if (o.stage === 'active') return 'active';
      if (o.stage === 'opportunity' && ss === 'proposal') return 'proposal';
      if (o.stage === 'opportunity' && ss === 'develop') return 'develop';
      if (o.stage === 'opportunity' && ss === 'qualify') return 'qualify';
      return 'other';
    };

    // Projecten per categorie. topic = projectnaam in dit CRM; valt terug op
    // de klantnaam als topic leeg is. client tonen we als context eronder.
    const dealsIn = (pred) => opps
      .filter(pred)
      .map((o) => {
        const client = nameOf(o);
        const project = (o.topic || '').trim() || client;
        return { id: o.id, project, client: project === client ? '' : client };
      })
      .sort((a, b) => a.project.localeCompare(b.project));

    const isWon = (o) => (o.status || '').toLowerCase() === 'won';
    const isLost = (o) => (o.status || '').toLowerCase() === 'lost';

    // Huidige snapshot-buckets (status nu)
    const proposal = dealsIn((o) => catOf(o) === 'proposal');
    const onboarding = dealsIn((o) => catOf(o) === 'onboarding');
    const active = dealsIn((o) => catOf(o) === 'active');
    const develop = dealsIn((o) => catOf(o) === 'develop');

    // Afgerond / gevallen IN het lopende jaar
    const doneThisYear = dealsIn((o) => isWon(o) && yearOf(o) === CUR_YEAR);
    const lostThisYear = dealsIn((o) => isLost(o) && yearOf(o) === CUR_YEAR);

    // Gewonnen omzet (alleen totaal), volledig jaar
    const dateOf = (o) => o.actual_close_date || o.close_date;
    const wonRevFull = (yr) => opps.filter((o) => isWon(o) && yearOf(o) === yr).reduce((s, o) => s + revenueOf(o), 0);

    // ── New vs recurring (alle lijnen) — eerste gewonnen deal per klant = new ──
    // De "new"-bepaling kijkt naar ALLE gewonnen deals (volledige historie),
    // de jaar-aggregatie hieronder past pas de YTD-grens toe.
    const won = opps.filter(isWon);
    const byCompany = new Map();
    for (const o of won) {
      const k = o.company_id || `__${nameOf(o)}`;
      if (!byCompany.has(k)) byCompany.set(k, []);
      byCompany.get(k).push(o);
    }
    const seq = new Map();
    for (const arr of byCompany.values()) {
      arr.sort((a, b) => {
        const da = a.actual_close_date || a.close_date || '9999';
        const db = b.actual_close_date || b.close_date || '9999';
        return da < db ? -1 : da > db ? 1 : (a.id < b.id ? -1 : 1);
      });
      arr.forEach((o, i) => seq.set(o.id, i === 0 ? 'new' : 'rec'));
    }

    // Eerlijke vergelijking: year-to-date t/m dezelfde kalenderdag (MM-DD) in
    // beide jaren. Anders zou een half jaar 2026 tegen een vol jaar 2025 staan.
    const now = new Date();
    const cutoffMd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const inYtd = (o, yr) => { const d = dateOf(o); if (!d) return false; const s = String(d); return s.slice(0, 4) === yr && s.slice(5, 10) <= cutoffMd; };
    const nrYtdFor = (yr) => {
      const acc = { new: 0, rec: 0, newN: 0, recN: 0 };
      for (const o of won) {
        if (!inYtd(o, yr)) continue;
        const t = seq.get(o.id);
        acc[t] += revenueOf(o); acc[t + 'N']++;
      }
      return acc;
    };

    return {
      proposal, onboarding, active, develop, doneThisYear, lostThisYear,
      wonRevCur: wonRevFull(CUR_YEAR), wonRevPrevFull: wonRevFull(PREV_YEAR),
      nrCur: nrYtdFor(CUR_YEAR), nrPrev: nrYtdFor(PREV_YEAR),
      ytdLabel: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    };
  }, [opps, companyById]);

  if (!open) return null;

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ padding: 0 }}>
      <div className="modal" style={{ width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', borderRadius: 0, display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>Eclectik — 2026 Overview</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>state of play · {today}</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto', color: 'var(--text-2)' }} onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 22, padding: '20px 28px', maxWidth: 1400, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading figures…</div>}
          {error && <div style={{ padding: 20, color: 'var(--danger)', fontSize: 12 }}>Could not load data: {error}</div>}

          {!loading && !error && (
            <>
              {/* KPI row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                <Kpi label="Completed in 2026" value={m.doneThisYear.length} tint="var(--good)" />
                <Kpi label="Running now" value={m.active.length} tint="var(--accent)" />
                <Kpi label="In onboarding" value={m.onboarding.length} tint="var(--accent)" />
                <Kpi label="In proposal" value={m.proposal.length} tint="var(--warn)" />
                <Kpi label="Lost in 2026" value={m.lostThisYear.length} tint="var(--danger)" />
                <Kpi label="Won revenue 2026" value={eurK(m.wonRevCur)} tint="var(--good)" small />
              </div>

              {/* Delivery funnel with project names */}
              <Section title="The projects — from proposal to completed">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <FunnelCol title="In proposal" sub="open proposals" color="var(--warn)" names={m.proposal} />
                  <FunnelCol title="In onboarding" sub="just won, starting up" color="var(--accent)" names={m.onboarding} />
                  <FunnelCol title="Running now" sub="active projects" color="var(--accent)" names={m.active} />
                  <FunnelCol title="Completed in 2026" sub="delivered this year" color="var(--good)" names={m.doneThisYear} />
                </div>
              </Section>

              {/* Lost */}
              {m.lostThisYear.length > 0 && (
                <Section title={`Lost in 2026 (${m.lostThisYear.length})`}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.lostThisYear.map((d) => (
                      <span key={d.id} title={d.client} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: 'var(--fill-1)', color: 'var(--text-2)', textDecoration: 'line-through', textDecorationColor: 'var(--danger)' }}>{d.project}</span>
                    ))}
                  </div>
                </Section>
              )}

              {/* New vs recurring — like-for-like YTD */}
              <Section title={`New business vs. recurring business — like-for-like (1 Jan – ${m.ytdLabel})`}>
                <NewRecurring prev={m.nrPrev} cur={m.nrCur} prevYr={PREV_YEAR} curYr={CUR_YEAR} ytdLabel={m.ytdLabel} prevFull={m.wonRevPrevFull} />
              </Section>

              <div style={{ fontSize: 10, color: 'var(--text-3)', borderTop: '0.5px solid var(--sep)', paddingTop: 8 }}>
                Live figures from the CRM. Definitions match the Reporting tab (won = status 'Won', new = first won deal per client).
                Early pipeline (qualify/develop): {leadCount + m.develop.length} opportunities in conversation.
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={() => window.print()}>Print / PDF</button>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tint, small }) {
  return (
    <div style={{ border: '0.5px solid var(--sep)', borderRadius: 10, padding: '12px 10px', background: 'var(--bg-1)', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: small ? 20 : 28, fontWeight: 700, color: tint, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.2 }}>{label}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{title}</div>
      {children}
    </div>
  );
}

function FunnelCol({ title, sub, color, names }) {
  return (
    <div style={{ border: '0.5px solid var(--sep)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 10px', borderTop: `3px solid ${color}`, background: 'var(--bg-1)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color, marginLeft: 'auto' }}>{names.length}</span>
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{sub}</div>
      </div>
      <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
        {names.length === 0 && <span style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>none</span>}
        {names.map((d) => (
          <div key={d.id} style={{ padding: '2px 0', borderBottom: '0.5px solid var(--sep)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-1)' }}>{d.project}</div>
            {d.client && <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{d.client}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewRecurring({ prev, cur, prevYr, curYr, ytdLabel, prevFull }) {
  const totalPrev = prev.new + prev.rec;
  const totalCur = cur.new + cur.rec;
  const max = Math.max(totalPrev, totalCur, 1);
  const growth = totalPrev > 0 ? Math.round(((totalCur - totalPrev) / totalPrev) * 100) : null;
  const recShare = (nr) => { const t = nr.new + nr.rec; return t > 0 ? Math.round((nr.rec / t) * 100) : 0; };

  const Row = ({ yr, nr }) => {
    const total = nr.new + nr.rec;
    const w = (v) => `${(v / max) * 100}%`;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, width: 64 }}>{yr} YTD</span>
        <div style={{ flex: 1, display: 'flex', height: 26, borderRadius: 6, overflow: 'hidden', background: 'var(--fill-1)' }}>
          <div title={`New business: ${eurK(nr.new)} (${nr.newN} deals)`}
            style={{ width: w(nr.new), background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: nr.new > 0 ? 2 : 0 }}>
            {nr.new / max > 0.12 && <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{eurK(nr.new)}</span>}
          </div>
          <div title={`Recurring: ${eurK(nr.rec)} (${nr.recN} deals)`}
            style={{ width: w(nr.rec), background: 'var(--good)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: nr.rec > 0 ? 2 : 0 }}>
            {nr.rec / max > 0.12 && <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{eurK(nr.rec)}</span>}
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-3)', width: 70, textAlign: 'right' }}>{eurK(total)}</span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 11 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)' }} /> New business</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--good)' }} /> Recurring business</span>
        {growth !== null && (
          <span style={{ marginLeft: 'auto', fontWeight: 600, color: growth >= 0 ? 'var(--good)' : 'var(--danger)' }}>
            {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}% revenue vs {prevYr} (same period)
          </span>
        )}
      </div>
      <Row yr={prevYr} nr={prev} />
      <Row yr={curYr} nr={cur} />
      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
        Both years counted 1 Jan – {ytdLabel} for a fair comparison. Recurring share: {recShare(prev)}% → {recShare(cur)}%.
        {prevFull > 0 && <> For reference, {prevYr} full year landed at {eurK(prevFull)}.</>}
      </div>
    </div>
  );
}
