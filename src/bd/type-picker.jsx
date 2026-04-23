import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../supabase';

// Cached list of all distinct company types across the DB.
// Shared module-level cache so the dropdown feels instant after first load
// and reflects newly-created types without a page reload.
let cachedTypes = null;
const cacheListeners = new Set();
function setCachedTypes(list) {
  cachedTypes = list;
  cacheListeners.forEach(fn => fn());
}
async function refreshCachedTypes() {
  const { data } = await supabase.from('companies').select('type').not('type', 'is', null);
  const set = new Set();
  (data || []).forEach(r => {
    const t = (r.type || '').trim();
    if (t) set.add(t);
  });
  setCachedTypes([...set].sort((a, b) => a.localeCompare(b)));
}

// TypePicker — dropdown of distinct company types with a "create new" option.
// Props:
//   value: current type string
//   onSave: async (newValue) => void   — persist to DB
//   compact: true for inline row (hero), false for field-style (details panel)
//   saving: bool — show saving indicator
export default function TypePicker({ value, onSave, compact = false, saving = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState(cachedTypes || []);
  const rootRef = useRef(null);

  useEffect(() => {
    const listener = () => setTypes(cachedTypes || []);
    cacheListeners.add(listener);
    if (!cachedTypes) refreshCachedTypes();
    return () => cacheListeners.delete(listener);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return types.filter(t => !q || t.toLowerCase().includes(q));
  }, [types, query]);

  const exactExists = query.trim() && types.some(t => t.toLowerCase() === query.trim().toLowerCase());

  const pick = async (newValue) => {
    const v = (newValue || '').trim();
    if (!v) return;
    await onSave(v);
    // Add to cache if it's new so the list updates immediately
    if (!types.includes(v)) {
      const next = [...types, v].sort((a, b) => a.localeCompare(b));
      setCachedTypes(next);
    }
    setOpen(false);
    setQuery('');
  };

  const displayStyle = compact
    ? { display: 'inline-flex', alignItems: 'center', padding: '0 4px', borderRadius: 3, cursor: 'pointer', fontSize: 'inherit', color: 'inherit' }
    : { fontSize: 12, color: value ? 'var(--text-1)' : 'var(--text-3)', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', border: '0.5px solid transparent' };

  return (
    <span ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={displayStyle}
        onMouseEnter={e => { if (!compact) e.currentTarget.style.background = 'var(--fill-1)'; }}
        onMouseLeave={e => { if (!compact) e.currentTarget.style.background = 'transparent'; }}
        title="Click to change type">
        {value || '—'}
        {saving && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>…</span>}
        {!compact && <span style={{ color: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)', marginLeft: 4 }}>▾</span>}
      </span>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: 'var(--bg-1)', border: '0.5px solid var(--sep)',
          borderRadius: 6, boxShadow: 'var(--shadow-2)', zIndex: 30,
          minWidth: 200, maxWidth: 260,
        }}>
          <input autoFocus value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && query.trim()) pick(query); }}
            placeholder="Search or create new…"
            style={{
              width: '100%', padding: '6px 10px', borderRadius: 0,
              border: 'none', borderBottom: '0.5px solid var(--sep)',
              background: 'var(--fill-1)', color: 'var(--text-1)', fontSize: 12,
              outline: 'none', boxSizing: 'border-box',
            }} />
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.map(t => (
              <div key={t} onClick={() => pick(t)}
                style={{
                  padding: '6px 10px', cursor: 'pointer', fontSize: 12,
                  color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6,
                  background: t === value ? 'var(--accent-tint)' : 'transparent',
                }}
                onMouseEnter={e => { if (t !== value) e.currentTarget.style.background = 'var(--fill-1)'; }}
                onMouseLeave={e => { if (t !== value) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ flex: 1 }}>{t}</span>
                {t === value && <span style={{ color: 'var(--accent)', fontSize: 10 }}>✓</span>}
              </div>
            ))}
            {query.trim() && !exactExists && (
              <div onClick={() => pick(query)}
                style={{
                  padding: '6px 10px', cursor: 'pointer', fontSize: 12,
                  color: 'var(--accent)', borderTop: filtered.length ? '0.5px solid var(--sep)' : 'none',
                  fontFamily: 'var(--font-mono)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                + Create "{query.trim()}"
              </div>
            )}
            {filtered.length === 0 && !query.trim() && (
              <div style={{ padding: '10px', fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', textAlign: 'center' }}>
                No types yet
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
