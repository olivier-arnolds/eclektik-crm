import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Chip from '../atoms/Chip';

const statusColors = {
  draft:    { bg: '#F1EFE8', color: '#888780' },
  active:   { bg: '#D1FAE5', color: '#065F46' },
  paused:   { bg: '#FEF3C7', color: '#92400E' },
  archived: { bg: '#E5E7EB', color: '#6B7280' },
};

const STEP_TYPES = [
  { value: 'email',            label: 'Email',              icon: '\u2709' },
  { value: 'linkedin_connect', label: 'LinkedIn Connect',   icon: 'in' },
  { value: 'linkedin_message', label: 'LinkedIn Message',   icon: '\uD83D\uDCAC' },
  { value: 'call',             label: 'Call',               icon: '\uD83D\uDCDE' },
  { value: 'task',             label: 'Task',               icon: '\u2713' },
  { value: 'wait',             label: 'Wait',               icon: '\u23F3' },
];

const stepIcon = (type) => (STEP_TYPES.find(s => s.value === type)?.icon || '?');

const enrollmentStatusColors = {
  active:    { bg: '#D1FAE5', color: '#065F46' },
  paused:    { bg: '#FEF3C7', color: '#92400E' },
  completed: { bg: '#E6F1FB', color: '#0C447C' },
  ejected:   { bg: '#FEE2E2', color: '#991B1B' },
  failed:    { bg: '#FEE2E2', color: '#991B1B' },
};

const VARIABLES = ['{{FirstName}}', '{{LastName}}', '{{FullName}}', '{{CompanyName}}', '{{Title}}'];

