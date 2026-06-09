// src/bd/industry-breakdown.jsx
//
// Reporting section: accounts grouped into broad industry sectors, split into
// clients (companies.type = 'Customer') vs prospects (companies.type = 'Prospect').
// Click a sector row to expand the account names beneath it.
// Themed with the app's CSS variables. Takes the already-loaded `companies`
// array as a prop (lane-reporting.jsx fetches companies incl. name + industry).

import { useMemo, useState } from 'react';

const SECTOR_OF = {
  'Finance': 'Financial Services & Insurance', 'Asset Management': 'Financial Services & Insurance',
  'Lending': 'Financial Services & Insurance', 'Personal Finance': 'Financial Services & Insurance',
  'Banking': 'Financial Services & Insurance', 'Financial Exchanges': 'Financial Services & Insurance',
  'Payments': 'Financial Services & Insurance', 'Impact Investing': 'Financial Services & Insurance',
  'Health Insurance': 'Financial Services & Insurance', 'Property Insurance': 'Financial Services & Insurance',
  'Insurance': 'Financial Services & Insurance', 'Trading': 'Financial Services & Insurance',
  'Information Technology': 'Technology & Software', 'IT Management': 'Technology & Software',
  'Information and Communications Technology (ICT)': 'Technology & Software', 'Information Services': 'Technology & Software',
  'Cloud Computing': 'Technology & Software', 'Enterprise Software': 'Technology & Software',
  'Enterprise': 'Technology & Software', 'Machine Learning': 'Technology & Software',
  'Intelligent Systems': 'Technology & Software', 'Application Performance Management': 'Technology & Software',
  'CRM': 'Technology & Software', 'Network Hardware': 'Technology & Software', 'Electronics': 'Technology & Software',
  'Semiconductor': 'Technology & Software', 'Web Hosting': 'Technology & Software', 'ISP': 'Technology & Software',
  'IT Services and IT Consulting': 'Technology & Software', 'Technical Support': 'Technology & Software',
  'Point of Sale': 'Technology & Software',
  'Hospital': 'Healthcare & Life Sciences', 'Hospitals and Health Care': 'Healthcare & Life Sciences',
  'Health Diagnostics': 'Healthcare & Life Sciences', 'Diabetes': 'Healthcare & Life Sciences',
  'Biotechnology': 'Healthcare & Life Sciences', 'Bioinformatics': 'Healthcare & Life Sciences',
  'Clinical Trials': 'Healthcare & Life Sciences', 'Wellness': 'Healthcare & Life Sciences',
  'Life Sciences': 'Healthcare & Life Sciences', 'Medical Devices': 'Healthcare & Life Sciences',
  'Healthcare': 'Healthcare & Life Sciences',
  'Manufacturing': 'Manufacturing & Industrial', 'Machinery Manufacturing': 'Manufacturing & Industrial',
  'Chemical Engineering': 'Manufacturing & Industrial', 'Civil Engineering': 'Manufacturing & Industrial',
  'Packaging Services': 'Manufacturing & Industrial', 'Industrial Manufacturing': 'Manufacturing & Industrial',
  'Chemicals': 'Manufacturing & Industrial', 'Maritime & Infrastructure': 'Manufacturing & Industrial',
  'Printing': 'Manufacturing & Industrial',
  'Clean Energy': 'Energy, Resources & Agriculture', 'Wind Energy': 'Energy, Resources & Agriculture',
  'Oil and Gas': 'Energy, Resources & Agriculture', 'Mining': 'Energy, Resources & Agriculture',
  'Mineral': 'Energy, Resources & Agriculture', 'Sustainability': 'Energy, Resources & Agriculture',
  'Farming': 'Energy, Resources & Agriculture', 'Energy': 'Energy, Resources & Agriculture',
  'Retail': 'Consumer & Retail', 'Retail Luxury Goods and Jewelry': 'Consumer & Retail',
  'Consumer Goods': 'Consumer & Retail', 'E-Commerce': 'Consumer & Retail', 'Fashion': 'Consumer & Retail',
  'Food and Beverage': 'Consumer & Retail', 'Confectionery': 'Consumer & Retail', 'Home Improvement': 'Consumer & Retail',
  'Consulting': 'Professional Services', 'Management Consulting': 'Professional Services',
  'Accounting': 'Professional Services', 'Marketing': 'Professional Services', 'Brand Marketing': 'Professional Services',
  'Advertising': 'Professional Services', 'Direct Marketing': 'Professional Services', 'Market Research': 'Professional Services',
  'Business Development': 'Professional Services', 'Human Resources': 'Professional Services',
  'Employee Benefits': 'Professional Services', 'Skill Assessment': 'Professional Services', 'Advice': 'Professional Services',
  'B2B': 'Professional Services', 'Professional Services': 'Professional Services',
  'Staffing & Recruiting': 'Professional Services', 'Supply Chain Management': 'Professional Services',
  'Business Travel': 'Travel, Hospitality & Events', 'Travel': 'Travel, Hospitality & Events',
  'Hospitality': 'Travel, Hospitality & Events', 'Resorts': 'Travel, Hospitality & Events', 'Events': 'Travel, Hospitality & Events',
  'Government': 'Public Sector, Education & Non-profit', 'Non Profit': 'Public Sector, Education & Non-profit',
  'Association': 'Public Sector, Education & Non-profit', 'Public Transportation': 'Public Sector, Education & Non-profit',
  'News': 'Public Sector, Education & Non-profit', 'Continuing Education': 'Public Sector, Education & Non-profit',
  'Training': 'Public Sector, Education & Non-profit', 'Education': 'Public Sector, Education & Non-profit',
  'Property Development': 'Real Estate & Property', 'Property Management': 'Real Estate & Property',
};

