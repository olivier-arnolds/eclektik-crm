import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// Admin view — list of recurring jobs (admin_jobs table) with toggle,
// recipient editing, last-run status, and a manual "Run now" button.
// Visible only to users on the admin email list (gated in topbar).
export default function AdminView() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const { data } = await supabase.from('admin_jobs').select('*').order('display_name');
    setJobs(data || []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  if (loading) return <div style={{ padding: 24, color: 'var(--text-3)' }}>Loading…</div>;

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Admin — recurring jobs</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
          Schedule and manage automated tasks. Toggle to enable, edit recipients, or run on demand.
        </div>
      </div>

      {jobs.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8 }}>
          No jobs configured yet.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {jobs.map(j => <JobRow key={j.id} job={j} onChange={reload} />)}
      </div>
    </div>
  );
}

function JobRow({ job, onChange }) {
  const [busy, setBusy] = useState(false);
  const [recipientsDraft, setRecipientsDraft] = useState((job.recipients || []).join(', '));
  const [editingRecipients, setEditingRecipients] = useState(false);
  const [runResult, setRunResult] = useState(null);

  const toggleEnabled = async () => {
    setBusy(true);
    const { error } = await supabase.from('admin_jobs').update({ enabled: !job.enabled }).eq('id', job.id);
    setBusy(false);
    if (error) { alert('Failed: ' + error.message); return; }
    if (onChange) onChange();
  };

  const saveRecipients = async () => {
    const list = recipientsDraft.split(',').map(s => s.trim()).filter(Boolean);
    setBusy(true);
    const { error } = await supabase.from('admin_jobs').update({ recipients: list }).eq('id', job.id);
    setBusy(false);
    if (error) { alert('Failed: ' + error.message); return; }
    setEditingRecipients(false);
    if (onChange) onChange();
  };

  const runNow = async () => {
    if (!confirm(`Run "${job.display_name}" now?\n\nWill send to: ${(job.recipients || []).join(', ')}`)) return;
    setBusy(true);
    setRunResult(null);
    try {
      const resp = await fetch('/api/admin-weekly-export', { method: 'POST' });
      const data = await resp.json();
      if (resp.ok) setRunResult({ ok: true, msg: 'Sent! Check your inbox.' });
      else setRunResult({ ok: false, msg: data?.error || `HTTP ${resp.status}` });
    } catch (e) {
      setRunResult({ ok: false, msg: e.message });
    }
    setBusy(false);
    if (onChange) onChange();
  };

  return (
    <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{job.display_name}</div>
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 10,
              background: job.enabled ? 'var(--good-tint)' : 'var(--fill-2)',
              color: job.enabled ? 'var(--good)' : 'var(--text-3)',
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {job.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {job.description && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{job.description}</div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            <span>type: <code style={{ fontSize: 10 }}>{job.job_type}</code></span>
            <span>last run: {job.last_run_at
              ? `${new Date(job.last_run_at).toLocaleString()} (${job.last_run_status || '—'})`
              : 'never'}</span>
          </div>
          {job.last_run_error && (
            <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
              ✗ {job.last_run_error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn-ghost tiny" onClick={runNow} disabled={busy}>
            {busy ? 'Running…' : 'Run now'}
          </button>
          <button
            className={job.enabled ? 'btn-ghost tiny' : 'btn-primary tiny'}
            onClick={toggleEnabled} disabled={busy}>
            {job.enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '0.5px solid var(--sep)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Recipients
        </div>
        {editingRecipients ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={recipientsDraft} onChange={e => setRecipientsDraft(e.target.value)}
              placeholder="comma,separated@example.com"
              style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 12, fontFamily: 'inherit' }} />
            <button className="btn-primary tiny" onClick={saveRecipients} disabled={busy}>Save</button>
            <button className="btn-ghost tiny" onClick={() => { setEditingRecipients(false); setRecipientsDraft((job.recipients || []).join(', ')); }} disabled={busy}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {(job.recipients || []).length === 0
              ? <span style={{ fontSize: 12, color: 'var(--danger)' }}>No recipients configured</span>
              : (job.recipients || []).map(r => (
                  <span key={r} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--fill-1)', color: 'var(--text-2)' }}>{r}</span>
                ))}
            <button className="btn-ghost tiny" onClick={() => setEditingRecipients(true)}>Edit</button>
          </div>
        )}
      </div>

      {runResult && (
        <div style={{ marginTop: 10, fontSize: 12, color: runResult.ok ? 'var(--good)' : 'var(--danger)' }}>
          {runResult.ok ? '✓ ' : '✗ '}{runResult.msg}
        </div>
      )}
    </div>
  );
}
