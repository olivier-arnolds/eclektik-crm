import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Chip from '../atoms/Chip';

const statusColors = {
  draft:    { bg: '#F1EFE8', color: '#888780' },
  active:   { bg: '#D1FAE5', color: '#065F46' },
  paused:   { bg: '#FEF3C7', color: '#92400E' },
  archived: { bg: '#E5E7EB', color: '#6B7280' },
};

const OWNERS = [
  { value: 'MVG', label: 'MVG' },
  { value: 'OA',  label: 'OA' },
  { value: 'YK',  label: 'YK' },
];

export default function PlaybooksList({ onSelectPlaybook }) {
  const [playbooks, setPlaybooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOwner, setNewOwner] = useState('OA');
  const [saving, setSaving] = useState(false);

  const fetchPlaybooks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('playbooks')
      .select(`
        *,
        playbook_steps(id),
        playbook_enrollments(id)
      `)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setPlaybooks(data.map(p => ({
        ...p,
        stepCount: p.playbook_steps?.length || 0,
        enrollmentCount: p.playbook_enrollments?.length || 0,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchPlaybooks(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('playbooks')
      .insert({ name: newName.trim(), status: 'draft', owner: newOwner, settings: {} })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setNewName('');
      setShowCreate(false);
      fetchPlaybooks();
    }
  };

  const toggleStatus = async (e, pb) => {
    e.stopPropagation();
    const next = pb.status === 'active' ? 'paused' : 'active';
    await supabase.from('playbooks').update({ status: next }).eq('id', pb.id);
    fetchPlaybooks();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ background: "#FFFFFF", borderBottom: "0.5px solid #D3D1C7", padding: "16px 18px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Playbooks</div>
            <div style={{ fontSize: 12, color: "#888780", marginTop: 2 }}>{playbooks.length} playbooks</div>
          </div>
          <button onClick={() => setShowCreate(true)} style={{ padding: "6px 14px", borderRadius: 7, border: "none", fontSize: 12, cursor: "pointer", background: "#042C53", color: "#B5D4F4", fontFamily: "inherit", fontWeight: 500 }}>+ Playbook</button>
        </div>

        {/* Inline create form */}
        {showCreate && (
          <div style={{ marginTop: 12, padding: 12, background: "#F1EFE8", borderRadius: 8, border: "0.5px solid #D3D1C7" }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Playbook name..."
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{ width: "100%", padding: "7px 11px", borderRadius: 7, border: "0.5px solid #D3D1C7", fontSize: 12, background: "#FFFFFF", color: "#2C2C2A", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <select value={newOwner} onChange={e => setNewOwner(e.target.value)} style={{ padding: "5px 8px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 12, background: "#FFFFFF", fontFamily: "inherit" }}>
                {OWNERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button onClick={handleCreate} disabled={saving || !newName.trim()} style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 12, cursor: "pointer", background: "#042C53", color: "#B5D4F4", fontFamily: "inherit", fontWeight: 500, opacity: saving || !newName.trim() ? 0.5 : 1 }}>
                {saving ? 'Creating...' : 'Create'}
              </button>
              <button onClick={() => { setShowCreate(false); setNewName(''); }} style={{ padding: "5px 12px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 12, cursor: "pointer", background: "transparent", color: "#888780", fontFamily: "inherit" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Playbook cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#888780", padding: 40, fontSize: 13 }}>Loading...</div>
        ) : playbooks.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888780", padding: 40, fontSize: 13 }}>No playbooks yet. Create your first one.</div>
        ) : (
          playbooks.map(pb => {
            const sc = statusColors[pb.status] || statusColors.draft;
            return (
              <div key={pb.id} onClick={() => onSelectPlaybook(pb)}
                style={{ background: "#FFFFFF", borderRadius: 10, border: "0.5px solid #D3D1C7", padding: "13px 16px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 13 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#888780"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#D3D1C7"}
              >
                <div style={{ width: 40, height: 40, borderRadius: 9, background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {"\uD83D\uDCCB"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{pb.name}</div>
                  <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>
                    {pb.stepCount} steps · {pb.enrollmentCount} enrolled · {pb.owner || ''}
                  </div>
                  <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                    <Chip bg={sc.bg} color={sc.color} size={10}>{pb.status}</Chip>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {pb.status !== 'archived' && (
                    <button
                      onClick={e => toggleStatus(e, pb)}
                      style={{ padding: "3px 10px", borderRadius: 6, border: "0.5px solid #D3D1C7", fontSize: 10, cursor: "pointer", background: pb.status === 'active' ? "#FEF3C7" : "#D1FAE5", color: pb.status === 'active' ? "#92400E" : "#065F46", fontFamily: "inherit" }}
                    >
                      {pb.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                  )}
                  <div style={{ color: "#B4B2A9", fontSize: 16 }}>{">"}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
