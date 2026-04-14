import { useState } from 'react';
import { insertRow } from '../../hooks/useSupabase';
import { getInitials, avatarColorFromName } from '../../lib/constants';

export default function AddContactModal({ open, onClose, refetch, accounts }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', title: '', company_id: '', linkedin_url: '', owner: 'MVG' });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!form.first_name && !form.last_name) return;
    setSaving(true);
    const fullName = `${form.first_name} ${form.last_name}`.trim();
    const company = accounts?.find(a => a.id === form.company_id);
    await insertRow('contacts', {
      first_name: form.first_name,
      last_name: form.last_name,
      full_name: fullName,
      email: form.email || null,
      phone: form.phone || null,
      title: form.title || null,
      company_id: form.company_id || null,
      company_name: company?.name || null,
      linkedin_url: form.linkedin_url || null,
      owner: form.owner,
      stage: 'Active',
      source: 'Manual',
    });
    setSaving(false);
    setForm({ first_name: '', last_name: '', email: '', phone: '', title: '', company_id: '', linkedin_url: '', owner: 'MVG' });
    refetch();
    onClose();
  };

  const inputStyle = { width: "100%", padding: "7px 11px", borderRadius: 7, border: "0.5px solid #D3D1C7", fontSize: 12, background: "#fff", color: "#2C2C2A", fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const labelStyle = { fontSize: 10, fontWeight: 500, color: "#888780", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: "24px 28px", width: 440, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>New contact</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><div style={labelStyle}>First name</div><input autoFocus value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} style={inputStyle} /></div>
          <div><div style={labelStyle}>Last name</div><input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} style={inputStyle} /></div>
        </div>
        <div style={{ marginBottom: 10 }}><div style={labelStyle}>Email</div><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} /></div>
        <div style={{ marginBottom: 10 }}><div style={labelStyle}>Phone</div><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} /></div>
        <div style={{ marginBottom: 10 }}><div style={labelStyle}>Role</div><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} /></div>
        <div style={{ marginBottom: 10 }}>
          <div style={labelStyle}>Company</div>
          <select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))} style={{ ...inputStyle, background: "#fff" }}>
            <option value="">— Select company —</option>
            {(accounts || []).sort((a, b) => a.name.localeCompare(b.name)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}><div style={labelStyle}>LinkedIn URL</div><input value={form.linkedin_url} onChange={e => setForm(p => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." style={inputStyle} /></div>
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>Owner</div>
          <select value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))} style={{ ...inputStyle, background: "#fff" }}>
            <option value="MVG">MVG</option>
            <option value="OA">OA</option>
            <option value="YK">YK</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 7, border: "0.5px solid #D3D1C7", fontSize: 12, cursor: "pointer", background: "#fff", color: "#2C2C2A", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "7px 16px", borderRadius: 7, border: "none", fontSize: 12, cursor: "pointer", background: "#042C53", color: "#B5D4F4", fontFamily: "inherit", fontWeight: 500 }}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
