import { useEffect, useMemo, useState } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

// Duplicate contacts cleanup modal.
// Groups active contacts by (first_name + last_name + company_name), lets user
// pick the keeper per group. On merge: missing fields are filled in on the keeper
// from the losers, losers are marked inactive with reason='duplicate'.
export default function DuplicateContactsModal({ onClose, onDone }) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  // keeperByGroup[groupKey] = contactId
  const [keeperByGroup, setKeeperByGroup] = useState({});
  // selectedGroups: Set of groupKeys that are checked for processing
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [merging, setMerging] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let all = [];
      for (let page = 0; page < 20; page++) {
        const { data, error } = await supabase
          .from('contacts')
          .select('id,first_name,last_name,full_name,email,company_id,company_name,phone,mobile,title,linkedin_url,country,notes,created_at,inactive_reason')
          .order('id', { ascending: true })
          .range(page * 1000, page * 1000 + 999);
        if (error) { console.error(error); break; }
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 1000) break;
      }
      const active = all.filter(c => !c.inactive_reason);
      // Group
      const byKey = new Map();
      for (const c of active) {
        const fn = (c.first_name || '').trim().toLowerCase();
        const ln = (c.last_name || '').trim().toLowerCase();
        const acc = (c.company_name || '').trim().toLowerCase();
        if (!fn && !ln) continue;
        const key = `${fn}|${ln}|${acc}`;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(c);
      }
      const dups = [...byKey.entries()]
        .filter(([, v]) => v.length > 1)
        .map(([key, rows]) => ({ key, rows: rows.sort((a, b) => scoreContact(b) - scoreContact(a)) }))
        .sort((a, b) => a.rows[0].last_name?.localeCompare(b.rows[0].last_name || '') || 0);

      // Default: pick row with highest score as keeper, select all groups
      const defKeep = {};
      const defSel = new Set();
      for (const g of dups) {
        defKeep[g.key] = g.rows[0].id;
        defSel.add(g.key);
      }
      setGroups(dups);
      setKeeperByGroup(defKeep);
      setSelectedGroups(defSel);
      setLoading(false);
    })();
  }, []);

  const toggleGroup = (key) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const pickKeeper = (groupKey, contactId) => {
    setKeeperByGroup(prev => ({ ...prev, [groupKey]: contactId }));
  };

  const stats = useMemo(() => {
    let toRemove = 0;
    for (const g of groups) {
      if (!selectedGroups.has(g.key)) continue;
      toRemove += g.rows.length - 1;
    }
    return { groups: selectedGroups.size, toRemove };
  }, [groups, selectedGroups]);

  const handleMerge = async () => {
    if (!selectedGroups.size) return;
    setMerging(true);
    let okGroups = 0, okLosers = 0, failed = 0;

    for (const g of groups) {
      if (!selectedGroups.has(g.key)) continue;
      const keeperId = keeperByGroup[g.key];
      const keeper = g.rows.find(r => r.id === keeperId);
      if (!keeper) { failed++; continue; }
      const losers = g.rows.filter(r => r.id !== keeperId);

      // Build patch: fill in fields on keeper that are null/empty, from losers (first one that has value)
      const fillFields = ['email', 'phone', 'mobile', 'title', 'linkedin_url', 'country', 'notes', 'company_id', 'company_name'];
      const patch = {};
      for (const f of fillFields) {
        if (keeper[f]) continue;
        for (const l of losers) {
          if (l[f]) { patch[f] = l[f]; break; }
        }
      }
      if (Object.keys(patch).length) {
        const { error } = await supabase.from('contacts').update(patch).eq('id', keeperId);
        if (error) { console.error('patch keeper err', error); failed++; continue; }
      }
      // Inactivate losers
      for (const l of losers) {
        const { error } = await supabase.from('contacts').update({
          inactive_reason: 'duplicate',
          inactivated_at: new Date().toISOString(),
        }).eq('id', l.id);
        if (error) { console.error('inactivate loser err', error); failed++; }
        else okLosers++;
      }
      okGroups++;
    }

    setDone({ okGroups, okLosers, failed });
    setMerging(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 900, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Duplicate contacts</span>
          <button className="icon-btn tiny" style={{ marginLeft: 'auto' }} onClick={onClose}><I.close /></button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>Analyseren…</div>}

          {!loading && !groups.length && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
              Geen duplicaten gevonden (op voornaam + achternaam + accountnaam).
            </div>
          )}

          {!loading && groups.length > 0 && !done && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {groups.length} groep(en) gevonden · selecteer per groep welke record je wilt houden.
                Ontbrekende velden op de keeper worden aangevuld uit de losers. Losers worden als
                <b> inactive (duplicate)</b> gemarkeerd (niet verwijderd).
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {groups.map((g, gi) => {
                  const checked = selectedGroups.has(g.key);
                  const keeperId = keeperByGroup[g.key];
                  const [fn, ln, acc] = g.key.split('|');
                  return (
                    <div key={g.key} style={{
                      border: '0.5px solid var(--sep)', borderRadius: 8, padding: 10,
                      background: checked ? 'var(--fill-1)' : 'var(--bg-1)',
                      opacity: checked ? 1 : 0.55,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleGroup(g.key)} />
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {gi + 1}. {(fn + ' ' + ln).trim().replace(/\b\w/g, c => c.toUpperCase())}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>@ {acc || '(geen account)'}</div>
                        <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                          {g.rows.length}x → {g.rows.length - 1} op te schonen
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {g.rows.map(r => {
                          const isKeep = r.id === keeperId;
                          return (
                            <label key={r.id} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: 6, borderRadius: 5, cursor: checked ? 'pointer' : 'default',
                              background: isKeep ? 'var(--accent-tint)' : 'transparent',
                              border: isKeep ? '0.5px solid var(--accent)' : '0.5px solid transparent',
                            }}>
                              <input
                                type="radio"
                                disabled={!checked}
                                checked={isKeep}
                                onChange={() => pickKeeper(g.key, r.id)}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                                  <span style={{ fontWeight: 500 }}>{r.full_name || '-'}</span>
                                  <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                                    {r.email || '(geen email)'}
                                  </span>
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {r.title && <span>{r.title}</span>}
                                  {r.phone && <span>☏ {r.phone}</span>}
                                  {r.mobile && <span>📱 {r.mobile}</span>}
                                  {r.country && <span>{r.country}</span>}
                                  <span>created {(r.created_at || '').slice(0, 10)}</span>
                                  <span>id:{r.id.slice(0, 8)}</span>
                                  <span style={{ marginLeft: 'auto' }}>score {scoreContact(r)}</span>
                                </div>
                              </div>
                              {isKeep && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>KEEP</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {done && (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 13 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Klaar ✓</div>
              <div>{done.okGroups} groep(en) verwerkt · {done.okLosers} records op inactive gezet{done.failed ? ` · ${done.failed} fout` : ''}.</div>
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', alignSelf: 'center' }}>
            {!done && !loading && groups.length > 0 && `${stats.groups} groep(en) · ${stats.toRemove} op te schonen`}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={onClose}>{done ? 'Sluiten' : 'Annuleren'}</button>
            {!done && groups.length > 0 && (
              <button className="btn-primary" onClick={handleMerge} disabled={merging || !selectedGroups.size}>
                {merging ? 'Verwerken…' : `Merge ${stats.groups} groep(en)`}
              </button>
            )}
            {done && (
              <button className="btn-primary" onClick={() => { if (onDone) onDone(); onClose(); }}>
                Herlaad
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Heuristic: more filled fields = better record, email with dot-name preferred over cryptic
function scoreContact(c) {
  let s = 0;
  if (c.email) s += 5;
  if (c.email && /^[a-z]+\.[a-z]+@/i.test(c.email)) s += 3; // prefer firstname.lastname@
  if (c.phone) s += 2;
  if (c.mobile) s += 2;
  if (c.title) s += 2;
  if (c.linkedin_url) s += 2;
  if (c.country) s += 1;
  if (c.notes) s += 1;
  if (c.company_id) s += 1;
  return s;
}
