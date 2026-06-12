import { useState, useMemo, useEffect } from 'react';
import TagChip from './tag-chip';
import BulkTagModal from './marketing-bulk-tag-modal';
import ContactDetailModal from './contact-detail-modal';
import DoubleCheckLinkedInModal from './marketing-doublecheck-modal';
import EmailSuggestModal from './marketing-email-suggest-modal';
import { useAuth } from '../lib/auth';
import { supabase } from '../supabase';
import { apiFetch } from '../lib/apiFetch';

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

// Afgeleide pseudo-status — geen waarde in companies.type, wordt
// automatisch berekend uit deals met stage='proposal'. Verschijnt in de
// Account Status filter naast de echte DB-statussen.
const PROPOSAL_STATUS = 'Prospect with proposal';

// Helper: tri-state filter pill (Yes / No / niets aan) voor de status-sidebar.
// Yes = groen = contact heeft de eigenschap (email, linkedin, follow, active)
// No  = rood  = contact heeft de eigenschap NIET
// Klik op zelfde knop schakelt 'm uit (filter naar null = alle contacten).
function YesNoFilter({ label, value, onChange, extraLabel }) {
  const btnBase = {
    padding: '2px 12px', borderRadius: 10, fontSize: 11,
    fontFamily: 'inherit', cursor: 'pointer', border: '0.5px solid',
    fontWeight: 500,
  };
  const yesActive = value === 'yes';
  const noActive = value === 'no';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
      <span style={{ fontSize: 12, minWidth: 80, color: 'var(--text-1)' }}>
        {label} {extraLabel && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{extraLabel}</span>}
      </span>
      <button onClick={() => onChange(yesActive ? null : 'yes')}
        style={{
          ...btnBase,
          background: yesActive ? '#dcfce7' : 'transparent',
          color: yesActive ? '#15803d' : 'var(--text-3)',
          borderColor: yesActive ? '#16a34a' : 'var(--sep)',
          fontWeight: yesActive ? 600 : 400,
        }}>Yes</button>
      <button onClick={() => onChange(noActive ? null : 'no')}
        style={{
          ...btnBase,
          background: noActive ? '#fee2e2' : 'transparent',
          color: noActive ? '#b91c1c' : 'var(--text-3)',
          borderColor: noActive ? '#dc2626' : 'var(--sep)',
          fontWeight: noActive ? 600 : 400,
        }}>No</button>
    </div>
  );
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
  // 4 status-filters elk met 3 states: null (uit), 'yes' (heeft eigenschap),
  // 'no' (heeft niet). UI = Yes-knop (groen) + No-knop (rood) per filter.
  const [emailFilter, setEmailFilter] = useState(null);
  const [linkedinFilter, setLinkedinFilter] = useState(null);
  const [followFilter, setFollowFilter] = useState(null);
  const [followedContactIds, setFollowedContactIds] = useState(() => new Set());

  // Haal alle contact-ids op die op signal-follow staan (bell-toggle in de
  // contact-detail modal). Lijst stuurt het 'Followed only' filter.
  useEffect(() => {
    let cancelled = false;
    supabase.from('signal_subjects')
      .select('contact_id')
      .eq('enabled', true)
      .not('contact_id', 'is', null)
      .then(({ data }) => {
        if (cancelled) return;
        setFollowedContactIds(new Set((data || []).map(r => r.contact_id)));
      });
    return () => { cancelled = true; };
  }, []);
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
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0 });
  const [openContactId, setOpenContactId] = useState(null);
  const [showDoublecheck, setShowDoublecheck] = useState(null); // array of contact-ids als open
  const [surfeFinding, setSurfeFinding] = useState(false);
  const [surfeProgress, setSurfeProgress] = useState({ done: 0, total: 0 });
  const [showEmailSuggest, setShowEmailSuggest] = useState(false);

  async function followSelected() {
    const ids = filtered.filter(c => selected.has(c.id) && !followedContactIds.has(c.id)).map(c => c.id);
    if (ids.length === 0) {
      alert('Geselecteerde contacten staan al allemaal op signal-follow (🔔).');
      return;
    }
    if (!confirm(`Follow ${ids.length} contact${ids.length === 1 ? '' : 'en'}? Hun LinkedIn-posts worden dagelijks gescand voor signals (cron 07:00 NL).`)) return;
    // Twee paden: bestaande signal_subjects rows worden ge-enabled, nieuwe contact-ids krijgen een nieuwe row.
    const { data: existing } = await supabase.from('signal_subjects')
      .select('contact_id')
      .in('contact_id', ids)
      .eq('source_type', 'linkedin_user_post');
    const existingIds = new Set((existing || []).map(r => r.contact_id));
    if (existingIds.size > 0) {
      const { error } = await supabase.from('signal_subjects')
        .update({ enabled: true })
        .in('contact_id', [...existingIds])
        .eq('source_type', 'linkedin_user_post');
      if (error) { alert('Follow update mislukt: ' + error.message); return; }
    }
    const newIds = ids.filter(id => !existingIds.has(id));
    if (newIds.length > 0) {
      const { error } = await supabase.from('signal_subjects')
        .insert(newIds.map(id => ({
          contact_id: id, source_type: 'linkedin_user_post',
          enabled: true, auto_added: false,
        })));
      if (error) { alert('Follow insert mislukt: ' + error.message); return; }
    }
    setFollowedContactIds(prev => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
    alert(`${ids.length} contact${ids.length === 1 ? '' : 'en'} ge-followed (🔔).`);
  }

  async function unfollowSelected() {
    const eligible = filtered.filter(c => selected.has(c.id) && followedContactIds.has(c.id));
    if (eligible.length === 0) {
      alert('Geen geselecteerde contacten staan op signal-follow (🔔).');
      return;
    }
    if (!confirm(`Unfollow ${eligible.length} contact${eligible.length === 1 ? '' : 'en'}? Hun LinkedIn-posts worden niet meer dagelijks gescand voor signals.`)) return;
    const ids = eligible.map(c => c.id);
    const { error } = await supabase.from('signal_subjects')
      .update({ enabled: false })
      .in('contact_id', ids)
      .eq('source_type', 'linkedin_user_post');
    if (error) {
      alert('Unfollow mislukt: ' + error.message);
      return;
    }
    setFollowedContactIds(prev => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    alert(`${eligible.length} contact${eligible.length === 1 ? '' : 'en'} unfollowed.`);
  }

  async function findEmailsViaSurfe() {
    const eligible = filtered.filter(c => selected.has(c.id) && !c.email && c.linkedin_url);
    if (eligible.length === 0) {
      alert('Geen geselecteerde contacten zonder email en mét LinkedIn-URL.');
      return;
    }
    const skipped = selected.size - eligible.length;
    const MAX_BATCH = 25;
    if (eligible.length > MAX_BATCH) {
      alert(`Selecteer maximaal ${MAX_BATCH} contacten per ronde — Surfe poll-timeout is 50s. Je hebt ${eligible.length} eligible contacten geselecteerd.`);
      return;
    }
    const msg = `Find emails via Surfe (waterfall over 8 providers):\n- ${eligible.length} contact${eligible.length === 1 ? '' : 'en'} te verrijken${skipped > 0 ? `\n- ${skipped} skipped (al email of geen LinkedIn-URL)` : ''}\n\nLet op: elk succes verbruikt Surfe-credits. Doorgaan?`;
    if (!confirm(msg)) return;

    setSurfeFinding(true);
    setSurfeProgress({ done: 0, total: eligible.length });
    try {
      const resp = await apiFetch('/api/surfe?action=find-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_ids: eligible.map(c => c.id) }),
      });
      const data = await resp.json();
      setSurfeFinding(false);
      if (!resp.ok) {
        console.error('Surfe error full response:', data);
        const detail = data.surfe_response ? `\n\nSurfe says:\n${JSON.stringify(data.surfe_response, null, 2)}` : '';
        alert('Surfe klaar (fout): ' + (data.error || `HTTP ${resp.status}`) + detail);
      } else {
        alert(`Surfe klaar:\n✓ ${data.found} email gevonden\n⊘ ${data.no_email} geen email in Surfe\n✗ ${data.failed} fout`);
      }
      if (refetch) refetch();
    } catch (err) {
      setSurfeFinding(false);
      alert('Surfe request mislukt: ' + err.message);
    }
  }

  async function enrichSelected() {
    const selectedContacts = filtered.filter(c => selected.has(c.id));
    if (selectedContacts.length === 0) return;

    const without = selectedContacts.filter(c => !c.linkedin_url);
    const withUrl = selectedContacts.filter(c => c.linkedin_url);

    // Skip confirm voor kleine batches (≤3) — voor grote sets bevestiging vragen om accidents te voorkomen
    if (selectedContacts.length > 3) {
      const planLines = [];
      if (without.length > 0) planLines.push(`- ${without.length} zonder LinkedIn-URL → zoeken via Unipile en URL invullen`);
      if (withUrl.length > 0) planLines.push(`- ${withUrl.length} met LinkedIn-URL → profile fetchen en title refreshen`);
      if (!confirm(`Enrich plan voor ${selectedContacts.length} contacten:\n${planLines.join('\n')}\n\nDoorgaan? (~0.8s per contact)`)) {
        return;
      }
    }

    setEnriching(true);
    setEnrichProgress({ done: 0, total: selectedContacts.length });
    let urlFound = 0, titleRefreshed = 0, noResults = 0, noCompany = 0, failed = 0;

    for (let i = 0; i < selectedContacts.length; i++) {
      const c = selectedContacts[i];
      const hasUrl = !!c.linkedin_url;
      try {
        const action = hasUrl ? 'enrich-contact' : 'find-contact-linkedin';
        const body = hasUrl
          ? { contact_id: c.id, linkedin_url: c.linkedin_url }
          : { contact_id: c.id };
        const resp = await apiFetch(`/api/unipile?action=${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await resp.json();
        if (data.success) {
          if (hasUrl) titleRefreshed++; else urlFound++;
        } else if (data.reason === 'no-company') {
          noCompany++;
        } else if (data.reason) {
          noResults++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      setEnrichProgress({ done: i + 1, total: selectedContacts.length });
      if (i < selectedContacts.length - 1) await new Promise(r => setTimeout(r, 800));
    }

    setEnriching(false);
    const lines = [];
    if (urlFound > 0) lines.push(`✓ ${urlFound} LinkedIn-URL gevonden`);
    if (titleRefreshed > 0) lines.push(`✓ ${titleRefreshed} title refreshed`);
    if (noResults > 0) lines.push(`⊘ ${noResults} geen match in LinkedIn-search`);
    if (noCompany > 0) lines.push(`⊘ ${noCompany} geen company in contact (geen veilige search)`);
    if (failed > 0) lines.push(`✗ ${failed} fout`);
    alert(`Enrich klaar:\n${lines.join('\n')}`);
    if (refetch) refetch();
  }
  const [savingEmail, setSavingEmail] = useState(false);
  // Default 'yes' (alleen actieve contacten) — gelijk aan het oude activeOnly default
  const [activeFilter, setActiveFilter] = useState('yes');
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

  // Unique account types present in the data, sorted. PROPOSAL_STATUS is
  // een afgeleide pseudo-status: niet in DB, altijd zichtbaar in filter.
  const accountTypes = useMemo(() => {
    const set = new Set();
    for (const a of (accounts || [])) if (a.type) set.add(a.type);
    for (const t of extraStatuses) set.add(t);
    set.add(PROPOSAL_STATUS);
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
  // Bedrijven met een open deal in 'proposal'-stage (subStatus='proposal' op
  // opportunities). Drijft de afgeleide pseudo-status "Prospect with
  // proposal" in de Account Status filter — geen handmatig taggen nodig.
  const accountsWithActiveProposal = useMemo(() => {
    const set = new Set();
    for (const d of deals) {
      if (d.stage === 'proposal' && d.accountId) set.add(d.accountId);
    }
    return set;
  }, [deals]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const matches = contacts.filter(c => {
      if (activeFilter === 'yes' && c.isFormer) return false;
      if (activeFilter === 'no' && !c.isFormer) return false;
      if (emailFilter === 'yes' && !c.email) return false;
      if (emailFilter === 'no' && c.email) return false;
      if (linkedinFilter === 'yes' && !c.linkedin_url) return false;
      if (linkedinFilter === 'no' && c.linkedin_url) return false;
      if (followFilter === 'yes' && !followedContactIds.has(c.id)) return false;
      if (followFilter === 'no' && followedContactIds.has(c.id)) return false;
      if (hasGlintDeal && !accountsWithGlintDeal.has(c.accountId)) return false;
      if (hasAnyDeal && !accountsWithAnyDeal.has(c.accountId)) return false;
      if (selectedTagIds.size > 0) {
        const ids = (c.tags || []).filter(t => !hiddenPairs.has(`${c.id}:${t.id}`)).map(t => t.id);
        if (!ids.some(id => selectedTagIds.has(id))) return false;
      }
      if (selectedAccountTypes.size > 0) {
        const t = accountTypeById.get(c.accountId);
        // OR-match: contact past als zijn account-type één van de
        // geselecteerde statuses is, OF (voor PROPOSAL_STATUS) als zijn
        // account een active proposal-deal heeft.
        const matches = [...selectedAccountTypes].some(sel => {
          if (sel === PROPOSAL_STATUS) {
            // Sluit Customer-accounts uit zodat ze niet dubbel worden
            // gemaild — zij staan al onder hun eigen 'Customer' filter.
            return accountsWithActiveProposal.has(c.accountId) && t !== 'Customer';
          }
          return t === sel;
        });
        if (!matches) return false;
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
  }, [contacts, activeFilter, emailFilter, linkedinFilter, followFilter, followedContactIds, hasGlintDeal, hasAnyDeal, accountsWithGlintDeal, accountsWithAnyDeal, accountsWithActiveProposal, selectedTagIds, selectedAccountTypes, accountTypeById, searchText, hiddenPairs]);

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
        <YesNoFilter label="Email" value={emailFilter} onChange={setEmailFilter} />
        <YesNoFilter label="LinkedIn" value={linkedinFilter} onChange={setLinkedinFilter} />
        <YesNoFilter label="Follow 🔔" value={followFilter} onChange={setFollowFilter} />
        <YesNoFilter label="Active" value={activeFilter} onChange={setActiveFilter} />
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
            <button className="btn-ghost tiny" onClick={enrichSelected} disabled={enriching}>
              {enriching ? `Enriching ${enrichProgress.done}/${enrichProgress.total}…` : 'Enrich via LinkedIn'}
            </button>
            <button className="btn-ghost tiny"
              onClick={() => {
                const ids = filtered.filter(c => selected.has(c.id) && c.linkedin_url).map(c => c.id);
                if (ids.length === 0) { alert('Geen geselecteerde contacten met LinkedIn-URL om te checken.'); return; }
                setShowDoublecheck(ids);
              }}>
              Doublecheck LinkedIn
            </button>
            <button className="btn-ghost tiny"
              onClick={findEmailsViaSurfe}
              disabled={surfeFinding}>
              {surfeFinding ? `Surfe ${surfeProgress.total} processing…` : 'Find emails (Surfe)'}
            </button>
            <button className="btn-ghost tiny"
              onClick={() => {
                const eligible = filtered.filter(c => selected.has(c.id) && !c.email);
                if (eligible.length === 0) { alert('Geen geselecteerde contacten zonder email.'); return; }
                setShowEmailSuggest(true);
              }}>
              Email suggesties (patroon)
            </button>
            {(() => {
              const notFollowedSelected = [...selected].filter(id => !followedContactIds.has(id)).length;
              return (
                <button className="btn-ghost tiny"
                  onClick={followSelected}
                  disabled={notFollowedSelected === 0}
                  title={notFollowedSelected === 0 ? 'Alle geselecteerde contacten staan al op signal-follow' : `${notFollowedSelected} geselecteerde contact${notFollowedSelected === 1 ? '' : 'en'} nog niet op signal-follow`}>
                  🔔 Follow {notFollowedSelected > 0 ? `(${notFollowedSelected})` : ''}
                </button>
              );
            })()}
            {(() => {
              const followedSelected = [...selected].filter(id => followedContactIds.has(id)).length;
              return (
                <button className="btn-ghost tiny"
                  onClick={unfollowSelected}
                  disabled={followedSelected === 0}
                  title={followedSelected === 0 ? 'Geen geselecteerde contacten op signal-follow' : `${followedSelected} geselecteerde contact${followedSelected === 1 ? '' : 'en'} op signal-follow`}>
                  🔕 Unfollow {followedSelected > 0 ? `(${followedSelected})` : ''}
                </button>
              );
            })()}
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
                <div
                  onClick={e => { e.stopPropagation(); setOpenContactId(c.id); }}
                  title="Open contact-details"
                  style={{ fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'inline-block' }}>
                  {c.name}
                </div>
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
                  (() => {
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
                  })()
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
      {openContactId && (
        <ContactDetailModal
          contactId={openContactId}
          onClose={() => setOpenContactId(null)}
          refetch={refetch}
        />
      )}
      {showDoublecheck && (
        <DoubleCheckLinkedInModal
          contactIds={showDoublecheck}
          onClose={() => setShowDoublecheck(null)}
          refetch={refetch}
        />
      )}
      {showEmailSuggest && (
        <EmailSuggestModal
          allContacts={contacts}
          selectedIds={selected}
          onClose={() => setShowEmailSuggest(false)}
          refetch={refetch}
        />
      )}
    </div>
  );
}
