import React from 'react';
import { NODE_TYPES, NODE_CATEGORIES, getNodesByCategory } from '../nodes/NodeTypes';

export default function NodePalette() {
  const grouped = getNodesByCategory();

  function onDragStart(event, nodeType) {
    event.dataTransfer.setData('application/playbook-node-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div style={{ width:180, background:'#fafafa', borderRight:'0.5px solid #D3D1C7', padding:10, overflowY:'auto' }}>
      {Object.entries(grouped).map(([catKey, items]) => {
        const cat = NODE_CATEGORIES[catKey];
        return (
          <div key={catKey} style={{ marginBottom:14 }}>
            <div style={{ fontSize:9, textTransform:'uppercase', color:'#6b7280', fontWeight:700, marginBottom:6, letterSpacing:0.5 }}>
              {cat.label}
            </div>
            {items.map(item => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => onDragStart(e, item.type)}
                title={item.description}
                style={{
                  background:'#fff',
                  border:'0.5px solid #D3D1C7',
                  borderLeft:`2px solid ${cat.color}`,
                  borderRadius:4,
                  padding:'6px 8px',
                  marginBottom:4,
                  fontSize:10,
                  display:'flex',
                  alignItems:'center',
                  gap:6,
                  cursor:'grab',
                }}>
                <span style={{
                  width:18, height:18, borderRadius:3,
                  background: cat.bg,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:10, flexShrink:0,
                }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
