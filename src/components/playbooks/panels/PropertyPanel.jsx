import React from 'react';
import { NODE_TYPES } from '../nodes/NodeTypes';

export default function PropertyPanel({ selectedNode, onChangeConfig, onDeleteNode }) {
  if (!selectedNode) {
    return (
      <div style={{ width:240, background:'#fff', borderLeft:'0.5px solid #D3D1C7', padding:14, color:'#888780', fontSize:11 }}>
        <p>Selecteer een node om properties te bewerken.</p>
      </div>
    );
  }

  const nodeType = NODE_TYPES[selectedNode.data.nodeType];
  if (!nodeType) {
    return (
      <div style={{ width:240, background:'#fff', borderLeft:'0.5px solid #D3D1C7', padding:14, color:'#dc2626', fontSize:11 }}>
        Onbekend node-type: {selectedNode.data.nodeType}
      </div>
    );
  }

  const config = selectedNode.data.config || {};

  function updateField(key, value) {
    onChangeConfig({ ...config, [key]: value });
  }

  return (
    <div style={{ width:240, background:'#fff', borderLeft:'0.5px solid #D3D1C7', padding:14, overflowY:'auto' }}>
      <div style={{ fontSize:11, fontWeight:700, paddingBottom:8, borderBottom:'0.5px solid #D3D1C7', marginBottom:10 }}>
        {nodeType.label} properties
      </div>

      {nodeType.fields.length === 0 && (
        <p style={{ fontSize:11, color:'#888780' }}>Dit node-type heeft geen configureerbare properties.</p>
      )}

      {nodeType.fields.map(field => (
        <div key={field.key} style={{ marginBottom:10 }}>
          <div style={{ fontSize:9, textTransform:'uppercase', color:'#6b7280', fontWeight:600, marginBottom:3 }}>
            {field.label}{field.required && <span style={{ color:'#dc2626' }}> *</span>}
          </div>
          {field.type === 'text' && (
            <input
              type="text"
              value={config[field.key] || ''}
              onChange={e => updateField(field.key, e.target.value)}
              style={{ width:'100%', padding:'4px 6px', fontSize:11, border:'0.5px solid #D3D1C7', borderRadius:4, fontFamily:'inherit' }}
            />
          )}
          {field.type === 'textarea' && (
            <textarea
              value={config[field.key] || ''}
              onChange={e => updateField(field.key, e.target.value)}
              rows={5}
              style={{ width:'100%', padding:'4px 6px', fontSize:11, border:'0.5px solid #D3D1C7', borderRadius:4, fontFamily:'inherit', resize:'vertical' }}
            />
          )}
          {field.type === 'number' && (
            <input
              type="number"
              value={config[field.key] || ''}
              onChange={e => updateField(field.key, e.target.value === '' ? null : Number(e.target.value))}
              style={{ width:'100%', padding:'4px 6px', fontSize:11, border:'0.5px solid #D3D1C7', borderRadius:4, fontFamily:'inherit' }}
            />
          )}
          {field.type === 'select' && (
            <select
              value={config[field.key] || ''}
              onChange={e => updateField(field.key, e.target.value)}
              style={{ width:'100%', padding:'4px 6px', fontSize:11, border:'0.5px solid #D3D1C7', borderRadius:4, fontFamily:'inherit' }}>
              <option value="">— kies —</option>
              {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}
        </div>
      ))}

      <div style={{ marginTop:18, borderTop:'0.5px solid #D3D1C7', paddingTop:10 }}>
        <button
          onClick={onDeleteNode}
          style={{ width:'100%', padding:'6px 10px', fontSize:11, background:'#fff', color:'#dc2626', border:'0.5px solid #dc2626', borderRadius:4, cursor:'pointer' }}>
          Delete node
        </button>
      </div>
    </div>
  );
}
