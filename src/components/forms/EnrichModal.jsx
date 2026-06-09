import { useState, useMemo } from 'react';
import { getInitials, avatarColorFromName } from '../../lib/constants';
import Avatar from '../atoms/Avatar';
import { apiFetch } from '../../lib/apiFetch';

// Unipile rate-limit guard — at most 80 enrich calls per modal run, leaving
// 20 of the daily 100 budget for everything else.
const ENRICH_BATCH_CAP = 80;
// Spacing between calls (ms). Unipile recommends randomizing during work hours;
// we keep it simple with a fixed gap that's gentle on the LinkedIn account.
const ENRICH_DELAY_MS = 2000;

export default function EnrichModal({ open, onClose, accounts, refetch }) {
  const [selected, setSelected] = useState(new Set());
  const [enriching, setEnriching] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [search, setSearch] = useState('');

  if (!open) return null;

  // Only LinkedIn-URL companies can be enriched via Unipile
  const enrichableCompanies = accounts.filter(a => a.linkedin_url);

  const items = enrichableCompanies.filter(a => {
    if (!search) return true;
    const t = search.toLowerCase();
    return a.name?.toLowerCase().includes(t) || (a.industry || '').toLowerCase().includes(t);
  });

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.id)));
    }
  };

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const formatDate = (d) => {
    if (!d) return 'Never';
    const date = new Date(d);
    const now = new Date();
    const days = Math.floor((now - date) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return date.toLocaleDateString('en', { day: 'numeric', month: 'short' });
  };

  const staleness = (d) => {
    if (!d) return '#B4B2A9';
    const days = Math.floor((new Date() - new Date(d)) / 86400000);
    if (days <= 7) return '#1D9E75';
    if (days <= 30) return '#EF9F27';
    return '#D85A30';
  };

  const handleEnrich = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected).slice(0, ENRICH_BATCH_CAP);
    const skipped = selected.size - ids.length;
    setEnriching(true);
    setResult(null);
    setProgress({ done: 0, total: ids.length });

    let succeeded = 0;
    let failed = 0;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const acc = accounts.find(a => a.id === id);
      if (!acc?.linkedin_url) { failed++; setProgress({ done: i + 1, total: ids.length }); continue; }
      try {
        const resp = await apiFetch('/api/unipile?action=enrich-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: id, linkedin_url: acc.linkedin_url }),
        });
        const data = await resp.json();
        if (data.success) succeeded++; else failed++;
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: ids.length });
      if (i < ids.length - 1) await new Promise(r => setTimeout(r, ENRICH_DELAY_MS));
    }

    setResult({ success: true, count: succeeded, failed, skipped, done: true });
    if (refetch) refetch();
    setEnriching(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 0, width: 620, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>🏢 Enrich companies via LinkedIn</div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#888780" }}>×</button>
          </div>
          <div style={{ fontSize: 11, color: "#888780", marginBottom: 12 }}>
            Pulls company name, industry, description, employee count, address and more from LinkedIn for the selected accounts. Limit: {ENRICH_BATCH_CAP} per run.
          </div>

          {/* Search + Select all */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
            <button onClick={toggleAll}
              style={{ padding: "6px 12px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 11, cursor: "pointer", background: "#fff", color: "#888780", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {selected.size === items.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          {/* Column headers */}
          <div style={{ display: "flex", padding: "0 0 6px", borderBottom: "0.5px solid #D3D1C7", fontSize: 10, fontWeight: 500, color: "#888780", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <div style={{ width: 28 }}></div>
            <div style={{ flex: 1 }}>Name</div>
            <div style={{ width: 180 }}>Industry</div>
            <div style={{ width: 90, textAlign: "center" }}>Last enriched</div>
            <div style={{ width: 60, textAlign: "center" }}>LinkedIn</div>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
          {items.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#888780", fontSize: 12 }}>
              {search ? 'No results' : 'No enrichable items (LinkedIn URL or name+company required)'}
            </div>
          ) : items.map(item => {
            const isSelected = selected.has(item.id);
            const enrichDate = item.last_enriched_at;
            return (
              <div key={item.id} onClick={() => toggle(item.id)}
                style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid #F1EFE8", cursor: "pointer", background: isSelected ? "#F0F7FF" : "transparent" }}>
                <div style={{ width: 28, flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `0.5px solid ${isSelected ? "#378ADD" : "#B4B2A9"}`, background: isSelected ? "#378ADD" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isSelected && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                </div>
                <div style={{ width: 180, fontSize: 11, color: "#888780", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.industry || ''}
                </div>
                <div style={{ width: 90, textAlign: "center" }}>
                  <span style={{ fontSize: 10, color: staleness(enrichDate), fontWeight: 500 }}>
                    {formatDate(enrichDate)}
                  </span>
                </div>
                <div style={{ width: 60, textAlign: "center" }}>
                  <span style={{ fontSize: 10, color: "#1D9E75" }}>✓</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: "0.5px solid #D3D1C7", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: "#888780" }}>
            {enriching
              ? `⟳ ${progress.done}/${progress.total} processed`
              : `${selected.size} selected${selected.size > ENRICH_BATCH_CAP ? ` · only first ${ENRICH_BATCH_CAP} will run` : ''}`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {result && result.done && (
              <span style={{ fontSize: 11, color: "#1D9E75", alignSelf: "center" }}>
                ✓ {result.count} updated
                {result.failed ? `, ${result.failed} failed` : ''}
                {result.skipped ? `, ${result.skipped} skipped (cap)` : ''}
              </span>
            )}
            <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 7, border: "0.5px solid #D3D1C7", fontSize: 12, cursor: "pointer", background: "#fff", color: "#2C2C2A", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleEnrich} disabled={enriching || selected.size === 0}
              style={{ padding: "7px 16px", borderRadius: 7, border: "none", fontSize: 12, cursor: selected.size > 0 ? "pointer" : "not-allowed", background: selected.size > 0 ? "#042C53" : "#D3D1C7", color: selected.size > 0 ? "#B5D4F4" : "#888780", fontFamily: "inherit", fontWeight: 500 }}>
              {enriching ? '⟳ Processing…' : `🏢 Enrich ${selected.size} compan${selected.size !== 1 ? 'ies' : 'y'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
