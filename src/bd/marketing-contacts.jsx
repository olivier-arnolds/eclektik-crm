import { useState, useMemo } from 'react';
import TagChip from './tag-chip';

// Marketing → Contacts tab
// Props: contacts, accounts, deals, allTags, refetch
// Layout: filter sidebar (left, ~260px) + list (right, fills)
export default function MarketingContacts({ contacts, accounts, deals, allTags, refetch }) {
  const [selectedTagIds, setSelectedTagIds] = useState(new Set());
  const [hasGlintDeal, setHasGlintDeal] = useState(false);
  const [hasAnyDeal, setHasAnyDeal] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);

  // Per-tag count: how many contacts carry tag X
  const tagCounts = useMemo(() => {
    const counts = new Map();
    for (const c of contacts) {
      for (const t of (c.tags || [])) counts.set(t.id, (counts.get(t.id) || 0) + 1);
    }
    return counts;
  }, [contacts]);

  // accountIds with at least one Glint deal (for the "has Glint deal" filter)
  const accountsWithGlintDeal = useMemo(() => {
    const set = new Set();
    for (const d of deals) if (d.dealType === 'Glint' && d.accountId) set.add(d.accountId);
    return set;
  }, [deals]);
  const accountsWithAnyDeal = useMemo(() => {
    const set = new Set();
    for (const d of deals) if (d.accountId) set.add(d.accountId);
    return set;
  }, [deals]);

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      if (activeOnly && c.isFormer) return false;
      if (hasEmail && !c.email) return false;
      if (hasGlintDeal && !accountsWithGlintDeal.has(c.accountId)) return false;
      if (hasAnyDeal && !accountsWithAnyDeal.has(c.accountId)) return false;
      if (selectedTagIds.size > 0) {
        const ids = (c.tags || []).map(t => t.id);
        if (!ids.some(id => selectedTagIds.has(id))) return false;
      }
      return true;
    });
  }, [contacts, activeOnly, hasEmail, hasGlintDeal, hasAnyDeal, accountsWithGlintDeal, accountsWithAnyDeal, selectedTagIds]);

  const toggleTagFilter = (tagId) => {
    const next = new Set(selectedTagIds);
    if (next.has(tagId)) next.delete(tagId); else next.add(tagId);
    setSelectedTagIds(next);
  };

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Filter sidebar */}
      <aside style={{ flex: '0 0 240px', background: 'var(--bg-1)', padding: 12, border: '0.5px solid var(--sep)', borderRadius: 8, alignSelf: 'flex-start' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Tags</div>
        {(allTags || []).map(t => (
          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
            <input type="checkbox" checked={selectedTagIds.has(t.id)} onChange={() => toggleTagFilter(t.id)} />
            <TagChip tag={t} small />
            <span style={{ color: 'var(--text-3)', marginLeft: 'auto', fontSize: 10 }}>({tagCounts.get(t.id) || 0})</span>
          </label>
        ))}

        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 6px' }}>Deals</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={hasGlintDeal} onChange={() => setHasGlintDeal(v => !v)} />
          Has Glint deal
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={hasAnyDeal} onChange={() => setHasAnyDeal(v => !v)} />
          Has any deal
        </label>

        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 6px' }}>Status</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={hasEmail} onChange={() => setHasEmail(v => !v)} />
          Has email
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={activeOnly} onChange={() => setActiveOnly(v => !v)} />
          Active only
        </label>
      </aside>

      {/* Contact list */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
          {filtered.length} of {contacts.length} contacts
        </div>
        <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '0.5px solid var(--sep)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.role}{c.account ? ` · ${c.account}` : ''}</div>
              </div>
              {(c.tags || []).length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(c.tags || []).map(t => <TagChip key={t.id} tag={t} small />)}
                </div>
              )}
              <span style={{ fontSize: 10, color: c.email ? 'var(--good)' : 'var(--text-4)', minWidth: 18, textAlign: 'center' }}>
                {c.email ? '✉' : '—'}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
              No contacts match the current filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
