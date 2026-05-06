export default function TagManager({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-1)', padding: 24, borderRadius: 8, minWidth: 400 }}>
        <div>Manage tags — coming in Task B.8</div>
        <button onClick={onClose} style={{ marginTop: 12 }} className="btn-ghost tiny">Close</button>
      </div>
    </div>
  );
}
