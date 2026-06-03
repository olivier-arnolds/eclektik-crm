import React, { useState } from 'react';
import PlaybookFlowBuilder from './PlaybookFlowBuilder';
import DraftsTab from './tabs/DraftsTab';
import RunningTab from './tabs/RunningTab';
import CompletedTab from './tabs/CompletedTab';
import SuggestionsTab from './tabs/SuggestionsTab';

const TABS = [
  { key: 'suggestions', label: 'Suggesties', placeholder: false },
  { key: 'drafts',      label: 'Drafts',     placeholder: false },
  { key: 'running',     label: 'Lopend',     placeholder: false },
  { key: 'completed',   label: 'Completed',  placeholder: false },
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
        {activeTab === 'drafts' && <DraftsTab />}
        {activeTab === 'running' && <RunningTab />}
        {activeTab === 'completed' && <CompletedTab />}
        {activeTab === 'suggestions' && <SuggestionsTab />}
      </div>
    </div>
  );
}
