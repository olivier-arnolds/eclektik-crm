import React from 'react';

export default function BuilderToolbar({ playbookName, version, status, saving, publishing, issues, onSaveDraft, onPublish, onClose, onTestRun }) {
  const hasErrors = issues.some(i => i.severity === 'error');
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      background:'#fafafa', borderBottom:'0.5px solid #D3D1C7',
      padding:'8px 14px', fontSize:11,
    }}>
      <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#888780', fontSize:14 }}>‹</button>
      <span style={{ fontWeight:700, fontSize:12 }}>{playbookName || 'Playbook'}</span>
      <span style={{ background:'#e0e7ff', color:'#4338ca', padding:'1px 6px', borderRadius:3, fontSize:10, fontWeight:600 }}>
        v{version} · {status}
      </span>

      {(errorCount > 0 || warningCount > 0) && (
        <span style={{ fontSize:10, color: hasErrors ? '#dc2626' : '#92400e' }}>
          {errorCount > 0 && `${errorCount} error${errorCount>1?'s':''}`}
          {errorCount > 0 && warningCount > 0 && ' · '}
          {warningCount > 0 && `${warningCount} warning${warningCount>1?'s':''}`}
        </span>
      )}

      <div style={{ flex:1 }} />

      <button
        onClick={onTestRun}
        disabled={saving || publishing}
        style={{ padding:'4px 10px', fontSize:11, background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:4, cursor: (saving || publishing) ? 'not-allowed' : 'pointer' }}>
        ▷ Test-run
      </button>

      <button
        onClick={onSaveDraft}
        disabled={saving || publishing}
        style={{ padding:'4px 10px', fontSize:11, background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:4, cursor: (saving || publishing) ? 'not-allowed' : 'pointer' }}>
        {saving ? 'Saving...' : 'Save draft'}
      </button>

      <button
        onClick={onPublish}
        disabled={hasErrors || saving || publishing}
        title={hasErrors ? 'Fix errors voor publish' : ''}
        style={{
          padding:'4px 12px', fontSize:11,
          background: hasErrors ? '#94a3b8' : '#14b8a6',
          color:'#fff', border:'none', borderRadius:4,
          cursor: (hasErrors || saving || publishing) ? 'not-allowed' : 'pointer',
          fontWeight:600,
        }}>
        {publishing ? 'Publishing...' : `▶ Publish v${(version || 1) + 1}`}
      </button>
    </div>
  );
}
