import { useState, useMemo, useEffect } from 'react';
import { I, fmtMoney, fmtRelative, AccountMark, OwnerDot, OwnerChip, ChannelIcon, STAGE_TINT } from './atoms';
import AddAccountModal from './add-account-modal';
import AddContactModal from './add-contact-modal';
import ContactSearchModal from './contact-search-modal';
import InactivateAccountModal from './inactivate-modal';
import ContactDetailModal from './contact-detail-modal';
import MeetingNoteModal from './meeting-note-modal';
import AccountLinksSection from './account-links-section';
import LinkExistingContactModal from './link-existing-contact-modal';
import DuplicateContactsModal from './duplicate-contacts-modal';

// Drag-handle on the left edge of the Accounts lane to resize its width.
// Persists to localStorage and applies via CSS var on document root.
function LaneResizer() {
  const onMouseDown = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragging');
    const startX = e.clientX;
    const root = document.documentElement;
    const startWidth = parseInt(getComputedStyle(root).getPropertyValue('--acc-lane-width')) || 480;
    const handle = e.currentTarget;
    const onMove = (ev) => {
      const dx = startX - ev.clientX; // drag left = wider
      const next = Math.min(900, Math.max(320, startWidth + dx));
      root.style.setProperty('--acc-lane-width', next + 'px');
    };
    const onUp = () => {
      const final = getComputedStyle(root).getPropertyValue('--acc-lane-width').trim();
      try { localStorage.setItem('acc-lane-width', final); } catch (_) {}
      handle.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  return <div className="lane-accounts-resizer" onMouseDown={onMouseDown} title="Drag to resize" />;
}
import ExpandableRow from './expandable-row';
import { InlineContactDetail, InlineMeetingDetail, InlineDealDetail, InlineAccountDetails } from './inline-details';
import { supabase } from '../supabase';
import { syncMyCalendar, getSharedEventsForAccount, buildDedupKey } from './sync-events';
import { useAuth } from '../lib/auth';

export default function AccountsLane({ context, accounts, contacts, deals, rawItems, comms, graphEmails, events, graphEvents, tasks, onPickAccount, onCompose, onOpenDeal, onSelectComm, search, refetch, refetchGraph }) {
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
        <AccountsList accounts={accounts} contacts={contacts} onPickAccount={onPickAccount} search={search}
          onAddAccount={() => setShowAddAccount(true)} />
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
    onPickAccount={onPickAccount} onCompose={onCompose} onOpenDeal={onOpenDeal} onSelectComm={onSelectComm} refetch={refetch} />;
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
    return acc ? { account: acc, highlight: { kind: 'task', item: t, title: t.title, body: t.dueLabel } } : null;
  }
  return null;
}

