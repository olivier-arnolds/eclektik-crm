import { useState } from "react";
import { pepC } from '../../lib/constants';
import { updateRow, insertRow } from '../../hooks/useSupabase';
import Chip from '../atoms/Chip';
import Btn from '../atoms/Btn';
import Empty from '../atoms/Empty';

export default function ItemRappelTab({ itemId, item, followUps, contacts, refetch }) {
  const [done, setDone] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', priority: 'schedule', due_date: new Date().toISOString().slice(0,10), description: '' });
  const [saving, setSaving] = useState(false);
  const related = followUps.filter(r => r.itemIds.includes(itemId));
  const pending = related.filter(r => r.status==="no-reply");
  const replied = related.filter(r => r.status==="replied");

  const handleMarkReplied = async (r) => {
    setDone(p => ({ ...p, [r.id]: true }));
    await updateRow('follow_ups', r.id, { status: 'replied' });
    refetch();
  };

  const handleCreateFollowUp = async () => {
    if (!formData.title.trim()) return;
    setSaving(true);
    const row = {
      title: formData.title.trim(),
      priority: formData.priority,
      status: 'pending',
      due_date: formData.due_date || null,
      description: formData.description.trim() || null,
      contact_id: item?.contactIds?.[0] || null,
      opportunity_id: item && item.funnelStage !== 'lead' ? item.id : null,
      lead_id: item && item.funnelStage === 'lead' ? item.id : null,
      owner: item?.owner || null,
    };
    await insertRow('follow_ups', row);
    setFormData({ title: '', priority: 'schedule', due_date: new Date().toISOString().slice(0,10), description: '' });
    setShowForm(false);
    setSaving(false);
    refetch();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <button onClick={() => setShowForm(f => !f)} style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 12px", borderRadius:7, border:"0.5px solid #B4B2A9", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", marginBottom:2, justifyContent:"center", fontWeight:500 }}>+ Add follow-up</button>
      {showForm && (
        <div style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #378ADD", padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
          <input placeholder="Title *" value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
          <div style={{ display:"flex", gap:8 }}>
            <select value={formData.priority} onChange={e => setFormData(f => ({ ...f, priority: e.target.value }))} style={{ flex:1, padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }}>
              <option value="do_now">Do now</option>
              <option value="schedule">Schedule</option>
            </select>
            <input type="date" value={formData.due_date} onChange={e => setFormData(f => ({ ...f, due_date: e.target.value }))} style={{ flex:1, padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8" }} />
          </div>
          <textarea placeholder="Description (optional)" value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={2} style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid #B4B2A9", fontSize:12, fontFamily:"inherit", outline:"none", background:"#F1EFE8", resize:"vertical" }} />
          <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
            <Btn small onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn small primary onClick={handleCreateFollowUp} disabled={saving}>{saving ? 'Saving...' : 'Create'}</Btn>
          </div>
        </div>
      )}
      {related.length === 0 && !showForm && <Empty text="No follow-ups for this item." />}
      {pending.map(r => {
        const contact = contacts.find(c => c.id===r.contactId);
        const pep = pepC[r.pepPriority] || pepC["schedule"];
        const isDone = done[r.id];
        return (
          <div key={r.id} style={{ background:isDone?"#F1EFE8":"#FFFFFF", borderRadius:9, border:`0.5px solid ${isDone?"#D3D1C7":pep.dot}44`, padding:"10px 12px", opacity:isDone?0.6:1 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:5 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:pep.dot, marginTop:4 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500 }}>{contact?.name}</div>
                <div style={{ fontSize:11, color:"#888780" }}>{r.subject}</div>
              </div>
              <Chip bg={pep.bg} color={pep.color} size={10}>{pep.label}</Chip>
            </div>
            <div style={{ fontSize:11, color:"#888780", marginBottom:isDone?0:8, paddingLeft:14 }}>
              {r.type==="email"?"✉":"◎"} Sent {r.sentDate}
              {r.daysWithoutReply>0 && <span style={{ color:r.daysWithoutReply>7?"#D85A30":"#888780" }}> · {r.daysWithoutReply}d no reply</span>}
            </div>
            {!isDone && (
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", paddingLeft:14 }}>
                <Btn small onClick={() => handleMarkReplied(r)}>Replied ✓</Btn>
                <Btn small>Schedule call</Btn>
                <Btn small>Send reminder</Btn>
                <Btn small>Snooze 3d</Btn>
              </div>
            )}
            {isDone && <div style={{ fontSize:11, color:"#1D9E75", paddingLeft:14 }}>✓ Marked as replied</div>}
          </div>
        );
      })}
      {replied.map(r => {
        const contact = contacts.find(c => c.id===r.contactId);
        return (
          <div key={r.id} style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #5DCAA5", padding:"10px 12px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#1D9E75" }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500 }}>{contact?.name}</div>
                <div style={{ fontSize:11, color:"#888780" }}>{r.subject}</div>
              </div>
              <Chip bg="#E1F5EE" color="#085041" size={10}>replied {r.replyDate}</Chip>
            </div>
            {r.note && <div style={{ fontSize:11, color:"#5F5E5A", marginTop:5, paddingLeft:14 }}>{r.note}</div>}
          </div>
        );
      })}
    </div>
  );
}
