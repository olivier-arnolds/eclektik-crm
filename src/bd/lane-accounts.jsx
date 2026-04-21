import { useState, useMemo } from 'react';
import { I, fmtMoney, fmtRelative, AccountMark, OwnerDot, OwnerChip, ChannelIcon, STAGE_TINT } from './atoms';

export default function AccountsLane({ context, accounts, contacts, deals, comms, events, tasks, onPickAccount, onCompose, onOpenDeal, onSelectComm, search }) {
  // Resolve context → account to show
  const resolved = useMemo(() => resolveContext(context, { accounts, contacts, deals, comms, events, tasks }), [context, accounts, contacts, deals, comms, events, tasks]);

  if (!resolved) {
    return <AccountsList accounts={accounts} onPickAccount={onPickAccount} search={search} />;
  }

  return <AccountDetail {...resolved} accounts={accounts} contacts={contacts} deals={deals} comms={comms} events={events} tasks={tasks}
    onPickAccount={onPickAccount} onCompose={onCompose} onOpenDeal={onOpenDeal} onSelectComm={onSelectComm} />;
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
    const acc = accounts.find(a => a.id === e.accountId);
    return acc ? { account: acc, highlight: { kind: 'event', item: e, title: e.title, body: e.attendees } } : null;
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

function AccountsList({ accounts, onPickAccount, search }) {
  const q = (search || '').toLowerCase();
  const filtered = useMemo(() => {
    const list = q
      ? accounts.filter(a => a.name.toLowerCase().includes(q) || (a.industry || '').toLowerCase().includes(q))
      : accounts;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts, q]);

  return (
    <div className="lane lane-accounts">
      <div className="lane-header">
        <div className="lane-title">
          <span className="lane-title-label">Accounts</span>
          <span className="lane-title-count">{filtered.length}</span>
        </div>
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

function AccountDetail({ account, highlight, accounts, contacts, deals, comms, events, tasks, onPickAccount, onCompose, onOpenDeal, onSelectComm }) {
  const accContacts = contacts.filter(c => c.accountId === account.id);
  const accDeals = deals.filter(d => d.accountId === account.id);
  const openDeals = accDeals.filter(d => ['qualify', 'develop', 'proposal', 'close'].includes(d.stage));
  const activeDeals = accDeals.filter(d => ['onboarding', 'active'].includes(d.stage));
  const accComms = comms.filter(c => c.accountId === account.id).sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0)).slice(0, 8);
  const accEvents = events.filter(e => e.accountId === account.id).sort((a, b) => new Date(a.startISO || 0) - new Date(b.startISO || 0));
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

        <Section label={`Contacts · ${accContacts.length}`}>
          <div className="contacts-grid">
            {accContacts.length === 0 && <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>No contacts</div>}
            {accContacts.map(c => (
              <div key={c.id} className="contact-card">
                <div style={{ width: 22, height: 22, borderRadius: 11, background: c.avatarBg || '#F1EFE8', color: c.avatarColor || '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                  {c.initials || (c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="contact-name">{c.name}</div>
                  {c.role && <div className="contact-role">{c.role}</div>}
                </div>
                {c.email && onCompose && (
                  <button className="icon-btn tiny" onClick={() => onCompose({ to: c.email, contact: c })} title="Email">
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

        <Section label={`Upcoming meetings · ${accEvents.length}`}>
          {accEvents.length === 0 ? (
            <div className="empty" style={{ padding: '8px 0', textAlign: 'left' }}>No meetings scheduled</div>
          ) : (
            <div className="acc-comms">
              {accEvents.map(e => (
                <div key={e.id} className="acc-comm-row">
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
    </div>
  );
}

function Section({ label, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="acc-section">
      <button className="acc-section-head" onClick={() => setOpen(o => !o)}>
        {open ? <I.chevronD /> : <I.chevronR />}
        <span>{label}</span>
      </button>
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
