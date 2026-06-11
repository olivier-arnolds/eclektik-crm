import { readableTextColor } from '../lib/color-utils';

// Small coloured chip representing one tag.
// `tag` shape: { id, name, color, type }
// Optional `onRemove` shows an × button (called with the tag object).
// Optional `onClick` makes the whole chip clickable (also called with the
// tag object). Use either or both — events stopPropagation so a chip
// inside a clickable row won't bubble.
export default function TagChip({ tag, onRemove, onClick, small }) {
  if (!tag) return null;
  const padding = small ? '1px 6px' : '2px 8px';
  const fontSize = small ? 9 : 10;
  const interactive = !!onClick;
  const textColor = readableTextColor(tag.color);
  return (
    <span
      title={interactive ? `Click to remove ${tag.name}` : (tag.description || tag.name)}
      onClick={interactive ? (e) => { e.stopPropagation(); onClick(tag); } : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding,
        borderRadius: 10,
        fontSize,
        fontWeight: 500,
        background: tag.color + '22', // 13% opacity tint of the tag color
        color: textColor,
        border: `0.5px solid ${tag.color}66`, // 40% opacity border
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        cursor: interactive ? 'pointer' : 'default',
      }}>
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(tag); }}
          title={`Remove ${tag.name}`}
          style={{
            background: 'transparent',
            border: 'none',
            color: textColor,
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