function AccountsList({ accounts, contacts, onPickAccount, search, onAddAccount }) {
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

  // Build a lookup: for each account id, which contacts match current filter (by name/email/role)
  // Used so "Mark van Veldhoven" finds companies where he's a contact.
  const matchContactAccounts = (query) => {
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
    return set;
  };

  const filtered = useMemo(() => {
    let list = accounts || [];
    // Global topbar search — matches account OR any of its contacts
    if (q) {
      const contactAccts = matchContactAccounts(q);
      list = list.filter(a =>
        a.name.toLowerCase().includes(q)
        || (a.industry || '').toLowerCase().includes(q)
        || (a.country || '').toLowerCase().includes(q)
        || (contactAccts && contactAccts.has(a.id))
      );
    }
    // Local name/contact filter
    const nf = nameFilter.trim().toLowerCase();
    if (nf) {
      const contactAccts = matchContactAccounts(nf);
      list = list.filter(a =>
        a.name.toLowerCase().includes(nf)
        || (contactAccts && contactAccts.has(a.id))
      );
    }
    if (typeFilters.length) list = list.filter(a => typeFilters.includes(a.type));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts, contacts, q, typeFilters, nameFilter]);

  return (
    <div className="lane lane-accounts">
      <LaneResizer />
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
            placeholder="Filter by company or contact name…" />
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

function AccountDetail({ account, highlight, accounts, contacts, deals, rawItems, comms, graphEmails, events, tasks, onPickAccount, onCompose, onOpenDeal, onSelectComm, refetch }) {
  const [showAddContact, setShowAddContact] = useState(false);
  const [showSearchContact, setShowSearchContact] = useState(false);
  const [showLinkExisting, setShowLinkExisting] = useState(false);
  const [showInactivate, setShowInactivate] = useState(false);
  const [detailContactId, setDetailContactId] = useState(null);
  const [meetingNoteEvent, setMeetingNoteEvent] = useState(null);
  const [showCoreDetails, setShowCoreDetails] = useState(false);
  // Shared calendar events for this account (synced from all users' Outlook)
  const [sharedEvents, setSharedEvents] = useState([]);
  const [syncingEvents, setSyncingEvents] = useState(false);

  const { session } = useAuth();
  const userEmail = session?.user?.email || '';
  const userName = session?.user?.user_metadata?.full_name || '';

  // Sync my calendar + refetch shared events whenever a new account is opened.
  useEffect(() => {
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
  // Sort contacts A-Z by first name (fall back to full name)
  const accContacts = contacts
    .filter(c => c.accountId === account.id)
    .slice()
    .sort((a, b) => {
      const fa = (a.first_name || (a.name || '').split(' ')[0] || '').toLowerCase();
      const fb = (b.first_name || (b.name || '').split(' ')[0] || '').toLowerCase();
      return fa.localeCompare(fb);
    });
  const accDeals = deals.filter(d => d.accountId === account.id);
  const openDeals = accDeals.filter(d => ['qualify', 'develop', 'proposal', 'close'].includes(d.stage));
  const activeDeals = accDeals.filter(d => ['onboarding', 'active'].includes(d.stage));
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
  const allComms = [...(comms || []).filter(c => c.accountId === account.id), ...matchedGraph];
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
  const accTasks = tasks.filter(t => t.accountId === account.id);
  const openTasks = accTasks.filter(t => !t.done);

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
      <LaneResizer />
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
                  <div className="contact-card">
                    <div style={{
                      width: 22, height: 22, borderRadius: 11,
                      background: c.avatarBg || '#F1EFE8', color: c.avatarColor || '#888',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 600,
                      ...(c.isPrimary ? { boxShadow: '0 0 0 2px var(--good)' } : {}),
                    }}>
                      {c.initials || (c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="contact-name">
                        {c.name}
                        {c.isPrimary && <span title="Primary contact" style={{ color: 'var(--good)', marginLeft: 6, fontSize: 10, fontFamily: 'var(--font-mono)' }}>★</span>}
                      </div>
                      {c.role && <div className="contact-role">{c.role}</div>}
                    </div>
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
                  <InlineContactDetail contactId={c.id} onCompose={onCompose} refetch={refetch} />
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
                      <span className="deal-row-title">{d.title}</span>
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
                        <span className="deal-row-title">{d.title}</span>
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
                        {e.channel && <ChannelIcon ch={e.channel} size={11} />}
                        <span className="acc-comm-subj">{e.title}</span>
                        {ownerInitials.length > 0 && (
                          <span title={`Synced from: ${e.owners.join(', ')}`}
                            style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                            {ownerInitials.slice(0, 3).join('/')}
                          </span>
                        )}
                        {noteCount > 0 && (
                          <span title={`${noteCount} note${noteCount !== 1 ? 's' : ''}`}
                            style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            📝{noteCount > 1 ? noteCount : ''}
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

        <Section label={`Tasks · ${openTasks.length}`}>
          {openTasks.length === 0 ? (
            <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>No open tasks</div>
          ) : (
            <div className="actions-list">
              {openTasks.map(t => (
                <div key={t.id} className="action-row">
                  <span className={`task-check ${t.done ? 'task-check-on' : ''}`}>{t.done && <I.check />}</span>
                  <span>{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
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

function Section({ label, actions, children }) {
  const [open, setOpen] = useState(true);
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
  };
  return map[stage] || 'lead';
}
