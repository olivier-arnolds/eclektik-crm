import React from 'react';

export default function OrgPalette({ contacts, placedContactIds, dealCount }) {
  function onDragContact(e, contactId) {
    e.dataTransfer.setData('application/organogram-contact', contactId);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragDeal(e) {
    e.dataTransfer.setData('application/organogram-deal', '1');
    e.dataTransfer.effectAllowed = 'link';
  }

  return (
    <div style={{ width: 210, borderRight: '0.5px solid var(--sep)', background: 'var(--bg-2)', padding: 10, overflowY: 'auto' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>
        Contactpersonen
      </div>
      {contacts.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>Geen contacten voor dit account.</div>}
      {contacts.map(c => {
        const placed = placedContactIds.has(c.id);
        return (
          <div key={c.id}
            draggable={!placed}
            onDragStart={(e) => onDragContact(e, c.id)}
            title={placed ? 'Staat al op het canvas' : 'Sleep naar canvas'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 4,
              padding: '5px 7px', marginBottom: 4, fontSize: 11,
              cursor: placed ? 'default' : 'grab', opacity: placed ? 0.45 : 1,
            }}>
            <span style={{
              width: 18, height: 18, borderRadius: 9, flexShrink: 0,
              background: c.avatarBg || '#F1EFE8', color: c.avatarColor || '#888',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600,
            }}>{c.initials || (c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
            <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
            {placed && <span style={{ fontSize: 9, color: 'var(--good)' }}>✓</span>}
          </div>
        );
      })}

      <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em', margin: '14px 0 6px' }}>
        Deals
      </div>
      <div draggable onDragStart={onDragDeal}
        title="Sleep op een contactpersoon om een deal te koppelen"
        style={{
          background: 'var(--bg-1)', border: '0.5px dashed var(--accent)', borderRadius: 4,
          padding: '7px 8px', fontSize: 11, cursor: 'grab', color: 'var(--accent)',
        }}>
        ＋ Koppel deal aan contact
        <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{dealCount} deal(s) op dit account</div>
      </div>
    </div>
  );
}