export default function PlaybookDetail({ playbook: initialPlaybook, onBack, contacts: allContacts, accounts }) {
  const [playbook, setPlaybook] = useState(initialPlaybook);
  const [steps, setSteps] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(playbook.name);

  // Add step form
  const [showAddStep, setShowAddStep] = useState(false);
  const [stepType, setStepType] = useState('email');
  const [stepSubject, setStepSubject] = useState('');
  const [stepBody, setStepBody] = useState('');
  const [stepDelay, setStepDelay] = useState(1);
  const [savingStep, setSavingStep] = useState(false);

  // Edit step
  const [editingStep, setEditingStep] = useState(null);
  const [editStepType, setEditStepType] = useState('');
  const [editStepSubject, setEditStepSubject] = useState('');
  const [editStepBody, setEditStepBody] = useState('');
  const [editStepDelay, setEditStepDelay] = useState(1);

  // Enroll contact
  const [showEnroll, setShowEnroll] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(playbook.settings || {});

  const fetchData = async () => {
    setLoading(true);
    const [stepsRes, enrollRes, execRes, pbRes] = await Promise.all([
      supabase.from('playbook_steps').select('*').eq('playbook_id', playbook.id).order('step_number'),
      supabase.from('playbook_enrollments').select('*, contacts(id, first_name, last_name, full_name, company_name)').eq('playbook_id', playbook.id).order('enrolled_at', { ascending: false }),
      supabase.from('playbook_executions').select('*').eq('enrollment_id', playbook.id),
      supabase.from('playbooks').select('*').eq('id', playbook.id).single(),
    ]);
    if (stepsRes.data) setSteps(stepsRes.data);
    if (enrollRes.data) setEnrollments(enrollRes.data);
    if (pbRes.data) {
      setPlaybook(pbRes.data);
      setSettings(pbRes.data.settings || {});
      setNameValue(pbRes.data.name);
    }
    // Fetch execution stats per step
    if (stepsRes.data?.length) {
      const stepIds = stepsRes.data.map(s => s.id);
      const { data: allExecs } = await supabase.from('playbook_executions').select('step_id, status').in('step_id', stepIds);
      if (allExecs) {
        const statsMap = {};
        allExecs.forEach(ex => {
          if (!statsMap[ex.step_id]) statsMap[ex.step_id] = { sent: 0, delivered: 0, opened: 0, replied: 0 };
          if (['sent', 'delivered', 'opened', 'replied', 'pending'].includes(ex.status)) statsMap[ex.step_id].sent++;
          if (['delivered', 'opened', 'replied'].includes(ex.status)) statsMap[ex.step_id].delivered++;
          if (['opened', 'replied'].includes(ex.status)) statsMap[ex.step_id].opened++;
          if (ex.status === 'replied') statsMap[ex.step_id].replied++;
        });
        setSteps(prev => prev.map(s => ({ ...s, stats: statsMap[s.id] || { sent: 0, delivered: 0, opened: 0, replied: 0 } })));
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [playbook.id]);

  const saveName = async () => {
    if (nameValue.trim() && nameValue !== playbook.name) {
      await supabase.from('playbooks').update({ name: nameValue.trim() }).eq('id', playbook.id);
      setPlaybook(prev => ({ ...prev, name: nameValue.trim() }));
    }
    setEditingName(false);
  };

  const togglePlaybookStatus = async () => {
    const next = playbook.status === 'active' ? 'paused' : 'active';
    await supabase.from('playbooks').update({ status: next }).eq('id', playbook.id);
    setPlaybook(prev => ({ ...prev, status: next }));
  };

  // ── Steps CRUD ──
  const addStep = async () => {
    if (stepType === 'email' && !stepSubject.trim()) return;
    if (stepType === 'wait' && stepDelay < 1) return;
    setSavingStep(true);
    const nextNum = steps.length + 1;
    const row = {
      playbook_id: playbook.id,
      step_number: nextNum,
      step_type: stepType,
      delay_days: stepType === 'wait' ? stepDelay : (stepDelay || 0),
      subject: ['email'].includes(stepType) ? stepSubject : null,
      body: ['email', 'linkedin_connect', 'linkedin_message', 'call', 'task'].includes(stepType) ? stepBody : null,
      settings: {},
    };
    await supabase.from('playbook_steps').insert(row);
    setSavingStep(false);
    setShowAddStep(false);
    setStepType('email'); setStepSubject(''); setStepBody(''); setStepDelay(1);
    fetchData();
  };

  const deleteStep = async (stepId) => {
    await supabase.from('playbook_steps').delete().eq('id', stepId);
    // Renumber remaining steps
    const remaining = steps.filter(s => s.id !== stepId).sort((a, b) => a.step_number - b.step_number);
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].step_number !== i + 1) {
        await supabase.from('playbook_steps').update({ step_number: i + 1 }).eq('id', remaining[i].id);
      }
    }
    fetchData();
  };

  const startEditStep = (step) => {
    setEditingStep(step.id);
    setEditStepType(step.step_type);
    setEditStepSubject(step.subject || '');
    setEditStepBody(step.body || '');
    setEditStepDelay(step.delay_days || 1);
  };

  const saveEditStep = async () => {
    await supabase.from('playbook_steps').update({
      step_type: editStepType,
      subject: ['email'].includes(editStepType) ? editStepSubject : null,
      body: ['email', 'linkedin_connect', 'linkedin_message', 'call', 'task'].includes(editStepType) ? editStepBody : null,
      delay_days: editStepDelay,
    }).eq('id', editingStep);
    setEditingStep(null);
    fetchData();
  };

  // ── Enrollments ──
  const enrollContact = async (contact) => {
    const nextStepAt = new Date();
    nextStepAt.setDate(nextStepAt.getDate() + (steps[0]?.delay_days || 0));
    await supabase.from('playbook_enrollments').insert({
      playbook_id: playbook.id,
      contact_id: contact.id,
      current_step: 1,
      status: 'active',
      enrolled_at: new Date().toISOString(),
      next_step_at: nextStepAt.toISOString(),
    });
    setShowEnroll(false);
    setContactSearch('');
    fetchData();
  };

  const filteredContacts = (allContacts || []).filter(c => {
    if (!contactSearch) return true;
    const t = contactSearch.toLowerCase();
    const name = (c.name || c.full_name || '').toLowerCase();
    const company = (c.company_name || '').toLowerCase();
    return name.includes(t) || company.includes(t);
  }).slice(0, 20);

  // ── Settings ──
  const saveSettings = async () => {
    await supabase.from('playbooks').update({ settings }).eq('id', playbook.id);
    setShowSettings(false);
  };

  const sc = statusColors[playbook.status] || statusColors.draft;

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#888780", fontSize: 13 }}>Loading...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#FFFFFF", borderBottom: "0.5px solid #D3D1C7", padding: "16px 18px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#888780", fontFamily: "inherit", padding: "2px 6px" }}>&larr; Back</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {editingName ? (
              <input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={saveName}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                autoFocus
                style={{ fontSize: 16, fontWeight: 500, border: "0.5px solid #D3D1C7", borderRadius: 6, padding: "4px 8px", fontFamily: "inherit", outline: "none" }}
              />
            ) : (
              <div onClick={() => setEditingName(true)} style={{ fontSize: 16, fontWeight: 500, cursor: "pointer" }} title="Click to edit">{playbook.name}</div>
            )}
            <Chip bg={sc.bg} color={sc.color} size={10}>{playbook.status}</Chip>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setShowSettings(!showSettings)} style={{ padding: "5px 12px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 11, cursor: "pointer", background: showSettings ? "#E6F1FB" : "transparent", color: "#2C2C2A", fontFamily: "inherit" }}>Settings</button>
            <button onClick={togglePlaybookStatus} style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 11, cursor: "pointer", background: playbook.status === 'active' ? "#FEF3C7" : "#042C53", color: playbook.status === 'active' ? "#92400E" : "#B5D4F4", fontFamily: "inherit", fontWeight: 500 }}>
              {playbook.status === 'active' ? 'Pause' : 'Start Playbook'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex" }}>
        {/* Main content */}
        <div style={{ flex: 1, padding: "16px 18px" }}>
          {/* Steps */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: "#2C2C2A" }}>Steps ({steps.length})</div>
            {steps.map((step, idx) => (
              <div key={step.id} style={{ position: "relative" }}>
                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div style={{ position: "absolute", left: 19, top: 44, width: 1, height: "calc(100% - 24px)", background: "#D3D1C7" }} />
                )}
                {editingStep === step.id ? (
                  /* Edit form */
                  <div style={{ background: "#FFFFFF", borderRadius: 8, border: "0.5px solid #185FA5", padding: 14, marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <select value={editStepType} onChange={e => setEditStepType(e.target.value)} style={{ padding: "5px 8px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit" }}>
                        {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "#888780" }}>Delay:</span>
                        <input type="number" min={0} value={editStepDelay} onChange={e => setEditStepDelay(parseInt(e.target.value) || 0)} style={{ width: 50, padding: "4px 6px", borderRadius: 5, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit" }} />
                        <span style={{ fontSize: 11, color: "#888780" }}>days</span>
                      </div>
                    </div>
                    {editStepType === 'email' && (
                      <input value={editStepSubject} onChange={e => setEditStepSubject(e.target.value)} placeholder="Subject..." style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit", marginBottom: 6, boxSizing: "border-box" }} />
                    )}
                    {['email', 'linkedin_connect', 'linkedin_message', 'call', 'task'].includes(editStepType) && (
                      <>
                        <textarea value={editStepBody} onChange={e => setEditStepBody(e.target.value)} placeholder="Body..." rows={3} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
                        <div style={{ fontSize: 10, color: "#888780", marginTop: 4 }}>Variables: {VARIABLES.join(', ')}</div>
                      </>
                    )}
                    {editStepType === 'wait' && (
                      <div style={{ fontSize: 12, color: "#888780" }}>This step will wait {editStepDelay} day(s) before the next step.</div>
                    )}
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={saveEditStep} style={{ padding: "4px 12px", borderRadius: 6, border: "none", fontSize: 11, cursor: "pointer", background: "#042C53", color: "#B5D4F4", fontFamily: "inherit", fontWeight: 500 }}>Save</button>
                      <button onClick={() => setEditingStep(null)} style={{ padding: "4px 12px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 11, cursor: "pointer", background: "transparent", color: "#888780", fontFamily: "inherit" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  /* Display step */
                  <div style={{ background: "#FFFFFF", borderRadius: 8, border: "0.5px solid #D3D1C7", padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 10 }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#888780"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#D3D1C7"}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: "#F1EFE8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginTop: 2 }}>
                      {stepIcon(step.step_type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "#888780" }}>Step {step.step_number}</span>
                        <Chip bg="#F1EFE8" color="#5F5E5A" size={9}>{STEP_TYPES.find(t => t.value === step.step_type)?.label || step.step_type}</Chip>
                        {step.delay_days > 0 && step.step_type !== 'wait' && (
                          <span style={{ fontSize: 10, color: "#888780" }}>after {step.delay_days}d</span>
                        )}
                      </div>
                      {step.subject && <div style={{ fontSize: 13, fontWeight: 500, marginTop: 3 }}>{step.subject}</div>}
                      {step.body && <div style={{ fontSize: 12, color: "#5F5E5A", marginTop: 2, whiteSpace: "pre-wrap", maxHeight: 60, overflow: "hidden" }}>{step.body}</div>}
                      {step.step_type === 'wait' && <div style={{ fontSize: 12, color: "#888780", marginTop: 2 }}>Wait {step.delay_days} day(s)</div>}
                      {/* Metrics */}
                      {step.stats && (step.stats.sent > 0) && (
                        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                          <span style={{ fontSize: 10, color: "#888780" }}>Sent: {step.stats.sent}</span>
                          <span style={{ fontSize: 10, color: "#888780" }}>Delivered: {step.stats.delivered}</span>
                          <span style={{ fontSize: 10, color: "#888780" }}>Opened: {step.stats.opened}</span>
                          <span style={{ fontSize: 10, color: "#059669" }}>Replied: {step.stats.replied}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button onClick={() => startEditStep(step)} style={{ padding: "3px 8px", borderRadius: 5, border: "0.5px solid #D3D1C7", fontSize: 10, cursor: "pointer", background: "transparent", color: "#888780", fontFamily: "inherit" }}>Edit</button>
                      <button onClick={() => deleteStep(step.id)} style={{ padding: "3px 8px", borderRadius: 5, border: "0.5px solid #D3D1C7", fontSize: 10, cursor: "pointer", background: "transparent", color: "#B91C1C", fontFamily: "inherit" }}>Del</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add step */}
            {showAddStep ? (
              <div style={{ background: "#FFFFFF", borderRadius: 8, border: "0.5px solid #185FA5", padding: 14, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <select value={stepType} onChange={e => setStepType(e.target.value)} style={{ padding: "5px 8px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit" }}>
                    {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {stepType !== 'wait' && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "#888780" }}>Delay:</span>
                      <input type="number" min={0} value={stepDelay} onChange={e => setStepDelay(parseInt(e.target.value) || 0)} style={{ width: 50, padding: "4px 6px", borderRadius: 5, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit" }} />
                      <span style={{ fontSize: 11, color: "#888780" }}>days</span>
                    </div>
                  )}
                </div>
                {stepType === 'email' && (
                  <input value={stepSubject} onChange={e => setStepSubject(e.target.value)} placeholder="Subject..." style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit", marginBottom: 6, boxSizing: "border-box" }} />
                )}
                {['email', 'linkedin_connect', 'linkedin_message', 'call', 'task'].includes(stepType) && (
                  <>
                    <textarea value={stepBody} onChange={e => setStepBody(e.target.value)} placeholder={stepType === 'linkedin_connect' ? 'Connection message (optional)...' : 'Body / description...'} rows={3} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
                    <div style={{ fontSize: 10, color: "#888780", marginTop: 4 }}>Variables: {VARIABLES.join(', ')}</div>
                  </>
                )}
                {stepType === 'wait' && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 12 }}>Wait</span>
                    <input type="number" min={1} value={stepDelay} onChange={e => setStepDelay(parseInt(e.target.value) || 1)} style={{ width: 50, padding: "4px 6px", borderRadius: 5, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit" }} />
                    <span style={{ fontSize: 12 }}>day(s)</span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button onClick={addStep} disabled={savingStep} style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 11, cursor: "pointer", background: "#042C53", color: "#B5D4F4", fontFamily: "inherit", fontWeight: 500, opacity: savingStep ? 0.5 : 1 }}>
                    {savingStep ? 'Adding...' : 'Add Step'}
                  </button>
                  <button onClick={() => setShowAddStep(false)} style={{ padding: "5px 12px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 11, cursor: "pointer", background: "transparent", color: "#888780", fontFamily: "inherit" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddStep(true)} style={{ padding: "8px 14px", borderRadius: 7, border: "1px dashed #D3D1C7", fontSize: 12, cursor: "pointer", background: "transparent", color: "#888780", fontFamily: "inherit", width: "100%", textAlign: "center" }}>+ Add Step</button>
            )}
          </div>

          {/* Enrollments */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#2C2C2A" }}>Enrolled Contacts ({enrollments.length})</div>
              <button onClick={() => setShowEnroll(!showEnroll)} style={{ padding: "4px 12px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 11, cursor: "pointer", background: showEnroll ? "#E6F1FB" : "transparent", color: "#2C2C2A", fontFamily: "inherit" }}>+ Enroll Contact</button>
            </div>

            {/* Contact picker */}
            {showEnroll && (
              <div style={{ background: "#FFFFFF", borderRadius: 8, border: "0.5px solid #185FA5", padding: 12, marginBottom: 10 }}>
                <input
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="Search contacts by name or company..."
                  autoFocus
                  style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }}
                />
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {filteredContacts.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#888780", padding: 8 }}>No contacts found.</div>
                  ) : filteredContacts.map(c => {
                    const alreadyEnrolled = enrollments.some(e => e.contact_id === c.id);
                    return (
                      <div key={c.id}
                        onClick={() => !alreadyEnrolled && enrollContact(c)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: alreadyEnrolled ? "default" : "pointer", opacity: alreadyEnrolled ? 0.5 : 1 }}
                        onMouseEnter={e => { if (!alreadyEnrolled) e.currentTarget.style.background = "#F1EFE8"; }}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{ fontSize: 13 }}>{c.name || c.full_name}</div>
                        <div style={{ fontSize: 11, color: "#888780" }}>{c.company_name || ''}</div>
                        {alreadyEnrolled && <Chip bg="#E6F1FB" color="#0C447C" size={9}>enrolled</Chip>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Enrollment list */}
            {enrollments.length === 0 ? (
              <div style={{ fontSize: 12, color: "#888780", padding: 12 }}>No contacts enrolled yet.</div>
            ) : (
              <div style={{ background: "#FFFFFF", borderRadius: 8, border: "0.5px solid #D3D1C7" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "0.5px solid #D3D1C7" }}>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 10, color: "#888780", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 10, color: "#888780", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Company</th>
                      <th style={{ textAlign: "center", padding: "8px 12px", fontSize: 10, color: "#888780", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Step</th>
                      <th style={{ textAlign: "center", padding: "8px 12px", fontSize: 10, color: "#888780", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 10, color: "#888780", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map(en => {
                      const esc = enrollmentStatusColors[en.status] || enrollmentStatusColors.active;
                      const contact = en.contacts;
                      return (
                        <tr key={en.id} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                          <td style={{ padding: "8px 12px" }}>{contact?.full_name || contact?.first_name || 'Unknown'}</td>
                          <td style={{ padding: "8px 12px", color: "#888780" }}>{contact?.company_name || ''}</td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>{en.current_step}/{steps.length}</td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}><Chip bg={esc.bg} color={esc.color} size={9}>{en.status}</Chip></td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "#888780", fontSize: 11 }}>{en.enrolled_at ? new Date(en.enrolled_at).toLocaleDateString('en', { day: 'numeric', month: 'short' }) : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div style={{ width: 260, borderLeft: "0.5px solid #D3D1C7", background: "#FFFFFF", padding: "16px 14px", flexShrink: 0, overflowY: "auto" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Settings</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={settings.eject_on_reply !== false} onChange={e => setSettings(prev => ({ ...prev, eject_on_reply: e.target.checked }))} />
                Eject on Reply
              </label>
              <div style={{ fontSize: 10, color: "#888780", marginTop: 2, marginLeft: 24 }}>Remove contact from playbook when they reply</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Daily Enrollment Limit</div>
              <input type="number" min={1} value={settings.daily_limit || 50} onChange={e => setSettings(prev => ({ ...prev, daily_limit: parseInt(e.target.value) || 50 }))} style={{ width: 80, padding: "4px 8px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 12, fontFamily: "inherit" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={settings.weekdays_only !== false} onChange={e => setSettings(prev => ({ ...prev, weekdays_only: e.target.checked }))} />
                Weekdays Only
              </label>
              <div style={{ fontSize: 10, color: "#888780", marginTop: 2, marginLeft: 24 }}>Only execute steps on weekdays</div>
            </div>

            <button onClick={saveSettings} style={{ padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 11, cursor: "pointer", background: "#042C53", color: "#B5D4F4", fontFamily: "inherit", fontWeight: 500 }}>Save Settings</button>
          </div>
        )}
      </div>
    </div>
  );
}
