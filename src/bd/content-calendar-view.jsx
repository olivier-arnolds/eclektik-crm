import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

// Content Calendar — gedrafte content-items per kanaal (GLINT/SEER/ROI/ROE) met
// verplichte menselijke goedkeuring; na goedkeuring + geplande tijd publiceert een
// cron automatisch. Stap 3 = scaffold (lege lijst). Week/maand-view volgt in stap 4.

export const CHANNELS = [
  { key: 'glint', label: 'GLINT', color: '#7c3aed' },
  { key: 'seer',  label: 'SEER',  color: '#0891b2' },
  { key: 'roi',   label: 'ROI',   color: '#16a34a' },
  { key: 'roe',   label: 'ROE',   color: '#ea580c' },
];

const STATUS_LABEL = {
  draft: 'Draft', approved: 'Goedgekeurd', scheduled: 'Gepland', published: 'Gepubliceerd',
};

export default function ContentCalendarView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('content_calendar_items')
      .select('*')
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else { setItems(data || []); setError(null); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Content Calendar</h2>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
          {loading ? 'laden…' : `${items.length} item${items.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Kanaal-legenda (vaste kleuren, hergebruikt in de week/maand-view) */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {CHANNELS.map(ch => (
          <span key={ch.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: ch.color, display: 'inline-block' }} />
            {ch.label}
          </span>
        ))}
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 8, background: 'var(--fill-1)', color: '#dc2626', fontSize: 12 }}>
          Kon items niet laden: {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 13, border: '0.5px dashed var(--sep)', borderRadius: 8 }}>
          Nog geen content-items. De week- en maandweergave met goedkeuren + plannen volgt in de volgende stappen.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8 }}>
          {items.map(it => {
            const ch = CHANNELS.find(c => c.key === it.channel);
            return (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '0.5px solid var(--sep)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: ch?.color || 'var(--text-3)', flexShrink: 0 }} />
                <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', width: 44, flexShrink: 0 }}>{ch?.label || it.channel}</span>
                <span style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.subject || it.body?.slice(0, 80) || '(geen inhoud)'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {STATUS_LABEL[it.status] || it.status}
                  {it.scheduled_at ? ` · ${new Date(it.scheduled_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
