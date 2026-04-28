import { useEffect, useMemo, useState } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

// Bulk-link unlinked leads/opps to existing accounts based on text matching
// in title + notes + description. User reviews/unchecks before applying.
const STOPWORDS = new Set(['inc','llc','ltd','bv','sa','ag','plc','nv','co','corp','group','company','holding','holdings','international','global','solutions','services','technologies','technology','software','systems','consulting','advisory','the','and','for']);

function wordsFor(name) {
  // Split AND strip regex-special chars, otherwise account names with
  // '(' / '[' / '|' build invalid regexes and crash the search.
  return (name || '').toLowerCase()
    .split(/[\s\-,&/()[\]]+/)
    .map(w => w.replace(/[\\^$.*+?()[\]{}|]/g, ''))
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));
}

function findMatch(text, accounts) {
  if (!text || !text.trim()) return null;
  const candidates = [];
  for (const a of accounts) {
    const ws = wordsFor(a.name);
    if (!ws.length) continue;
    const hits = ws.filter(w => {
      try { return new RegExp(`\\b${w}\\b`).test(text); }
      catch { return false; }
    });
    if (!hits.length) continue;
    const score = hits.length / ws.length;
    if (score >= 0.5 || (ws.length === 1 && hits.length === 1)) {
      candidates.push({ score, len: (a.name || '').length, account: a });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => (b.score - a.score) || (b.len - a.len));
  return candidates[0].account;
}

export default function BulkLinkDealsModal({ accounts, onClose, onDone }) {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]); // [{ table, id, title, notes, suggested, override }]
  const [selected, setSelected] = useState(new Set());
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [leadsRes, oppsRes] = await Promise.all([
        supabase.from('leads').select('id,full_name,topic,notes,description,company_id,stage').is('company_id', null).limit(2000),
        supabase.from('opportunities').select('id,topic,full_name,notes,description,company_id,stage,sub_status').is('company_id', null).limit(2000),
      ]);
      const leadsRaw = leadsRes.data || [];
      const oppsRaw  = oppsRes.data  || [];

      const buildRow = (d, table) => {
        const title = d.topic || d.full_name || '(untitled)';
        const text  = `${title} ${d.notes || ''} ${d.description || ''}`.toLowerCase();
        const sug   = findMatch(text, accounts || []);
        return sug ? {
          table, id: d.id, title, stage: d.stage,
          suggested: sug, override: sug.id,
          notesPreview: ((d.notes || d.description || '').slice(0, 140)).replace(/\s+/g, ' ').trim(),
        } : null;
      };

      const all = [
        ...leadsRaw.map(d => buildRow(d, 'leads')),
        ...oppsRaw.map(d  => buildRow(d, 'opportunities')),
      ].filter(Boolean);
      // Default: all selected
      setMatches(all);
      setSelected(new Set(all.map(m => m.table + ':' + m.id)));
      setLoading(false);
    })();
  }, [accounts]);

  const filteredAccounts = useMemo(() => accounts || [], [accounts]);

  const toggle = (key) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const setOverride = (key, accId) => {
    setMatches(prev => prev.map(m => (m.table + ':' + m.id === key) ? { ...m, override: accId } : m));
  };

  const apply = async () => {
    setApplying(true);
    let ok = 0, fail = 0;
    for (const m of matches) {
      const key = m.table + ':' + m.id;
      if (!selected.has(key)) continue;
      if (!m.override) continue;
      const { error } = await supabase.from(m.table).update({ company_id: m.override }).eq('id', m.id);
      if (error) { console.error(error); fail++; } else ok++;
    }
    setDone({ ok, fail });
    setApplying(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 920, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Bulk-link unlinked deals to accounts</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>Analyseren…</div>}
          {!loading && !done && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                Gevonden suggesties op basis van titel + notes. Vink uit wat je niet wilt; gebruik de dropdown om een ander account te kiezen.
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {matches.length === 0 && (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
                    Geen suggesties gevonden voor unlinked deals.
                  </div>
                )}
                {matches.map(m => {
                  const key = m.table + ':' + m.id;
                  const checked = selected.has(key);
                  return (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: 8, border: '0.5px solid var(--sep)', borderRadius: 6,
                      background: checked ? 'var(--fill-1)' : 'transparent',
                      opacity: checked ? 1 : 0.5,
                    }}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(key)} style={{ marginTop: 4 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {m.table === 'leads' ? 'lead' : 'opp'} · {m.stage}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{m.title}</span>
                        </div>
                        {m.notesPreview && (
                          <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.notesPreview}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: '0 0 280px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>→</span>
                        <select value={m.override || ''} onChange={e => setOverride(key, e.target.value)}
                          disabled={!checked}
                          style={{
                            flex: 1, padding: '4px 6px', borderRadius: 4,
                            border: '0.5px solid var(--sep)', background: 'var(--bg-1)',
                            color: 'var(--text-1)', fontSize: 12, fontFamily: 'var(--font)', outline: 'none',
                          }}>
                          <option value="">— pick account —</option>
                          {filteredAccounts.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {done && (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Klaar ✓</div>
              <div style={{ fontSize: 12 }}>{done.ok} deals gekoppeld{done.fail ? ` · ${done.fail} fout` : ''}.</div>
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <div style={{ marginRight: 'auto', fontSize: 11, color: 'var(--text-3)' }}>
            {!loading && !done && matches.length > 0 && `${selected.size} van ${matches.length} geselecteerd`}
          </div>
          <button className="btn-ghost" onClick={onClose}>{done ? 'Sluiten' : 'Annuleren'}</button>
          {!done && matches.length > 0 && (
            <button className="btn-primary" onClick={apply} disabled={applying || !selected.size}>
              {applying ? 'Bezig…' : `Link ${selected.size} deal(s)`}
            </button>
          )}
          {done && (
            <button className="btn-primary" onClick={() => { if (onDone) onDone(); onClose(); }}>Herlaad</button>
          )}
        </div>
      </div>
    </div>
  );
}
