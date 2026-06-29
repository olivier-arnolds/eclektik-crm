import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { STAGE_TINT } from '../../bd/atoms';
import { useOrganogram } from './OrganogramContext';

function ringShadow(c) {
  if (c?.isPrimary && c?.isFinancial) return '0 0 0 2px var(--good), 0 0 0 4px var(--accent)';
  if (c?.isPrimary) return '0 0 0 2px var(--good)';
  if (c?.isFinancial) return '0 0 0 2px var(--accent)';
  return 'none';
}

export default function ContactNode({ id, data, selected }) {
  const { contactsById, dealsById, onRequestAttachDeal, onRemoveDeal, onRemoveNode, onReplaceNodeContact, onSetNodeLabel, onOpenDeal } = useOrganogram();
  const isUnknown = !data.contactId;                 // placeholder zonder gekoppeld contact
  const c = contactsById[data.contactId];
  const dealRefs = Array.isArray(data.dealRefs) ? data.dealRefs : [];

  const onDragOver = (e) => {
    const t = e.dataTransfer.types;
    // Deal koppelen kan alleen op een echt contact; een contact slepen kan alleen
    // op een placeholder (om die te vervangen).
    if (t.includes('application/organogram-deal') && !isUnknown) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    else if (t.includes('application/organogram-contact') && isUnknown) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  };
  const onDrop = (e) => {
    const t = e.dataTransfer.types;
    if (t.includes('application/organogram-deal') && !isUnknown) {
      e.preventDefault(); e.stopPropagation(); onRequestAttachDeal(id); return;
    }
    if (t.includes('application/organogram-contact') && isUnknown) {
      e.preventDefault(); e.stopPropagation();
      const contactId = e.dataTransfer.getData('application/organogram-contact');
      if (contactId) onReplaceNodeContact(id, contactId);
    }
  };

  // ×-knop: haalt het blokje (en zijn lijnen) van het canvas; een gekoppeld
  // contact verschijnt daardoor weer sleepbaar in de linkerbalk.
  const removeBtn = (
    <button className="nodrag" onClick={(e) => { e.stopPropagation(); onRemoveNode(id); }}
      title="Remove from canvas (back to the left menu)"
      style={{
        position: 'absolute', top: -8, right: -8, width: 16, height: 16, borderRadius: 8,
        border: '0.5px solid var(--sep)', background: 'var(--bg-1)', color: 'var(--text-3)',
        cursor: 'pointer', fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      }}>×</button>
  );

  // Boven/onder = hiërarchie (grijs). Links/rechts = peer/gelijk niveau (blauw).
  const handles = (
    <>
      <Handle id="top" type="target" position={Position.Top} style={{ background: 'var(--text-3)' }} />
      <Handle id="left" type="target" position={Position.Left} style={{ background: 'var(--accent)' }} />
      <Handle id="right" type="source" position={Position.Right} style={{ background: 'var(--accent)' }} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={{ background: 'var(--text-3)' }} />
    </>
  );

  // Placeholder ("onbekend contact"): structuur alvast zetten, later vervangen
  // door een contact uit de linkerbalk (erop slepen). Dubbelklik = rolhint typen.
  if (isUnknown) {
    return (
      <div onDragOver={onDragOver} onDrop={onDrop}
        onDoubleClick={(e) => {
          e.stopPropagation();
          const next = prompt('Role hint for this unknown contact (e.g. "Team lead"):', data.label || '');
          if (next !== null) onSetNodeLabel(id, next.trim() || null);
        }}
        title="Unknown contact — drag a contact from the left menu onto it to replace. Double-click for a role hint."
        style={{
          position: 'relative',
          background: 'var(--bg-1)',
          border: `1px dashed ${selected ? 'var(--accent)' : 'var(--sep)'}`,
          borderRadius: 8, padding: '8px 10px', minWidth: 180,
          boxShadow: selected ? '0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent)' : '0 1px 2px rgba(0,0,0,0.05)',
        }}>
        {removeBtn}
        {handles}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 13,
            background: 'var(--fill-2)', color: 'var(--text-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 600, flexShrink: 0,
            border: '1px dashed var(--text-3)',
          }}>?</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {data.label || 'Unknown'}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-3)' }}>drag a contact here</div>
          </div>
        </div>
      </div>
    );
  }

  // contactId gezet maar contact niet gevonden (bv. verwijderd/gepromoveerd).
  if (!c) {
    return (
      <div style={{ position: 'relative', background: 'var(--warn-tint)', padding: 8, borderRadius: 6, fontSize: 11, color: 'var(--warn)' }}>
        {removeBtn}
        Unknown contact
        {handles}
      </div>
    );
  }

  return (
    <div onDragOver={onDragOver} onDrop={onDrop}
      style={{
        position: 'relative',
        background: 'var(--bg-1)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--sep)'}`,
        borderRadius: 8, padding: '8px 10px', minWidth: 180, maxWidth: 220,
        boxShadow: selected ? '0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent)' : '0 1px 2px rgba(0,0,0,0.05)',
        opacity: c.isFormer ? 0.6 : 1,
      }}>
      {removeBtn}
      {handles}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 13,
          background: c.avatarBg || '#F1EFE8', color: c.avatarColor || '#888',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 600, flexShrink: 0,
          boxShadow: ringShadow(c),
        }}>
          {c.initials || (c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.name}
            {c.isPrimary && <span title="Primary contact" style={{ color: 'var(--good)', marginLeft: 5, fontSize: 10, fontFamily: 'var(--font-mono)' }}>★</span>}
            {c.isFinancial && <span title="Financial contact" style={{ color: 'var(--accent)', marginLeft: 3, fontSize: 10, fontFamily: 'var(--font-mono)' }}>$</span>}
          </div>
          {c.role && <div style={{ fontSize: 10, color: 'var(--text-3)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{c.role}</div>}
        </div>
      </div>

      {dealRefs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, marginTop: 6 }}>
          {dealRefs.map((ref) => {
            const deal = dealsById[ref.id];
            const hue = deal ? (STAGE_TINT[deal.stage]?.hue ?? 220) : 220;
            return (
              <span key={ref.id}
                title={deal ? `${deal.title} (${deal.stage})` : 'Unknown deal'}
                onClick={(e) => { e.stopPropagation(); if (deal) onOpenDeal(deal); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 9, fontFamily: 'var(--font-mono)',
                  padding: '1px 5px', borderRadius: 3, cursor: deal ? 'pointer' : 'default',
                  background: `hsl(${hue} 60% 92%)`, color: `hsl(${hue} 50% 30%)`,
                }}>
                {deal ? `${deal.dealNo || 'deal'} · ${deal.title}`.slice(0, 28) : 'deal?'}
                <button onClick={(e) => { e.stopPropagation(); onRemoveDeal(id, ref); }}
                  title="Remove link"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 10, lineHeight: 1 }}>×</button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
