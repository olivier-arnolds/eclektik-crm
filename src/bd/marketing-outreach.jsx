import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { apiFetch } from '../lib/apiFetch';
import { useAuth } from '../lib/auth';
import { getFolderEmails } from '../lib/graph';
import { scanInbox } from './outreach-match';

// Outreach-tab onder Marketing. Ontwerp: docs/outreach-handover.md addendum §9.
//
// Job B (replydetectie) draait HIER in de browser, met het Graph-token van de
// ingelogde gebruiker. Dat scheelt de hele Azure-app-only-route, maar het heeft
// twee consequenties die zichtbaar in de UI moeten zitten:
//
//   1. Het token is van de ingelogde gebruiker, dus alleen de afzender zelf
//      (Marco) kan zijn eigen inbox scannen. Iemand anders zou de verkeerde
//      mailbox lezen; daarom blokkeren we de scanknop dan.
//   2. Het is niet onbeheerd. Daarom tonen we prominent hoe oud de laatste scan
//      is: bericht 2 mag straks niet uitgaan op verouderde reply-data.
//
// De lijst met contacten wordt bewust ZONDER de berichtteksten opgehaald
// (msg1_body/msg2_body zijn volledige e-mails); die horen niet in een overzicht.

const STALE_HOURS = 12;
const CLASSIFY_BATCH = 25;

const STATUS_LABEL = {
  queued: 'Klaar om te sturen', msg1_sent: 'Bericht 1 verstuurd', msg2_sent: 'Bericht 2 verstuurd',
  replied: 'Heeft geantwoord', bounced: 'Gebounced', ooo: 'Afwezig', referred: 'Doorverwezen',
  opted_out: 'Afgemeld', paused: 'Gepauzeerd', done: 'Afgerond',
};
const STATUS_COLOR = {
  queued: '#2563eb', msg1_sent: '#d97706', msg2_sent: '#d97706', replied: '#16a34a',
  bounced: '#dc2626', ooo: '#7c3aed', referred: '#0891b2', opted_out: '#6b7280',
  paused: '#6b7280', done: '#16a34a',
};
const TIER_LABEL = { top: 'Top', good: 'Goed', medium: 'Matig' };

const CONTACT_COLS =
  'id,email,first_name,last_name,title,company,status,priority_tier,outreach_prio,is_reserve,' +
  'next_action_at,paused_reason,last_reply_summary,contact_id,company_id';

function hoursSince(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 3600000;
}

