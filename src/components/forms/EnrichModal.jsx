import { useState, useMemo } from 'react';
import { getInitials, avatarColorFromName } from '../../lib/constants';
import Avatar from '../atoms/Avatar';

export default function EnrichModal({ open, onClose, contacts, accounts, refetch }) {
  const [selected, setSelected] = useState(new Set());
  const [enriching, setEnriching] = useState(false);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState('contacts');
  const [search, setSearch] = useState('');

  if (!open) return null;

  const enrichableContacts = contacts.filter(c => c.linkedin_url || (c.name && c.company_name));
  const enrichableCompanies = accounts.filter(a => a.linkedin_url || a.website || a.name);

  const filteredContacts = enrichableContacts.filter(c => {
    if (!search) return true;
    const t = search.toLowerCase();
    return c.name?.toLowerCase().includes(t) || c.email?.toLowerCase().includes(t) || (c.company_name || '').toLowerCase().includes(t);
  });

  const filteredCompanies = enrichableCompanies.filter(a => {
    if (!search) return true;
    const t = search.toLowerCase();
    return a.name?.toLowerCase().includes(t) || (a.industry || '').toLowerCase().includes(t);
  });

  const items = tab === 'contacts' ? filteredContacts : filteredCompanies;

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
    setEnriching(true);
    setResult(null);
    try {
      // Step 1: Start enrichment
      const resp = await fetch('/api/surfe-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab, ids: Array.from(selected) }),
      });
      const data = await resp.json();

      if (data.surfeResponse?.enrichmentID) {
        // Step 2: Poll for results (try 5 times, 3s apart)
        setResult({ success: true, count: data.count, polling: true });
        const enrichmentID = data.surfeResponse.enrichmentID;
        const enrichType = tab === 'companies' ? 'companies' : 'contacts';

        for (let i = 0; i < 5; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const pollResp = await fetch(`/api/surfe-poll?enrichmentID=${enrichmentID}&type=${enrichType}`);
          const pollData = await pollResp.json();
          if (pollData.success && pollData.updated > 0) {
            setResult({ success: true, count: pollData.updated, done: true });
            if (refetch) refetch();
            break;
          }
          if (i === 4) {
            setResult({ success: true, count: data.count, done: true });
            if (refetch) refetch();
          }
        }
      } else {
        setResult({ success: true, count: data.count || selected.size });
        if (refetch) refetch();
      }
    } catch (e) {
      setResult({ success: false, error: e.message });
    }
    setEnriching(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 0, width: 620, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{tab === 'contacts' ? '◈ Enrich contacts via Surfe' : '🏢 Enrich companies via Surfe'}</div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#888780" }}>×</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            <button onClick={() => { setTab('contacts'); setSelected(new Set()); }}
              style={{ padding: "5px 12px", borderRadius: 6, border: "0.5px solid", borderColor: tab === 'contacts' ? "#185FA5" : "#D3D1C7", background: tab === 'contacts' ? "#E6F1FB" : "transparent", color: tab === 'contacts' ? "#0C447C" : "#888780", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
              Contacts ({enrichableContacts.length})
            </button>
            <button onClick={() => { setTab('companies'); setSelected(new Set()); }}
              style={{ padding: "5px 12px", borderRadius: 6, border: "0.5px solid", borderColor: tab === 'companies' ? "#185FA5" : "#D3D1C7", background: tab === 'companies' ? "#E6F1FB" : "transparent", color: tab === 'companies' ? "#0C447C" : "#888780", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
              Companies ({enrichableCompanies.length})
            </button>
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
            <div style={{ width: 140 }}>{tab === 'contacts' ? 'Company' : 'Industry'}</div>
            <div style={{ width: 90, textAlign: "center" }}>Last enriched</div>
            <div style={{ width: 60, textAlign: "center" }}>Email</div>
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
            const isContact = tab === 'contacts';
            const isSelected = selected.has(item.id);
            const enrichDate = item.last_enriched_at;
            const hasEmail = isContact ? !!item.email : !!item.email;
            const hasLinkedin = !!item.linkedin_url;

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
                  {isContact && <div style={{ fontSize: 10, color: "#888780" }}>{item.role}</div>}
                </div>
                <div style={{ width: 140, fontSize: 11, color: "#888780", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isContact ? (item.company_name || '') : (item.industry || '')}
                </div>
                <div style={{ width: 90, textAlign: "center" }}>
                  <span style={{ fontSize: 10, color: staleness(enrichDate), fontWeight: 500 }}>
                    {formatDate(enrichDate)}
                  </span>
                </div>
                <div style={{ width: 60, textAlign: "center" }}>
                  {hasEmail
                    ? <span style={{ fontSize: 10, color: "#1D9E75" }}>✓</span>
                    : <span style={{ fontSize: 10, color: "#B4B2A9" }}>—</span>
                  }
                </div>
                <div style={{ width: 60, textAlign: "center" }}>
                  {hasLinkedin
                    ? <span style={{ fontSize: 10, color: "#1D9E75" }}>✓</span>
                    : <span style={{ fontSize: 10, color: "#B4B2A9" }}>—</span>
                  }
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: "0.5px solid #D3D1C7", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: "#888780" }}>
            {selected.size} selected · {selected.size} credit{selected.size !== 1 ? 's' : ''} needed
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {result && (
              <span style={{ fontSize: 11, color: result.success ? "#1D9E75" : "#dc2626", alignSelf: "center" }}>
                {result.success
                  ? (result.polling && !result.done ? `⟳ Enriching ${result.count}, fetching...` : `✓ ${result.count} updated`)
                  : `✗ ${result.error}`}
              </span>
            )}
            <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 7, border: "0.5px solid #D3D1C7", fontSize: 12, cursor: "pointer", background: "#fff", color: "#2C2C2A", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleEnrich} disabled={enriching || selected.size === 0}
              style={{ padding: "7px 16px", borderRadius: 7, border: "none", fontSize: 12, cursor: selected.size > 0 ? "pointer" : "not-allowed", background: selected.size > 0 ? "#042C53" : "#D3D1C7", color: selected.size > 0 ? "#B5D4F4" : "#888780", fontFamily: "inherit", fontWeight: 500 }}>
              {enriching ? '⟳ Processing...' : tab === 'contacts' ? `◈ Enrich ${selected.size} contact${selected.size !== 1 ? 's' : ''}` : `🏢 Enrich ${selected.size} compan${selected.size !== 1 ? 'ies' : 'y'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