// Canonical broad sectors offered in the Account 360 industry dropdown. The
// values of SECTOR_OF map raw industries into these; a few extra logical sectors
// are added. Exported so the accounts dropdown and this breakdown stay in sync.
export const SECTOR_OPTIONS = [
  'Financial Services & Insurance',
  'Technology & Software',
  'Healthcare & Life Sciences',
  'Manufacturing & Industrial',
  'Energy, Resources & Agriculture',
  'Consumer & Retail',
  'Professional Services',
  'Travel, Hospitality & Events',
  'Public Sector, Education & Non-profit',
  'Real Estate & Property',
  'Media & Entertainment',
  'Telecommunications',
  'Transport & Logistics',
  'Automotive',
  'Construction & Engineering',
];
// If an account's industry is set directly to a sector name, honour it as-is.
const SECTORS = new Set([...Object.values(SECTOR_OF), ...SECTOR_OPTIONS]);

function sectorOf(industry) {
  const v = (industry || '').trim();
  if (!v) return 'No industry';
  if (SECTORS.has(v)) return v;        // industry already holds a sector name (set in 360)
  return SECTOR_OF[v] || 'Other';
}

const card = { background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 'var(--radius-card)', padding: '14px 16px', marginBottom: 14 };
const muted = { color: 'var(--text-3)' };
const mono = { fontFamily: 'var(--font-mono)' };

// Classic three-tier market division. Headcount is the primary signal (cleanest
// data); annual revenue is the fallback. Tiers: SMB 1-100 emp / <$50M, Mid-Market
// 100-1,000 / $50M-$1B, Enterprise 1,000+ / >$1B.
const TIERS = ['Enterprise', 'Mid-Market', 'SMB', 'Unknown'];
const TIER_COLOR = { 'Enterprise': '#2D6A9F', 'Mid-Market': '#3FA796', 'SMB': '#E0A458', 'Unknown': '#9AA0A6' };
const TIER_SHORT = { 'Enterprise': 'Ent', 'Mid-Market': 'Mid', 'SMB': 'SMB', 'Unknown': '?' };

function tierOf(c) {
  // 1) headcount
  const empRaw = String(c.employee_count || '').replace(/[^0-9.]/g, '');
  const emp = empRaw ? parseFloat(empRaw) : NaN;
  if (Number.isFinite(emp) && emp > 0) {
    if (emp < 100) return 'SMB';
    if (emp < 1000) return 'Mid-Market';
    return 'Enterprise';
  }
  // 2) revenue — handles bands ("50-100M", "1-5B") and raw dollar numbers
  const rev = String(c.annual_revenue || '').trim();
  if (rev) {
    const band = rev.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*([MB])/i);
    if (band) {
      const lowerM = band[3].toUpperCase() === 'B' ? parseFloat(band[1]) * 1000 : parseFloat(band[1]);
      if (lowerM < 50) return 'SMB';
      if (lowerM < 1000) return 'Mid-Market';
      return 'Enterprise';
    }
    const num = parseFloat(rev.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(num) && num > 0) {
      const dollars = num >= 1e6 ? num : num * 1e6; // bare numbers assumed $M
      if (dollars < 50e6) return 'SMB';
      if (dollars < 1e9) return 'Mid-Market';
      return 'Enterprise';
    }
  }
  return 'Unknown';
}

const emptyTiers = () => ({ 'Enterprise': 0, 'Mid-Market': 0, 'SMB': 0, 'Unknown': 0 });

