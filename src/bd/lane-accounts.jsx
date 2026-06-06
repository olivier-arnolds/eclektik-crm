import { useState, useMemo, useEffect, useRef } from 'react';
import { I, fmtMoney, fmtRelative, AccountMark, OwnerDot, OwnerChip, ChannelIcon, STAGE_TINT } from './atoms';
import AddAccountModal from './add-account-modal';
import AddContactModal from './add-contact-modal';
import ContactSearchModal from './contact-search-modal';
import InactivateAccountModal from './inactivate-modal';
import ContactDetailModal from './contact-detail-modal';
import MeetingNoteModal from './meeting-note-modal';
import AccountLinksSection from './account-links-section';
import LinkExistingContactModal from './link-existing-contact-modal';
import TagChip from './tag-chip';
import DuplicateContactsModal from './duplicate-contacts-modal';
import { useLinkedInPosts } from '../hooks/useLinkedInPosts';

function PostText({ text }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 300;
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {isLong && !expanded ? text.substring(0, 300) + '…' : text}
      </div>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit' }}>
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

// Inline rename for a deal directly in the collapsed Account-360 deal row.
// Click the pencil → input replaces title; Enter saves, Esc cancels.
function EditableDealTitle({ deal, refetch }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(deal.title || '');
  useEffect(() => { setDraft(deal.title || ''); }, [deal.title]);

  const save = async () => {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === deal.title) return;
    const field = deal.table === 'opportunities' ? 'topic' : 'full_name';
    await supabase.from(deal.table).update({ [field]: next }).eq('id', deal.id);
    if (refetch) refetch();
  };

  if (editing) {
    return (
      <input autoFocus value={draft} onClick={e => e.stopPropagation()}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') { setDraft(deal.title || ''); setEditing(false); }
        }}
        style={{
          flex: 1, fontSize: 13, fontWeight: 500,
          background: 'var(--fill-1)', color: 'var(--text-1)',
          border: '0.5px solid var(--accent)', borderRadius: 4,
          padding: '2px 6px', outline: 'none', minWidth: 0,
        }} />
    );
  }
  return (
    <>
      <span className="deal-row-title">{deal.title}</span>
      <button onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        title="Rename deal"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-3)', fontSize: 11, padding: '0 4px',
          fontFamily: 'var(--font-mono)',
        }}>
        ✎
      </button>
    </>
  );
}

// Click-to-pick deal type (product line) chip used in the collapsed deal row.
function DealTypePill({ deal, refetch }) {
  const [open, setOpen] = useState(false);
  const opts = ['Glint', 'ROI', 'ROE', 'Other'];
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pick = async (v) => {
    setOpen(false);
    await supabase.from(deal.table).update({ product_line: v || null }).eq('id', deal.id);
    if (refetch) refetch();
  };

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        title="Click to change type"
        style={{
          padding: '3px 8px', borderRadius: 6, fontSize: 11,
          background: 'var(--accent)', color: '#fff', fontWeight: 500,
          border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>
        {deal.dealType || '+ type'} ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 20,
          background: 'var(--bg-1)', border: '0.5px solid var(--sep)',
          borderRadius: 6, boxShadow: 'var(--shadow-2)', minWidth: 130, padding: 4,
        }}
          onClick={(e) => e.stopPropagation()}>
          {opts.map(o => (
            <div key={o} onClick={() => pick(o)}
              style={{
                padding: '5px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 4,
                background: o === deal.dealType ? 'var(--accent-tint)' : 'transparent',
                color: o === deal.dealType ? 'var(--accent)' : 'var(--text-1)',
              }}
              onMouseEnter={e => { if (o !== deal.dealType) e.currentTarget.style.background = 'var(--fill-1)'; }}
              onMouseLeave={e => { if (o !== deal.dealType) e.currentTarget.style.background = 'transparent'; }}>
              {o}{o === deal.dealType && ' ✓'}
            </div>
          ))}
          {deal.dealType && (
            <div onClick={() => pick(null)}
              style={{
                padding: '5px 8px', fontSize: 11, cursor: 'pointer',
                color: 'var(--danger)', borderTop: '0.5px solid var(--sep)', marginTop: 4,
                fontFamily: 'var(--font-mono)',
              }}>
              × Clear
            </div>
          )}
        </div>
      )}
    </span>
  );
}

// Collapse-button on the left edge of the Accounts lane.
// Replaces the older drag-handle (resize functionality removed; clean toggle UI).
function LaneCollapseButton({ onToggle }) {
  if (!onToggle) return null;
  return (
    <button
      onClick={onToggle}
      title="Account-paneel verbergen"
      className="lane-accounts-resizer"
      style={{
        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
        width: 22, height: 44, padding: 0,
        background: 'var(--bg-1)',
        border: '0.5px solid var(--sep)',
        borderRadius: '4px 0 0 4px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: 'var(--text-3)',
        zIndex: 2,
      }}>
      ›
    </button>
  );
}
import ExpandableRow from './expandable-row';
import { InlineContactDetail, InlineMeetingDetail, InlineDealDetail, InlineAccountDetails, InlineTaskDetail } from './inline-details';
import { supabase } from '../supabase';
import { syncMyCalendar, getSharedEventsForAccount, buildDedupKey } from './sync-events';
import { getChannelMessages } from '../lib/graph';
import { useAuth } from '../lib/auth';

// Per-client internal Teams channel mapping. Keyed by a lowercase substring of
// the account name. Posts from these channels are folded into the account's
// AI summary as INTERNAL context (Eclectik colleagues coordinating about the
// client — not client-facing comms). To link a channel, open it in Teams →
// "Get link to channel" → the groupId is the team id and the 19:...@thread.tacv2
// segment is the channel id.
//
// NOTE: reading channel messages needs the Graph admin-consent scopes
// Team.ReadBasic.All + Channel.ReadBasic.All + ChannelMessage.Read.All. Until
// those are consented the fetch returns 403 and is skipped silently — nothing
// breaks, the channel stream is simply empty.
const ACCOUNT_TEAMS_CHANNELS = [
  {
    match: 'imc',
    teamId: '0d78a0bf-a4e8-441d-bc21-fefa037dca52',
    channelId: '19:5e5b760d72564a53a5d35ea734f59500@thread.tacv2',
    channelName: 'IMC Trading',
  },
];

function teamsChannelForAccount(account) {
  const name = (account?.name || '').toLowerCase();
  if (!name) return null;
  return ACCOUNT_TEAMS_CHANNELS.find((c) => name.includes(c.match)) || null;
}

export default function AccountsLane({ context, accounts, contacts, deals, rawItems, comms, graphEmails, events, graphEvents, tasks, onPickAccount, onCompose, onOpenDeal, onSelectComm, search, refetch, refetchGraph, allTags, onToggleCollapse }) {
  // Merge DB events + graph events for context resolution
  const allEvents = useMemo(() => {
    const mappedGraph = (graphEvents || []).map(e => ({
      id: 'graph:' + e.id,
      title: e.title,
      startISO: e.startAt,
      endISO: e.endAt,
      attendees: e.attendees,
      attendeesEmails: e.attendeesEmails,
      channel: e.isOnline ? 'teams' : null,
      isAllDay: !!e.isAllDay,
      bodyHtml: e.bodyHtml,
      bodyPreview: e.bodyPreview,
      meetingUrl: e.meetingUrl,
      accountId: null,
    }));
    // Filter out all-day events — these are often birthdays/company events not relevant for account 360
    const visibleGraph = mappedGraph.filter(e => !e.isAllDay);
    const ids = new Set((events || []).map(e => e.id));
    return [...(events || []), ...visibleGraph.filter(e => !ids.has(e.id))];
  }, [events, graphEvents]);

  const resolved = useMemo(() => resolveContext(context, { accounts, contacts, deals, comms, graphEmails, events: allEvents, tasks }), [context, accounts, contacts, deals, comms, graphEmails, allEvents, tasks]);
  const [showAddAccount, setShowAddAccount] = useState(false);

  if (!resolved) {
    return (
      <>
        <AccountsList accounts={accounts} contacts={contacts} deals={deals} onPickAccount={onPickAccount} search={search}
          onAddAccount={() => setShowAddAccount(true)} onToggleCollapse={onToggleCollapse} />
        {showAddAccount && (
          <AddAccountModal
            onClose={() => setShowAddAccount(false)}
            onCreated={(newAcc) => {
              setShowAddAccount(false);
              if (refetch) refetch();
              // Navigate to the new account
              if (newAcc && onPickAccount) setTimeout(() => onPickAccount(newAcc), 500);
            }}
          />
        )}
      </>
    );
  }

  return <AccountDetail {...resolved} accounts={accounts} contacts={contacts} deals={deals} rawItems={rawItems} comms={comms} graphEmails={graphEmails} events={allEvents} tasks={tasks}
    onPickAccount={onPickAccount} onCompose={onCompose} onOpenDeal={onOpenDeal} onSelectComm={onSelectComm} refetch={refetch} allTags={allTags} onToggleCollapse={onToggleCollapse} />;
}

