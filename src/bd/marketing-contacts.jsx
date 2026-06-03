import { useState, useMemo } from 'react';
import TagChip from './tag-chip';
import BulkTagModal from './marketing-bulk-tag-modal';
import { useAuth } from '../lib/auth';
import { supabase } from '../supabase';

// CSV escaping: wrap in double-quotes, double-up internal quotes.
// Excel-compatible — newlines / commas / quotes inside fields preserved.
function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportContactsToCSV(contacts) {
  const headers = ['Full name', 'Email', 'Phone', 'Company', 'Role', 'LinkedIn URL', 'Tags'];
  const rows = contacts.map(c => [
    c.name || '',
    c.email || '',
    c.phone || '',
    c.account || '',
    c.role || '',
    c.linkedin_url || '',
    (c.tags || []).map(t => t.name || t.label || '').filter(Boolean).join(', '),
  ]);
  const csv = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\r\n');
  // Prepend BOM so Excel detects UTF-8 (otherwise é/ü etc. show as garbled)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const a = document.createElement('a');
  a.href = url;
  a.download = `contacts-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Marketing → Contacts tab
// Props: contacts, accounts, deals, allTags, refetch
// Layout: filter sidebar (left, ~260px) + list (right, fills)
export default function MarketingContacts({ contacts, accounts, deals, allTags, refetch, onComposeCampaign }) {
  const [selectedTagIds, setSelectedTagIds] = useState(new Set());
  const [selectedAccountTypes, setSelectedAccountTypes] = useState(new Set());
  const [searchText, setSearchText] = useState('');
  const [hasGlintDeal, setHasGlintDeal] = useState(false);
  const [hasAnyDeal, setHasAnyDeal] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [noEmail, setNoEmail] = useState(false);
  const [editingEmailId, setEditingEmailId] = useState(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [extraStatuses, setExtraStatuses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('marketing_extra_statuses') || '[]'); }
    catch { return []; }
  });
  const [optOutOverrides, setOptOutOverrides] = useState({}); // { [contactId]: boolean } — local optimistic state
  const [savingEmail, setSavingEmail] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [showBulkTag, setShowBulkTag] = useState(false);
  // Optimistic-removed (contact_id:tag_id) pairs — see removeTagFromContact
  const [hiddenPairs, setHiddenPairs] = useState(new Set());
  const isHidden = (contactId, tagId) => hiddenPairs.has(`${contactId}:${tagId}`);
  const { session } = useAuth();
  const userEmail = session?.user?.email || '';

  // Quick lookup: account.id → account.type
  const accountTypeById = useMemo(() => {
    const m = new Map();
    for (const a of (accounts || [])) m.set(a.id, a.type || '');
    return m;
  }, [accounts]);

  // Unique account types present in the data, sorted
  const accountTypes = useMemo(() => {
    const set = new Set();
    for (const a of (accounts || [])) if (a.type) set.add(a.type);
    for (const t of extraStatuses) set.add(t);
    return [...set].sort();
  }, [accounts, extraStatuses]);

  async function createTag() {
    const name = newTagName.trim();
    if (!name) return;
    const palette = ['#fef3c7', '#dbeafe', '#fce7f3', '#dcfce7', '#fde68a', '#e0e7ff'];
    const bg = palette[Math.floor(Math.random() * palette.length)];
    const { error } = await supabase.from('tags').insert({ name, color: bg });
    if (!error) {
      setNewTagName('');
      setShowAddTag(false);
      if (refetch) refetch();
    } else {
      alert('Tag aanmaken mislukt: ' + error.message);
    }
  }

  function addAccountStatus() {
    const name = newStatusName.trim();
    if (!name) return;
    const next = [...new Set([...extraStatuses, name])];
    setExtraStatuses(next);
    localStorage.setItem('marketing_extra_statuses', JSON.stringify(next));
    setNewStatusName('');
    setShowAddStatus(false);
  }

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
    const q = searchText.trim().toLowerCase();
    const matches = contacts.filter(c => {
      if (activeOnly && c.isFormer) return false;
      if (hasEmail && !c.email) return false;
      if (noEmail && c.email) return false;
      if (hasGlintDeal && !accountsWithGlintDeal.has(c.accountId)) return false;
      if (hasAnyDeal && !accountsWithAnyDeal.has(c.accountId)) return false;
      if (selectedTagIds.size > 0) {
        const ids = (c.tags || []).filter(t => !hiddenPairs.has(`${c.id}:${t.id}`)).map(t => t.id);
        if (!ids.some(id => selectedTagIds.has(id))) return false;
      }
      if (selectedAccountTypes.size > 0) {
        const t = accountTypeById.get(c.accountId);
        if (!t || !selectedAccountTypes.has(t)) return false;
      }
      if (q) {
        const hay = [c.name, c.role, c.account, c.email].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Sort by company A-Z, then by contact name as tiebreaker.
    // Contacts without an account land at the bottom.
    return matches.slice().sort((a, b) => {
      const acoEmpty = !a.account;
      const bcoEmpty = !b.account;
      if (acoEmpty !== bcoEmpty) return acoEmpty ? 1 : -1;
      const cmp = (a.account || '').toLowerCase().localeCompare((b.account || '').toLowerCase());
      if (cmp !== 0) return cmp;
      return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
    });
  }, [contacts, activeOnly, hasEmail, noEmail, hasGlintDeal, hasAnyDeal, accountsWithGlintDeal, accountsWithAnyDeal, selectedTagIds, selectedAccountTypes, accountTypeById, searchText, hiddenPairs]);

  // Inline email edit — optimistic-free: save then refetch so the parent
  // cache stays the single source of truth.
  const saveEmail = async (contact) => {
    if (savingEmail) return;
    const val = emailDraft.trim();
    if (val === (contact.email || '')) { setEditingEmailId(null); return; }
    setSavingEmail(true);
    const { error } = await supabase
      .from('contacts')
      .update({ email: val || null })
      .eq('id', contact.id);
    setSavingEmail(false);
    if (error) { alert('Failed to save email: ' + error.message); return; }
    setEditingEmailId(null);
    if (refetch) refetch();
  };

  const [selected, setSelected] = useState(new Set());

  const toggleTagFilter = (tagId) => {
    const next = new Set(selectedTagIds);
    if (next.has(tagId)) next.delete(tagId); else next.add(tagId);
    setSelectedTagIds(next);
  };

  const toggleAccountType = (type) => {
    const next = new Set(selectedAccountTypes);
    if (next.has(type)) next.delete(type); else next.add(type);
    setSelectedAccountTypes(next);
  };

  // Optimistic removal: hide the chip locally immediately, then delete the
  // row in the background. No confirm prompt and no full refetch — both
  // would jolt the list and clear the user's checkbox/selection focus.
  // On the next genuine refetch (e.g. browser reload, or an action that
  // does refresh), the cache catches up automatically.
  const removeTagFromContact = async (contact, tag) => {
    const key = `${contact.id}:${tag.id}`;
    setHiddenPairs(prev => new Set(prev).add(key));
    const { error } = await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contact.id)
      .eq('tag_id', tag.id);
    if (error) {
      setHiddenPairs(prev => { const n = new Set(prev); n.delete(key); return n; });
      alert('Failed: ' + error.message);
    }
  };

  const toggleRow = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(c => c.id)));
    }
  };

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Filter sidebar — sticky tijdens scroll */}
      <aside style={{
        flex: '0 0 240px',
        background: 'var(--bg-1)',
        padding: 12,
        border: '0.5px solid var(--sep)',
        borderRadius: 8,
        alignSelf: 'flex-start',
        position: 'sticky',
        top: 0,
        maxHeight: 'calc(100vh - 80px)',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tags</div>
          <button onClick={() => setShowAddTag(v => !v)}
            title="Nieuwe tag toevoegen"
            style={{ background:'transparent', border:'0.5px solid var(--sep)', borderRadius:3, cursor:'pointer', fontSize:11, padding:'0 5px', lineHeight:'14px', color:'var(--text-3)' }}>
            +
          </button>
        </div>
        {showAddTag && (
          <div style={{ display:'flex', gap:4, marginBottom:6 }}>
            <input type="text" value={newTagName} autoFocus
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createTag(); if (e.key === 'Escape') { setShowAddTag(false); setNewTagName(''); } }}
              placeholder="Tag naam..."
              style={{ flex:1, padding:'3px 6px', fontSize:11, border:'0.5px solid var(--sep)', borderRadius:3, background:'var(--bg-0)', fontFamily:'inherit' }} />
            <button onClick={createTag}
              style={{ padding:'3px 8px', fontSize:11, background:'var(--accent)', color:'#fff', border:'none', borderRadius:3, cursor:'pointer' }}>OK</button>
          </div>
        )}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '12px 0 6px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Account status</div>
          <button onClick={() => setShowAddStatus(v => !v)}
            title="Nieuwe status toevoegen (lokaal — wordt zichtbaar als filter; wijs toe via account-detail om te persisten in DB)"
            style={{ background:'transparent', border:'0.5px solid var(--sep)', borderRadius:3, cursor:'pointer', fontSize:11, padding:'0 5px', lineHeight:'14px', color:'var(--text-3)' }}>
            +
          </button>
        </div>
        {showAddStatus && (
          <div style={{ display:'flex', gap:4, marginBottom:6 }}>
            <input type="text" value={newStatusName} autoFocus
              onChange={e => setNewStatusName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addAccountStatus(); if (e.key === 'Escape') { setShowAddStatus(false); setNewStatusName(''); } }}
              placeholder="Status naam..."
              style={{ flex:1, padding:'3px 6px', fontSize:11, border:'0.5px solid var(--sep)', borderRadius:3, background:'var(--bg-0)', fontFamily:'inherit' }} />
            <button onClick={addAccountStatus}
              style={{ padding:'3px 8px', fontSize:11, background:'var(--accent)', color:'#fff', border:'none', borderRadius:3, cursor:'pointer' }}>OK</button>
          </div>
        )}
        {accountTypes.length > 0 && (
          <>
            {accountTypes.map(type => (
              <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedAccountTypes.has(type)} onChange={() => toggleAccountType(type)} />
                {type}
              </label>
            ))}
          </>
        )}

        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 6px' }}>Status</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={hasEmail} onChange={() => { setHasEmail(v => !v); if (!hasEmail) setNoEmail(false); }} />
          Has email
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={noEmail} onChange={() => { setNoEmail(v => !v); if (!noEmail) setHasEmail(false); }} />
          Without email
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={activeOnly} onChange={() => setActiveOnly(v => !v)} />
          Active only
        </label>
      </aside>

      {/* Contact list */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'var(--bg-0, #fafafa)',
          zIndex: 5,
          paddingBottom: 4,
          marginBottom: 4,
        }}>
        <div style={{ marginBottom: 8 }}>
          <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
            placeholder="Search by name, role, account, or email…"
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: '0.5px solid var(--sep)', background: 'var(--bg-1)',
              fontSize: 13, fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box',
            }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)', cursor: 'pointer' }}>
            <input type="checkbox"
              checked={selected.size > 0 && selected.size === filtered.length}
              ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < filtered.length; }}
              onChange={toggleAll} />
            Select all
          </label>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {filtered.length} of {contacts.length} contacts
            {selected.size > 0 && ` · ${selected.size} selected`}
          </span>
          <button className="btn-ghost tiny"
            style={{ marginLeft: 'auto' }}
            disabled={filtered.length === 0}
            title={selected.size > 0
              ? `Export ${selected.size} selected contact${selected.size === 1 ? '' : 's'} as CSV`
              : `Export ${filtered.length} visible contact${filtered.length === 1 ? '' : 's'} as CSV`}
            onClick={() => {
              const subset = selected.size > 0
                ? filtered.filter(c => selected.has(c.id))
                : filtered;
              exportContactsToCSV(subset);
            }}>
            📥 Export CSV ({selected.size > 0 ? selected.size : filtered.length})
          </button>
        </div>
        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--accent-tint)', borderRadius: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{selected.size} selected</span>
            <button className="btn-primary tiny" onClick={() => setShowBulkTag(true)}>
              Tag selected
            </button>
            <button className="btn-primary tiny" disabled={!onComposeCampaign}
              onClick={() => {
                if (!onComposeCampaign) return;
                const isBlocked = (c) => optOutOverrides[c.id] !== undefined ? optOutOverrides[c.id] : !!c.do_not_email;
                const eligible = filtered.filter(c => selected.has(c.id) && !isBlocked(c));
                const optedOut = selected.size - eligible.length;
                if (optedOut > 0 && !confirm(`${optedOut} geselecteerde contact${optedOut === 1 ? '' : 'en'} ${optedOut === 1 ? 'staat' : 'staan'} op opt-out (🚫). Ga je door met de overige ${eligible.length}?`)) {
                  return;
                }
                onComposeCampaign(eligible);
              }}>
              Send campaign to {selected.size}
            </button>
            <button className="btn-ghost tiny" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
        )}
        </div>{/* end sticky top-toolbar */}
        <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8 }}>
          {filtered.map(c => (
            <div key={c.id}
              onClick={() => toggleRow(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderBottom: '0.5px solid var(--sep)',
                cursor: 'pointer',
                background: selected.has(c.id) ? 'var(--accent-tint)' : 'transparent',
              }}>
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggleRow(c.id)}
                onClick={e => e.stopPropagation()}
                style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.role}{c.account ? ` · ${c.account}` : ''}</div>
              </div>
              {(() => {
                const visibleTags = (c.tags || []).filter(t => !isHidden(c.id, t.id));
                if (visibleTags.length === 0) return null;
                return (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {visibleTags.map(t => (
                      <TagChip key={t.id} tag={t} small
                        onClick={(tag) => removeTagFromContact(c, tag)} />
                    ))}
                  </div>
                );
              })()}
              {(() => {
                // Effective state: local override wint van DB-state.
                const effective = optOutOverrides[c.id] !== undefined ? optOutOverrides[c.id] : !!c.do_not_email;
                return (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const newVal = !effective;
                      // Optimistic update — UI flipt direct
                      setOptOutOverrides(prev => ({ ...prev, [c.id]: newVal }));
                      const { error } = await supabase.from('contacts').update({ do_not_email: newVal }).eq('id', c.id);
                      if (error) {
                        // Rollback
                        setOptOutOverrides(prev => ({ ...prev, [c.id]: !newVal }));
                        alert('Opt-out toggle mislukt: ' + error.message + '\n\nMogelijke oorzaak: do_not_email kolom bestaat nog niet, of RLS-policy ontbreekt.');
                      }
                      // Geen refetch — local override is voldoende tot volgende natuurlijke reload
                    }}
                    title={effective ? 'Opt-in: mag wel gemaild worden' : 'Opt-out: niet meer mailen'}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 18, padding: '2px 6px', flexShrink: 0,
                      lineHeight: 1,
                      color: effective ? '#dc2626' : '#16a34a',
                      fontWeight: 600,
                    }}>
                    {effective ? '⊘' : '✉'}
                  </button>
                );
              })()}
              <div onClick={e => e.stopPropagation()} style={{ minWidth: 180, flexShrink: 0 }}>
                {editingEmailId === c.id ? (
                  <input
                    autoFocus
                    type="email"
                    value={emailDraft}
                    onChange={e => setEmailDraft(e.target.value)}
                    onBlur={() => saveEmail(c)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEmail(c);
                      if (e.key === 'Escape') setEditingEmailId(null);
                    }}
                    placeholder="email@example.com"
                    style={{
                      width: '100%', padding: '4px 6px', borderRadius: 4,
                      border: '0.5px solid var(--accent)', background: 'var(--bg-1)',
                      fontSize: 11, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    }} />
                ) : (
                  {(() => {
                    const blocked = optOutOverrides[c.id] !== undefined ? optOutOverrides[c.id] : !!c.do_not_email;
                    return (
                      <span
                        onClick={() => { setEditingEmailId(c.id); setEmailDraft(c.email || ''); }}
                        title={blocked ? 'Email geblokt (opt-out)' : 'Click to edit email'}
                        style={{
                          fontSize: 11, cursor: 'text',
                          color: c.email ? 'var(--text-2)' : 'var(--text-4)',
                          fontStyle: c.email ? 'normal' : 'italic',
                          textDecoration: blocked ? 'line-through' : 'none',
                          opacity: blocked ? 0.5 : 1,
                        }}>
                        {c.email || '+ add email'}
                      </span>
                    );
                  })()}
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
              No contacts match the current filters.
            </div>
          )}
        </div>
      </div>
      {showBulkTag && (
        <BulkTagModal
          contactIds={selected}
          allTags={allTags}
          userEmail={userEmail}
          onClose={() => setShowBulkTag(false)}
          onComplete={() => { setSelected(new Set()); if (refetch) refetch(); }}
        />
      )}
    </div>
  );
}
