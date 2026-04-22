import { useState } from 'react';
import { I } from './atoms';

// A row that toggles between collapsed and expanded state on click.
// The collapsed view is what you always see; the expanded content appears below.
export default function ExpandableRow({ collapsed, expanded, defaultOpen = false, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      border: open ? `0.5px solid ${accent || 'var(--sep)'}` : '0.5px solid transparent',
      borderRadius: 6,
      background: open ? 'var(--fill-1)' : 'transparent',
      transition: 'background 0.12s, border-color 0.12s',
      marginBottom: 2,
    }}>
      <div onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
        {typeof collapsed === 'function' ? collapsed(open) : collapsed}
      </div>
      {open && (
        <div style={{
          padding: '6px 10px 10px',
          borderTop: `0.5px solid var(--sep)`,
          marginTop: 2,
        }}>
          {typeof expanded === 'function' ? expanded({ close: () => setOpen(false) }) : expanded}
        </div>
      )}
    </div>
  );
}

export function ExpandCaret({ open }) {
  return (
    <span style={{ display: 'inline-flex', color: 'var(--text-3)', flexShrink: 0, width: 12 }}>
      {open ? <I.chevronD /> : <I.chevronR />}
    </span>
  );
}
