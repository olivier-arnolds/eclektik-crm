import { useState, useMemo } from 'react';
import { I, fmtMoney, fmtRelative, AccountMark, OwnerDot, OwnerChip, ChannelIcon, STAGE_TINT } from './atoms';
import AddAccountModal from './add-account-modal';
import AddContactModal from './add-contact-modal';
import ContactSearchModal from './contact-search-modal';
import InactivateAccountModal from './inactivate-modal';
import ContactDetailModal from './contact-detail-modal';
import MeetingNoteModal from './meeting-note-modal';

export default function AccountsLane({ context, accounts, contacts, deals, comms, events, graphEvents, tasks, onPickAccount, onCompose, onOpenDeal, onSelectComm, search, refetch }) {
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
      accountId: null,
    }));
    const ids = new Set((events || []).map(e => e.id));
    return [...(events || []), ...mappedGraph.filter(e => !ids.has(e.id))];
  }, [events, graphEvents]);

  const resolved = useMemo(() => resolveContext(context, { accounts, contacts, deals, comms, events: allEvents, tasks }), [context, accounts, contacts, deals, comms, allEvents, tasks]);
  const [showAddAccount, setShowAddAccount] = useState(false);

  if (!resolved) {
    return (
      <>
        <AccountsList accounts={accounts} onPickAccount={onPickAccount} search={search}
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

  return <AccountDetail {...resolved} accounts={accounts} contacts={contacts} deals={deals} comms={comms} events={allEvents} tasks={tasks}
    onPickAccount={onPickAccount} onCompose={onCompose} onOpenDeal={onOpenDeal} onSelectComm={onSelectComm} refetch={refetch} />;
}

function resolveContext(context, data) {
  if (!context) return null;
  const { accounts, contacts, deals, comms, events, tasks } = data;
  if (context.type === 'account') {
    const acc = accounts.find(a => a.id === context.id);
    return acc ? { account: acc, highlight: null } : null;
  }
  if (context.type === 'comm') {
    const c = comms.find(x => x.id === context.id);
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

    // 3) Match attendee email domain to company website domain
    if (!acc && attendeeEmails.length) {
      for (const email of attendeeEmails) {
        const domain = email.split('@')[1];
        if (!domain) continue;
        const found = accounts.find(a => {
          const web = (a.website || '').toLowerCase();
          return web && (web.includes(domain) || domain.includes(web.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]));
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

function AccountsList({ accounts, onPickAccount, search, onAddAccount }) {
  const q = (search || '').toLowerCase();
  const [typeFilters, setTypeFilters] = useState([]);
  const [nameFilter, setNameFilter] = useState('');

  // Build a dynamic list of all types present in our data (sorted, unique)
  const allTypes = useMemo(() => {
    const set = new Set();
    (accounts || []).forEach(a => { if (a.type) set.add(a.type); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [accounts]);

  const toggleType = (t) => setTypeFilters(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const filtered = useMemo(() => {
    let list = accounts || [];
    // Global topbar search
    if (q) list = list.filter(a => a.name.toLowerCase().includes(q) || (a.industry || '').toLowerCase().includes(q));
    // Local name filter
    const nf = nameFilter.trim().toLowerCase();
    if (nf) list = list.filter(a => a.name.toLowerCase().includes(nf));
    if (typeFilters.length) list = list.filter(a => typeFilters.includes(a.type));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts, q, typeFilters, nameFilter]);

  return (
    <div className="lane lane-accounts">
      <div className="lane-header">
        <div className="lane-title">
          <span className="lane-title-label">Accounts</span>
          <span className="lane-title-count">{filtered.length}{filtered.length !== accounts.length ? ` / ${accounts.length}` : ''}</span>
        </div>
        <div className="lane-actions">
          {onAddAccount && (
            <button className="btn-primary tiny" onClick={onAddAccount}>
              <I.plus /> New account
            </button>
          )}
        </div>
      </div>

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
            placeholder="Filter by company name…" />
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

function AccountDetail({ account, highlight, accounts, contacts, deals, comms, events, tasks, onPickAccount, onCompose, onOpenDeal, onSelectComm, refetch }) {
  const [showAddContact, setShowAddContact] = useState(false);
  const [showSearchContact, setShowSearchContact] = useState(false);
  const [showInactivate, setShowInactivate] = useState(false);
  const [detailContactId, setDetailContactId] = useState(null);
  const [meetingNoteEvent, setMeetingNoteEvent] = useState(null);
  const accContacts = contacts.filter(c => c.accountId === account.id);
  const accDeals = deals.filter(d => d.accountId === account.id);
  const openDeals = accDeals.filter(d => ['qualify', 'develop', 'proposal', 'close'].includes(d.stage));
  const activeDeals = accDeals.filter(d => ['onboarding', 'active'].includes(d.stage));
  const accComms = comms.filter(c => c.accountId === account.id).sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0)).slice(0, 8);
  // Show ALL meetings (past + future) — resolve account via accountId OR via attendee/domain matching
  const accEvents = (events || []).filter(e => {
    if (!account.id) return false;
    if (e.accountId === account.id) return true;
    // Additionally include graph events whose attendees match one of our contacts at this account
    const attEmails = (e.attendeesEmails && e.attendeesEmails.length
      ? e.attendeesEmails.map(s => (s || '').toLowerCase())
      : []);
    if (!attEmails.length) return false;
    const accContactEmails = new Set((contacts || []).filter(c => c.accountId === account.id && c.email).map(c => c.email.toLowerCase()));
    if (attEmails.some(e => accContactEmails.has(e))) return true;
    // Domain match against account website
    const web = (account.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (web) {
      return attEmails.some(e => (e.split('@')[1] || '').includes(web));
    }
    return false;
  }).sort((a, b) => new Date(b.startISO || 0) - new Date(a.startISO || 0));
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

      <div className="acc-hero">
        <AccountMark account={account} size={40} />
        <div>
          <div className="acc-hero-name">{account.name}</div>
          <div className="acc-hero-meta">
            <span>{account.type || '—'}</span>
            {account.tier && <><span className="sep">·</span><span>{account.tier}</span></>}
            {account.region && <><span className="sep">·</span><span>{account.region}</span></>}
            {account.arr && <><span className="sep">·</span><span>{account.arr}</span></>}
          </div>
        </div>
        {account.owner && <div style={{ marginLeft: 'auto' }}><OwnerChip id={account.owner} /></div>}
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
              <button className="btn-ghost tiny" onClick={() => setShowSearchContact(true)}>
                <I.search /> Search
              </button>
              <button className="btn-ghost tiny" onClick={() => setShowAddContact(true)}>
                <I.plus /> Add
              </button>
            </>
          )}>
          <div className="contacts-grid">
            {accContacts.length === 0 && <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>No contacts</div>}
            {accContacts.map(c => (
              <div key={c.id} className="contact-card" style={{ cursor: 'pointer' }}
                onClick={() => setDetailContactId(c.id)}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: c.avatarBg || '#F1EFE8', color: c.avatarColor || '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                  {c.initials || (c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="contact-name">{c.name}</div>
                  {c.role && <div className="contact-role">{c.role}</div>}
                </div>
                {c.email && onCompose && (
                  <button className="icon-btn tiny" onClick={(e) => { e.stopPropagation(); onCompose({ to: c.email, contact: c }); }} title="Email">
                    <I.send />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section label={`Open deals · ${openDeals.length}`}>
          <div className="deals-list">
            {openDeals.length === 0 && <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>No open deals</div>}
            {openDeals.map(d => (
              <div key={d.id} className="deal-row" onClick={() => onOpenDeal && onOpenDeal(d)}>
                <div className="deal-row-left">
                  <span className={`stage-pill stage-${stageClass(d.stage)}`}>{STAGE_TINT[d.stage]?.label || d.stage}</span>
                  <span className="deal-row-title">{d.title}</span>
                </div>
                <div className="deal-row-right">
                  {d.owner && <OwnerDot id={d.owner} />}
                  <span className="deal-row-value">{fmtMoney(d.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {activeDeals.length > 0 && (
          <Section label={`Active projects · ${activeDeals.length}`}>
            <div className="deals-list">
              {activeDeals.map(d => (
                <div key={d.id} className="deal-row" onClick={() => onOpenDeal && onOpenDeal(d)}>
                  <div className="deal-row-left">
                    <span className={`stage-pill stage-${stageClass(d.stage)}`}>{STAGE_TINT[d.stage]?.label || d.stage}</span>
                    <span className="deal-row-title">{d.title}</span>
                  </div>
                  <div className="deal-row-right">
                    {d.owner && <OwnerDot id={d.owner} />}
                    <span className="deal-row-value">{fmtMoney(d.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section label={`Meetings · ${accEvents.length}`}>
          {accEvents.length === 0 ? (
            <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>No meetings scheduled</div>
          ) : (
            <div className="acc-comms">
              {accEvents.map(e => (
                <div key={e.id} className="acc-comm-row" onClick={() => setMeetingNoteEvent(e)} style={{ cursor: 'pointer' }} title="Click to add/view meeting notes">
                  {e.channel && <ChannelIcon ch={e.channel} size={11} />}
                  <span className="acc-comm-subj">{e.title}</span>
                  <span className="acc-comm-ts">{e.startISO ? new Date(e.startISO).toLocaleDateString('en', { day: 'numeric', month: 'short' }) : ''}</span>
                </div>
              ))}
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
                  <span className="acc-comm-subj">{c.subject || c.from}</span>
                  <span className="acc-comm-ts">{fmtRelative(c.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section label={`Open tasks · ${openTasks.length}`}>
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
