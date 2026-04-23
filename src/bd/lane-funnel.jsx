import { useState } from 'react';
import { I, fmtMoney, OwnerDot, AccountMark, StaleDot, OWNERS, STAGE_TINT } from './atoms';
import { STAGES, stageUpdates } from './adapters';
import { updateRow } from '../hooks/useSupabase';
import NewDealModal from './new-deal-modal';

const toggle = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

export default function FunnelLane({ deals, accounts, contacts, filters, setFilters, onSelectDeal, onClose, refetch, search }) {
  const [collapsed, setCollapsed] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [confirmMove, setConfirmMove] = useState(null);
  const [showNewDeal, setShowNewDeal] = useState(false);

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

  // Some transitions need a Won/Lost decision before we can save.
  // Specifically, anything that moves INTO 'close' or 'active' from an
  // earlier/non-final stage should ask the user.
  const needsWonLost = (fromStage, toStage) => {
    if (!fromStage || !toStage) return false;
    if (fromStage === toStage) return false;
    // Closing a deal from Proposal or Onboarding
    if (toStage === 'close' && ['proposal', 'onboarding'].includes(fromStage)) return true;
    // Moving from Onboarding into Active (project started — won) or not (lost)
    if (toStage === 'active' && fromStage === 'onboarding') return true;
    return false;
  };

  const doMove = async (dealId, toStage, winStatus) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    setConfirmMove(null);
    const updates = stageUpdates(toStage, deal.table);
    // If winStatus provided, also update the opportunity status
    if (winStatus) {
      updates.status = winStatus; // 'Won' or 'Lost'
      if (winStatus === 'Lost' && deal.table === 'opportunities') {
        // Lost deals are stored as past/inactive funnelStage in our data model
        updates.stage = 'past';
        updates.sub_status = null;
      }
    }
    await updateRow(deal.table, dealId, updates);
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
          <button className="btn-ghost tiny" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
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
          {['Glint', 'People Science', 'AI Transformation', 'ROI', 'Technical', 'Other'].map(t => (
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
                      onClick={() => onSelectDeal && onSelectDeal(d)} />
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

      {confirmMove && (() => {
        const mvDeal = deals.find(d => d.id === confirmMove.dealId);
        const askWonLost = mvDeal ? needsWonLost(mvDeal.stage, confirmMove.toStage) : false;
        return (
        <div className="modal-backdrop" onClick={() => setConfirmMove(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {askWonLost
                ? `Close deal — won or lost?`
                : `Move deal to ${STAGE_TINT[confirmMove.toStage]?.label || confirmMove.toStage}?`}
            </div>
            <div className="modal-body">
              <div className="modal-body-strong">{mvDeal?.title}</div>
              <div className="modal-body-sub">
                From <b>{STAGE_TINT[mvDeal?.stage]?.label}</b> → <b>{STAGE_TINT[confirmMove.toStage]?.label}</b>
              </div>
              {askWonLost && (
                <div className="modal-body-sub" style={{ marginTop: 8 }}>
                  Mark this deal as <b>Won</b> or <b>Lost</b>.
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setConfirmMove(null)}>Cancel</button>
              {askWonLost ? (
                <>
                  <button className="btn-ghost tiny" style={{ color: 'var(--danger)' }}
                    onClick={() => doMove(confirmMove.dealId, confirmMove.toStage, 'Lost')}>
                    Lost
                  </button>
                  <button className="btn-primary" style={{ background: 'var(--good)' }}
                    onClick={() => doMove(confirmMove.dealId, confirmMove.toStage, 'Won')}>
                    ✓ Won
                  </button>
                </>
              ) : (
                <button className="btn-primary" onClick={() => doMove(confirmMove.dealId, confirmMove.toStage)}>Confirm</button>
              )}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

function DealCard({ deal, accounts, dragging, onDragStart, onDragEnd, onClick }) {
  const account = accounts.find(a => a.id === deal.accountId);
  return (
    <div className={`deal-card ${dragging ? 'deal-card-dragging' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}>
      <div className="deal-card-top">
        <AccountMark account={account} size={14} />
        <span className="deal-card-account">{account?.name || deal.account}</span>
        <OwnerDot id={deal.owner} />
      </div>
      <div className="deal-card-title">{deal.title}</div>
      {deal.contact && (
        <div className="deal-card-meta">
          <span className="deal-card-contact">{deal.contact}</span>
        </div>
      )}
      <div className="deal-card-bottom">
        <span className="deal-card-value">{fmtMoney(deal.value)}</span>
        <div className="deal-card-flags">
          <StaleDot days={deal.staleDays} />
          {deal.probability > 0 && <span>{deal.probability}%</span>}
        </div>
      </div>
    </div>
  );
}
