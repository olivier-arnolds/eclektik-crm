import { useState, useEffect } from 'react';
import { I, fmtMoney, OwnerDot, AccountMark, StaleDot, OWNERS, STAGE_TINT } from './atoms';
import { STAGES, stageUpdates } from './adapters';
import { updateRow } from '../hooks/useSupabase';
import { supabase } from '../supabase';
import { promoteLeadToOpportunity } from './lead-promote';
import NewDealModal from './new-deal-modal';
import BulkLinkDealsModal from './bulk-link-deals-modal';

const toggle = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

export default function FunnelLane({ deals, accounts, contacts, filters, setFilters, onSelectDeal, onEditDeal, onClose, refetch, search, expanded, onToggleExpand }) {
  const [collapsed, setCollapsed] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [confirmMove, setConfirmMove] = useState(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [showBulkLink, setShowBulkLink] = useState(false);
  const [pendingByDealId, setPendingByDealId] = useState({});

  useEffect(() => {
    function loadSuggestions() {
      supabase.from('playbook_suggestions')
        .select('deal_id, playbook_id, playbooks(name)')
        .eq('status', 'pending')
        .not('deal_id', 'is', null)
        .then(({ data }) => {
          const map = {};
          (data || []).forEach(s => {
            if (!map[s.deal_id]) map[s.deal_id] = [];
            map[s.deal_id].push(s);
          });
          setPendingByDealId(map);
        });
    }
    loadSuggestions();
    const channel = supabase
      .channel('lane_funnel_suggestions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playbook_suggestions' }, loadSuggestions)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const q = (search || '').toLowerCase();
  const matchesSearch = (d) => !q ||
    d.title.toLowerCase().includes(q) ||
    d.account.toLowerCase().includes(q) ||
    d.contact.toLowerCase().includes(q);

  const filteredDeals = deals.filter(d => {
    if (filters?.owners?.length && !filters.owners.includes(d.owner)) return false;
    if (filters?.types?.length) {
      const dealTypes = (d.dealType || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!filters.types.some(t => dealTypes.includes(t))) return false;
    }
    if (!matchesSearch(d)) return false;
    return true;
  });

  const byStage = STAGES.map(s => ({
    stage: s,
    deals: filteredDeals.filter(d => d.stage === s.id),
  }));

  // Won-side stages: deals here are "won" (positive outcome).
  // Used to auto-promote Prospect→Customer when first entering this side.
  const WON_STAGES = ['onboarding', 'active', 'sleeping'];
  // Stages that only opportunities can occupy. A lead dragged onto one of
  // these is auto-promoted into the opportunities table first.
  const OPP_ONLY_STAGES = ['develop', 'proposal', 'onboarding', 'active', 'sleeping'];

  const doMove = async (dealId, toStage) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) { setConfirmMove(null); return; }

    try {
      // Lead → opportunity auto-promote: leads have no `stage` column, so
      // any drop on an opp-only stage requires moving the row to the
      // opportunities table first.
      if (deal.table === 'leads' && OPP_ONLY_STAGES.includes(toStage)) {
        await promoteLeadToOpportunity(dealId, toStage);
      } else {
        const updates = stageUpdates(toStage, deal.table);
        const { error: upErr } = await updateRow(deal.table, dealId, updates);
        if (upErr) throw new Error(upErr.message);
      }
    } catch (e) {
      alert('Move failed: ' + (e.message || String(e)));
      setConfirmMove(null);
      return;
    }

    // First entry into the won-side (onboarding/active/sleeping) means the
    // deal was won — promote the parent account from Prospect to Customer.
    const enteringWonSide = WON_STAGES.includes(toStage) && !WON_STAGES.includes(deal.stage);
    if (enteringWonSide && deal.accountId) {
      const acc = (accounts || []).find(a => a.id === deal.accountId);
      if (acc && (acc.type || '').toLowerCase() === 'prospect') {
        await updateRow('companies', deal.accountId, { type: 'Customer' });
      }
    }
    setConfirmMove(null);
    if (refetch) refetch();
  };

  const totalValue = filteredDeals.reduce((s, d) => s + d.value, 0);

  return (
    <div className="lane lane-funnel">
      <div className="lane-header">
        <div className="lane-title">
          <span className="lane-title-label">Funnel</span>
          <span className="lane-title-count">{filteredDeals.length} deals · {fmtMoney(totalValue)}</span>
        </div>
        <div className="lane-actions">
          <button className="btn-primary tiny" onClick={() => setShowNewDeal(true)}>
            <I.plus /> New deal
          </button>
          <button className="btn-ghost tiny" onClick={() => setShowBulkLink(true)} title="Link unlinked deals to existing accounts">
            Link deals
          </button>
          <button className="btn-ghost tiny" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          {onToggleExpand && (
            <button className="icon-btn" onClick={onToggleExpand} title={expanded ? 'Collapse to 3-lane view' : 'Expand full width'}>
              <span style={{ fontSize: 14, display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                ›
              </span>
            </button>
          )}
          {onClose && (
            <button className="icon-btn" onClick={onClose} title="Close">
              <I.close />
            </button>
          )}
        </div>
      </div>

      <div className="funnel-filters">
        <div className="filter-group">
          <span className="filter-label">Owner</span>
          {Object.values(OWNERS).map(o => (
            <button key={o.id}
              className={`chip ${filters?.owners?.includes(o.id) ? 'chip-on' : ''}`}
              onClick={() => setFilters({ ...filters, owners: toggle(filters?.owners || [], o.id) })}>
              <span className="owner-mini-dot" style={{ background: o.color }} />
              {o.id}
            </button>
          ))}
        </div>
        <div className="filter-group">
          <span className="filter-label">Type</span>
          {['Glint', 'ROI', 'Seer', 'Insights', 'Other'].map(t => (
            <button key={t}
              className={`chip ${filters?.types?.includes(t) ? 'chip-on' : ''}`}
              onClick={() => setFilters({ ...filters, types: toggle(filters?.types || [], t) })}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="funnel-lanes">
        {byStage.map(({ stage, deals: sDeals }) => {
          const total = sDeals.reduce((s, d) => s + d.value, 0);
          const isOver = overStage === stage.id;
          return (
            <div key={stage.id} className={`swimlane ${isOver ? 'swimlane-over' : ''} ${collapsed ? 'swimlane-collapsed' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage.id); }}
              onDragLeave={() => setOverStage(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOverStage(null);
                if (draggingId) {
                  const d = deals.find(x => x.id === draggingId);
                  if (d && d.stage !== stage.id) {
                    setConfirmMove({ dealId: draggingId, toStage: stage.id });
                  }
                  setDraggingId(null);
                }
              }}>
              <div className="swimlane-head" style={{ '--stage-hue': stage.hue }}>
                <div className="swimlane-head-top">
                  <span className="swimlane-dot" />
                  <span className="swimlane-label">{stage.label}</span>
                  <span className="swimlane-count">{sDeals.length}</span>
                </div>
                <div className="swimlane-value">{fmtMoney(total)}</div>
              </div>
              {!collapsed && (
                <div className="swimlane-body">
                  {sDeals.map(d => (
                    <DealCard key={d.id} deal={d} accounts={accounts}
                      dragging={draggingId === d.id}
                      onDragStart={() => setDraggingId(d.id)}
                      onDragEnd={() => setDraggingId(null)}
                      onClick={() => onSelectDeal && onSelectDeal(d)}
                      onEdit={onEditDeal}
                      pendingSuggestions={pendingByDealId[d.id] || []} />
                  ))}
                  {sDeals.length === 0 && <div className="swimlane-empty">No deals</div>}
                </div>
              )}
              {collapsed && (
                <div className="swimlane-summary">
                  {sDeals.slice(0, 3).map(d => (
                    <div key={d.id} className="swimlane-summary-row" onClick={() => onSelectDeal && onSelectDeal(d)}>
                      <OwnerDot id={d.owner} />
                      <span>{d.title}</span>
                      <span className="swimlane-summary-value">{fmtMoney(d.value)}</span>
                    </div>
                  ))}
                  {sDeals.length > 3 && <div className="swimlane-more">+{sDeals.length - 3} more</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNewDeal && (
        <NewDealModal
          accounts={accounts}
          contacts={contacts}
          onClose={() => setShowNewDeal(false)}
          onCreated={() => { setShowNewDeal(false); if (refetch) refetch(); }}
        />
      )}

      {showBulkLink && (
        <BulkLinkDealsModal
          accounts={accounts}
          onClose={() => setShowBulkLink(false)}
          onDone={() => { setShowBulkLink(false); if (refetch) refetch(); }}
        />
      )}

      {confirmMove && (() => {
        const mvDeal = deals.find(d => d.id === confirmMove.dealId);
        return (
        <div className="modal-backdrop" onClick={() => setConfirmMove(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              Move deal to {STAGE_TINT[confirmMove.toStage]?.label || confirmMove.toStage}?
            </div>
            <div className="modal-body">
              <div className="modal-body-strong">{mvDeal?.title}</div>
              <div className="modal-body-sub">
                From <b>{STAGE_TINT[mvDeal?.stage]?.label}</b> → <b>{STAGE_TINT[confirmMove.toStage]?.label}</b>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setConfirmMove(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => doMove(confirmMove.dealId, confirmMove.toStage)}>Confirm</button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

function DealCard({ deal, accounts, dragging, onDragStart, onDragEnd, onClick, onEdit, pendingSuggestions = [] }) {
  const account = accounts.find(a => a.id === deal.accountId);
  // Region stripe: red = US, blue = EMEA (missing country → EMEA), like Reporting.
  // NB: the adapter stores the country string on `account.region`.
  const isUS = ['US', 'United States', 'USA'].includes(account?.region || account?.country || '');
  const stripe = isUS ? '#E24B4A' : '#3B82F6';
  return (
    <div className={`deal-card ${dragging ? 'deal-card-dragging' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{ borderLeft: `3px solid ${stripe}` }}
      title={isUS ? 'US' : 'EMEA'}>
      <div className="deal-card-top">
        <AccountMark account={account} size={14} />
        <span className="deal-card-account">{account?.name || deal.account}</span>
        <OwnerDot id={deal.owner} />
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(deal); }}
            title="Edit deal"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '0 2px', color: 'var(--text-3)', fontSize: 12, lineHeight: 1,
              fontFamily: 'var(--font-mono)',
            }}>
            ✎
          </button>
        )}
      </div>
      <div className="deal-card-title">{deal.title}</div>
      {deal.contact && (
        <div className="deal-card-meta">
          <span className="deal-card-contact">{deal.contact}</span>
        </div>
      )}
      <div className="deal-card-bottom">
        <span className="deal-card-value">{fmtMoney(deal.value)}</span>
        {deal.dealNo && <span title="Deal number" style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', marginLeft: 6 }}>{deal.dealNo}</span>}
        <div className="deal-card-flags">
          <StaleDot days={deal.staleDays} />
          {deal.probability > 0 && <span>{deal.probability}%</span>}
        </div>
      </div>
      {pendingSuggestions.length > 0 && (
        <div style={{
          background: '#fdf2f8',
          color: '#be185d',
          fontSize: 9,
          padding: '2px 6px',
          borderRadius: 3,
          marginTop: 4,
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}>
          ▶ {pendingSuggestions[0].playbooks?.name || 'Playbook'}
          {pendingSuggestions.length > 1 && ` (+${pendingSuggestions.length - 1})`}
        </div>
      )}
    </div>
  );
}
