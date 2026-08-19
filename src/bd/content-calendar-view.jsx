import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { apiFetch } from '../lib/apiFetch';
import { useAuth } from '../lib/auth';
import { SENDERS, DEFAULT_SENDER, senderNameFor } from '../lib/senders';
import { isApproved, deriveStatus, statusAfterMove, itemReport } from './content-calendar-logic';
import ContentAudiencePicker from './content-audience-picker';

// Content Calendar — gedrafte content-items per kanaal (GLINT/SEER/ROI/ROE) met
// verplichte menselijke goedkeuring; na goedkeuring + geplande tijd publiceert een
// cron automatisch. Stap 5 = slepen (datum zetten/verplaatsen) + detail-modal
// (tekst, bron, datum/tijd, goedkeuren). Cron-publicatie volgt in stap 6+.
//
// Status = afgeleide van twee feiten: goedgekeurd? (approved-toggle) × heeft datum?
//   niet goedgekeurd            -> 'draft'
//   goedgekeurd, geen datum     -> 'approved'
//   goedgekeurd, wel datum      -> 'scheduled'  (cron-doelwit in stap 6)
//   verstuurd                   -> 'published'  (read-only)
// Slepen verandert ALLEEN de datum, nooit de goedkeuring.

export const CHANNELS = [
  { key: 'glint', label: 'GLINT', color: '#7c3aed' },
  { key: 'seer',  label: 'SEER',  color: '#0891b2' },
  { key: 'roi',   label: 'ROI',   color: '#16a34a' },
  { key: 'roe',   label: 'ROE',   color: '#ea580c' },
];

const TYPE_BADGE = { email: 'Mail', linkedin_post: 'Post', linkedin_dm: 'DM' };

// Unipile-accounts (CLAUDE.md §5). Leeg = default = Marco (env CONTENT_LINKEDIN_ACCOUNT_ID).
const DEFAULT_LINKEDIN_ACCOUNT_ID = 'KYq2oN8JSPiAQSrcIfT5Ew'; // Marco
const LINKEDIN_ACCOUNTS = [
  { id: 'KYq2oN8JSPiAQSrcIfT5Ew', label: 'Marco' },
  { id: 'j9-n2jeNTtGUxemfjlBsZA', label: 'Yarmilla' },
  { id: 'tC2o50tiTBiRCt9xAnio3w', label: 'Olivier' },
];
const linkedinAccountLabel = (id) => {
  const eff = id || DEFAULT_LINKEDIN_ACCOUNT_ID;
  return LINKEDIN_ACCOUNTS.find(a => a.id === eff)?.label || eff;
};

const STATUS_STYLE = {
  draft:     { bg: 'rgba(148,163,184,0.18)', border: 'rgba(148,163,184,0.55)', label: 'Draft' },
  approved:  { bg: 'rgba(37,99,235,0.16)',   border: 'rgba(37,99,235,0.55)',   label: 'Goedgekeurd' },
  scheduled: { bg: 'rgba(217,119,6,0.18)',   border: 'rgba(217,119,6,0.6)',    label: 'Gepland' },
  published: { bg: 'rgba(22,163,74,0.16)',   border: 'rgba(22,163,74,0.55)',   label: 'Gepubliceerd' },
};

// Werkdagen (ma-vr) standaard; weekenddagen verschijnen alleen als er content op staat.
const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];
const ALL_DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const dowLabel = (d) => ALL_DAY_LABELS[(d.getDay() + 6) % 7]; // ma=0 … zo=6
const MONTHS_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

