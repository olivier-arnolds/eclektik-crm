import React, { useState } from 'react';
import PlaybookFlowBuilder from './PlaybookFlowBuilder';

const TABS = [
  { key: 'suggestions', label: 'Suggesties', placeholder: true },
  { key: 'drafts',      label: 'Drafts',     placeholder: true },
  { key: 'running',     label: 'Lopend',     placeholder: true },
  { key: 'completed',   label: 'Completed',  placeholder: true },
  { key: 'builder',     label: 'Builder',    placeholder: false },
];

export default function PlaybooksHub() {
  const [activeTab, setActiveTab] = useState('builder');
  const [editingPlaybookId, setEditingPlaybookId] = useState(null);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <div style={{ display:'flex', borderBottom:'0.5px solid #D3D1C7', padding:'0 24px', background:'#fff' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            disabled={t.placeholder}
            style={{
              padding:'12px 18px',
              fontSize:12,
              fontFamily:'inherit',
              background:'transparent',
              border:'none',
              borderBottom: activeTab===t.key ? '2px solid #378ADD' : '2px solid transparent',
              color: activeTab===t.key ? '#2C2C2A' : (t.placeholder ? '#C0BDB2' : '#888780'),
              fontWeight: activeTab===t.key ? 500 : 400,
              cursor: t.placeholder ? 'not-allowed' : 'pointer',
            }}
          >
            {t.label}{t.placeholder ? ' (Plan 3/4)' : ''}
          </button>
        ))}
      </div>
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        {activeTab === 'builder' && (
          <PlaybookFlowBuilder
            playbookId={editingPlaybookId}
            onClose={() => setEditingPlaybookId(null)}
            onOpenPlaybook={setEditingPlaybookId}
          />
        )}
        {activeTab !== 'builder' && (
          <div style={{ padding:40, textAlign:'center', color:'#888780', fontSize:13 }}>
            <p>Deze tab komt beschikbaar in een volgend plan:</p>
            <ul style={{ listStyle:'none', padding:0, marginTop:8 }}>
              <li>📨 Drafts + Lopend + Completed → Plan 3 (execution engine)</li>
              <li>▶ Suggesties → Plan 4 (signal-system)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
