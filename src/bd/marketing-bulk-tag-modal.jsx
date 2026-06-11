import { useState } from 'react';
import { supabase } from '../supabase';
import { readableTextColor } from '../lib/color-utils';

// Modal for adding or removing tags on a batch of selected contacts.
// Props:
//   contactIds: Set<uuid> — the selected contacts
//   allTags: array of tag objects
//   userEmail: string (for tagged_by audit field)
//   onClose: () => void
//   onComplete: () => void  — called after the batch operation finishes
export default function BulkTagModal({ contactIds, allTags, userEmail, onClose, onComplete }) {
  const [mode, setMode] = useState('add'); // 'add' | 'remove'
  const [selectedTagIds, setSelectedTagIds] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const ids = [...contactIds];

  const toggleTag = (tagId) => {
    const next = new Set(selectedTagIds);
    if (next.has(tagId)) next.delete(tagId); else next.add(tagId);
    setSelectedTagIds(next);
  };

  const apply = async () => {
    if (selectedTagIds.size === 0 || ids.length === 0) return;
    setBusy(true);
    setResult(null);

    try {
      if (mode === 'add') {
        // Build all (contact_id, tag_id) rows; rely on PK conflict to skip duplicates
        const rows = [];
        for (const cid of ids) {
          for (const tid of selectedTagIds) rows.push({ contact_id: cid, tag_id: tid, tagged_by: userEmail });
        }
        // Use upsert to avoid PK violations on already-tagged contacts
        const { error } = await supabase.from('contact_tags').upsert(rows, { onConflict: 'contact_id,tag_id', ignoreDuplicates: true });
        if (error) throw error;
      } else {
        // Remove: one delete per tag (Supabase doesn't support multi-key delete in a single call)
        for (const tid of selectedTagIds) {
          const { error } = await supabase.from('contact_tags').delete().in('contact_id', ids).eq('tag_id', tid);
          if (error) throw error;
        }
      }
      setResult({ ok: true, count: ids.length, tagCount: selectedTagIds.size });
      if (onComplete) onComplete();
    } catch (e) {
      setResult({ ok: false, error: e.message || 'Failed' });
    }
    setBusy(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', borderRadius: 10, padding: 20, width: 460, boxShadow: 'var(--shadow-modal, 0 8px 24px rgba(0,0,0,0.2))' }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
          Tag {ids.length} contact{ids.length !== 1 ? 's' : ''}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            className={mode === 'add' ? 'btn-primary tiny' : 'btn-ghost tiny'}
            onClick={() => setMode('add')}>
            + Add tags
          </button>
          <button
            className={mode === 'remove' ? 'btn-primary tiny' : 'btn-ghost tiny'}
            onClick={() => setMode('remove')}>
            − Remove tags
          </button>
        </div>

        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Pick tag(s)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {(allTags || []).map(tag => {
            const selected = selectedTagIds.has(tag.id);
            const textColor = readableTextColor(tag.color);
            return (
              <button key={tag.id} onClick={() => toggleTag(tag.id)} disabled={busy}
                style={{
                  background: selected ? tag.color + '33' : 'transparent',
                  color: textColor,
                  border: `0.5px solid ${tag.color}${selected ? 'aa' : '44'}`,
                  borderRadius: 10,
                  padding: '4px 10px',
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

        {result && (
          <div style={{ fontSize: 12, color: result.ok ? 'var(--good)' : 'var(--danger)', marginBottom: 12 }}>
            {result.ok
              ? `✓ ${mode === 'add' ? 'Tagged' : 'Untagged'} ${result.count} contact${result.count !== 1 ? 's' : ''} with ${result.tagCount} tag${result.tagCount !== 1 ? 's' : ''}.`
              : `✗ ${result.error}`}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-ghost tiny" onClick={onClose}>{result?.ok ? 'Done' : 'Cancel'}</button>
          {!result?.ok && (
            <button className="btn-primary tiny" onClick={apply} disabled={busy || selectedTagIds.size === 0}>
              {busy ? 'Applying…' : `${mode === 'add' ? 'Add' : 'Remove'} tag${selectedTagIds.size !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