// --- datum-helpers (weekstart = maandag, lokale tijd) ---
function startOfWeek(d) {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function pad(n) { return String(n).padStart(2, '0'); }
function toDateInput(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function toTimeInput(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

export default function ContentCalendarView({ contacts = [], accounts = [], allTags = [] }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [draggingId, setDraggingId] = useState(null);
  const [openItem, setOpenItem] = useState(null); // item-object voor de detail-modal
  const [reportItem, setReportItem] = useState(null); // item-object voor de rapportage-popup

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

  // Optimistische patch van één item in de lokale state.
  const patchLocal = useCallback((id, fields) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...fields } : it));
  }, []);

  // Datum zetten/verplaatsen via slepen. day=null => uit de kalender halen.
  // Verandert ALLEEN de datum + de afgeleide status; goedkeuring blijft gelijk.
  // Zoekt het actuele item op id op (het gesleepte item kan uit grid of lade komen).
  const moveToDate = useCallback(async (id, day) => {
    const item = items.find(it => it.id === id);
    if (!item || item.status === 'published') return; // niet gevonden / al verstuurd
    let newAt = null;
    if (day) {
      const prev = item.scheduled_at ? new Date(item.scheduled_at) : null;
      const h = prev ? prev.getHours() : 9;   // behoud tijd, anders 09:00
      const m = prev ? prev.getMinutes() : 0;
      const d = new Date(day); d.setHours(h, m, 0, 0);
      newAt = d.toISOString();
    }
    const newStatus = statusAfterMove(item.status, !!day);
    patchLocal(item.id, { scheduled_at: newAt, status: newStatus });
    const { error } = await supabase.from('content_calendar_items')
      .update({ scheduled_at: newAt, status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (error) { alert('Verplaatsen mislukt: ' + error.message); load(); }
  }, [items, patchLocal, load]);

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const scheduled = useMemo(() => items.filter(it => it.scheduled_at), [items]);
  const unscheduled = useMemo(() => items.filter(it => !it.scheduled_at), [items]);
  // Werkdagen (ma-vr) altijd tonen; een weekenddag alleen als er een item op staat
  // (zo blijft het weekend normaal verborgen, maar wordt niets stilletjes onzichtbaar).
  const weekDays = useMemo(() => {
    const full = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const days = full.slice(0, 5);
    for (const wd of [5, 6]) {
      if (scheduled.some(it => sameDay(new Date(it.scheduled_at), full[wd]))) days.push(full[wd]);
    }
    return days;
  }, [weekStart, scheduled]);

  const weekIndex = useMemo(() => {
    const map = {};
    for (const it of scheduled) {
      const d = new Date(it.scheduled_at);
      const idx = weekDays.findIndex(wd => sameDay(wd, d));
      if (idx === -1) continue;
      const k = `${it.channel}|${idx}`;
      (map[k] = map[k] || []).push(it);
    }
    return map;
  }, [scheduled, weekDays]);

  const weekLabel = `${weekDays[0].getDate()} ${MONTHS_NL[weekDays[0].getMonth()].slice(0, 3)} – ${weekDays[4].getDate()} ${MONTHS_NL[weekDays[4].getMonth()].slice(0, 3)} ${weekDays[4].getFullYear()}`;
  const today = new Date();

  const dragProps = { draggingId, setDraggingId };

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Content Calendar</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn-ghost tiny" onClick={() => setAnchor(mode === 'week' ? addDays(anchor, -7) : new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}>‹</button>
          <button className="btn-ghost tiny" onClick={() => setAnchor(new Date())}>Vandaag</button>
          <button className="btn-ghost tiny" onClick={() => setAnchor(mode === 'week' ? addDays(anchor, 7) : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}>›</button>
          <span style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 150, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            {mode === 'week' ? weekLabel : `${MONTHS_NL[anchor.getMonth()]} ${anchor.getFullYear()}`}
          </span>
          <div style={{ display: 'inline-flex', border: '0.5px solid var(--sep)', borderRadius: 6, overflow: 'hidden' }}>
            <button className={mode === 'week' ? 'btn-primary tiny' : 'btn-ghost tiny'} style={{ borderRadius: 0 }} onClick={() => setMode('week')}>Week</button>
            <button className={mode === 'month' ? 'btn-primary tiny' : 'btn-ghost tiny'} style={{ borderRadius: 0 }} onClick={() => setMode('month')}>Maand</button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 8, background: 'var(--fill-1)', color: '#dc2626', fontSize: 12, marginBottom: 12 }}>
          Kon items niet laden: {error}
        </div>
      )}
      {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>Laden…</div>}

      {!loading && !error && (
        <>
          {mode === 'week' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {CHANNELS.map(ch => {
                const count = weekDays.reduce((n, _, i) => n + (weekIndex[`${ch.key}|${i}`]?.length || 0), 0);
                const zero = count === 0;
                return (
                  <span key={ch.key} title={zero ? `${ch.label}: geen content deze week` : `${ch.label}: ${count} item(s) deze week`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 10px', borderRadius: 999,
                      border: `1px solid ${zero ? 'rgba(217,119,6,0.7)' : ch.color}`,
                      background: zero ? 'rgba(217,119,6,0.12)' : 'transparent',
                      color: 'var(--text-1)', fontWeight: zero ? 600 : 500,
                    }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: ch.color, display: 'inline-block' }} />
                    {ch.label} {zero ? '⚠ 0' : count}
                  </span>
                );
              })}
            </div>
          )}

          {mode === 'week' ? (
            <WeekGrid channels={CHANNELS} weekDays={weekDays} weekIndex={weekIndex} today={today}
              {...dragProps} onMoveToDate={moveToDate} onOpen={setOpenItem} onReport={setReportItem} items={items} />
          ) : (
            <MonthGrid anchor={anchor} scheduled={scheduled} today={today}
              onPickDay={(d) => { setAnchor(d); setMode('week'); }} />
          )}

          <UnscheduledTray items={unscheduled} {...dragProps} onMoveToDate={moveToDate} onOpen={setOpenItem} onReport={setReportItem} />
        </>
      )}

      {openItem && (
        <ContentItemModal
          item={items.find(it => it.id === openItem.id) || openItem}
          contacts={contacts}
          accounts={accounts}
          allTags={allTags}
          onClose={() => setOpenItem(null)}
          onSaved={(fields) => { patchLocal(openItem.id, fields); }}
        />
      )}

      {reportItem && (
        <ContentReportModal item={reportItem} contacts={contacts} onClose={() => setReportItem(null)} />
      )}
    </div>
  );
}

// Kleine datum-notatie voor de rapportage (nl-NL, dag-maand-tijd).
function fmtReportDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const REPORT_STAGES = [
  { key: 'draft', label: 'Concept' },
  { key: 'approved', label: 'Goedgekeurd' },
  { key: 'scheduled', label: 'Gepland' },
  { key: 'published', label: 'Gepubliceerd' },
];

