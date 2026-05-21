import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { NODE_TYPES, NODE_CATEGORIES } from './NodeTypes';

export default function NodeCard({ data, selected }) {
  const nodeType = NODE_TYPES[data.nodeType];
  if (!nodeType) {
    return (
      <div style={{ background:'#fee', padding:8, border:'1px solid #c33', borderRadius:6, fontSize:11 }}>
        Onbekend node-type: {data.nodeType}
      </div>
    );
  }
  const cat = NODE_CATEGORIES[nodeType.category];
  const config = data.config || {};
  const summary = getSummary(nodeType, config);

  return (
    <div style={{
      background:'#fff',
      border: `1px solid ${selected ? '#14b8a6' : '#d0d5dd'}`,
      borderLeft: `3px solid ${cat.color}`,
      borderRadius:6,
      padding:'8px 12px',
      minWidth: 200,
      fontSize:11,
      boxShadow: selected ? '0 0 0 2px rgba(20,184,166,0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
      cursor:'pointer',
    }}>
      {nodeType.maxIncoming !== 0 && (
        <Handle type="target" position={Position.Top} style={{ background:'#94a3b8' }} />
      )}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{
          width:22, height:22, borderRadius:4,
          background: cat.bg,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, flexShrink:0,
        }}>{nodeType.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, color:'#1f2937', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {nodeType.label}
          </div>
          {summary && (
            <div style={{ fontSize:10, color:'#6b7280', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {summary}
            </div>
          )}
        </div>
      </div>
      {nodeType.maxOutgoing !== 0 && (
        <Handle type="source" position={Position.Bottom} style={{ background:'#94a3b8' }} />
      )}
    </div>
  );
}

function getSummary(nodeType, config) {
  // Per type: pak het meest informatieve field als 1-liner
  if (nodeType.label === 'Stage change' && config.to_stage) return `→ ${config.to_stage}`;
  if (nodeType.label === 'Wait' && config.days) return `${config.days} dagen`;
  if (nodeType.label === 'Wait-until / -or' && config.max_days) return `≤ ${config.max_days}d OR ${config.event_type || '?'}`;
  if (nodeType.label === 'Email-draft' && config.subject) return config.subject;
  if (nodeType.label === 'Branch (if/else)' && config.condition_field) return `${config.condition_field} ${config.condition_operator || ''} ${config.condition_value || ''}`;
  if (nodeType.label === 'Stage update' && config.new_stage) return `→ ${config.new_stage}`;
  if (nodeType.label === 'Internal task' && config.title) return config.title;
  return '';
}
