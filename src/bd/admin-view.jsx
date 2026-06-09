import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../lib/auth';
import { apiFetch } from '../lib/apiFetch';

// Admin view — two tabs: recurring jobs and feature-request inbox.
// Visible only to users on the admin email list (gated in topbar).
export default function AdminView() {
  const [tab, setTab] = useState('jobs');

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, borderBottom: '0.5px solid var(--sep)', paddingBottom: 8 }}>
        <button className={tab === 'jobs' ? 'btn-primary tiny' : 'btn-ghost tiny'} onClick={() => setTab('jobs')}>
          Recurring jobs
        </button>
        <button className={tab === 'feedback' ? 'btn-primary tiny' : 'btn-ghost tiny'} onClick={() => setTab('feedback')}>
          Feedback inbox
        </button>
      </div>
      {tab === 'jobs' && <JobsPanel />}
      {tab === 'feedback' && <FeedbackInbox />}
    </div>
  );
}

function JobsPanel() {
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
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Recurring jobs</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
          Toggle to enable, edit recipients, or run on demand.
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

function FeedbackInbox() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('new'); // new | approved | done | all
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const adminEmail = session?.user?.email || '';

  const reload = async () => {
    setLoading(true);
    let q = supabase.from('feature_requests').select('*').order('created_at', { ascending: false }).limit(200);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [filter]);

  const updateStatus = async (id, status, decision_notes) => {
    const patch = { status, decided_at: new Date().toISOString(), decided_by: adminEmail };
    if (decision_notes !== undefined) patch.decision_notes = decision_notes;
    const { error } = await supabase.from('feature_requests').update(patch).eq('id', id);
    if (error) { alert('Failed: ' + error.message); return; }
    reload();
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Feedback inbox</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
          Bug reports, feature requests, and questions submitted via the 💡 Feedback button.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {['new', 'approved', 'in_progress', 'done', 'rejected', 'all'].map(s => (
          <button key={s} className={filter === s ? 'btn-primary tiny' : 'btn-ghost tiny'} onClick={() => setFilter(s)}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding: 24, color: 'var(--text-3)' }}>Loading…</div>}

      {!loading && items.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8 }}>
          No items in <code>{filter}</code>.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(it => <FeedbackRow key={it.id} item={it} onAction={updateStatus} />)}
      </div>
    </div>
  );
}

function FeedbackRow({ item, onAction }) {
  const [showFull, setShowFull] = useState(false);
  const [busy, setBusy] = useState(false);

  const stamp = item.created_at ? new Date(item.created_at).toLocaleString() : '';
  const typeIcon = { bug: '🐛', feature: '✨', question: '❓' }[item.type] || '•';
  const statusColor = {
    new: 'var(--accent)', approved: 'var(--good)', in_progress: 'var(--warn)',
    done: 'var(--text-3)', rejected: 'var(--danger)', need_info: 'var(--warn)',
  }[item.status] || 'var(--text-3)';

  const wrap = async (s) => {
    setBusy(true);
    await onAction(item.id, s);
    setBusy(false);
  };

  return (
    <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{typeIcon}</span>
            <span>{item.title}</span>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'var(--fill-1)', color: statusColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {item.status.replace('_', ' ')}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            {item.submitter_email} · {stamp}{item.page_path ? ` · ${item.page_path}` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-1)', marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {showFull || item.description.length < 200 ? item.description : item.description.slice(0, 200) + '…'}
            {item.description.length >= 200 && (
              <button onClick={() => setShowFull(v => !v)}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, marginLeft: 6, padding: 0, fontFamily: 'inherit' }}>
                {showFull ? 'less' : 'more'}
              </button>
            )}
          </div>
          {item.screenshot_url && (
            <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 8 }}>
              <img src={item.screenshot_url} alt="screenshot"
                style={{ maxWidth: 280, maxHeight: 160, border: '0.5px solid var(--sep)', borderRadius: 6 }} />
            </a>
          )}
          {item.decision_notes && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, fontStyle: 'italic' }}>
              Note: {item.decision_notes}
            </div>
          )}
          {item.commit_sha && (
            <div style={{ fontSize: 11, color: 'var(--good)', marginTop: 6 }}>
              ✓ Implemented in commit <code>{item.commit_sha}</code>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          {item.status === 'new' && (
            <>
              <button className="btn-primary tiny" onClick={() => wrap('approved')} disabled={busy}>✓ Approve</button>
              <button className="btn-ghost tiny" style={{ color: 'var(--danger)' }}
                onClick={() => {
                  const reason = prompt('Reason (optional):', '');
                  if (reason === null) return;
                  onAction(item.id, 'rejected', reason || null);
                }} disabled={busy}>✗ Reject</button>
            </>
          )}
          {item.status === 'approved' && (
            <button className="btn-ghost tiny" onClick={() => wrap('new')} disabled={busy}>← Move to new</button>
          )}
        </div>
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
      const resp = await apiFetch('/api/admin-weekly-export', { method: 'POST' });
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
