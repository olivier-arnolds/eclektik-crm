import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

// Popover for adding/removing tags on a contact.
// Props:
//   contactId: uuid of the contact being edited
//   currentTags: array of tag objects currently on this contact
//   allTags: array of all available tag objects
//   userEmail: string (used as tagged_by)
//   onClose: () => void
//   onChange: () => void  — called after a successful add/remove so caller can refetch
export default function TagPopover({ contactId, currentTags, allTags, userEmail, onClose, onChange }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const currentIds = new Set(currentTags.map(t => t.id));

  const toggle = async (tag) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (currentIds.has(tag.id)) {
        const { error } = await supabase
          .from('contact_tags')
          .delete()
          .eq('contact_id', contactId)
          .eq('tag_id', tag.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contact_tags')
          .insert({ contact_id: contactId, tag_id: tag.id, tagged_by: userEmail });
        if (error) throw error;
      }
      if (onChange) onChange();
    } catch (e) {
      setError(e.message || 'Failed');
    }
    setBusy(false);
  };

  return (
    <div ref={ref}
      style={{
        position: 'absolute',
        zIndex: 100,
        background: 'var(--bg-1)',
        border: '0.5px solid var(--sep)',
        borderRadius: 8,
        padding: 10,
        minWidth: 200,
        boxShadow: 'var(--shadow-modal, 0 4px 16px rgba(0,0,0,0.15))',
      }}
      onClick={(e) => e.stopPropagation()}>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Tag this contact
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {(allTags || []).map(tag => {
          const selected = currentIds.has(tag.id);
          return (
            <button key={tag.id}
              onClick={() => toggle(tag)}
              disabled={busy}
              style={{
                background: selected ? tag.color + '33' : 'transparent',
                color: tag.color,
                border: `0.5px solid ${tag.color}${selected ? 'aa' : '44'}`,
                borderRadius: 10,
                padding: '3px 9px',
                fontSize: 11,
                fontWeight: selected ? 600 : 400,
                cursor: busy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}>
              {selected ? '✓ ' : ''}{tag.name}
            </button>
          );
        })}
      </div>
      {error && <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 6 }}>{error}</div>}
    </div>
  );
}
