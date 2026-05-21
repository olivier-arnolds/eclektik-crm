import React from 'react';

export default function PlaybookFlowBuilder({ playbookId, onClose, onOpenPlaybook }) {
  return (
    <div style={{ padding:24 }}>
      <h2 style={{ fontSize:14, marginBottom:8 }}>Playbook Builder</h2>
      <p style={{ fontSize:12, color:'#888780' }}>
        Canvas-component wordt ingevuld in Task 4-15.
        Selected playbookId: {playbookId || '(geen)'}
      </p>
    </div>
  );
}
