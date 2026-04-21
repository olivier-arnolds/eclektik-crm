import { useMemo, useState, useEffect } from 'react';
import { I, fmtMoney, fmtRelative, AccountMark, ChannelIcon, OwnerDot, STAGE_TINT } from './atoms';

// Slide-over panel that shows unified global search results.
// Rendered absolutely over the right (accounts) lane when search.length >= 2.
//
// Props:
// - query: the current search string
// - accounts, contacts, deals, events, graphEvents, tasks: data sources
// - onPickAccount(acc): navigate to account in 360°
// - onOpenContact(id): open ContactDetailModal
// - onOpenDeal(deal): open DealDetailModal
// - onSelectEvent(ev): highlight event in accounts panel
// - onClose(): dismiss the panel (does NOT clear the search string)
// - onClearSearch(): clear the search string and dismiss
export default function SearchResultsPanel({
  query, accounts, contacts, deals, events, graphEvents, tasks,
  onPickAccount, onOpenContact, onOpenDeal, onSelectEvent,
  onClose, onClearSearch,
}) {
  const q = (query || '').toLowerCase().trim();
  const has = (s) => (s || '').toLowerCase().includes(q);

  const results = useMemo(() => {
    if (q.length < 2) return { accounts: [], contacts: [], deals: [], meetings: [], tasks: [] };

    const matchedAccounts = (accounts || []).filter(a =>
      has(a.name) || has(a.industry) || has(a.region) || has(a.city) || has(a.website)
    );

    const matchedContacts = (contacts || []).filter(c =>
      has(c.name) || has(c.email) || has(c.role) || has(c.account)
    );

    const matchedDeals = (deals || []).filter(d =>
      has(d.title) || has(d.account) || has(d.contact) || has(d.dealType) || has(d.description)
    );

    // Meetings = DB events + graph events
    const allEvents = [
      ...(events || []),
      ...(graphEvents || []).map(e => ({
        id: 'graph:' + e.id,
        title: e.title,
        startISO: e.startAt,
        attendees: e.attendees,
        attendeesEmails: e.attendeesEmails,
        channel: e.isOnline ? 'teams' : null,
      })),
    ];
    const seenEvIds = new Set();
    const matchedMeetings = allEvents.filter(e => {
      if (seenEvIds.has(e.id)) return false;
      seenEvIds.add(e.id);
      return has(e.title) || has(e.attendees);
    });

    const matchedTasks = (tasks || []).filter(t => has(t.title));

    return {
      accounts: matchedAccounts,
      contacts: matchedContacts,
      deals: matchedDeals,
      meetings: matchedMeetings,
      tasks: matchedTasks,
    };
  }, [q, accounts, contacts, deals, events, graphEvents, tasks]);

  // Escape key closes
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const totalCount =
    results.accounts.length + results.contacts.length +
    results.deals.length + results.meetings.length + results.tasks.length;

  if (q.length < 2) return null;

  return (
    <div style={{
      position: 'absolute', top: 10, right: 10, bottom: 34,
      width: 380, maxWidth: '45vw',
      background: 'var(--bg-1)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-2)',
      border: '0.5px solid var(--sep)',
      display: 'flex', flexDirection: 'column',
      zIndex: 30,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '0.5px solid var(--sep)',
        display: 'flex', alignItems: 'center', gap: 8,
        flex: '0 0 auto',
      }}>
        <I.search />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Results for "{query}"
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {totalCount} match{totalCount !== 1 ? 'es' : ''}
          </div>
        </div>
        <button className="btn-ghost tiny" onClick={onClearSearch}>Clear</button>
        <button className="icon-btn" onClick={onClose} title="Close (Esc)">
          <I.close />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
        {totalCount === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
            No matches found.
          </div>
        )}

        <ResultGroup title="Accounts" count={results.accounts.length}>
          {results.accounts.slice(0, 6).map(a => (
            <ResultRow key={a.id} onClick={() => { onPickAccount(a); onClose(); }}>
              <AccountMark account={a} size={22} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={rowTitle}>{highlight(a.name, q)}</div>
                <div style={rowMeta}>
                  {a.type && <span>{a.type}</span>}
                  {a.region && <><span>·</span><span>{a.region}</span></>}
                  {a.industry && <><span>·</span><span>{a.industry}</span></>}
                </div>
              </div>
              {a.owner && <OwnerDot id={a.owner} />}
            </ResultRow>
          ))}
          {results.accounts.length > 6 && <MoreRow count={results.accounts.length - 6} />}
        </ResultGroup>

        <ResultGroup title="Contacts" count={results.contacts.length}>
          {results.contacts.slice(0, 6).map(c => (
            <ResultRow key={c.id} onClick={() => { onOpenContact(c.id); }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: c.avatarBg || 'var(--fill-2)', color: c.avatarColor || 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                {c.initials || (c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={rowTitle}>{highlight(c.name, q)}</div>
                <div style={rowMeta}>
                  {c.account && <span>{c.account}</span>}
                  {c.role && <><span>·</span><span>{c.role}</span></>}
                </div>
                {c.email && <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>}
              </div>
            </ResultRow>
          ))}
          {results.contacts.length > 6 && <MoreRow count={results.contacts.length - 6} />}
        </ResultGroup>

        <ResultGroup title="Deals" count={results.deals.length}>
          {results.deals.slice(0, 6).map(d => (
            <ResultRow key={d.id} onClick={() => { onOpenDeal(d); onClose(); }}>
              <span className="stage-pill" style={{
                background: `oklch(92% 0.05 ${STAGE_TINT[d.stage]?.hue || 220})`,
                color: `oklch(40% 0.12 ${STAGE_TINT[d.stage]?.hue || 220})`,
                flexShrink: 0,
              }}>{STAGE_TINT[d.stage]?.label || d.stage}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={rowTitle}>{highlight(d.title, q)}</div>
                <div style={rowMeta}>
                  {d.account && <span>{d.account}</span>}
                  {d.contact && <><span>·</span><span>{d.contact}</span></>}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>{fmtMoney(d.value)}</span>
            </ResultRow>
          ))}
          {results.deals.length > 6 && <MoreRow count={results.deals.length - 6} />}
        </ResultGroup>

        <ResultGroup title="Meetings" count={results.meetings.length}>
          {results.meetings.slice(0, 6).map(e => (
            <ResultRow key={e.id} onClick={() => { onSelectEvent(e); onClose(); }}>
              {e.channel === 'teams' ? <ChannelIcon ch="teams" size={14} /> : <I.calendar />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={rowTitle}>{highlight(e.title, q)}</div>
                {e.attendees && <div style={rowMeta}>{e.attendees}</div>}
              </div>
              {e.startISO && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
                  {new Date(e.startISO).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </ResultRow>
          ))}
          {results.meetings.length > 6 && <MoreRow count={results.meetings.length - 6} />}
        </ResultGroup>

        <ResultGroup title="Tasks" count={results.tasks.length}>
          {results.tasks.slice(0, 6).map(t => (
            <ResultRow key={t.id} onClick={() => { /* no-op for now, tasks are viewed inline */ }}>
              <span className={`task-check ${t.done ? 'task-check-on' : ''}`} style={{ flexShrink: 0 }}>
                {t.done && <I.check />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={rowTitle}>{highlight(t.title, q)}</div>
                {t.dueLabel && <div style={rowMeta}>{t.dueLabel}</div>}
              </div>
            </ResultRow>
          ))}
          {results.tasks.length > 6 && <MoreRow count={results.tasks.length - 6} />}
        </ResultGroup>
      </div>
    </div>
  );
}

const rowTitle = {
  fontSize: 12, fontWeight: 500, color: 'var(--text-1)',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const rowMeta = {
  fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
  display: 'flex', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

function ResultGroup({ title, count, children }) {
  if (count === 0) return null;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        padding: '6px 10px 4px',
        fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span>{title}</span>
        <span>·</span>
        <span>{count}</span>
      </div>
      {children}
    </div>
  );
}

function ResultRow({ onClick, children }) {
  return (
    <div onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', cursor: 'pointer', borderRadius: 6, margin: '0 4px',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-1)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {children}
    </div>
  );
}

function MoreRow({ count }) {
  return (
    <div style={{ padding: '4px 14px', fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
      +{count} more
    </div>
  );
}

// Simple highlight helper: wrap matching substring in <mark>
function highlight(text, q) {
  if (!text || !q) return text || '';
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background: 'var(--accent-tint)', color: 'var(--accent)', borderRadius: 3, padding: '0 2px' }}>
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}
