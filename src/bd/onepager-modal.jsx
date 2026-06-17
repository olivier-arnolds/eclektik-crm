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

const CUR_YEAR = '2026';
const PREV_YEAR = '2025';

export default function OnepagerModal({ open, onClose }) {
  const [opps, setOpps] = useState([]);
  const [companyById, setCompanyById] = useState(new Map());
  const [leads, setLeads] = useState([]);
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
            .select('id,topic,company_id,company_name,status,stage,sub_status,pipeline_phase,product_line,est_revenue,actual_revenue,close_date,actual_close_date')
            .limit(2000),
          supabase.from('companies').select('id,name,country,industry,employee_count').limit(2000),
          supabase.from('leads').select('id,full_name,topic,company_id,product_line').limit(2000),
        ]);
        if (cancelled) return;
        if (o.error) throw o.error;
        setOpps(o.data || []);
        setCompanyById(new Map((c.data || []).map((r) => [r.id, r])));
        setLeads(l.data || []);
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const m = useMemo(() => {
    const nameOf = (o) => o.company_name || companyById.get(o.company_id)?.name || '— onbekend —';

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

    // Win rate — alleen verloren deals die tot een proposal kwamen tellen als
    // loss. pipeline_phase codeert de bereikte fase (1-Qualify .. 4-Close);
    // 3-Propose of 4-Close = er is een proposal geweest. Deals die in
    // qualify/develop strandden tellen NIET mee als loss.
    const reachedProposal = (o) => /propose|close/i.test(o.pipeline_phase || '');
    const wonN = opps.filter(isWon).length;
    const lostQualified = opps.filter((o) => isLost(o) && reachedProposal(o)).length;
    const winRate = (wonN + lostQualified) > 0 ? Math.round((wonN / (wonN + lostQualified)) * 100) : null;

    // ROI-opportunities worden uit de kolommen proposal..sleeping geweerd
    // (alleen de Leads-kolom houdt alle types). product_line = 'ROI'.
    const isROI = (o) => (o.product_line || '').trim().toUpperCase() === 'ROI';

    // Lifecycle-buckets (huidige stage), ROI uitgesloten
    const proposal = dealsIn((o) => catOf(o) === 'proposal' && !isROI(o));
    const onboarding = dealsIn((o) => catOf(o) === 'onboarding' && !isROI(o));
    const active = dealsIn((o) => o.stage === 'active' && !isROI(o));               // Running / Completed
    const sleeping = dealsIn((o) => o.stage === 'past' && isWon(o) && !isROI(o));   // afgerond, dormant

    // Leads = pre-proposal pijplijn: de leads-tabel (qualify) + qualify/develop-opps.
    // ROI wordt ook hier geweerd (net als in de overige kolommen).
    const earlyOpps = dealsIn((o) => ['qualify', 'develop'].includes(catOf(o)) && !isROI(o));
    const leadItems = (leads || []).filter((l) => !isROI(l)).map((l) => {
      const client = companyById.get(l.company_id)?.name || '';
      const project = (l.topic || '').trim() || (l.full_name || '').trim() || 'Untitled lead';
      return { id: 'lead-' + l.id, project, client: project === client ? '' : client };
    });
    const leadsBucket = [...leadItems, ...earlyOpps].sort((a, b) => a.project.localeCompare(b.project));

    // Afgerond / gevallen IN het lopende jaar (voor de KPI-tegels)
    const doneThisYear = dealsIn((o) => isWon(o) && yearOf(o) === CUR_YEAR);
    const lostThisYear = dealsIn((o) => isLost(o) && yearOf(o) === CUR_YEAR);

    const dateOf = (o) => o.actual_close_date || o.close_date;

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

    // ── Client base: bedrijven met een gewonnen / lopend / onboarding deal ──
    // Dit is "waar we daadwerkelijk leveren". Geografie, sector en omvang
    // hieronder zijn over deze set berekend.
    const clientIds = new Set();
    for (const o of opps) {
      if ((isWon(o) || o.stage === 'active' || o.stage === 'onboarding') && o.company_id) clientIds.add(o.company_id);
    }
    const clients = [...clientIds].map((id) => companyById.get(id)).filter(Boolean);

    // Geografie: US vs EMEA (zelfde regel als de Reporting-tab).
    const US_C = new Set(['US', 'United States', 'USA']);
    const region = { US: 0, EMEA: 0 };
    for (const c of clients) region[US_C.has((c.country || '').trim()) ? 'US' : 'EMEA']++;

    // Industrie → sector-cluster (de ruwe industry-tekst is te versnipperd).
    const sectorOf = (industry) => {
      const t = (industry || '').toLowerCase();
      if (/bio|pharma|clinical|diabetes|health|life scien|diagnostic|medical/.test(t)) return 'Life Sciences & Healthcare';
      if (/manufactur|industrial|engineering|maritime|machinery|chemical/.test(t)) return 'Manufacturing & Industrial';
      if (/retail|consumer|food|beverage|brand|luxury|fashion|confection/.test(t)) return 'Consumer & Retail';
      if (/software|technolog|\bit\b|saas|web hosting|isp|semiconductor|cloud|information tech/.test(t)) return 'Technology & Software';
      if (/insur|bank|financ|lending|trading|account|payment|asset/.test(t)) return 'Financial Services';
      if (/government|non.?profit|public|education/.test(t)) return 'Public & Non-profit';
      return 'Other';
    };
    const sectorCount = new Map();
    for (const c of clients) { const s = sectorOf(c.industry); sectorCount.set(s, (sectorCount.get(s) || 0) + 1); }
    const sectors = [...sectorCount.entries()]
      .map(([label, n]) => ({ label, n }))
      .sort((a, b) => (a.label === 'Other' ? 1 : b.label === 'Other' ? -1 : b.n - a.n));

    // Omvang naar werknemersaantal (employee_count is tekst in de DB).
    const SIZE_BANDS = [
      { label: '1–49', test: (n) => n < 50 },
      { label: '50–249', test: (n) => n >= 50 && n < 250 },
      { label: '250–999', test: (n) => n >= 250 && n < 1000 },
      { label: '1,000–4,999', test: (n) => n >= 1000 && n < 5000 },
      { label: '5,000+', test: (n) => n >= 5000 },
    ];
    const sizeCount = Object.fromEntries(SIZE_BANDS.map((b) => [b.label, 0]));
    let sizeUnknown = 0;
    for (const c of clients) {
      // Parse als getal: verwijder duizendtal-/spatie-scheiders, neem dan de
      // numerieke waarde. parseFloat handelt decimalen af ("1600.0" → 1600),
      // anders zou "1600.0" naar 16000 verminkt worden.
      const cleaned = String(c.employee_count ?? '').trim().replace(/[,\s]/g, '');
      const n = cleaned ? Math.round(parseFloat(cleaned)) : NaN;
      const band = Number.isFinite(n) ? SIZE_BANDS.find((b) => b.test(n)) : null;
      if (band) sizeCount[band.label]++; else sizeUnknown++;
    }
    const sizes = [
      ...SIZE_BANDS.map((b) => ({ label: b.label, n: sizeCount[b.label] })),
      { label: 'unknown', n: sizeUnknown },
    ];

    return {
      leadsBucket, proposal, onboarding, active, sleeping, doneThisYear, lostThisYear,
      nrCur: nrYtdFor(CUR_YEAR), nrPrev: nrYtdFor(PREV_YEAR),
      ytdLabel: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      clientCount: clients.length, region, sectors, sizes,
      wonN, lostQualified, winRate,
    };
  }, [opps, companyById, leads]);

  if (!open) return null;

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ padding: 0 }}>
      <div className="modal" style={{ width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', borderRadius: 0, display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>Eclectik — 2026 Overview</span>
          <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 400 }}>state of play · {today}</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto', color: 'var(--text-2)' }} onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 22, padding: '20px 28px', maxWidth: 1400, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading figures…</div>}
          {error && <div style={{ padding: 20, color: 'var(--danger)', fontSize: 12 }}>Could not load data: {error}</div>}

          {!loading && !error && (
            <>
              {/* KPI row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                <Kpi label="Completed in 2026" value={m.doneThisYear.length} tint="var(--good)" />
                <Kpi label="Running now" value={m.active.length} tint="var(--accent)" />
                <Kpi label="In onboarding" value={m.onboarding.length} tint="var(--accent)" />
                <Kpi label="In proposal" value={m.proposal.length} tint="var(--warn)" />
                <Kpi label="Lost in 2026" value={m.lostThisYear.length} tint="var(--danger)" />
              </div>

              {/* Win rate — proposal-stage deals only */}
              {m.winRate !== null && (
                <Section title="Win rate — deals that reached a proposal">
                  <WinRate won={m.wonN} lost={m.lostQualified} rate={m.winRate} />
                </Section>
              )}

              {/* Project lifecycle: leads → proposal → onboarding → running/completed → sleeping */}
              <Section title="The project lifecycle — leads to sleeping">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                  <FunnelCol title="Leads" sub="pre-proposal pipeline" color="var(--text-3)" names={m.leadsBucket} />
                  <FunnelCol title="Proposal" sub="open proposals" color="var(--warn)" names={m.proposal} />
                  <FunnelCol title="Onboarding" sub="just won, starting up" color="var(--accent)" names={m.onboarding} />
                  <FunnelCol title="Running / Completed" sub="active delivery" color="var(--good)" names={m.active} />
                  <FunnelCol title="Sleeping" sub="finished, revivable" color="var(--text-2)" names={m.sleeping} />
                </div>
              </Section>

              {/* Where we're strong — client base profile */}
              <Section title={`Where we're strong — clients we deliver to (${m.clientCount})`}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <ProfilePanel title="Geography" rows={[{ label: 'EMEA', n: m.region.EMEA }, { label: 'US', n: m.region.US }]} total={m.clientCount} color="var(--accent)" />
                  <ProfilePanel title="Sector strength" rows={m.sectors} total={m.clientCount} color="var(--good)" />
                  <ProfilePanel title="Company size (employees)" rows={m.sizes} total={m.clientCount} color="var(--warn)" />
                </div>
              </Section>

              {/* New vs recurring — like-for-like YTD */}
              <Section title={`New business vs. recurring business — like-for-like (1 Jan – ${m.ytdLabel})`}>
                <NewRecurring prev={m.nrPrev} cur={m.nrCur} prevYr={PREV_YEAR} curYr={CUR_YEAR} ytdLabel={m.ytdLabel} />
              </Section>

              <div style={{ fontSize: 12, color: 'var(--text-3)', borderTop: '0.5px solid var(--sep)', paddingTop: 10 }}>
                Live figures from the CRM. Definitions match the Reporting tab (won = status 'Won', new = first won deal per client).
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
    <div style={{ border: '0.5px solid var(--sep)', borderRadius: 10, padding: '16px 14px', background: 'var(--bg-1)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: small ? 26 : 36, fontWeight: 700, color: tint, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.25 }}>{label}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{title}</div>
      {children}
    </div>
  );
}

function FunnelCol({ title, sub, color, names }) {
  return (
    <div style={{ border: '0.5px solid var(--sep)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 12px', borderTop: `4px solid ${color}`, background: 'var(--bg-1)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
          <span style={{ fontSize: 24, fontWeight: 700, color, marginLeft: 'auto' }}>{names.length}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</div>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
        {names.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>none</span>}
        {names.map((d) => (
          <div key={d.id} style={{ padding: '3px 0', borderBottom: '0.5px solid var(--sep)' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-1)' }}>{d.project}</div>
            {d.client && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{d.client}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function WinRate({ won, lost, rate }) {
  const total = won + lost;
  const wonPct = total > 0 ? (won / total) * 100 : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontSize: 44, fontWeight: 700, color: 'var(--good)', lineHeight: 1 }}>{rate}%</span>
        <span style={{ fontSize: 15, color: 'var(--text-2)' }}>{won} won vs {lost} lost</span>
      </div>
      <div style={{ display: 'flex', height: 30, borderRadius: 6, overflow: 'hidden', background: 'var(--fill-1)' }}>
        <div title={`${won} won`} style={{ width: `${wonPct}%`, background: 'var(--good)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: won > 0 ? 2 : 0 }}>
          {wonPct > 14 && <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{won} won</span>}
        </div>
        <div title={`${lost} lost`} style={{ width: `${100 - wonPct}%`, background: 'var(--danger)', opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: lost > 0 ? 2 : 0 }}>
          {(100 - wonPct) > 14 && <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{lost} lost</span>}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
        Only opportunities that reached a proposal count as a loss — deals that dropped out earlier (qualify/develop) are excluded. Across all tracked deals.
      </div>
    </div>
  );
}

function ProfilePanel({ title, rows, total, color }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div style={{ border: '0.5px solid var(--sep)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 12px', borderTop: `4px solid ${color}`, background: 'var(--bg-1)' }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.filter((r) => r.n > 0).map((r) => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, color: 'var(--text-1)', width: 130, flexShrink: 0 }}>{r.label}</span>
            <div style={{ flex: 1, height: 14, borderRadius: 4, background: 'var(--fill-1)', overflow: 'hidden' }}>
              <div style={{ width: `${(r.n / max) * 100}%`, height: '100%', background: color, opacity: 0.55 }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', width: 28, textAlign: 'right' }}>{r.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewRecurring({ prev, cur, prevYr, curYr, ytdLabel }) {
  // Geteld op AANTAL gewonnen deals (geen omzetcijfers).
  const totalPrev = prev.newN + prev.recN;
  const totalCur = cur.newN + cur.recN;
  const max = Math.max(totalPrev, totalCur, 1);
  const growth = totalPrev > 0 ? Math.round(((totalCur - totalPrev) / totalPrev) * 100) : null;
  const recShare = (nr) => { const t = nr.newN + nr.recN; return t > 0 ? Math.round((nr.recN / t) * 100) : 0; };

  const Row = ({ yr, nr }) => {
    const total = nr.newN + nr.recN;
    const w = (v) => `${(v / max) * 100}%`;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, width: 80 }}>{yr} YTD</span>
        <div style={{ flex: 1, display: 'flex', height: 34, borderRadius: 6, overflow: 'hidden', background: 'var(--fill-1)' }}>
          <div title={`New business: ${nr.newN} deals`}
            style={{ width: w(nr.newN), background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: nr.newN > 0 ? 2 : 0 }}>
            {nr.newN / max > 0.1 && <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{nr.newN}</span>}
          </div>
          <div title={`Recurring: ${nr.recN} deals`}
            style={{ width: w(nr.recN), background: 'var(--good)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: nr.recN > 0 ? 2 : 0 }}>
            {nr.recN / max > 0.1 && <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{nr.recN}</span>}
          </div>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', width: 84, textAlign: 'right' }}>{total} deals</span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', fontSize: 13 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--accent)' }} /> New business (new clients)</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--good)' }} /> Recurring business (repeat)</span>
        {growth !== null && (
          <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 700, color: growth >= 0 ? 'var(--good)' : 'var(--danger)' }}>
            {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}% deals vs {prevYr} (same period)
          </span>
        )}
      </div>
      <Row yr={prevYr} nr={prev} />
      <Row yr={curYr} nr={cur} />
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
        Counted by number of won deals, 1 Jan – {ytdLabel} in both years for a fair comparison. Recurring share: {recShare(prev)}% → {recShare(cur)}%.
      </div>
    </div>
  );
}
