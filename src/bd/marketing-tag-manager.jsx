import { useState } from 'react';
import { supabase } from '../supabase';

// Modal for editing tag definitions (rename + recolor).
// System tags can be edited but not deleted; custom tags will be deletable in v2.
// Props: allTags, onClose, onChange
export default function TagManager({ allTags, onClose, onChange }) {
  const [editing, setEditing] = useState(null); // tag id being edited
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const startEdit = (tag) => {
    setEditing(tag.id);
    setDraftName(tag.name);
    setDraftColor(tag.color);
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraftName('');
    setDraftColor('');
  };

  const save = async (tag) => {
    if (!draftName.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('tags')
        .update({ name: draftName.trim(), color: draftColor })
        .eq('id', tag.id);
      if (error) throw error;
      cancelEdit();
      if (onChange) onChange();
    } catch (e) {
      setError(e.message || 'Save failed');
    }
    setBusy(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', borderRadius: 10, padding: 20, width: 480, maxHeight: '80vh', overflowY: 'auto', boxShadow: 'var(--shadow-modal, 0 8px 24px rgba(0,0,0,0.2))' }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Manage tags</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(allTags || []).map(tag => {
            const isEditing = editing === tag.id;
            return (
              <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '0.5px solid var(--sep)', borderRadius: 6 }}>
                {isEditing ? (
                  <>
                    <input type="color" value={draftColor} onChange={e => setDraftColor(e.target.value)}
                      style={{ width: 32, height: 22, border: 'none', cursor: 'pointer', padding: 0 }} />
                    <input value={draftName} onChange={e => setDraftName(e.target.value)}
                      autoFocus
                      style={{ flex: 1, padding: '3px 6px', borderRadius: 4, border: '0.5px solid var(--sep)', fontSize: 12 }} />
                    <button className="btn-primary tiny" onClick={() => save(tag)} disabled={busy}>Save</button>
                    <button className="btn-ghost tiny" onClick={cancelEdit} disabled={busy}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: tag.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{tag.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tag.type}</span>
                    <button className="btn-ghost tiny" onClick={() => startEdit(tag)}>Edit</button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {error && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 8 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn-ghost tiny" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
