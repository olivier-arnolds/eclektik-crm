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
  const { contactsById, dealsById, onRequestAttachDeal, onRemoveDeal, onRemoveNode, onOpenDeal } = useOrganogram();
  const c = contactsById[data.contactId];
  const dealRefs = Array.isArray(data.dealRefs) ? data.dealRefs : [];

  const onDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/organogram-deal')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'link';
    }
  };
  const onDrop = (e) => {
    if (!e.dataTransfer.types.includes('application/organogram-deal')) return;
    e.preventDefault();
    e.stopPropagation();
    onRequestAttachDeal(id);
  };

  // ×-knop: haalt het blokje (en zijn lijnen) van het canvas; de contactpersoon
  // verschijnt daardoor weer sleepbaar in de linkerbalk.
  const removeBtn = (
    <button className="nodrag" onClick={(e) => { e.stopPropagation(); onRemoveNode(id); }}
      title="Verwijder van canvas (terug naar linkerbalk)"
      style={{
        position: 'absolute', top: -8, right: -8, width: 16, height: 16, borderRadius: 8,
        border: '0.5px solid var(--sep)', background: 'var(--bg-1)', color: 'var(--text-3)',
        cursor: 'pointer', fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      }}>×</button>
  );

  if (!c) {
    return (
      <div style={{ position: 'relative', background: 'var(--warn-tint)', padding: 8, borderRadius: 6, fontSize: 11, color: 'var(--warn)' }}>
        {removeBtn}
        Onbekend contact
        <Handle id="top" type="target" position={Position.Top} />
        <Handle id="bottom" type="source" position={Position.Bottom} />
      </div>
    );
  }

  return (
    <div onDragOver={onDragOver} onDrop={onDrop}
      style={{
        position: 'relative',
        background: 'var(--bg-1)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--sep)'}`,
        borderRadius: 8, padding: '8px 10px', minWidth: 180,
        boxShadow: selected ? '0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent)' : '0 1px 2px rgba(0,0,0,0.05)',
        opacity: c.isFormer ? 0.6 : 1,
      }}>
      {removeBtn}
      {/* Boven/onder = hiërarchie (grijs). Links/rechts = peer/gelijk niveau (blauw). */}
      <Handle id="top" type="target" position={Position.Top} style={{ background: 'var(--text-3)' }} />
      <Handle id="left" type="target" position={Position.Left} style={{ background: 'var(--accent)' }} />
      <Handle id="right" type="source" position={Position.Right} style={{ background: 'var(--accent)' }} />
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
          {c.role && <div style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.role}</div>}
        </div>
      </div>

      {dealRefs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {dealRefs.map((ref) => {
            const deal = dealsById[ref.id];
            const hue = deal ? (STAGE_TINT[deal.stage]?.hue ?? 220) : 220;
            return (
              <span key={ref.id}
                title={deal ? `${deal.title} (${deal.stage})` : 'Onbekende deal'}
                onClick={(e) => { e.stopPropagation(); if (deal) onOpenDeal(deal); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 9, fontFamily: 'var(--font-mono)',
                  padding: '1px 5px', borderRadius: 3, cursor: deal ? 'pointer' : 'default',
                  background: `hsl(${hue} 60% 92%)`, color: `hsl(${hue} 50% 30%)`,
                }}>
                {deal ? `${deal.dealNo || 'deal'} · ${deal.title}`.slice(0, 28) : 'deal?'}
                <button onClick={(e) => { e.stopPropagation(); onRemoveDeal(id, ref); }}
                  title="Koppeling verwijderen"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 10, lineHeight: 1 }}>×</button>
              </span>
            );
          })}
        </div>
      )}
      <Handle id="bottom" type="source" position={Position.Bottom} style={{ background: 'var(--text-3)' }} />
    </div>
  );
}