function fmtAge(iso) {
  const h = hoursSince(iso);
  if (h === null) return 'nog nooit';
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min geleden`;
  if (h < 48) return `${Math.round(h)} uur geleden`;
  return `${Math.round(h / 24)} dagen geleden`;
}

export default function MarketingOutreach() {
  const { session, hasGraphToken, reconnectMicrosoft } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [rows, setRows] = useState([]);
  const [sync, setSync] = useState(null);         // outreach_sync_state-rij
  const [sentInfo, setSentInfo] = useState({ count: 0, firstAt: null });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [scanning, setScanning] = useState(false);
  const [scanErr, setScanErr] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [showReserve, setShowReserve] = useState(false);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: camps, error: cErr } = await supabase
        .from('outreach_campaign').select('*').order('created_at', { ascending: true });
      if (cErr) throw cErr;
      const camp = (camps || [])[0] || null;
      setCampaign(camp);
      if (!camp) { setRows([]); setLoading(false); return; }

      const { data: cts, error: rErr } = await supabase
        .from('outreach_contact').select(CONTACT_COLS)
        .eq('campaign_id', camp.id)
        .order('is_reserve', { ascending: true })
        .order('outreach_prio', { ascending: true, nullsFirst: false })
        .limit(2000);
      if (rErr) throw rErr;
      setRows(cts || []);

      const { data: st } = await supabase
        .from('outreach_sync_state').select('*').eq('id', 'inbox').maybeSingle();
      setSync(st || null);

      // Vanaf wanneer we de inbox scannen: het eerste uitgaande bericht. Is er
      // nog niets verstuurd, dan vanaf het aanmaken van de campagne.
      const { data: firstOut } = await supabase
        .from('outreach_message').select('sent_or_received_at')
        .eq('campaign_id', camp.id).eq('direction', 'outbound')
        .order('sent_or_received_at', { ascending: true }).limit(1);
      const { count } = await supabase
        .from('outreach_message').select('id', { count: 'exact', head: true })
        .eq('campaign_id', camp.id).eq('direction', 'outbound');
      setSentInfo({ count: count || 0, firstAt: firstOut?.[0]?.sent_or_received_at || null });

      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const wave = useMemo(() => rows.filter(r => !r.is_reserve), [rows]);
  const counts = useMemo(() => {
    const c = {};
    for (const r of wave) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [wave]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(r => {
      if (!showReserve && r.is_reserve) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!needle) return true;
      return [r.email, r.company, r.first_name, r.last_name, r.title]
        .some(v => String(v || '').toLowerCase().includes(needle));
    });
  }, [rows, showReserve, statusFilter, q]);

  // Alleen de afzender zelf kan zijn eigen inbox scannen (delegated token).
  const myEmail = String(session?.user?.email || '').toLowerCase();
  const senderMailbox = String(campaign?.sender_mailbox || '').toLowerCase();
  const isSender = !!myEmail && myEmail === senderMailbox;

  const age = hoursSince(sync?.last_synced_at);
  const stale = age === null || age > STALE_HOURS;

  const runScan = async () => {
    if (!campaign) return;
    setScanning(true); setScanErr(null); setScanResult(null);
    try {
      const messages = await getFolderEmails('Inbox', 500);
      const sinceISO = sentInfo.firstAt || campaign.created_at;
      const { candidates, stats } = scanInbox(messages, rows, { sinceISO });

      const applied = { processed: 0, skipped_known: 0, bounces: 0, flagged: 0, classified: 0, status_changed: 0, errors: 0 };
      for (let i = 0; i < candidates.length; i += CLASSIFY_BATCH) {
        const chunk = candidates.slice(i, i + CLASSIFY_BATCH);
        const resp = await apiFetch('/api/outreach-classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign_id: campaign.id, candidates: chunk }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
        for (const k of Object.keys(applied)) applied[k] += (data.stats?.[k] || 0);
      }

      const nowIso = new Date().toISOString();
      await supabase.from('outreach_sync_state')
        .upsert({ id: 'inbox', last_synced_at: nowIso, updated_at: nowIso });

      setScanResult({ scanned: stats.scanned, stats, applied, sinceISO });
      await load();
    } catch (e) {
      setScanErr(e.message === 'Token expired'
        ? 'Je Microsoft-verbinding is verlopen. Verbind opnieuw en scan daarna nog eens.'
        : e.message);
    }
    setScanning(false);
  };

  if (loading) return <div style={{ padding: 24, color: 'var(--text-3)', fontSize: 12 }}>Laden…</div>;
  if (err) return <div style={{ padding: 16, color: '#dc2626', fontSize: 12 }}>Kon outreach niet laden: {err}</div>;
  if (!campaign) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: 'var(--text-2)' }}>
        Nog geen outreach-campagne. Importeer de lijst met{' '}
        <code>scripts/import-outreach-list.py</code> (zie docs/outreach-handover.md).
      </div>
    );
  }

  const kpi = (label, value, color) => (
    <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, padding: '8px 12px', minWidth: 104 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: color || 'var(--text-1)' }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Kop */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{campaign.name}</span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, border: '0.5px solid var(--sep)', color: 'var(--text-2)' }}>
          {campaign.status}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          afzender {campaign.sender_mailbox} · dagcap {campaign.daily_cap}
          {campaign.hard_stop_at ? ` · stop ${String(campaign.hard_stop_at).slice(0, 10)}` : ''}
        </span>
      </div>

      {/* KPI's over golf 1 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {kpi('Golf 1', wave.length)}
        {kpi('Klaar', counts.queued || 0, STATUS_COLOR.queued)}
        {kpi('Verstuurd', (counts.msg1_sent || 0) + (counts.msg2_sent || 0), STATUS_COLOR.msg1_sent)}
        {kpi('Antwoord', counts.replied || 0, STATUS_COLOR.replied)}
        {kpi('Gebounced', counts.bounced || 0, STATUS_COLOR.bounced)}
        {kpi('Gepauzeerd', counts.paused || 0, STATUS_COLOR.paused)}
        {kpi('Reserve', rows.length - wave.length, 'var(--text-3)')}
      </div>

      {/* Inboxscan: de kern van de veiligheid */}
      <div style={{
        border: `1px solid ${stale ? 'rgba(217,119,6,0.6)' : 'rgba(22,163,74,0.5)'}`,
        background: stale ? 'rgba(217,119,6,0.08)' : 'rgba(22,163,74,0.06)',
        borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Laatste inboxscan: {fmtAge(sync?.last_synced_at)}
          </span>
          {stale && (
            <span style={{ fontSize: 11, color: '#b45309' }}>
              ouder dan {STALE_HOURS} uur, dus opvolgmail wordt straks geblokkeerd
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {!hasGraphToken && (
              <button className="btn-primary tiny" onClick={reconnectMicrosoft}>Verbind Microsoft</button>
            )}
            <button className="btn-primary tiny" disabled={scanning || !hasGraphToken || !isSender}
              onClick={runScan}
              title={isSender ? 'Leest je inbox en koppelt antwoorden aan prospects'
                : `Alleen ${campaign.sender_mailbox} kan deze inbox scannen`}>
              {scanning ? 'Scannen…' : 'Scan inbox'}
            </button>
          </div>
        </div>

        {!isSender && (
          <div style={{ fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
            Je bent ingelogd als <strong>{myEmail || 'onbekend'}</strong>, maar de afzender van deze
            campagne is <strong>{campaign.sender_mailbox}</strong>. De scan leest de inbox van wie is
            ingelogd, dus dat zou de verkeerde mailbox zijn. Laat {campaign.sender_mailbox} de scan
            doen, of pas de afzender van de campagne aan.
          </div>
        )}

        {scanErr && <div style={{ fontSize: 12, color: '#dc2626' }}>Scan mislukt: {scanErr}</div>}

        {scanResult && (
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
            {scanResult.stats.scanned} berichten bekeken vanaf {String(scanResult.sinceISO).slice(0, 10)}.
            {' '}Gekoppeld op afzender: <strong>{scanResult.stats.sender}</strong>,
            {' '}bounces: <strong>{scanResult.stats.bounces}</strong>,
            {' '}alleen geflagd op domein: <strong>{scanResult.stats.domainFlag}</strong>.
            {' '}Genegeerd: {scanResult.stats.tooOld} te oud, {scanResult.stats.ownDomain} eigen domein,
            {' '}{scanResult.stats.noMatch} geen match.
            {scanResult.applied.processed > 0 && (
              <> Verwerkt: {scanResult.applied.processed}, status gewijzigd bij {scanResult.applied.status_changed}.</>
            )}
            {scanResult.applied.skipped_known > 0 && <> {scanResult.applied.skipped_known} al eerder verwerkt.</>}
            {scanResult.applied.errors > 0 && (
              <span style={{ color: '#dc2626' }}> {scanResult.applied.errors} fout(en), die worden bij de volgende scan opnieuw geprobeerd.</span>
            )}
            {scanResult.stats.sender === 0 && scanResult.stats.bounces === 0 && (
              <div style={{ color: 'var(--text-3)', marginTop: 4 }}>
                Geen antwoorden gevonden. Dat is te verwachten zolang er nog niets verstuurd is
                ({sentInfo.count} uitgaande berichten geregistreerd).
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Zoek op naam, bedrijf of e-mail…"
          style={{ padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 12, minWidth: 240 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 12 }}>
          <option value="all">Alle statussen</option>
          {Object.keys(STATUS_LABEL).map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}{counts[s] ? ` (${counts[s]})` : ''}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={showReserve} onChange={e => setShowReserve(e.target.checked)} />
          Reserve meenemen
        </label>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>
          {filtered.length} van {rows.length}
        </span>
      </div>

      {/* Lijst */}
      <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ maxHeight: 560, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--fill-1)', zIndex: 1 }}>
              <tr>
                {['#', 'Naam', 'Bedrijf', 'Status', 'Volgende actie', 'Toelichting'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '7px 10px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', borderBottom: '0.5px solid var(--sep)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 400).map(r => (
                <tr key={r.id} style={{ borderBottom: '0.5px solid var(--sep)' }}>
                  <td style={{ padding: '6px 10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {r.is_reserve ? 'res' : (r.outreach_prio ?? '')}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <div style={{ color: 'var(--text-1)' }}>
                      {[r.first_name, r.last_name].filter(Boolean).join(' ') || r.email}
                      {r.priority_tier && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-3)' }}>{TIER_LABEL[r.priority_tier]}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.title || r.email}</div>
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-2)' }}>
                    {r.company || '-'}
                    {r.company_id && <span title="Bekend bedrijf in het CRM" style={{ marginLeft: 5, color: 'var(--text-3)' }}>◆</span>}
                  </td>
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                    <span style={{ color: STATUS_COLOR[r.status] || 'var(--text-2)', fontWeight: 500 }}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {r.next_action_at ? String(r.next_action_at).slice(0, 10) : '-'}
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-3)', maxWidth: 320 }}>
                    {r.last_reply_summary || r.paused_reason || ''}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: 'var(--text-3)' }}>Niets gevonden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 400 && (
          <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--text-3)', borderTop: '0.5px solid var(--sep)' }}>
            Eerste 400 van {filtered.length} getoond. Filter om te verfijnen.
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
        Verzenden zit hier nog niet in. Dat komt als aparte stap, en die knop blijft geblokkeerd
        zolang de inboxscan ouder is dan {STALE_HOURS} uur, zodat bericht 2 nooit uitgaat op
        verouderde reply-data.
      </div>
    </div>
  );
}