export default function IndustryBreakdown({ companies = [] }) {
  const [open, setOpen] = useState(null);

  const { sectors, totalClients, totalProspects, maxVal } = useMemo(() => {
    const acc = {};
    let tc = 0, tp = 0;
    for (const c of companies) {
      if (c.type !== 'Customer' && c.type !== 'Prospect') continue;
      const s = sectorOf(c.industry);
      const t = tierOf(c);
      acc[s] = acc[s] || { sector: s, clients: 0, prospects: 0, clientNames: [], prospectNames: [], clientTiers: emptyTiers(), prospectTiers: emptyTiers() };
      if (c.type === 'Customer') { acc[s].clients += 1; acc[s].clientNames.push({ name: c.name || '—', tier: t }); acc[s].clientTiers[t] += 1; tc += 1; }
      else { acc[s].prospects += 1; acc[s].prospectNames.push({ name: c.name || '—', tier: t }); acc[s].prospectTiers[t] += 1; tp += 1; }
    }
    const sortAZ = (a, b) => String(a.name).localeCompare(String(b.name));
    Object.values(acc).forEach((s) => { s.clientNames.sort(sortAZ); s.prospectNames.sort(sortAZ); });
    const list = Object.values(acc).sort((a, b) => (b.clients - a.clients) || (b.prospects - a.prospects));
    const max = list.reduce((m, s) => Math.max(m, s.clients, s.prospects), 1);
    return { sectors: list, totalClients: tc, totalProspects: tp, maxVal: max };
  }, [companies]);

  // One bar = one type (clients / prospects), segmented by tier. Segment width is
  // relative to the global max so bars stay comparable across sectors.
  const TierBar = ({ tiers, total, tag, tagColor }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 52, flex: '0 0 52px', fontSize: 9.5, ...mono, color: tagColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tag}</span>
      <div style={{ position: 'relative', flex: 1, height: 15, background: 'var(--fill-1)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
        {total > 0 && TIERS.map((t) => {
          const cnt = tiers[t] || 0;
          if (!cnt) return null;
          const w = (cnt / maxVal) * 100;
          return (
            <div key={t} title={`${t} · ${cnt}`}
              style={{ width: `${w}%`, minWidth: 2, background: TIER_COLOR[t], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, ...mono, color: '#fff', boxShadow: 'inset -1px 0 0 var(--bg-1)' }}>
              {w > 7 ? cnt : ''}
            </div>
          );
        })}
      </div>
      <span style={{ width: 16, flex: '0 0 16px', textAlign: 'right', fontSize: 10.5, ...mono, color: 'var(--text-2)' }}>{total}</span>
    </div>
  );

  const NameList = ({ label, names, color }) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color, marginBottom: 3 }}>{label} ({names.length})</div>
      {names.length
        ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {names.map((n) => (
              <span key={n.name} style={{ fontSize: 11.5, color: 'var(--text-2)', background: 'var(--fill-1)', borderRadius: 6, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {n.name}
                <span style={{ fontSize: 9, ...mono, color: '#fff', background: TIER_COLOR[n.tier], borderRadius: 4, padding: '1px 4px' }}>{TIER_SHORT[n.tier]}</span>
              </span>
            ))}
          </div>
        : <div style={{ fontSize: 11.5, ...muted }}>none</div>}
    </div>
  );

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Industries · clients vs prospects</div>
          <div style={{ fontSize: 12, ...muted, marginTop: 2 }}>Click a sector to see the accounts. Each bar is split by company size tier (headcount, revenue fallback).</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 14, fontSize: 11.5, ...muted }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--good)' }} />Clients ({totalClients})</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)' }} />Prospects ({totalProspects})</span>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 11, ...muted }}>
            {TIERS.map((t) => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: TIER_COLOR[t] }} />{t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {sectors.map((s) => {
          const isOpen = open === s.sector;
          return (
            <div key={s.sector}>
              <div
                onClick={() => setOpen(isOpen ? null : s.sector)}
                style={{ display: 'grid', gridTemplateColumns: '210px 1fr', alignItems: 'center', gap: 12, cursor: 'pointer', borderRadius: 6, padding: '2px 4px', margin: '0 -4px' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--fill-1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = ''}
              >
                <div style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.sector}>
                  <span style={{ display: 'inline-block', width: 12, ...muted }}>{isOpen ? '▾' : '▸'}</span>{s.sector}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TierBar tiers={s.clientTiers} total={s.clients} tag="Clients" tagColor="var(--good)" />
                  <TierBar tiers={s.prospectTiers} total={s.prospects} tag="Prospects" tagColor="var(--accent)" />
                </div>
              </div>
              {isOpen && (
                <div style={{ margin: '4px 0 8px 12px', padding: '8px 12px', borderLeft: '2px solid var(--sep-strong)' }}>
                  <NameList label="Clients" names={s.clientNames} color="var(--good)" />
                  <NameList label="Prospects" names={s.prospectNames} color="var(--accent)" />
                </div>
              )}
            </div>
          );
        })}
        {sectors.length === 0 && <div style={{ fontSize: 12, ...muted }}>No clients or prospects found.</div>}
      </div>
    </div>
  );
}
