import { useState } from 'react';
import { supabase } from '../../supabase';
import { C } from '../../lib/constants';

const OWNERS = ['MVG', 'OA', 'YK'];

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(44,44,42,0.35)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 9999,
};

const modalStyle = {
  background: '#FFFFFF', borderRadius: 12, padding: '28px 32px 24px',
  width: 440, maxHeight: '85vh', overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 500,
  color: '#888780', marginBottom: 4, textTransform: 'uppercase',
  letterSpacing: '0.3px',
};

const inputStyle = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '0.5px solid #D3D1C7', borderRadius: 6,
  background: '#FAFAF7', color: '#2C2C2A', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
};

const selectStyle = { ...inputStyle, appearance: 'auto' };

const rowStyle = { marginBottom: 14 };

const btnBase = {
  padding: '8px 20px', fontSize: 13, fontWeight: 500,
  borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
  border: 'none',
};

const LEAD_TYPES = ['Glint', 'ROI', 'ROE', 'Other'];

const EMPTY = {
  title: '', company_name: '', contact_name: '', email: '', linkedin_url: '',
  value: '', owner: 'MVG', probability: 20, close_date: '', notes: '', product_line: '',
};

export default function AddLeadModal({ open, onClose, refetch, stageKey }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');

    const row = {
      topic: form.title.trim(),
      full_name: form.contact_name.trim() || form.title.trim(),
      email: form.email.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      owner: form.owner,
      est_revenue: Number(form.value) || 0,
      probability: Number(form.probability) || 0,
      notes: form.notes.trim(),
      sub_status: 'qualify',
      status: 'New',
      product_line: form.product_line || null,
    };
    if (form.close_date) row.close_date = form.close_date;

    const { error: dbErr } = await supabase.from('leads').insert([row]);

    if (dbErr) {
      setError(dbErr.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setForm({ ...EMPTY });
    if (refetch) await refetch();
    onClose();
  };

  const itemLabel = stageKey === 'opportunity' ? 'opportunity' : stageKey === 'active' || stageKey === 'onboarding' ? 'project' : 'lead';

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2A', marginBottom: 20 }}>
          Add {itemLabel}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={rowStyle}>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={form.title} onChange={set('title')} placeholder="Deal or lead name" autoFocus />
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Company</label>
            <input style={inputStyle} value={form.company_name} onChange={set('company_name')} placeholder="Company name" />
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Contact name</label>
            <input style={inputStyle} value={form.contact_name} onChange={set('contact_name')} placeholder="Full name" />
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>LinkedIn URL</label>
            <input style={inputStyle} type="url" value={form.linkedin_url} onChange={set('linkedin_url')} placeholder="https://linkedin.com/in/..." />
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Type</label>
            <select style={selectStyle} value={form.product_line} onChange={set('product_line')}>
              <option value="">-- Select type --</option>
              {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, ...rowStyle }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Value</label>
              <input style={inputStyle} type="number" min="0" value={form.value} onChange={set('value')} placeholder="0" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Probability (%)</label>
              <input style={inputStyle} type="number" min="0" max="100" value={form.probability} onChange={set('probability')} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, ...rowStyle }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Owner</label>
              <select style={selectStyle} value={form.owner} onChange={set('owner')}>
                {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Close date</label>
              <input style={inputStyle} type="date" value={form.close_date} onChange={set('close_date')} />
            </div>
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={set('notes')} placeholder="Any additional context..." />
          </div>

          {error && (
            <div style={{ color: '#791F1F', fontSize: 12, marginBottom: 10, background: '#FCEBEB', padding: '6px 10px', borderRadius: 6 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ ...btnBase, background: '#F1EFE8', color: '#5F5E5A' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ ...btnBase, background: C.lead.dot, color: '#fff', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
