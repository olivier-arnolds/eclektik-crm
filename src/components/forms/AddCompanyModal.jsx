import { useState } from 'react';
import { insertRow } from '../../hooks/useSupabase';

export default function AddCompanyModal({ open, onClose, refetch }) {
  const [form, setForm] = useState({ name: '', country: '', city: '', industry: '', website: '', type: 'Klant', phone: '', email: '', linkedin_url: '' });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const [enriching, setEnriching] = useState(false);

  const handleSave = async () => {
    if (!form.name) return;
    if (!form.website && !form.linkedin_url) {
      alert('Please provide a Website URL or LinkedIn URL to enable auto-enrichment.');
      return;
    }
    setSaving(true);
    const { data: newCompany } = await insertRow('companies', {
      name: form.name,
      country: form.country || null,
      address: form.city || null,
      industry: form.industry || null,
      website: form.website || null,
      linkedin_url: form.linkedin_url || null,
      type: form.type,
      phone: form.phone || null,
      email: form.email || null,
      stage: 'Active',
      owner: 'MVG',
    });
    setSaving(false);

    // Auto-enrich if we have a website (via Surfe) or LinkedIn URL (via Unipile)
    if (newCompany?.id && (form.website || form.linkedin_url)) {
      setEnriching(true);
      try {
        // Try Surfe enrichment if website is available
        if (form.website) {
          const enrichResp = await fetch('/api/surfe-enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'companies', ids: [newCompany.id] }),
          });
          const enrichData = await enrichResp.json();
          if (enrichData.surfeResponse?.enrichmentID) {
            // Poll for results
            await new Promise(r => setTimeout(r, 5000));
            await fetch(`/api/surfe-poll?enrichmentID=${enrichData.surfeResponse.enrichmentID}&type=companies`);
          }
        }
        // Try Unipile enrichment if LinkedIn URL is available
        if (form.linkedin_url) {
          const match = form.linkedin_url.match(/linkedin\.com\/company\/([^\/\?]+)/);
          if (match) {
            const accResp = await fetch('/api/unipile?action=list-accounts');
            const accData = await accResp.json();
            const liAcc = accData.data?.items?.find(a => (a.account_type || '').includes('LINKEDIN'));
            if (liAcc) {
              const companyResp = await fetch(`/api/unipile?action=get-profile&account_id=${liAcc.id}&linkedin_url=${encodeURIComponent(form.linkedin_url)}`);
              // Company data will be fetched on next view
            }
          }
        }
      } catch (e) { /* enrichment is best-effort */ }
      setEnriching(false);
    }

    setForm({ name: '', country: '', city: '', industry: '', website: '', type: 'Klant', phone: '', email: '', linkedin_url: '' });
    refetch();
    onClose();
  };

  const inputStyle = { width: "100%", padding: "7px 11px", borderRadius: 7, border: "0.5px solid #D3D1C7", fontSize: 12, background: "#fff", color: "#2C2C2A", fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const labelStyle = { fontSize: 10, fontWeight: 500, color: "#888780", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: "24px 28px", width: 440, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>New company</div>
        <div style={{ marginBottom: 10 }}><div style={labelStyle}>Company name</div><input autoFocus value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><div style={labelStyle}>City</div><input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} style={inputStyle} /></div>
          <div><div style={labelStyle}>Country</div><input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} style={inputStyle} /></div>
        </div>
        <div style={{ marginBottom: 10 }}><div style={labelStyle}>Industry</div><input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} style={inputStyle} /></div>
        <div style={{ marginBottom: 10 }}><div style={labelStyle}>Website</div><input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://..." style={inputStyle} /></div>
        <div style={{ marginBottom: 10 }}><div style={labelStyle}>LinkedIn URL</div><input value={form.linkedin_url} onChange={e => setForm(p => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/company/..." style={inputStyle} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><div style={labelStyle}>Phone</div><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} /></div>
          <div><div style={labelStyle}>Email</div><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} /></div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>Type</div>
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ ...inputStyle, background: "#fff" }}>
            <option value="Klant">Klant</option>
            <option value="Customer">Customer</option>
            <option value="Partner">Partner</option>
            <option value="Prospect">Prospect</option>
            <option value="Big Four">Big Four</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 7, border: "0.5px solid #D3D1C7", fontSize: 12, cursor: "pointer", background: "#fff", color: "#2C2C2A", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || enriching} style={{ padding: "7px 16px", borderRadius: 7, border: "none", fontSize: 12, cursor: "pointer", background: "#042C53", color: "#B5D4F4", fontFamily: "inherit", fontWeight: 500 }}>{enriching ? '⟳ Enriching...' : saving ? 'Saving...' : 'Save & Enrich'}</button>
        </div>
      </div>
    </div>
  );
}
