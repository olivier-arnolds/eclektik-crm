import { useState, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../lib/auth';

// Submit feedback / feature request modal.
// Anyone signed-in can submit. Anonymous-but-authenticated; submitter
// email is captured from the session.
export default function FeedbackModal({ open, onClose, onSubmitted }) {
  const { session } = useAuth();
  const [type, setType] = useState('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  if (!open) return null;

  const submitterEmail = session?.user?.email || 'unknown';
  const pagePath = (typeof window !== 'undefined' ? window.location.pathname + window.location.hash : '') || '/';
  const browserInfo = (typeof navigator !== 'undefined' ? navigator.userAgent : '').slice(0, 200);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      let screenshot_url = null;
      if (file) {
        const ext = (file.name.split('.').pop() || 'png').toLowerCase();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('feature-requests').upload(path, file, {
          cacheControl: '3600', upsert: false,
        });
        if (upErr) throw new Error('Upload failed: ' + upErr.message);
        const pub = supabase.storage.from('feature-requests').getPublicUrl(path);
        screenshot_url = pub?.data?.publicUrl || null;
      }

      const { data, error: insErr } = await supabase.from('feature_requests').insert({
        type, title: title.trim(), description: description.trim(),
        screenshot_url, page_path: pagePath, browser_info: browserInfo,
        submitter_email: submitterEmail,
      }).select('id').single();
      if (insErr) throw new Error(insErr.message);

      // Fire-and-forget admin notification (don't block close on this)
      fetch('/api/feedback-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data?.id }),
      }).catch(() => {});

      if (onSubmitted) onSubmitted();
      // Reset & close
      setType('bug'); setTitle(''); setDescription(''); setFile(null);
      onClose();
    } catch (e) {
      setError(e.message || String(e));
    }
    setSubmitting(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', borderRadius: 10, padding: 20, width: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-modal, 0 8px 24px rgba(0,0,0,0.2))' }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
          Submit feedback / feature request
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={lbl}>Type</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { v: 'bug', label: '🐛 Bug' },
              { v: 'feature', label: '✨ Feature' },
              { v: 'question', label: '❓ Question' },
            ].map(o => (
              <button key={o.v} type="button" onClick={() => setType(o.v)}
                className={type === o.v ? 'btn-primary tiny' : 'btn-ghost tiny'}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={lbl}>Title</div>
          <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
            placeholder="Short summary of the issue or request"
            style={input} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={lbl}>Description</div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
            placeholder="Steps to reproduce / what you'd like to see / context"
            style={{ ...input, fontFamily: 'inherit', resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={lbl}>Screenshot (optional)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="btn-ghost tiny" onClick={() => fileRef.current?.click()}>
              📁 {file ? 'Change file' : 'Choose file'}
            </button>
            {file && (
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {file.name} ({Math.round(file.size / 1024)} KB)
              </span>
            )}
            <input ref={fileRef} type="file" accept="image/*"
              onChange={e => setFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }} />
          </div>
        </div>

        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 12 }}>
          Auto-captured: <code>{submitterEmail}</code> · page <code>{pagePath}</code>
        </div>

        {error && <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-ghost tiny" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn-primary tiny" onClick={handleSubmit}
            disabled={submitting || !title.trim() || !description.trim()}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

const lbl = { fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 };
const input = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