// Rapportage-popup voor één contentstuk. Los van de editor (ContentItemModal).
function ContentReportModal({ item, contacts = [], onClose }) {
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState(null);

  const rep = itemReport(item, { now: new Date() });
  const ch = CHANNELS.find(c => c.key === item.channel);

  // Afzenderregel (kanaal-afhankelijk; bewust buiten de pure itemReport gehouden).
  let senderLine = null;
  if (item.type === 'email') {
    senderLine = [item.from_name, item.from_email].filter(Boolean).join(' · ') || null;
  } else {
    senderLine = `LinkedIn van ${linkedinAccountLabel(item.linkedin_account_id)}`;
  }

  // Doelgroep-omschrijving voor het inhoud-blok.
  let audience = null;
  if (item.type === 'linkedin_dm') {
    const c = contacts.find(x => x.id === item.recipient_contact_id);
    audience = c ? (c.name || c.full_name || c.email || 'gekozen contact') : (item.recipient_contact_id ? 'gekozen contact' : 'geen ontvanger');
  } else if (item.target_tag) {
    audience = `tag: ${item.target_tag}`;
  } else if (item.audience_summary) {
    audience = item.audience_summary;
  } else if (Array.isArray(item.target_contact_ids) && item.target_contact_ids.length) {
    audience = `${item.target_contact_ids.length} contact${item.target_contact_ids.length === 1 ? '' : 'en'}`;
  }

  async function runSummary() {
    setAiLoading(true); setAiErr(null);
    try {
      const resp = await apiFetch('/api/content-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: item.channel, type: item.type, subject: item.subject, body: item.body }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setAiSummary(data.summary || '(geen samenvatting)');
    } catch (e) {
      setAiErr(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  const box = { fontSize: 13, border: '0.5px solid var(--sep)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 };
  const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' };

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 12, width: 'min(560px, 95vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--sep)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: ch?.color || 'var(--text-3)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: ch?.color }}>{ch?.label || item.channel}</span>
          <span style={{ fontSize: 10, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{TYPE_BADGE[item.type] || item.type}</span>
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700 }}>Rapportage</span>
          <button className="btn-ghost tiny" onClick={onClose} style={{ marginLeft: 4 }}>✕</button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Blok 1: Status */}
          <div style={box}>
            <span style={label}>Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {REPORT_STAGES.map((s, i) => (
                <span key={s.key} style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 999,
                  border: `1px solid ${i <= rep.stageIndex ? (ch?.color || 'var(--accent)') : 'var(--sep)'}`,
                  background: i === rep.stageIndex ? (ch?.color || 'var(--accent)') : 'transparent',
                  color: i === rep.stageIndex ? '#fff' : (i < rep.stageIndex ? 'var(--text-1)' : 'var(--text-3)'),
                  fontWeight: i === rep.stageIndex ? 700 : 500,
                }}>{s.label}</span>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, color: 'var(--text-2)', fontSize: 12 }}>
              {fmtReportDate(rep.timeline.created_at) && <div>Aangemaakt: {fmtReportDate(rep.timeline.created_at)}</div>}
              {fmtReportDate(rep.timeline.scheduled_at) && <div>Gepland voor: {fmtReportDate(rep.timeline.scheduled_at)}</div>}
              {fmtReportDate(rep.timeline.published_at) && <div>Gepubliceerd: {fmtReportDate(rep.timeline.published_at)}</div>}
            </div>
            {rep.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12, color: w.level === 'block' ? '#dc2626' : '#d97706' }}>
                {w.level === 'block' ? '⛔ ' : '⚠️ '}{w.message}
              </div>
            ))}
          </div>

          {/* Blok 2: Verzendresultaat */}
          {rep.send && (
            <div style={box}>
              <span style={label}>Verzendresultaat</span>
              {senderLine && <div style={{ color: 'var(--text-2)', fontSize: 12 }}>Afzender: {senderLine}</div>}
              {rep.send.recipientCount != null
                ? <div style={{ color: 'var(--text-1)' }}>Verstuurd aan {rep.send.recipientCount} contact{rep.send.recipientCount === 1 ? '' : 'en'}</div>
                : (rep.send.dripSent > 0
                    ? <div style={{ color: 'var(--text-1)' }}>{rep.send.dripSent} verstuurd tot nu toe (drip loopt nog)</div>
                    : <div style={{ color: 'var(--text-3)' }}>Nog niet verstuurd</div>)}
              {rep.send.externalId && <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>ID: {rep.send.externalId}</div>}
            </div>
          )}

          {/* Blok 3: Inhoud */}
          <div style={box}>
            <span style={label}>Inhoud</span>
            {audience && <div style={{ color: 'var(--text-2)', fontSize: 12 }}>Doelgroep: {audience}</div>}
            {item.subject && <div style={{ color: 'var(--text-1)', fontWeight: 600 }}>{item.subject}</div>}
            <div style={{ color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
              {(item.body || '(geen inhoud)').slice(0, 240)}{(item.body || '').length > 240 ? '…' : ''}
            </div>
            {item.source_note && <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Bron: {item.source_note}</div>}

            <div style={{ borderTop: '0.5px solid var(--sep)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {aiSummary
                ? <div style={{ color: 'var(--text-1)' }}>{aiSummary}</div>
                : (
                  <button className="btn-ghost tiny" style={{ alignSelf: 'flex-start' }} disabled={aiLoading} onClick={runSummary}>
                    {aiLoading ? 'Samenvatten…' : 'AI-samenvatting'}
                  </button>
                )}
              {aiErr && <div style={{ fontSize: 12, color: '#dc2626' }}>Samenvatting mislukt: {aiErr}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemCard({ it, draggable = false, dragging = false, setDraggingId, onOpen, onReport }) {
  const ch = CHANNELS.find(c => c.key === it.channel);
  const st = STATUS_STYLE[it.status] || STATUS_STYLE.draft;
  const canDrag = draggable && it.status !== 'published';
  return (
    <div
      draggable={canDrag}
      onDragStart={canDrag ? (e) => { e.stopPropagation(); setDraggingId && setDraggingId(it.id); } : undefined}
      onDragEnd={canDrag ? () => setDraggingId && setDraggingId(null) : undefined}
      onClick={(e) => { e.stopPropagation(); onOpen && onOpen(it); }}
      title={`${st.label}${it.subject ? ' · ' + it.subject : ''}${canDrag ? ' — sleep om te (her)plannen, klik om te openen' : ''}`}
      style={{
        background: st.bg, border: `1px solid ${st.border}`, borderRadius: 6,
        padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0,
        cursor: canDrag ? 'grab' : 'pointer', opacity: dragging ? 0.4 : 1,
      }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', color: ch?.color || 'var(--text-2)', fontWeight: 700 }}>
          {TYPE_BADGE[it.type] || it.type}
        </span>
        <button
          title="Rapportage bekijken"
          onClick={(e) => { e.stopPropagation(); onReport && onReport(it); }}
          onDragStart={(e) => e.preventDefault()}
          style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 11, color: 'var(--text-3)' }}>
          📊
        </button>
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {it.subject || it.body?.slice(0, 60) || '(geen inhoud)'}
      </span>
    </div>
  );
}

function WeekGrid({ channels, weekDays, weekIndex, today, draggingId, setDraggingId, onMoveToDate, onOpen, onReport, items }) {
  const [overCell, setOverCell] = useState(null); // `${channel}|${dayIdx}`
  const draggingItem = items.find(it => it.id === draggingId);
  const gridCols = `80px repeat(${weekDays.length}, 1fr)`;

  return (
    <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, background: 'var(--fill-1)' }}>
        <div style={{ padding: '6px 8px' }} />
        {weekDays.map((d, i) => {
          const isToday = sameDay(d, today);
          return (
            <div key={i} style={{ padding: '6px 8px', textAlign: 'center', borderLeft: '0.5px solid var(--sep)', fontSize: 11, color: isToday ? 'var(--accent)' : 'var(--text-2)', fontWeight: isToday ? 700 : 500 }}>
              {dowLabel(d)} {d.getDate()}
            </div>
          );
        })}
      </div>
      {channels.map(ch => (
        <div key={ch.key} style={{ display: 'grid', gridTemplateColumns: gridCols, borderTop: '0.5px solid var(--sep)', minHeight: 56 }}>
          <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-1)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: ch.color, display: 'inline-block' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)' }}>{ch.label}</span>
          </div>
          {weekDays.map((day, i) => {
            const key = `${ch.key}|${i}`;
            const cell = weekIndex[key] || [];
            // Alleen droppen als het gesleepte item bij dit kanaal hoort (kanaal wijzigt niet via slepen).
            const canDropHere = draggingItem && draggingItem.channel === ch.key && draggingItem.status !== 'published';
            const isOver = overCell === key && canDropHere;
            return (
              <div key={i}
                onDragOver={(e) => { if (canDropHere) { e.preventDefault(); setOverCell(key); } }}
                onDragLeave={() => setOverCell(prev => prev === key ? null : prev)}
                onDrop={(e) => {
                  e.preventDefault(); setOverCell(null);
                  if (canDropHere) { onMoveToDate(draggingItem.id, day); setDraggingId(null); }
                }}
                style={{
                  borderLeft: '0.5px solid var(--sep)', padding: 4, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0,
                  background: isOver ? 'var(--accent-tint)' : 'transparent',
                  outline: isOver ? '1px dashed var(--accent)' : 'none', outlineOffset: -2,
                }}>
                {cell.map(it => (
                  <ItemCard key={it.id} it={it} draggable dragging={draggingId === it.id} setDraggingId={setDraggingId} onOpen={onOpen} onReport={onReport} />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MonthGrid({ anchor, scheduled, today, onPickDay }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const byDay = useMemo(() => {
    const m = {};
    for (const it of scheduled) {
      const d = new Date(it.scheduled_at);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      (m[k] = m[k] || new Set()).add(it.channel);
    }
    return m;
  }, [scheduled]);
  // Weekendkolommen (za/zo) alleen tonen als deze maand weekend-content heeft.
  const monthHasWeekend = useMemo(() => scheduled.some(it => {
    const d = new Date(it.scheduled_at);
    return d.getMonth() === anchor.getMonth() && d.getFullYear() === anchor.getFullYear() && (d.getDay() === 0 || d.getDay() === 6);
  }), [scheduled, anchor]);
  const dayCount = monthHasWeekend ? 7 : 5;
  const labels = monthHasWeekend ? ALL_DAY_LABELS : DAY_LABELS;
  const cols = `repeat(${dayCount}, 1fr)`;

  return (
    <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, background: 'var(--fill-1)' }}>
        {labels.map(l => (
          <div key={l} style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11, color: 'var(--text-2)', borderLeft: '0.5px solid var(--sep)' }}>{l}</div>
        ))}
      </div>
      {Array.from({ length: 6 }, (_, w) => (
        <div key={w} style={{ display: 'grid', gridTemplateColumns: cols, borderTop: '0.5px solid var(--sep)' }}>
          {cells.slice(w * 7, w * 7 + dayCount).map((d, i) => {
            const inMonth = d.getMonth() === anchor.getMonth();
            const isToday = sameDay(d, today);
            const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const chans = byDay[k] ? [...byDay[k]] : [];
            return (
              <div key={i} onClick={() => onPickDay(d)}
                title="Klik om naar deze week te springen"
                style={{
                  borderLeft: '0.5px solid var(--sep)', minHeight: 64, padding: 6, cursor: 'pointer',
                  background: inMonth ? 'transparent' : 'var(--fill-1)', opacity: inMonth ? 1 : 0.5,
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                <span style={{ fontSize: 11, color: isToday ? 'var(--accent)' : 'var(--text-2)', fontWeight: isToday ? 700 : 400 }}>{d.getDate()}</span>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {chans.map(ck => {
                    const ch = CHANNELS.find(c => c.key === ck);
                    return <span key={ck} title={ch?.label} style={{ width: 7, height: 7, borderRadius: '50%', background: ch?.color || 'var(--text-3)', display: 'inline-block' }} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function UnscheduledTray({ items, draggingId, setDraggingId, onMoveToDate, onOpen, onReport }) {
  const [over, setOver] = useState(false);
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
        Nog in te plannen ({items?.length || 0}) — sleep hierheen om van de kalender te halen
      </div>
      <div
        onDragOver={(e) => { if (draggingId) { e.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setOver(false);
          if (draggingId && onMoveToDate) { onMoveToDate(draggingId, null); setDraggingId(null); }
        }}
        style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', minHeight: 48, padding: 8, borderRadius: 8,
          border: `1px dashed ${over ? 'var(--accent)' : 'var(--sep)'}`,
          background: over ? 'var(--accent-tint)' : 'transparent',
        }}>
        {(!items || items.length === 0) && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', alignSelf: 'center' }}>Geen ongeplande items.</span>
        )}
        {(items || []).map(it => (
          <div key={it.id} style={{ width: 180 }}>
            <ItemCard it={it} draggable dragging={draggingId === it.id} setDraggingId={setDraggingId} onOpen={onOpen} onReport={onReport} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Detail-modal: tekst, bron, datum/tijd + goedkeuren ----------
function ContentItemModal({ item, contacts = [], accounts = [], allTags = [], onClose, onSaved }) {
  const ch = CHANNELS.find(c => c.key === item.channel);
  const published = item.status === 'published';
  const isEmail = item.type === 'email';
  const isDM = item.type === 'linkedin_dm';
  const initialDate = item.scheduled_at ? new Date(item.scheduled_at) : null;
  const isLinkedIn = item.type === 'linkedin_post' || item.type === 'linkedin_dm';
  const [subject, setSubject] = useState(item.subject || '');
  const [body, setBody] = useState(item.body || '');
  const [targetContactIds, setTargetContactIds] = useState(item.target_contact_ids || []);
  const [audienceSummaryText, setAudienceSummaryText] = useState(item.audience_summary || '');
  const [showAudiencePicker, setShowAudiencePicker] = useState(false);
  const [audiencePickerMode, setAudiencePickerMode] = useState('build'); // 'build' | 'review'
  const [accountId, setAccountId] = useState(item.linkedin_account_id || '');
  const [recipientId, setRecipientId] = useState(item.recipient_contact_id || '');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientConn, setRecipientConn] = useState(undefined); // undefined=nog niet geladen, null=niet gecheckt, else status
  const [dateVal, setDateVal] = useState(initialDate ? toDateInput(initialDate) : '');
  const [timeVal, setTimeVal] = useState(initialDate ? toTimeInput(initialDate) : '09:00');
  const [approved, setApproved] = useState(isApproved(item.status));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  // Afzender (alleen e-mail). Leeg item = de default-afzender; per item op te slaan.
  const [fromEmail, setFromEmail] = useState(item.from_email || DEFAULT_SENDER.email);
  const [fromName, setFromName] = useState(item.from_name || senderNameFor(item.from_email || DEFAULT_SENDER.email));
  // Cold outreach: negeert de opt-in-eis in de cron (alleen e-mail).
  const [coldOutreach, setColdOutreach] = useState(!!item.cold_outreach);

  // Testmail: stuurt direct één mail naar een adres (meestal jezelf), buiten de
  // planning/opt-in om, zodat je de opmaak kunt controleren.
  const { session } = useAuth();
  const [testTo, setTestTo] = useState(session?.user?.email || '');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null); // { ok, msg }

  async function sendTestEmail() {
    if (!testTo.trim()) { setTestResult({ ok: false, msg: 'Vul een testadres in.' }); return; }
    setTestSending(true); setTestResult(null);
    try {
      const resp = await apiFetch('/api/content-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, to: testTo.trim(), from_email: fromEmail, from_name: fromName, channel: item.channel }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setTestResult({ ok: true, msg: `Testmail verstuurd naar ${data.to || testTo.trim()}.` });
    } catch (e) {
      setTestResult({ ok: false, msg: `Testmail mislukt: ${e.message}` });
    } finally {
      setTestSending(false);
    }
  }

  // Tekstvak-ref + invoeg-helpers voor merge-tags en links. Wij vervangen de
  // huidige selectie (of voegen op de cursor in) en herstellen de cursor na de
  // re-render. Links en merge-tags worden bij het verzenden omgezet (zie
  // api/content-calendar-execute.js: textToHtml + api/_lib/send-broadcast.js).
  const bodyRef = useRef(null);
  function spliceBody(start, end, insert, caretStart, caretEnd) {
    const next = body.slice(0, start) + insert + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      const el = bodyRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + caretStart, start + caretEnd);
    });
  }
  function insertMergeTag(tag) {
    const el = bodyRef.current;
    const start = el ? el.selectionStart : body.length;
    const end = el ? el.selectionEnd : body.length;
    spliceBody(start, end, tag, tag.length, tag.length);
  }
  function insertLink() {
    const el = bodyRef.current;
    const start = el ? el.selectionStart : body.length;
    const end = el ? el.selectionEnd : body.length;
    const selected = body.slice(start, end);
    const url = window.prompt('Link-URL (laat met http:// of https:// beginnen):', 'https://');
    if (url == null) return; // geannuleerd
    if (!/^https?:\/\/\S+/i.test(url.trim())) {
      setErr('Ongeldige URL - een link moet met http:// of https:// beginnen.');
      return;
    }
    let label = selected;
    if (!label) {
      label = window.prompt('Tekst die klikbaar wordt:', 'hier');
      if (label == null) return; // geannuleerd
      label = label.trim() || 'hier';
    }
    const insert = `[${label}](${url.trim()})`;
    spliceBody(start, end, insert, 1, 1 + label.length);
  }

  const hasDate = !!dateVal;
  const nextStatus = published ? 'published' : deriveStatus(approved, hasDate);
  const effectiveAccountId = accountId || DEFAULT_LINKEDIN_ACCOUNT_ID;
  const recipient = contacts.find(c => c.id === recipientId) || null;

  // Laad de connectiestatus van de gekozen DM-ontvanger t.o.v. het gekozen account.
  useEffect(() => {
    if (!isDM || !recipientId) { setRecipientConn(undefined); return; }
    let cancelled = false;
    supabase.from('contact_connections').select('status')
      .eq('contact_id', recipientId).eq('account_id', effectiveAccountId).maybeSingle()
      .then(({ data }) => { if (!cancelled) setRecipientConn(data ? data.status : null); });
    return () => { cancelled = true; };
  }, [isDM, recipientId, effectiveAccountId]);

  async function save() {
    setSaving(true); setErr(null);
    let scheduled_at = null;
    if (hasDate) {
      const d = new Date(`${dateVal}T${timeVal || '09:00'}`);
      if (isNaN(d.getTime())) { setErr('Ongeldige datum/tijd.'); setSaving(false); return; }
      scheduled_at = d.toISOString();
    }
    if (approved && !hasDate) {
      // Goedgekeurd zonder datum mag (status 'approved'), maar waarschuw: cron plant pas met datum.
    }
    const fields = {
      subject: isEmail ? (subject || null) : null,
      body,
      from_email: isEmail ? (fromEmail || null) : null,
      from_name: isEmail ? (fromName || null) : null,
      cold_outreach: isEmail ? coldOutreach : false,
      target_tag: item.target_tag || null,
      target_contact_ids: isEmail ? (targetContactIds.length ? targetContactIds : null) : null,
      audience_summary: isEmail && targetContactIds.length ? (audienceSummaryText || null) : null,
      linkedin_account_id: isLinkedIn ? (accountId || null) : null,
      recipient_contact_id: isDM ? (recipientId || null) : null,
      scheduled_at,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('content_calendar_items').update(fields).eq('id', item.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved && onSaved({ subject: fields.subject, body, from_email: fields.from_email, from_name: fields.from_name, cold_outreach: fields.cold_outreach, target_tag: fields.target_tag, target_contact_ids: fields.target_contact_ids, audience_summary: fields.audience_summary, linkedin_account_id: fields.linkedin_account_id, recipient_contact_id: fields.recipient_contact_id, scheduled_at, status: nextStatus });
    onClose();
  }

  const st = STATUS_STYLE[nextStatus] || STATUS_STYLE.draft;

  // Vriendelijke statusregel onderin zodra gepubliceerd.
  const publishedLine = () => {
    const when = item.published_at
      ? new Date(item.published_at).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '';
    const acct = linkedinAccountLabel(item.linkedin_account_id);
    const tail = when ? ` · ${when}` : '';
    if (item.type === 'email') {
      const n = item.published_recipient_count;
      return `E-mail gestuurd aan ${n ?? '?'} contact${n === 1 ? '' : 'en'}${tail}`;
    }
    if (item.type === 'linkedin_post') return `Gepost via LinkedIn van ${acct}${tail}`;
    if (item.type === 'linkedin_dm') return `Bericht gestuurd via LinkedIn van ${acct}${tail}`;
    return `Gepubliceerd${when ? ' op ' + when : ''}`;
  };

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 12, width: 'min(920px, 95vw)', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--sep)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: ch?.color || 'var(--text-3)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: ch?.color }}>{ch?.label || item.channel}</span>
          <span style={{ fontSize: 10, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{TYPE_BADGE[item.type] || item.type}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 999, background: st.bg, border: `1px solid ${st.border}`, color: 'var(--text-1)' }}>{st.label}</span>
          <button className="btn-ghost tiny" onClick={onClose} style={{ marginLeft: 4 }}>✕</button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isEmail && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '2 1 300px' }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Onderwerp</span>
                <input value={subject} onChange={e => setSubject(e.target.value)} disabled={published}
                  style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 13 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 240px' }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Afzender</span>
                <select value={fromEmail} disabled={published}
                  onChange={e => { setFromEmail(e.target.value); setFromName(senderNameFor(e.target.value)); }}
                  style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 13 }}>
                  {SENDERS.map(s => <option key={s.email} value={s.email}>{s.name} &lt;{s.email}&gt;</option>)}
                  {fromEmail && !SENDERS.some(s => s.email === fromEmail) && <option value={fromEmail}>{fromName} &lt;{fromEmail}&gt;</option>}
                </select>
              </label>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Tekst</span>
            {isEmail && !published && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                <button type="button" className="btn-ghost tiny" onClick={() => insertMergeTag('{{first_name}}')} title="Wordt per ontvanger vervangen door de voornaam">+ Voornaam</button>
                <button type="button" className="btn-ghost tiny" onClick={() => insertMergeTag('{{last_name}}')} title="Wordt per ontvanger vervangen door de achternaam">+ Achternaam</button>
                <button type="button" className="btn-ghost tiny" onClick={insertLink} title="Selecteer een woord en koppel er een link aan">🔗 Link invoegen</button>
              </div>
            )}
            <textarea ref={bodyRef} value={body} onChange={e => setBody(e.target.value)} disabled={published} rows={8}
              style={{ padding: '8px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            {isEmail && !published && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
                {'{{first_name}}'} en {'{{last_name}}'} worden per ontvanger ingevuld. Een link zie je hier als <code>[woord](https://…)</code> en wordt in de mail een klikbaar woord.
              </span>
            )}
          </div>

          {item.source_note && (
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>Bron: </span>{item.source_note}
            </div>
          )}

          {isLinkedIn && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                LinkedIn-account
              </span>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} disabled={published}
                style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 13 }}>
                <option value="">Standaard (Marco)</option>
                {LINKEDIN_ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                {accountId && !LINKEDIN_ACCOUNTS.some(a => a.id === accountId) && <option value={accountId}>{accountId} (onbekend)</option>}
              </select>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                Wordt geplaatst via: <strong style={{ color: 'var(--text-2)' }}>{linkedinAccountLabel(accountId)}</strong>
              </span>
            </label>
          )}

          {isDM && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                Ontvanger (contact)
              </span>
              {recipient ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <strong>{recipient.name || recipient.full_name || '(naamloos)'}</strong>
                  {!published && <button className="btn-ghost tiny" onClick={() => { setRecipientId(''); setRecipientQuery(''); }}>wijzig</button>}
                </div>
              ) : !published ? (
                <>
                  <input value={recipientQuery} onChange={e => setRecipientQuery(e.target.value)} placeholder="Zoek een contact met LinkedIn-URL…"
                    style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 13 }} />
                  {recipientQuery.trim().length >= 2 && (() => {
                    const matches = contacts.filter(c => c.linkedin_url && (c.name || c.full_name || '').toLowerCase().includes(recipientQuery.toLowerCase())).slice(0, 8);
                    return (
                      <div style={{ border: '0.5px solid var(--sep)', borderRadius: 6, maxHeight: 168, overflow: 'auto' }}>
                        {matches.map(c => (
                          <div key={c.id} onClick={() => { setRecipientId(c.id); setRecipientQuery(''); }}
                            style={{ padding: '6px 8px', cursor: 'pointer', fontSize: 12, borderBottom: '0.5px solid var(--sep)' }}>
                            {c.name || c.full_name}{c.account ? <span style={{ color: 'var(--text-3)' }}> · {c.account}</span> : ''}
                          </div>
                        ))}
                        {matches.length === 0 && <div style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-3)' }}>Geen contact met LinkedIn-URL gevonden.</div>}
                      </div>
                    );
                  })()}
                </>
              ) : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
              {recipient && (
                recipientConn === 'connected'
                  ? <span style={{ fontSize: 11, color: '#16a34a' }}>Verbonden via {linkedinAccountLabel(accountId)} - DM komt direct aan.</span>
                  : recipientConn === 'not_connected'
                    ? <span style={{ fontSize: 11, color: '#d97706' }}>Niet 1e-graads verbonden via {linkedinAccountLabel(accountId)} - DM komt aan als bericht/verzoek; grotere kans op weigering.</span>
                    : recipientConn === undefined
                      ? <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Connectie laden…</span>
                      : <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Connectie niet gecheckt via {linkedinAccountLabel(accountId)} - check in Marketing voor zekerheid.</span>
              )}
            </div>
          )}

          {isEmail && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                Doelgroep
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn-ghost" disabled={published} onClick={() => { setAudiencePickerMode('build'); setShowAudiencePicker(true); }}>
                  {targetContactIds.length ? 'Doelgroep uitbreiden' : 'Doelgroep samenstellen'}
                </button>
                {targetContactIds.length > 0 && (
                  <button type="button" className="btn-ghost" onClick={() => { setAudiencePickerMode('review'); setShowAudiencePicker(true); }}>
                    Bekijk doelgroep ({targetContactIds.length})
                  </button>
                )}
                {targetContactIds.length > 0
                  ? <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{audienceSummaryText || `${targetContactIds.length} contacten geselecteerd`}</span>
                  : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Nog geen doelgroep gekozen.</span>}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                Tijdelijke selectie voor dit bericht. De cron verstuurt {coldOutreach ? 'naar alle actieve contacten in de selectie (ook zonder opt-in)' : 'alleen naar opted-in, actieve contacten'}.
              </span>
              {!published && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
                  <input type="checkbox" checked={coldOutreach} onChange={e => setColdOutreach(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>
                    Cold outreach - negeer de opt-in-eis
                    <span style={{ display: 'block', fontSize: 11, color: coldOutreach ? '#d97706' : 'var(--text-3)', lineHeight: 1.5 }}>
                      {coldOutreach
                        ? 'Let op: verstuurt naar contacten zonder marketing-opt-in. Afgemelde, do-not-email en inactieve/former contacten blijven altijd uitgesloten. Zorg dat dit past bij je outreach-afspraken.'
                        : 'Aan voor koude prospects (bv. de Glint-lijst) die nog geen opt-in hebben.'}
                    </span>
                  </span>
                </label>
              )}
              {published && item.cold_outreach && (
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Verstuurd als cold outreach (opt-in genegeerd).</span>
              )}
            </div>
          )}

          {isEmail && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 8, background: 'var(--fill-1)', border: '0.5px solid var(--sep)' }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Testmail</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="jouw@adres.nl"
                  style={{ flex: 1, minWidth: 180, padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 13 }} />
                <button type="button" className="btn-ghost" disabled={testSending || !subject || !body} onClick={sendTestEmail}>
                  {testSending ? 'Versturen…' : 'Stuur testmail'}
                </button>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                Stuurt nu direct één mail met deze afzender/tekst, buiten planning en opt-in om. Merge-tags worden met een voorbeeldnaam ingevuld.
              </span>
              {testResult && (
                <span style={{ fontSize: 12, color: testResult.ok ? '#16a34a' : '#dc2626' }}>{testResult.msg}</span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Datum</span>
              <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)} disabled={published}
                style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 13 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Tijd</span>
              <input type="time" value={timeVal} onChange={e => setTimeVal(e.target.value)} disabled={published || !dateVal}
                style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 13 }} />
            </label>
            {dateVal && !published && (
              <button className="btn-ghost tiny" style={{ alignSelf: 'flex-end' }} onClick={() => setDateVal('')}>Datum wissen</button>
            )}
          </div>

          {!published && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />
              Goedgekeurd {approved && !hasDate && <span style={{ fontSize: 11, color: '#d97706' }}>(zonder datum plant de cron nog niet)</span>}
              {approved && hasDate && isEmail && !targetContactIds.length && !item.target_tag && <span style={{ fontSize: 11, color: '#d97706' }}>(stel een doelgroep samen, anders kan de cron niet versturen)</span>}
              {approved && hasDate && isDM && !recipientId && <span style={{ fontSize: 11, color: '#d97706' }}>(kies een ontvanger, anders kan de cron niet versturen)</span>}
              {approved && hasDate && ((isEmail && (targetContactIds.length || item.target_tag)) || (isDM && recipientId) || item.type === 'linkedin_post') && <span style={{ fontSize: 11, color: '#16a34a' }}>→ wordt automatisch gepubliceerd op de geplande tijd</span>}
            </label>
          )}

          {err && <div style={{ fontSize: 12, color: '#dc2626' }}>Opslaan mislukt: {err}</div>}

          {showAudiencePicker && (
            <ContentAudiencePicker
              contacts={contacts}
              accounts={accounts}
              allTags={allTags}
              audienceIds={targetContactIds}
              initialMode={audiencePickerMode}
              onChange={({ contact_ids, summary }) => { setTargetContactIds(contact_ids); setAudienceSummaryText(summary); }}
              onClose={() => setShowAudiencePicker(false)}
            />
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '0.5px solid var(--sep)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            {published && (<><span>✓</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publishedLine()}</span></>)}
          </span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn-ghost tiny" onClick={onClose}>{published ? 'Sluiten' : 'Annuleren'}</button>
            {!published && (
              <button className="btn-primary tiny" onClick={() => save()} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
