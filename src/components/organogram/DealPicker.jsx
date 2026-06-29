import React, { useState } from 'react';

// Eenvoudige gecentreerde popover met een <select> van de account-deals.
// onPick(dealId) koppelt; onClose annuleert.
export default function DealPicker({ deals, onPick, onClose }) {
  const [sel, setSel] = useState(deals[0]?.id || '');

  return (
    <div className="modal-backdrop"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8, padding: 16, width: 340, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-1)' }}>Link deal</div>
        {deals.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No deals on this account.</div>
        ) : (
          <select value={sel} onChange={(e) => setSel(e.target.value)}
            style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', color: 'var(--text-1)', fontSize: 12, fontFamily: 'inherit' }}>
            {deals.map(d => (
              <option key={d.id} value={d.id}>
                {(d.dealNo ? d.dealNo + ' · ' : '') + d.title + ' (' + d.stage + ')'}
              </option>
            ))}
          </select>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button className="btn-ghost tiny" onClick={onClose}>Cancel</button>
          <button className="btn-primary tiny" disabled={!sel} onClick={() => onPick(sel)}>Link</button>
        </div>
      </div>
    </div>
  );
}