function resolveContext(context, data) {
  if (!context) return null;
  const { accounts, contacts, deals, comms, graphEmails, events, tasks } = data;
  if (context.type === 'account') {
    const acc = accounts.find(a => a.id === context.id);
    return acc ? { account: acc, highlight: null } : null;
  }
  if (context.type === 'comm') {
    // Look in DB comms first, then in live Graph emails. Graph emails resolve
    // their accountId via the sender's email matching a CRM contact.
    let c = comms.find(x => x.id === context.id);
    if (!c) {
      const g = (graphEmails || []).find(x => x.id === context.id);
      if (g) {
        const sender = (g.fromAddress || '').toLowerCase();
        const senderDom = (sender.split('@')[1] || '').toLowerCase();
        const domMatchesWeb = (a) => {
          const wd = (a?.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
          return wd && senderDom && (wd === senderDom || senderDom.endsWith('.' + wd));
        };
        // Try contact lookup first, but only trust the link if the contact's
        // company has a matching website domain (filters out leaked partners).
        const contact = sender ? (contacts || []).find(ct => (ct.email || '').toLowerCase() === sender) : null;
        let acc = contact ? accounts.find(a => a.id === contact.accountId) : null;
        if (acc && acc.website && !domMatchesWeb(acc)) acc = null;
        // Domain-based fallback
        if (!acc && senderDom) {
          acc = (accounts || []).find(domMatchesWeb);
        }
        c = {
          id: g.id, subject: g.subject, preview: g.bodyPreview || g.preview || '',
          from: g.from, accountId: acc?.id || null,
        };
      }
    }
    if (!c) return null;
    const acc = accounts.find(a => a.id === c.accountId);
    return acc ? { account: acc, highlight: { kind: 'comm', item: c, title: c.subject, body: c.preview, actions: [{ label: 'Reply', kind: 'reply', commId: c.id }] } } : null;
  }
  if (context.type === 'event') {
    const e = events.find(x => x.id === context.id);
    if (!e) return null;

    // Extract email addresses from attendees string (format: "Name <email>, Name <email>" OR "name, name" OR emails only)
    const extractEmails = (str) => {
      if (!str) return [];
      const emails = [];
      // Match anything with <email>
      const angleRe = /<([^>]+)>/g;
      let m;
      while ((m = angleRe.exec(str)) !== null) emails.push(m[1].trim().toLowerCase());
      // Match bare emails in text (common after comma-split without brackets)
      const emailRe = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      while ((m = emailRe.exec(str)) !== null) {
        const addr = m[1].toLowerCase();
        if (!emails.includes(addr)) emails.push(addr);
      }
      return emails;
    };

    const attendeeEmails = (e.attendeesEmails && e.attendeesEmails.length)
      ? e.attendeesEmails.map(s => (s || '').toLowerCase())
      : extractEmails(e.attendees);

    // 1) Direct accountId link (DB events)
    let acc = accounts.find(a => a.id === e.accountId);

    // 2) Match attendee email(s) against our contacts
    if (!acc && attendeeEmails.length) {
      const contactByEmail = new Map(contacts.filter(c => c.email).map(c => [c.email.toLowerCase(), c]));
      for (const email of attendeeEmails) {
        const c = contactByEmail.get(email);
        if (c?.accountId) {
          acc = accounts.find(a => a.id === c.accountId);
          if (acc) break;
        }
      }
    }

    // 3) STRICT domain match (exact or subdomain) against company website
    const ECLECTIK = new Set(['eclectik.co', 'eclectik.com', 'eclectikadmin.onmicrosoft.com']);
    if (!acc && attendeeEmails.length) {
      for (const email of attendeeEmails) {
        const domain = (email.split('@')[1] || '').toLowerCase();
        if (!domain || ECLECTIK.has(domain)) continue;
        const found = accounts.find(a => {
          const web = (a.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
          if (!web || web.length < 4) return false;
          return domain === web || domain.endsWith('.' + web);
        });
        if (found) { acc = found; break; }
      }
    }

    // 4) Match attendee name against contact name
    if (!acc && e.attendees) {
      const attNames = e.attendees.toLowerCase();
      const matched = contacts.find(c => c.name && attNames.includes(c.name.toLowerCase()));
      if (matched?.accountId) acc = accounts.find(a => a.id === matched.accountId);
    }

    if (acc) {
      return { account: acc, highlight: { kind: 'event', item: e, title: e.title, body: e.attendees } };
    }

    // No account found — show pseudo-account view with event info
    return {
      account: { id: null, name: e.title || '(Untitled meeting)', type: 'Calendar event', logoHue: 200 },
      highlight: { kind: 'event', item: e, title: e.title, body: e.attendees || (e.startISO ? new Date(e.startISO).toLocaleString('en') : '') }
    };
  }
  if (context.type === 'deal') {
    const d = deals.find(x => x.id === context.id);
    if (!d) return null;
    const acc = accounts.find(a => a.id === d.accountId);
    return acc ? { account: acc, highlight: { kind: 'deal', item: d, title: d.title, body: `${STAGE_TINT[d.stage]?.label} · ${fmtMoney(d.value)}`, actions: [{ label: 'Open deal', kind: 'openDeal', dealId: d.id }] } } : null;
  }
  if (context.type === 'task') {
    const t = tasks.find(x => x.id === context.id);
    if (!t) return null;
    const acc = accounts.find(a => a.id === t.accountId);
    if (acc) return { account: acc, highlight: { kind: 'task', item: t, title: t.title, body: t.dueLabel } };
    // No linked account → still show a pseudo-account so user can edit the task
    return {
      account: { id: null, name: t.title || '(Task)', type: 'Task (no account)', logoHue: 280 },
      highlight: { kind: 'task', item: t, title: t.title, body: t.dueLabel },
    };
  }
  return null;
}

const sectionLabel = {
  fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'var(--text-3)',
  padding: '8px 12px 4px',
};

function AccountsList({ accounts, contacts, deals, onPickAccount, search, onAddAccount, onToggleCollapse }) {
  const q = (search || '').toLowerCase();
  const [typeFilters, setTypeFilters] = useState([]);
  const [nameFilter, setNameFilter] = useState('');
  const [showDupes, setShowDupes] = useState(false);

  // Build a dynamic list of all types present in our data (sorted, unique)
  const allTypes = useMemo(() => {
    const set = new Set();
    (accounts || []).forEach(a => { if (a.type) set.add(a.type); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [accounts]);

  const toggleType = (t) => setTypeFilters(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  // Build sets of account ids whose contacts OR deals match the query.
  // Used so "Mark van Veldhoven" finds companies where he's a contact, AND
  // "Glint Implementation" finds companies that have such a deal.
  const matchRelatedAccounts = (query) => {
    if (!query) return null;
    const cl = query.toLowerCase();
    const set = new Set();
    (contacts || []).forEach(c => {
      const hit =
        (c.name || '').toLowerCase().includes(cl)
        || (c.email || '').toLowerCase().includes(cl)
        || (c.role || '').toLowerCase().includes(cl);
      if (hit && c.accountId) set.add(c.accountId);
    });
    (deals || []).forEach(d => {
      const hit =
        (d.title || '').toLowerCase().includes(cl)
        || (d.dealType || '').toLowerCase().includes(cl)
        || (d.description || '').toLowerCase().includes(cl)
        || (d.contact || '').toLowerCase().includes(cl);
      if (hit && d.accountId) set.add(d.accountId);
    });
    return set;
  };

  const filtered = useMemo(() => {
    let list = accounts || [];
    // Global topbar search — matches account OR any of its contacts/deals
    if (q) {
      const relAccts = matchRelatedAccounts(q);
      list = list.filter(a =>
        a.name.toLowerCase().includes(q)
        || (a.industry || '').toLowerCase().includes(q)
        || (a.country || '').toLowerCase().includes(q)
        || (relAccts && relAccts.has(a.id))
      );
    }
    // Local name/contact/deal filter
    const nf = nameFilter.trim().toLowerCase();
    if (nf) {
      const relAccts = matchRelatedAccounts(nf);
      list = list.filter(a =>
        a.name.toLowerCase().includes(nf)
        || (relAccts && relAccts.has(a.id))
      );
    }
    if (typeFilters.length) list = list.filter(a => typeFilters.includes(a.type));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts, contacts, deals, q, typeFilters, nameFilter]);

  // Direct contact / deal matches for the active query (whichever is set).
  // Used to render dedicated rows above the accounts grid so users can pick
  // a person/deal directly instead of having to expand a company first.
  const activeQuery = (nameFilter.trim() || q || '').toLowerCase();
  const matchedContacts = useMemo(() => {
    if (!activeQuery) return [];
    return (contacts || []).filter(c =>
      (c.name || '').toLowerCase().includes(activeQuery)
      || (c.email || '').toLowerCase().includes(activeQuery)
      || (c.role || '').toLowerCase().includes(activeQuery)
    ).slice(0, 50);
  }, [contacts, activeQuery]);
  const matchedDeals = useMemo(() => {
    if (!activeQuery) return [];
    return (deals || []).filter(d =>
      (d.title || '').toLowerCase().includes(activeQuery)
      || (d.dealType || '').toLowerCase().includes(activeQuery)
      || (d.description || '').toLowerCase().includes(activeQuery)
    ).slice(0, 50);
  }, [deals, activeQuery]);

  return (
    <div className="lane lane-accounts">
      <LaneCollapseButton onToggle={onToggleCollapse} />
      <div className="lane-header">
        <div className="lane-title">
          <span className="lane-title-label">Accounts</span>
          <span className="lane-title-count">{filtered.length}{filtered.length !== accounts.length ? ` / ${accounts.length}` : ''}</span>
        </div>
        <div className="lane-actions" style={{ display: 'flex', gap: 6 }}>
          <button className="btn-ghost tiny" onClick={() => setShowDupes(true)} title="Duplicaten opschonen">
            Duplicates
          </button>
          {onAddAccount && (
            <button className="btn-primary tiny" onClick={onAddAccount}>
              <I.plus /> New account
            </button>
          )}
        </div>
      </div>
      {showDupes && (
        <DuplicateContactsModal
          onClose={() => setShowDupes(false)}
          onDone={() => { setShowDupes(false); window.location.reload(); }}
        />
      )}

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '8px 12px',
        borderBottom: '0.5px solid var(--sep)',
      }}>
        {/* Name filter */}
        <div className="searchfield" style={{ width: '100%' }}>
          <I.search />
          <input
            type="text"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            placeholder="Filter by company, contact, or deal…" />
          {nameFilter && (
            <button className="icon-btn tiny" onClick={() => setNameFilter('')}>
              <I.close />
            </button>
          )}
        </div>

        {/* Type filter chips */}
        {allTypes.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginRight: 4 }}>Type</span>
            {allTypes.map(t => {
              const on = typeFilters.includes(t);
              const count = (accounts || []).filter(a => a.type === t).length;
              return (
                <button key={t}
                  className={`chip ${on ? 'chip-on' : ''}`}
                  onClick={() => toggleType(t)}
                  style={{ fontSize: 11 }}>
                  {t}
                  <span style={{ opacity: 0.6, fontFamily: 'var(--font-mono)', fontSize: 10, marginLeft: 2 }}>{count}</span>
                </button>
              );
            })}
            {typeFilters.length > 0 && (
              <button className="btn-ghost tiny" onClick={() => setTypeFilters([])}>Clear</button>
            )}
          </div>
        )}
      </div>

      <div className="accounts-grid">
        {activeQuery && matchedContacts.length > 0 && (
          <>
            <div style={sectionLabel}>Contacts · {matchedContacts.length}</div>
            {matchedContacts.map(c => {
              const acc = (accounts || []).find(a => a.id === c.accountId);
              return (
                <div key={'c:' + c.id} className="account-card"
                  onClick={() => acc && onPickAccount && onPickAccount(acc)}
                  style={{ cursor: acc ? 'pointer' : 'default', opacity: acc ? 1 : 0.6 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 12,
                    background: c.avatarBg || 'var(--fill-2)', color: c.avatarColor || 'var(--text-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600, flexShrink: 0,
                  }}>
                    {c.initials || (c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="account-card-name">{c.name}</div>
                    <div className="account-card-meta">
                      {acc ? <span>{acc.name}</span> : <span style={{ fontStyle: 'italic' }}>(no account)</span>}
                      {c.role && <><span className="sep">·</span><span>{c.role}</span></>}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {activeQuery && matchedDeals.length > 0 && (
          <>
            <div style={sectionLabel}>Deals · {matchedDeals.length}</div>
            {matchedDeals.map(d => {
              const acc = (accounts || []).find(a => a.id === d.accountId);
              return (
                <div key={'d:' + d.id} className="account-card"
                  onClick={() => acc && onPickAccount && onPickAccount(acc)}
                  style={{ cursor: acc ? 'pointer' : 'default', opacity: acc ? 1 : 0.6 }}>
                  <span className={`stage-pill stage-${(d.stage || '').toLowerCase()}`} style={{ fontSize: 9, flexShrink: 0 }}>
                    {(d.stage || '').toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="account-card-name">{d.title || '(untitled)'}</div>
                    <div className="account-card-meta">
                      {acc ? <span>{acc.name}</span> : <span style={{ fontStyle: 'italic' }}>(no account)</span>}
                      {d.dealType && <><span className="sep">·</span><span>{d.dealType}</span></>}
                    </div>
                  </div>
                  {d.value > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>{fmtMoney(d.value)}</span>}
                </div>
              );
            })}
          </>
        )}

        {activeQuery && (matchedContacts.length > 0 || matchedDeals.length > 0) && filtered.length > 0 && (
          <div style={sectionLabel}>Accounts · {filtered.length}</div>
        )}

        {filtered.map(a => (
          <div key={a.id} className="account-card" onClick={() => onPickAccount && onPickAccount(a)}>
            <AccountMark account={a} size={24} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="account-card-name">{a.name}</div>
              <div className="account-card-meta">
                <span>{a.type || '—'}</span>
                {a.region && <><span className="sep">·</span><span>{a.region}</span></>}
                {a.industry && <><span className="sep">·</span><span>{a.industry}</span></>}
              </div>
            </div>
            {a.owner && <OwnerDot id={a.owner} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountDetail({ account, highlight, accounts, contacts, deals, rawItems, comms, graphEmails, events, tasks, onPickAccount, onCompose, onOpenDeal, onSelectComm, refetch, allTags, onToggleCollapse }) {
  const [showAddContact, setShowAddContact] = useState(false);
  const [showSearchContact, setShowSearchContact] = useState(false);
  const [showLinkExisting, setShowLinkExisting] = useState(false);
  const [showInactivate, setShowInactivate] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [detailContactId, setDetailContactId] = useState(null);
  const [meetingNoteEvent, setMeetingNoteEvent] = useState(null);
  const [showCoreDetails, setShowCoreDetails] = useState(false);
  // Shared calendar events for this account (synced from all users' Outlook)
  const [sharedEvents, setSharedEvents] = useState([]);
  const [syncingEvents, setSyncingEvents] = useState(false);
  // Internal Teams channel posts for this account (if a channel is linked)
  const [channelMsgs, setChannelMsgs] = useState([]);
  // AI summary brief
  const [brief, setBrief] = useState(null);
  const [briefAt, setBriefAt] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState(null);

  const { session } = useAuth();
  const userEmail = session?.user?.email || '';
  const userName = session?.user?.user_metadata?.full_name || '';

  // Sync my calendar + refetch shared events whenever a new account is opened.
  useEffect(() => {
    // Always reset the previous account's events first — otherwise a
    // pseudo-account view (clicking a calendar event with no match) would
    // keep showing the previous account's meetings/contacts/etc.
    setSharedEvents([]);
    if (!account?.id) return;
    let cancelled = false;
    (async () => {
      setSyncingEvents(true);
      // 1. Push my own Outlook events into synced_events (if any new ones)
      if (userEmail && localStorage.getItem('graph_token')) {
        // Get raw accounts+contacts for company resolution (with company_id directly)
        const { data: rawAccs } = await supabase.from('companies').select('id, name, website, linkedin_url');
        const { data: rawCs } = await supabase.from('contacts').select('id, email, company_id').not('email', 'is', null);
        await syncMyCalendar({
          userEmail, userName,
          accounts: rawAccs || [],
          contacts: rawCs || [],
          skipIfRecent: true,
        });
      }
      if (cancelled) return;
      // 2. Pull shared events for this account (from all users)
      const events = await getSharedEventsForAccount(account.id);
      if (cancelled) return;
      setSharedEvents(events);
      setSyncingEvents(false);
    })();
    return () => { cancelled = true; };
  }, [account?.id, userEmail, userName]);

  // Reset the brief and pull any linked internal Teams channel on account change.
  useEffect(() => {
    setBrief(null);
    setBriefAt(null);
    setBriefError(null);
    setChannelMsgs([]);
    if (!account?.id) return;
    let cancelled = false;
    (async () => {
      // Try to load a previously generated brief (table is optional).
      try {
        const { data } = await supabase
          .from('account_briefs')
          .select('brief, generated_at')
          .eq('company_id', account.id)
          .maybeSingle();
        if (!cancelled && data?.brief) {
          setBrief(data.brief);
          setBriefAt(data.generated_at);
        }
      } catch (_) { /* table missing → ephemeral mode */ }

      // Pull internal Teams channel messages if this account has one linked.
      const ch = teamsChannelForAccount(account);
      if (ch && localStorage.getItem('graph_token')) {
        try {
          const msgs = await getChannelMessages(ch.teamId, ch.channelId, 30);
          if (!cancelled) setChannelMsgs((msgs || []).map((m) => ({ ...m, channelName: ch.channelName })));
        } catch (_) { /* missing scope / consent → skip silently */ }
      }
    })();
    return () => { cancelled = true; };
  }, [account?.id]);

  // LinkedIn posts (fetched live from Unipile + cached in Supabase)
  const {
    fetchedPosts,
    fetching: fetchingPosts,
    fetchError,
    hasFetched,
    fetchPosts: fetchLinkedInPosts,
  } = useLinkedInPosts(account, contacts, { enabled: !!account?.id });

  // Track which events have notes (📝 indicator)
  const [notesCountByEvent, setNotesCountByEvent] = useState({});
  useEffect(() => {
    if (!account?.id) return;
    supabase.from('meeting_notes')
      .select('event_id, dedup_key')
      .eq('company_id', account.id)
      .then(({ data, error }) => {
        if (error) return;
        const counts = {};
        (data || []).forEach(r => {
          if (r.dedup_key) counts['dedup:' + r.dedup_key] = (counts['dedup:' + r.dedup_key] || 0) + 1;
          if (r.event_id) counts[r.event_id] = (counts[r.event_id] || 0) + 1;
        });
        setNotesCountByEvent(counts);
      });
  }, [account?.id, meetingNoteEvent]);
  // Sort contacts A-Z by first name (fall back to full name).
  // If this is a pseudo-account (no real id), don't list any contacts —
  // 'no accountId' would otherwise match every unlinked contact.
  const accContacts = (!account.id ? [] : contacts.filter(c => c.accountId === account.id))
    .slice()
    .sort((a, b) => {
      // Keep former contacts in normal alphabetical position so they're not 'lost'.
      const fa = (a.first_name || (a.name || '').split(' ')[0] || '').toLowerCase();
      const fb = (b.first_name || (b.name || '').split(' ')[0] || '').toLowerCase();
      return fa.localeCompare(fb);
    });
  const accDeals = !account.id ? [] : deals.filter(d => d.accountId === account.id);
  const openDeals = accDeals.filter(d => ['qualify', 'develop', 'proposal', 'close'].includes(d.stage));
  const activeDeals = accDeals.filter(d => ['onboarding', 'active'].includes(d.stage));
  // Sleeping = finished projects (stage='past' + status='Won'). They stay
  // linked to the account (company_id is untouched on the move) but were
  // previously invisible here because they fell into neither open nor active.
  const sleepingDeals = accDeals.filter(d => d.stage === 'sleeping');
  // Merge DB comms + Graph emails matched to this account via contact email or website domain
  const webDomain = ((account.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]) || null;
  // Only count a contact's email as belonging to this account if their email
  // domain matches the account's website domain. Otherwise (e.g. partners or
  // mis-imported contacts with @microsoft.com / @eclectik.co linked to a
  // customer record), every inbound from that domain would leak in.
  const accountContactEmails = new Set(
    (contacts || [])
      .filter(c => {
        if (c.accountId !== account.id || !c.email) return false;
        if (!webDomain) return true; // no website → trust the link
        const dom = (c.email.split('@')[1] || '').toLowerCase();
        return dom === webDomain || dom.endsWith('.' + webDomain);
      })
      .map(c => c.email.toLowerCase())
  );
  const matchedGraph = (graphEmails || [])
    .filter(e => {
      const from = (e.fromAddress || '').toLowerCase();
      if (!from) return false;
      if (accountContactEmails.has(from)) return true;
      if (webDomain) {
        const dom = (from.split('@')[1] || '').toLowerCase();
        if (dom && (dom === webDomain || dom.endsWith('.' + webDomain))) return true;
      }
      return false;
    })
    .map(e => ({
      id: e.id,
      channel: 'email',
      from: e.from,
      subject: e.bodyPreview ? e.subject : e.subject,
      preview: e.bodyPreview || '',
      ts: e.date,
      hasAttach: !!e.hasAttachments,
      accountId: account.id,
    }));
  const allComms = !account.id ? [] : [...(comms || []).filter(c => c.accountId === account.id), ...matchedGraph];
  // Dedupe by id and sort
  const seen = new Set();
  const accComms = allComms
    .filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
    .sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
    .slice(0, 12);
  // Meetings shown for this account come from the SHARED synced_events table:
  // all CRM users' Outlook events matched to this account. The dedup happens
  // in getSharedEventsForAccount so one physical meeting only appears once.
  const accEvents = useMemo(() => {
    return (sharedEvents || []).map(row => ({
      id: 'graph:' + row.graph_event_id,
      graphEventId: row.graph_event_id,
      dedupKey: row.dedup_key,
      title: row.subject,
      startISO: row.start_at,
      endISO: row.end_at,
      attendees: Array.isArray(row.attendees) ? row.attendees.map(a => a.name || a.email).join(', ') : '',
      attendeesEmails: row.attendee_emails || [],
      bodyHtml: row.body_html,
      bodyPreview: row.body_preview,
      channel: row.is_online ? 'teams' : null,
      meetingUrl: row.online_url,
      owners: row.owners || [],
    }));
  }, [sharedEvents]);
  const accTasks = !account.id
    ? (highlight?.kind === 'task' && highlight.item ? [highlight.item] : [])
    : tasks.filter(t => t.accountId === account.id);
  const openTasks = accTasks.filter(t => !t.done);
  const doneTasks = accTasks.filter(t => t.done);

  // ---- AI summary: merge every interaction stream into one normalized list ----
  const stripTags = (s) => (s || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();

  const interactions = useMemo(() => {
    const out = [];
    (accEvents || []).forEach((e) => out.push({
      type: 'meeting', channel: e.channel === 'teams' ? 'Teams meeting' : 'meeting',
      date: e.startISO, who: e.attendees, title: e.title, text: e.bodyPreview || '',
    }));
    (allComms || []).forEach((c) => out.push({
      type: c.channel === 'note' ? 'note' : (c.channel || 'email'),
      channel: c.channel || 'email', direction: c.dir === 'out' ? 'outbound' : (c.channel === 'note' ? '' : 'inbound'),
      date: c.ts, who: c.from, title: c.subject, text: c.preview || '',
    }));
    (channelMsgs || []).forEach((m) => out.push({
      type: 'team-channel', internal: true, channel: 'Teams channel',
      date: m.date, who: m.from, title: m.channelName || 'Team channel', text: stripTags(m.body),
    }));
    (accTasks || []).forEach((t) => out.push({
      type: 'task', date: t.dueDate || '', who: t.ownerRaw || t.owner || '',
      title: t.title, direction: t.done ? 'done' : 'open',
      text: t.done ? 'Task completed' : `Open task${t.dueLabel ? ', due ' + t.dueLabel : ''}${t.overdue ? ' (overdue)' : ''}`,
    }));
    (accDeals || []).forEach((d) => out.push({
      type: 'deal', date: d.modifiedDate || d.createdDate || '', title: `Deal: ${d.title}`,
      text: `Stage ${STAGE_TINT[d.stage]?.label || d.stage}${d.value ? ' · ' + fmtMoney(d.value) : ''}`,
    }));
    return out.filter((x) => x.title || x.text);
  }, [accEvents, allComms, channelMsgs, accTasks, accDeals]);

  const channelLinked = !!teamsChannelForAccount(account);

  const generateBrief = async () => {
    if (!account?.id || briefLoading) return;
    setBriefLoading(true);
    setBriefError(null);
    try {
      const resp = await fetch('/api/account-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: account.id, accountName: account.name, interactions }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed');
      setBrief(data.brief);
      setBriefAt(data.generatedAt);
    } catch (e) {
      setBriefError(e.message || 'Could not generate brief');
    }
    setBriefLoading(false);
  };

  const runHighlightAction = (action) => {
    if (action.kind === 'reply' && onCompose) {
      const c = comms.find(x => x.id === action.commId);
      onCompose({ replyTo: c });
    }
    if (action.kind === 'openDeal' && onOpenDeal) {
      const d = deals.find(x => x.id === action.dealId);
      if (d) onOpenDeal(d);
    }
  };

  return (
    <div className="lane lane-accounts">
      <LaneCollapseButton onToggle={onToggleCollapse} />
      <div className="lane-header">
        <div className="lane-title">
          <button className="btn-ghost tiny" onClick={() => onPickAccount && onPickAccount(null)}><I.back /></button>
          <span className="lane-title-label">Account</span>
        </div>
        {account.id && (
          <div className="lane-actions">
            <button className="btn-ghost tiny" style={{ color: 'var(--danger)' }}
              onClick={() => setShowInactivate(true)} title="Inactivate this account and all linked contacts">
              <I.archive /> Inactivate
            </button>
          </div>
        )}
      </div>

      <div className="acc-hero" style={{ flexWrap: 'wrap' }}>
        <AccountMark account={account} size={40} />
        <div style={{ cursor: account.id ? 'pointer' : 'default', flex: 1, minWidth: 0 }}
          onClick={() => account.id && setShowCoreDetails(v => !v)}
          title={account.id ? (showCoreDetails ? 'Hide core details' : 'Show core details') : ''}>
          <div className="acc-hero-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {account.name}
            {account.id && (
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', transform: showCoreDetails ? 'rotate(90deg)' : 'none', transition: 'transform 0.12s' }}>
                ›
              </span>
            )}
          </div>
          <div className="acc-hero-meta">
            <span>{account.type || '—'}</span>
            {account.tier && <><span className="sep">·</span><span>{account.tier}</span></>}
            {account.region && <><span className="sep">·</span><span>{account.region}</span></>}
            {account.arr && <><span className="sep">·</span><span>{account.arr}</span></>}
          </div>
        </div>
        {account.owner && <div style={{ marginLeft: 'auto' }}><OwnerChip id={account.owner} /></div>}
        {showCoreDetails && account.id && (
          <div style={{ flexBasis: '100%', marginTop: 10, padding: '10px 0', borderTop: '0.5px solid var(--sep)' }}>
            <InlineAccountDetails accountId={account.id} onPickAccount={onPickAccount} />
          </div>
        )}
      </div>

      <div className="acc-scroll">
        {highlight && (
          <div className="acc-highlight">
            <div className="acc-highlight-label">{highlight.kind}</div>
            <div className="acc-highlight-body">
              <b>{highlight.title}</b>
              {highlight.body && <><br />{highlight.body}</>}
            </div>
            {highlight.actions && (
              <div className="acc-highlight-actions">
                {highlight.actions.map((a, i) => (
                  <button key={i} className="btn-ghost tiny" onClick={() => runHighlightAction(a)}>{a.label}</button>
                ))}
              </div>
            )}
          </div>
        )}

        <Section label={`Contacts · ${accContacts.length}`}
          actions={account.id && (
            <>
              <button className="btn-ghost tiny" onClick={() => setShowLinkExisting(true)} title="Link a contact that already exists in the CRM">
                <I.search /> Link existing
              </button>
              <button className="btn-ghost tiny" onClick={() => setShowSearchContact(true)} title="Search on LinkedIn">
                <I.search /> LinkedIn
              </button>
              <button className="btn-ghost tiny" onClick={() => setShowAddContact(true)}>
                <I.plus /> Add
              </button>
            </>
          )}>
          <div className="contacts-grid">
            {accContacts.length === 0 && <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>No contacts</div>}
            {accContacts.map(c => (
              <ExpandableRow key={c.id} accent="var(--accent)"
                collapsed={(open) => (
                  <div className="contact-card" style={c.isFormer ? { background: 'var(--fill-1)' } : {}}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 11,
                      background: c.avatarBg || '#F1EFE8', color: c.avatarColor || '#888',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 600,
                      ...(c.isPrimary ? { boxShadow: '0 0 0 2px var(--good)' } : {}),
                      ...(c.isFormer ? { opacity: 0.6 } : {}),
                    }}>
                      {c.initials || (c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="contact-name">
                        <span style={c.isFormer ? { textDecoration: 'line-through', color: 'var(--text-3)' } : {}}>{c.name}</span>
                        {c.isPrimary && <span title="Primary contact" style={{ color: 'var(--good)', marginLeft: 6, fontSize: 10, fontFamily: 'var(--font-mono)' }}>★</span>}
                        {c.isFormer && (
                          <span title="No longer at this account"
                            style={{
                              marginLeft: 6, fontSize: 9, fontFamily: 'var(--font-mono)',
                              padding: '1px 5px', borderRadius: 3,
                              background: 'var(--warn-tint)', color: 'var(--warn)',
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>former</span>
                        )}
                      </div>
                      {c.role && <div className="contact-role" style={c.isFormer ? { textDecoration: 'line-through', color: 'var(--text-3)' } : {}}>{c.role}</div>}
                      {Array.isArray(c.tags) && c.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {c.tags.map(t => <TagChip key={t.id} tag={t} small />)}
                        </div>
                      )}
                    </div>
                    <button className="btn-ghost tiny"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const action = c.isFormer ? 'restore as current employee' : 'mark as FORMER (no longer at this account)';
                        if (!confirm(`${action.replace(/^./, ch => ch.toUpperCase())} for ${c.name}?\n\nContact stays linked to this account; just visually marked.`)) return;
                        await supabase.from('contacts').update({ former: !c.isFormer }).eq('id', c.id);
                        if (refetch) refetch();
                      }}
                      title={c.isFormer ? 'Restore as current employee' : 'Mark as former employee (no longer at this account)'}
                      style={{ fontSize: 10, color: c.isFormer ? 'var(--accent)' : 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {c.isFormer ? '↻ restore' : 'former?'}
                    </button>
                    <button className="icon-btn tiny"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const newVal = !c.isPrimary;
                        if (newVal) await supabase.from('contacts').update({ is_primary: false }).eq('company_id', account.id);
                        await supabase.from('contacts').update({ is_primary: newVal }).eq('id', c.id);
                        if (refetch) refetch();
                      }}
                      title={c.isPrimary ? 'Unset as primary' : 'Set as primary contact'}
                      style={{ color: c.isPrimary ? 'var(--good)' : 'var(--text-3)' }}>
                      <I.star />
                    </button>
                    {c.email && onCompose && (
                      <button className="icon-btn tiny" onClick={(e) => { e.stopPropagation(); onCompose({ to: c.email, contact: c }); }} title="Email">
                        <I.send />
                      </button>
                    )}
                  </div>
                )}
                expanded={() => (
                  <InlineContactDetail contactId={c.id} onCompose={onCompose} refetch={refetch} allTags={allTags} onTagsChange={refetch} />
                )}
              />
            ))}
          </div>
        </Section>

        {account.id && (
          <AccountLinksSection
            account={account}
            contacts={contacts}
            linkType="partner"
            label="Partners"
            accent="var(--accent)"
            onOpenContact={(id) => setDetailContactId(id)}
          />
        )}
        {account.id && (
          <AccountLinksSection
            account={account}
            contacts={contacts}
            linkType="eclectik_team"
            label="Eclectik team"
            accent="var(--good)"
            onOpenContact={(id) => setDetailContactId(id)}
          />
        )}

        <Section label={`Open deals · ${openDeals.length}`}>
          <div className="deals-list">
            {openDeals.length === 0 && <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>No open deals</div>}
            {openDeals.map(d => (
              <ExpandableRow key={d.id} accent="var(--accent)"
                collapsed={(open) => (
                  <div className="deal-row">
                    <div className="deal-row-left">
                      <span className={`stage-pill stage-${stageClass(d.stage)}`}>{STAGE_TINT[d.stage]?.label || d.stage}</span>
                      <DealTypePill deal={d} refetch={refetch} />
                      <EditableDealTitle deal={d} refetch={refetch} />
                    </div>
                    <div className="deal-row-right">
                      <TeamDots deal={d} />
                      <span className="deal-row-value">{fmtMoney(d.value)}</span>
                    </div>
                  </div>
                )}
                expanded={() => (
                  <InlineDealDetail deal={d}
                    rawItems={rawItems}
                    onCompose={onCompose}
                    onOpenModal={() => onOpenDeal && onOpenDeal(d)}
                    refetch={refetch} />
                )}
              />
            ))}
          </div>
        </Section>

        {activeDeals.length > 0 && (
          <Section label={`Active projects · ${activeDeals.length}`}>
            <div className="deals-list">
              {activeDeals.map(d => (
                <ExpandableRow key={d.id} accent="var(--good)"
                  collapsed={(open) => (
                    <div className="deal-row">
                      <div className="deal-row-left">
                        <span className={`stage-pill stage-${stageClass(d.stage)}`}>{STAGE_TINT[d.stage]?.label || d.stage}</span>
                        <DealTypePill deal={d} refetch={refetch} />
                        <EditableDealTitle deal={d} refetch={refetch} />
                      </div>
                      <div className="deal-row-right">
                        <TeamDots deal={d} />
                        <span className="deal-row-value">{fmtMoney(d.value)}</span>
                      </div>
                    </div>
                  )}
                  expanded={() => (
                    <InlineDealDetail deal={d}
                      rawItems={rawItems}
                      onCompose={onCompose}
                      onOpenModal={() => onOpenDeal && onOpenDeal(d)}
                      refetch={refetch} />
                  )}
                />
              ))}
            </div>
          </Section>
        )}

        {sleepingDeals.length > 0 && (
          <Section label={`Sleeping projects · ${sleepingDeals.length}`} defaultOpen={false}>
            <div className="deals-list">
              {sleepingDeals.map(d => (
                <ExpandableRow key={d.id} accent="oklch(60% 0.10 270)"
                  collapsed={(open) => (
                    <div className="deal-row">
                      <div className="deal-row-left">
                        <span className={`stage-pill stage-${stageClass(d.stage)}`}>{STAGE_TINT[d.stage]?.label || d.stage}</span>
                        <DealTypePill deal={d} refetch={refetch} />
                        <EditableDealTitle deal={d} refetch={refetch} />
                      </div>
                      <div className="deal-row-right">
                        <TeamDots deal={d} />
                        <span className="deal-row-value">{fmtMoney(d.value)}</span>
                      </div>
                    </div>
                  )}
                  expanded={() => (
                    <InlineDealDetail deal={d}
                      rawItems={rawItems}
                      onCompose={onCompose}
                      onOpenModal={() => onOpenDeal && onOpenDeal(d)}
                      refetch={refetch} />
                  )}
                />
              ))}
            </div>
          </Section>
        )}

        {account.id && (
          <Section label="Summary">
            <AccountBrief
              brief={brief}
              briefAt={briefAt}
              loading={briefLoading}
              error={briefError}
              onGenerate={generateBrief}
              interactions={interactions}
              channelLinked={channelLinked}
            />
          </Section>
        )}

        <Section label={`Meetings · ${accEvents.length}${syncingEvents ? ' (syncing…)' : ''}`}>
          {accEvents.length === 0 ? (
            <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>
              {syncingEvents ? 'Syncing calendars…' : 'No meetings scheduled'}
            </div>
          ) : (
            <div className="acc-comms">
              {accEvents.map(e => {
                // Notes can be attached via graph_event_id OR dedup_key
                const noteCount = (notesCountByEvent[e.id] || 0)
                  + (e.dedupKey ? (notesCountByEvent['dedup:' + e.dedupKey] || 0) : 0);
                // Show which users synced this meeting (Marco, Yamilla, etc.)
                const ownerInitials = (e.owners || [])
                  .map(em => (em || '').split('@')[0].split('.').map(p => p[0]).join('').toUpperCase())
                  .filter(Boolean);
                return (
                  <ExpandableRow key={e.id} accent="var(--accent)"
                    collapsed={(open) => (
                      <div className="acc-comm-row">
                        <span className="acc-comm-subj">{e.title}</span>
                        {noteCount > 0 && (
                          <span title={`${noteCount} note${noteCount !== 1 ? 's' : ''} / transcript stored`}
                            style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#1D9E75' }} />
                            {noteCount > 1 ? noteCount : ''}
                          </span>
                        )}
                        <span className="acc-comm-ts">{e.startISO ? new Date(e.startISO).toLocaleDateString('en', { day: 'numeric', month: 'short' }) : ''}</span>
                      </div>
                    )}
                    expanded={() => (
                      <InlineMeetingDetail event={e} companyId={account.id}
                        dedupKey={e.dedupKey}
                        onRefresh={() => {
                          // Refresh note counts
                          supabase.from('meeting_notes').select('event_id, dedup_key').eq('company_id', account.id)
                            .then(({ data }) => {
                              const counts = {};
                              (data || []).forEach(r => {
                                if (r.dedup_key) counts['dedup:' + r.dedup_key] = (counts['dedup:' + r.dedup_key] || 0) + 1;
                                if (r.event_id) counts[r.event_id] = (counts[r.event_id] || 0) + 1;
                              });
                              setNotesCountByEvent(counts);
                            });
                        }} />
                    )}
                  />
                );
              })}
            </div>
          )}
        </Section>

        <Section label={`Recent comms · ${accComms.length}`}>
          {accComms.length === 0 ? (
            <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>No comms logged</div>
          ) : (
            <div className="acc-comms">
              {accComms.map(c => (
                <div key={c.id} className="acc-comm-row" onClick={() => onSelectComm && onSelectComm(c.id)} style={{ cursor: 'pointer' }}>
                  <ChannelIcon ch={c.channel} size={11} />
                  <span className="acc-comm-subj">
                    {c.subject || c.from}
                    {c.from && c.subject && <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>· {c.from}</span>}
                  </span>
                  {c.hasAttach && <span style={{ color: 'var(--text-3)', fontSize: 10 }} title="Has attachments"><I.paperclip /></span>}
                  <span className="acc-comm-ts">{fmtRelative(c.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {account.id && (
          <Section label={`LinkedIn posts${fetchedPosts.length ? ` · ${fetchedPosts.length}` : ''}`}
            actions={
              <>
                {account.linkedin_url && (
                  <button className="btn-ghost tiny"
                    onClick={() => {
                      const url = account.linkedin_url.replace(/\/$/, '');
                      window.open(url + '/posts/?feedView=all', '_blank', 'noopener,noreferrer');
                    }}
                    title="Open the company's LinkedIn posts feed in a new tab">
                    Open on LinkedIn ↗
                  </button>
                )}
                <button className="btn-primary tiny" onClick={fetchLinkedInPosts} disabled={fetchingPosts}
                  title="Pull recent posts from this company and its contacts via Unipile">
                  {fetchingPosts ? 'Fetching…' : hasFetched ? 'Refresh' : 'Fetch posts'}
                </button>
              </>
            }>
            {fetchError && (
              <div style={{ background: 'var(--danger-tint)', border: '0.5px solid var(--danger)', borderRadius: 6, padding: '6px 10px', marginBottom: 8, fontSize: 11, color: 'var(--danger)' }}>
                {fetchError}
              </div>
            )}
            {!hasFetched && !fetchingPosts && fetchedPosts.length === 0 && (
              <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>
                Click <b>Fetch posts</b> to pull recent posts from this company and its contacts.
              </div>
            )}
            {hasFetched && !fetchingPosts && !fetchError && fetchedPosts.length === 0 && (
              <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>
                No original posts from the last 2 months.
              </div>
            )}
            {fetchedPosts.length > 0 && (
              <div className="acc-comms" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fetchedPosts.map((post, idx) => {
                  const text = post.text || post.content || post.commentary || '';
                  const authorName = post._contactName || post.author?.name || (post.author?.first_name ? `${post.author?.first_name || ''} ${post.author?.last_name || ''}`.trim() : '');
                  const postDate = post.parsed_datetime || post.date || post.created_at;
                  const likes = post.reaction_counter ?? post.likes_count ?? post.reactions_count;
                  const comments = post.comment_counter ?? post.comments_count;
                  const reposts = post.repost_counter;
                  const postUrl = post.share_url || post.url || post.post_url;
                  return (
                    <div key={post.social_id || post.id || idx}
                      style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10,
                            background: post._isCompanyPost ? 'var(--warn-tint)' : 'var(--accent-tint)',
                            color: post._isCompanyPost ? 'var(--warn)' : 'var(--accent)',
                            border: `0.5px solid ${post._isCompanyPost ? 'var(--warn)' : 'var(--accent)'}`,
                            fontWeight: 600 }}>
                            {post._isCompanyPost ? 'Company' : 'Contact'}
                          </span>
                          {authorName && <span style={{ fontSize: 12, fontWeight: 500 }}>{authorName}</span>}
                          {postDate && (
                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                              {typeof postDate === 'string' && /^\d/.test(postDate) && postDate.length < 6
                                ? postDate
                                : new Date(postDate).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {postUrl && (
                          <a href={postUrl} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            Open ↗
                          </a>
                        )}
                      </div>
                      {text && <PostText text={text} />}
                      {(likes != null || comments != null || reposts != null) && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--text-3)' }}>
                          {likes != null && <span>{likes} reaction{likes !== 1 ? 's' : ''}</span>}
                          {comments != null && <span>{comments} comment{comments !== 1 ? 's' : ''}</span>}
                          {reposts != null && reposts > 0 && <span>{reposts} repost{reposts !== 1 ? 's' : ''}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        )}

        <Section label={`Tasks · ${openTasks.length}`}
          actions={account.id && (
            <button className="btn-ghost tiny" onClick={() => setShowAddTask(v => !v)} title="Add a new task for this account">
              <I.plus /> Add
            </button>
          )}>
          {showAddTask && account.id && (
            <AddTaskInline
              accountId={account.id}
              onCancel={() => setShowAddTask(false)}
              onDone={() => { setShowAddTask(false); if (refetch) refetch(); }}
            />
          )}
          {openTasks.length === 0 ? (
            !showAddTask && <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>No open tasks</div>
          ) : (
            <div className="actions-list">
              {openTasks.map(t => (
                <ExpandableRow key={t.id} accent="var(--accent)"
                  defaultOpen={highlight?.kind === 'task' && highlight?.item?.id === t.id}
                  collapsed={() => (
                    <div className="action-row" style={{ width: '100%' }}>
                      <span className={`task-check ${t.done ? 'task-check-on' : ''}`}>{t.done && <I.check />}</span>
                      <span style={{ flex: 1 }}>{t.title}</span>
                      {(t.dueLabel || t.ownerRaw) && (
                        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                          {t.dueLabel && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{t.dueLabel}</span>}
                          {t.ownerRaw && <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{t.ownerRaw}</span>}
                        </span>
                      )}
                    </div>
                  )}
                  expanded={() => <InlineTaskDetail taskId={t.id} refetch={refetch} />}
                />
              ))}
            </div>
          )}
        </Section>

        {doneTasks.length > 0 && (
          <Section label={`Completed tasks · ${doneTasks.length}`} defaultOpen={false}>
            <div className="actions-list">
              {doneTasks.map(t => (
                <ExpandableRow key={t.id} accent="var(--good)"
                  collapsed={() => (
                    <div className="action-row" style={{ width: '100%', opacity: 0.7 }}>
                      <span className="task-check task-check-on"><I.check /></span>
                      <span style={{ flex: 1, textDecoration: 'line-through', color: 'var(--text-3)' }}>{t.title}</span>
                      {(t.dueLabel || t.ownerRaw) && (
                        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                          {t.dueLabel && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{t.dueLabel}</span>}
                          {t.ownerRaw && <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{t.ownerRaw}</span>}
                        </span>
                      )}
                    </div>
                  )}
                  expanded={() => <InlineTaskDetail taskId={t.id} refetch={refetch} />}
                />
              ))}
            </div>
          </Section>
        )}
      </div>

      {showAddContact && (
        <AddContactModal
          account={account}
          onClose={() => setShowAddContact(false)}
          onCreated={() => { setShowAddContact(false); if (refetch) refetch(); }}
        />
      )}
      {showSearchContact && (
        <ContactSearchModal
          account={account}
          onClose={() => setShowSearchContact(false)}
          onAdded={() => { if (refetch) refetch(); }}
        />
      )}
      {showLinkExisting && (
        <LinkExistingContactModal
          account={account}
          contacts={contacts}
          onClose={() => setShowLinkExisting(false)}
          onLinked={() => {
            setShowLinkExisting(false);
            if (refetch) refetch();
          }}
        />
      )}
      {showInactivate && (
        <InactivateAccountModal
          account={account}
          contacts={contacts}
          onClose={() => setShowInactivate(false)}
          onDone={() => {
            setShowInactivate(false);
            if (refetch) refetch();
            // Navigate back to the accounts list after inactivation
            if (onPickAccount) onPickAccount(null);
          }}
        />
      )}
      {detailContactId && (
        <ContactDetailModal
          contactId={detailContactId}
          onClose={() => setDetailContactId(null)}
          refetch={refetch}
          onCompose={onCompose}
        />
      )}
      {meetingNoteEvent && (
        <MeetingNoteModal
          event={meetingNoteEvent}
          account={account}
          onClose={() => setMeetingNoteEvent(null)}
          refetch={refetch}
        />
      )}
    </div>
  );
}

// Shows the Eclectik-side team for a deal: owner + any extra team members.
// Dots overlap slightly for compact display.
function TeamDots({ deal }) {
  const members = [];
  if (deal.owner) members.push(deal.owner);
  (deal.team || []).forEach(m => { if (m && !members.includes(m)) members.push(m); });
  if (members.length === 0) return null;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      {members.map((m, i) => (
        <span key={m} style={{ marginLeft: i === 0 ? 0 : -3, display: 'inline-flex' }}>
          <OwnerDot id={m} ring />
        </span>
      ))}
    </div>
  );
}

// Quick-add task form shown inline at the top of the Account 360 Tasks section.
function AddTaskInline({ accountId, onDone, onCancel }) {
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [withId, setWithId] = useState('');
  const [team, setTeam] = useState([]);
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('account_links')
      .select('contact_id, contacts:contact_id(id, full_name, first_name, last_name)')
      .eq('link_type', 'eclectik_team')
      .then(({ data }) => {
        const seen = new Map();
        (data || []).forEach(l => {
          const c = l.contacts;
          if (!c) return;
          const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.full_name || '';
          if (!name || name.includes('@')) return;        // skip blank / email-as-name junk
          const key = name.toLowerCase().replace(/\s+/g, ' ').trim();
          if (!seen.has(key)) seen.set(key, { id: c.id, name });
        });
        setTeam([...seen.values()].sort((a, b) => a.name.localeCompare(b.name)));
      });
  }, []);

  const fieldStyle = {
    padding: '4px 6px', borderRadius: 4, border: '0.5px solid var(--sep)',
    background: 'var(--fill-1)', color: 'var(--text-1)', fontSize: 12,
    fontFamily: 'var(--font)', outline: 'none', width: '100%',
  };
  const labelStyle = { fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' };

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    const { error } = await supabase.from('tasks').insert({
      title: title.trim(), company_id: accountId, status: 'pending',
      owner: owner || null, with_contact_id: withId || null, due_date: due || null, priority,
    });
    setSaving(false);
    if (error) { alert('Could not add task: ' + error.message); return; }
    onDone();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0', borderBottom: '0.5px solid var(--sep)', marginBottom: 8 }}>
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel(); }}
        placeholder="Task title…" style={fieldStyle} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={labelStyle}>Due date</div>
          <input type="date" value={due} onChange={e => setDue(e.target.value)} style={fieldStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={labelStyle}>For</div>
          <select value={owner} onChange={e => setOwner(e.target.value)} style={fieldStyle}>
            <option value="">—</option>
            {['Marco', 'Olivier', 'Yarmilla'].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={labelStyle}>With (Eclectik)</div>
          <select value={withId} onChange={e => setWithId(e.target.value)} style={fieldStyle}>
            <option value="">—</option>
            {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={labelStyle}>Priority</div>
          <select value={priority} onChange={e => setPriority(e.target.value)} style={fieldStyle}>
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn-primary tiny" disabled={!title.trim() || saving} onClick={save}>
          {saving ? 'Adding…' : 'Add task'}
        </button>
        <button className="btn-ghost tiny" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// Account 360 AI summary: a short relationship brief + "needs attention" list,
// generated from the merged interaction streams via /api/account-summary.
function AccountBrief({ brief, briefAt, loading, error, onGenerate, interactions, channelLinked }) {
  const pill = {
    fontSize: 11, padding: '2px 8px', borderRadius: 999, border: '0.5px solid var(--sep)',
    color: 'var(--text-3)', whiteSpace: 'nowrap',
  };
  const warnPill = { ...pill, color: 'var(--warn)', borderColor: 'var(--warn)', background: 'var(--warn-tint)' };
  const dated = (interactions || []).map(i => i.date).filter(Boolean).map(d => new Date(d)).filter(d => !isNaN(d));
  const lastTouch = dated.length ? new Date(Math.max(...dated)) : null;
  const attention = brief?.attention || [];

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {lastTouch && <span style={pill}>last touch {fmtRelative(lastTouch.toISOString())}</span>}
        <span style={pill}>{(interactions || []).length} interactions</span>
        {channelLinked && <span style={{ ...pill, color: 'var(--accent)', borderColor: 'var(--accent)' }}>team channel linked</span>}
        {attention.length > 0 && <span style={warnPill}>{attention.length} need{attention.length === 1 ? 's' : ''} attention</span>}
      </div>

      {!brief && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
            Generate an AI brief of what's happened with this client — across meetings, email, LinkedIn, notes, tasks and the team channel.
          </div>
          <button className="btn-ghost tiny" onClick={onGenerate} style={{ color: 'var(--accent)' }}>✨ Generate brief</button>
        </div>
      )}

      {loading && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Generating brief…</div>}

      {error && !loading && (
        <div style={{ fontSize: 12, color: 'var(--warn)' }}>
          {error} <button className="btn-ghost tiny" onClick={onGenerate} style={{ color: 'var(--accent)' }}>Retry</button>
        </div>
      )}

      {brief && !loading && (
        <div>
          {(brief.paragraphs || []).map((p, i) => (
            <p key={i} style={{ fontSize: 13.5, lineHeight: 1.7, margin: '0 0 10px 0', color: 'var(--text-1)' }}>
              <strong style={{ fontWeight: 600 }}>{p.heading}. </strong>{p.body}
            </p>
          ))}

          {attention.length > 0 && (
            <div style={{
              marginTop: 6, border: '0.5px solid var(--warn)', background: 'var(--warn-tint)',
              borderRadius: 8, padding: '10px 12px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warn)', marginBottom: 6 }}>Needs attention</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {attention.map((a, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-1)', marginBottom: 3 }}>
                    {a.text}{a.meta && <span style={{ color: 'var(--text-3)', fontSize: 12 }}> — {a.meta}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {briefAt ? `Generated ${fmtRelative(briefAt)}` : 'AI-generated · verify before relying on it'}
            </span>
            <button className="btn-ghost tiny" onClick={onGenerate} style={{ color: 'var(--accent)' }}>↻ Refresh</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, actions, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="acc-section">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="acc-section-head" style={{ flex: 1 }} onClick={() => setOpen(o => !o)}>
          {open ? <I.chevronD /> : <I.chevronR />}
          <span>{label}</span>
        </button>
        {actions && <div style={{ display: 'flex', gap: 4, paddingRight: 14 }}>{actions}</div>}
      </div>
      {open && <div className="acc-section-body">{children}</div>}
    </div>
  );
}

function stageClass(stage) {
  const map = {
    qualify: 'lead',
    develop: 'qualified',
    proposal: 'proposal',
    close: 'negotiation',
    onboarding: 'won',
    active: 'won',
    sleeping: 'won',
  };
  return map[stage] || 'lead';
}
