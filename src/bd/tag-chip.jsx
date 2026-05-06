// Small coloured chip representing one tag.
// `tag` shape: { id, name, color, type }
// Optional `onRemove` shows an × button.
export default function TagChip({ tag, onRemove, small }) {
  if (!tag) return null;
  const padding = small ? '1px 6px' : '2px 8px';
  const fontSize = small ? 9 : 10;
  return (
    <span
      title={tag.description || tag.name}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding,
        borderRadius: 10,
        fontSize,
        fontWeight: 500,
        background: tag.color + '22', // 13% opacity tint of the tag color
        color: tag.color,
        border: `0.5px solid ${tag.color}66`, // 40% opacity border
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}>
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(tag); }}
          title={`Remove ${tag.name}`}
          style={{
            background: 'transparent',
            border: 'none',
            color: tag.color,
            cursor: 'pointer',
            padding: 0,
            fontSize: fontSize + 2,
            lineHeight: 1,
            opacity: 0.6,
          }}>
          ×
        </button>
      )}
    </span>
  );
}
