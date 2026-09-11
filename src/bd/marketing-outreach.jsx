import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { apiFetch } from '../lib/apiFetch';
import { useAuth } from '../lib/auth';
import { getFolderEmails, getMailboxFolderEmails, getMailboxMessagesSince } from '../lib/graph';
import { scanInbox, needsOurReply } from './outreach-match';
import { outreachTextToHtml, subjectForStep } from '../lib/outreach-html';

// Outreach-tab onder Marketing. Ontwerp: docs/outreach-handover.md addendum §9.
//
// Job B (replydetectie) draait HIER in de browser, met het Graph-token van de
// ingelogde gebruiker. Dat scheelt de hele Azure-app-only-route, maar het heeft
// twee consequenties die zichtbaar in de UI moeten zitten:
//
//   1. We scannen altijd de mailbox van de campagne-AFZENDER, nooit die van wie
//      toevallig is ingelogd. Ben je de afzender zelf, dan via /me; anders via
//      /users/{afzender}, wat Mail.Read.Shared plus leesrechten vergt.
//   2. Het is niet onbeheerd. Daarom tonen we prominent hoe oud de laatste scan
//      is: bericht 2 mag niet uitgaan op verouderde reply-data.
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

const CONTACT_COLS =
  'id,email,first_name,last_name,title,company,status,priority_tier,priority_label,outreach_prio,is_reserve,' +
  'next_action_at,paused_reason,last_reply_summary,contact_id,company_id,last_inbound_at,answered_at,linkedin_url';

const AWAITING = '__awaiting__';

// Sleutel voor de scantijd, per campagne. Zie de toelichting bij het inlezen.
const syncKey = (campaignId) => `inbox:${campaignId}`;

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
  const [campaigns, setCampaigns] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [rows, setRows] = useState([]);
  const [sync, setSync] = useState(null);         // outreach_sync_state-rij
  const [sentInfo, setSentInfo] = useState({ count: 0, firstAt: null });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [scanning, setScanning] = useState(false);
  const [scanErr, setScanErr] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  const [sending, setSending] = useState(false);
  const [sendPlan, setSendPlan] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [sendErr, setSendErr] = useState(null);
  const [batchSize, setBatchSize] = useState(25);
  const [busyStatus, setBusyStatus] = useState(false);

  const [openContact, setOpenContact] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [prioFilter, setPrioFilter] = useState('all');
  const [showReserve, setShowReserve] = useState(false);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: camps, error: cErr } = await supabase
        .from('outreach_campaign').select('*').order('created_at', { ascending: true });
      if (cErr) throw cErr;
      setCampaigns(camps || []);
      // Respecteer een handmatige keuze; anders de oudste campagne.
      const camp = (camps || []).find(x => x.id === selectedId) || (camps || [])[0] || null;
      setCampaign(camp);
      if (camp && camp.id !== selectedId) setSelectedId(camp.id);
      if (!camp) { setRows([]); setLoading(false); return; }

      const { data: cts, error: rErr } = await supabase
        .from('outreach_contact').select(CONTACT_COLS)
        .eq('campaign_id', camp.id)
        .order('is_reserve', { ascending: true })
        .order('outreach_prio', { ascending: true, nullsFirst: false })
        .limit(2000);
      if (rErr) throw rErr;
      setRows(cts || []);

      // Scantijd PER CAMPAGNE. Een gedeelde sleutel zou fataal zijn: een scan met
      // campagne A geselecteerd matcht alleen tegen A's contacten, maar zou dan
      // ook voor B als "recent gescand" gelden. Bericht 2 van B mag daar nooit op
      // vertrouwen.
      const { data: st } = await supabase
        .from('outreach_sync_state').select('*').eq('id', syncKey(camp.id)).maybeSingle();
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
  }, [selectedId]);

  useEffect(() => { load(); }, [load]);

  const wave = useMemo(() => rows.filter(r => !r.is_reserve), [rows]);
  const counts = useMemo(() => {
    const c = {};
    for (const r of wave) c[r.status] = (c[r.status] || 0) + 1;
    c[AWAITING] = wave.filter(needsOurReply).length;
    return c;
  }, [wave]);

  // Prioriteit-opties uit de data zelf, met het aantal in golf 1 erbij.
  const prioOptions = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      const k = r.priority_label || '(leeg)';
      if (!m.has(k)) m.set(k, 0);
      if (!r.is_reserve) m.set(k, m.get(k) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(r => {
      if (!showReserve && r.is_reserve) return false;
      if (statusFilter === AWAITING) { if (!needsOurReply(r)) return false; }
      else if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (prioFilter !== 'all' && (r.priority_label || '') !== prioFilter) return false;
      if (!needle) return true;
      return [r.email, r.company, r.first_name, r.last_name, r.title]
        .some(v => String(v || '').toLowerCase().includes(needle));
    });
  }, [rows, showReserve, statusFilter, prioFilter, q]);

  // Bepaalt welk Graph-pad we gebruiken: eigen mailbox of gedeelde leesrechten.
  const myEmail = String(session?.user?.email || '').toLowerCase();
  const senderMailbox = String(campaign?.sender_mailbox || '').toLowerCase();
  const isSender = !!myEmail && myEmail === senderMailbox;

  const age = hoursSince(sync?.last_synced_at);
  const stale = age === null || age > STALE_HOURS;

  const runScan = async () => {
    if (!campaign) return;
    setScanning(true); setScanErr(null); setScanResult(null);
    try {
      // We scannen ALTIJD de mailbox van de campagne-afzender, ongeacht wie is
      // ingelogd. Ben je dat zelf, dan gaat het via /me. Ben je iemand anders,
      // dan via /users/{afzender}: dat vraagt Mail.Read.Shared plus leesrechten
      // op die mailbox.
      //
      // Over ALLE MAPPEN, niet alleen de Inbox. Dat laatste deed het eerst, en
      // dat ging stil mis: Marco ruimt zijn inbox op, dus een antwoord dat hij
      // al gelezen en gearchiveerd had was voor de scan onvindbaar. De prospect
      // bleef dan op 'bericht 1 verstuurd' staan met de opvolgmail nog ingepland.
      const sinceISO = sentInfo.firstAt || campaign.created_at;
      const messages = await getMailboxMessagesSince(
        isSender ? null : campaign.sender_mailbox, sinceISO, 800,
      );
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

      // Sent Items: heeft Marco zelf (buiten de app om) al geantwoord? Zo ja,
      // dan is die prospect niet 'Onbeantwoord'. Handover §5, stap 1.
      let answeredFound = 0;
      try {
        const sent = isSender
          ? await getFolderEmails('SentItems', 300)
          : await getMailboxFolderEmails(campaign.sender_mailbox, 'SentItems', 300);
        const byEmail = new Map(rows.filter(r => r.email).map(r => [r.email.toLowerCase(), r]));
        const best = new Map();
        for (const m of sent) {
          const when = new Date(m.date || 0).getTime();
          if (!Number.isFinite(when)) continue;
          for (const addr of (m.toAddresses || [])) {
            const r = byEmail.get(String(addr).toLowerCase());
            if (!r || !r.last_inbound_at) continue;
            if (when <= new Date(r.last_inbound_at).getTime()) continue;   // van voor het antwoord
            if (r.answered_at && when <= new Date(r.answered_at).getTime()) continue;
            if (!best.has(r.id) || best.get(r.id) < when) best.set(r.id, when);
          }
        }
        for (const [id, when] of best) {
          const { error } = await supabase.from('outreach_contact')
            .update({ answered_at: new Date(when).toISOString() }).eq('id', id);
          if (!error) answeredFound++;
        }
      } catch (e) {
        // Sent Items niet leesbaar is niet fataal: de inboxscan is al gelukt.
        console.warn('Sent Items overslaan:', e.message);
      }

      const nowIso = new Date().toISOString();
      await supabase.from('outreach_sync_state')
        .upsert({ id: syncKey(campaign.id), last_synced_at: nowIso, updated_at: nowIso });

      setScanResult({ scanned: stats.scanned, stats, applied, sinceISO, answeredFound });
      await load();
    } catch (e) {
      const m = e.message || String(e);
      if (m === 'Token expired' || m.startsWith('No Microsoft token')) {
        setScanErr('Je Microsoft-verbinding is verlopen. Verbind opnieuw en scan daarna nog eens.');
      } else if (m.startsWith('GEEN_TOEGANG')) {
        setScanErr('NO_ACCESS');
      } else {
        setScanErr(m);
      }
    }
    setScanning(false);
  };

  const callSend = async ({ dryRun }) => {
    if (!campaign) return;
    setSending(true); setSendErr(null); setSendResult(null);
    if (dryRun) setSendPlan(null);
    try {
      const resp = await apiFetch('/api/outreach-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id, limit: batchSize, dry_run: dryRun }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      if (dryRun) setSendPlan(data.plan);
      else { setSendResult({ ...data.stats, plan: data.plan, failures: data.failures || [] }); setSendPlan(null); await load(); }
    } catch (e) {
      setSendErr(e.message);
    }
    setSending(false);
  };

  const doSend = async () => {
    const n = sendPlan?.would_send;
    const dm = campaign.channel === 'linkedin';
    const wat = dm ? 'LinkedIn-bericht(en)' : 'mail(s)';
    const vanaf = dm ? `het LinkedIn-account van ${campaign.sender_mailbox}` : campaign.sender_mailbox;
    const msg = n
      ? `${n} ${wat} versturen vanaf ${vanaf}?`
      : `Tot ${batchSize} ${wat} versturen vanaf ${vanaf}?`;
    if (!confirm(msg + '\n\nDit gaat naar echte prospects en is niet terug te draaien.')) return;
    await callSend({ dryRun: false });
  };

  const setCampaignStatus = async (status) => {
    setBusyStatus(true);
    const { error } = await supabase.from('outreach_campaign')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', campaign.id);
    setBusyStatus(false);
    if (error) { setSendErr('Status wijzigen mislukt: ' + error.message); return; }
    await load();
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

  // Het kanaal bepaalt een hoop: een DM heeft geen onderwerp, geen bounces, geen
  // opvolgbericht en geen inbox om te scannen. De tab verzwijgt wat niet bestaat
  // in plaats van lege of misleidende vakjes te tonen.
  const isLinkedIn = campaign.channel === 'linkedin';

  // Klikbaar: filtert de lijst op die status. Nog een keer klikken zet het filter uit.
  const kpi = (label, value, color, filterValue) => {
    const active = filterValue !== undefined && statusFilter === filterValue;
    return (
      <button type="button"
        onClick={() => filterValue !== undefined && setStatusFilter(active ? 'all' : filterValue)}
        title={filterValue === undefined ? undefined : (active ? 'Filter uitzetten' : `Filter op ${label.toLowerCase()}`)}
        style={{
          border: `0.5px solid ${active ? (color || 'var(--accent)') : 'var(--sep)'}`,
          background: active ? 'var(--fill-1)' : 'transparent',
          borderRadius: 8, padding: '8px 12px', minWidth: 104, textAlign: 'left',
          cursor: filterValue === undefined ? 'default' : 'pointer', font: 'inherit',
        }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: color || 'var(--text-1)' }}>{value}</div>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Kop */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        {campaigns.length > 1 ? (
          <select value={campaign.id} onChange={e => setSelectedId(e.target.value)}
            title="Kies een campagne"
            style={{ padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 13, fontWeight: 600 }}>
            {campaigns.map(cx => <option key={cx.id} value={cx.id}>{cx.name}</option>)}
          </select>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600 }}>{campaign.name}</span>
        )}
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, border: '0.5px solid var(--sep)', color: 'var(--text-2)' }}>
          {campaign.status}
        </span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999,
          border: '0.5px solid var(--sep)', color: isLinkedIn ? '#0a66c2' : 'var(--text-2)' }}>
          {isLinkedIn ? 'LinkedIn-DM' : 'e-mail'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {isLinkedIn ? 'vanaf het LinkedIn-account van ' : 'afzender '}{campaign.sender_mailbox} · dagcap {campaign.daily_cap}
          {campaign.hard_stop_at ? ` · stop ${String(campaign.hard_stop_at).slice(0, 10)}` : ''}
        </span>
      </div>

      {/* KPI's over golf 1 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {kpi('Golf 1', wave.length, undefined, 'all')}
        {kpi('Klaar', counts.queued || 0, STATUS_COLOR.queued, 'queued')}
        {kpi('Bericht 1', counts.msg1_sent || 0, STATUS_COLOR.msg1_sent, 'msg1_sent')}
        {!isLinkedIn && kpi('Bericht 2', counts.msg2_sent || 0, STATUS_COLOR.msg2_sent, 'msg2_sent')}
        {kpi('Antwoord', counts.replied || 0, STATUS_COLOR.replied, 'replied')}
        {kpi('Onbeantwoord', counts[AWAITING] || 0, '#d97706', AWAITING)}
        {!isLinkedIn && kpi('Gebounced', counts.bounced || 0, STATUS_COLOR.bounced, 'bounced')}
        {kpi('Gepauzeerd', counts.paused || 0, STATUS_COLOR.paused, 'paused')}
        {kpi('Reserve', rows.length - wave.length, 'var(--text-3)')}
      </div>

      {/* Inboxscan: de kern van de veiligheid bij e-mail. Bij een DM bestaat die
          inbox niet: antwoorden komen binnen op LinkedIn zelf en zijn live te
          lezen in de Comms-lane, dus hier zou een scanknop niets doen. */}
      {isLinkedIn ? (
        <div style={{
          border: '0.5px solid var(--sep)', borderRadius: 8, padding: 12,
          fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
        }}>
          <strong>Antwoorden lees je in de Comms-lane.</strong> Die haalt LinkedIn live op uit
          het account van {campaign.sender_mailbox}. Er is hier geen inboxscan, want er gaat ook
          geen opvolgbericht uit dat afgeremd moet worden.
        </div>
      ) : (
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
              <button className="btn-primary tiny" disabled={scanning || !hasGraphToken}
                onClick={runScan}
                title={`Leest de inbox van ${campaign.sender_mailbox} en koppelt antwoorden aan prospects`}>
                {scanning ? 'Scannen…' : 'Scan inbox'}
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            Scant de mailbox van <strong>{campaign.sender_mailbox}</strong>
            {isSender ? ' (dat ben jij)' : `, via gedeelde leesrechten op jouw login (${myEmail})`}.
            {' '}Alle mappen, dus ook wat al opgeruimd of gearchiveerd is.
          </div>

          {scanErr === 'NO_ACCESS' ? (
            <div style={{ fontSize: 12, color: '#b45309', lineHeight: 1.6 }}>
              <strong>Geen leesrechten op {campaign.sender_mailbox}.</strong> Jouw login mag die mailbox
              nog niet lezen. Twee dingen zijn nodig, eenmalig:
              <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
                <li>
                  Leesrechten in Exchange: <em>Exchange Admin Center → Mailboxes → {campaign.sender_mailbox} → Delegation → Read and manage</em>,
                  en voeg {myEmail || 'je eigen account'} toe. Kan tot ongeveer een half uur duren voordat het werkt.
                </li>
                <li>
                  Daarna hier op <em>Verbind Microsoft</em> klikken, zodat je token de nieuwe
                  rechten meekrijgt (de app vraagt sinds kort ook Mail.Read.Shared).
                </li>
              </ol>
            </div>
          ) : scanErr ? (
            <div style={{ fontSize: 12, color: '#dc2626' }}>Scan mislukt: {scanErr}</div>
          ) : null}

          {scanResult && (
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
              {scanResult.stats.scanned} berichten bekeken vanaf {String(scanResult.sinceISO).slice(0, 10)} (alle mappen).
              {' '}Gekoppeld op afzender: <strong>{scanResult.stats.sender}</strong>,
              {' '}bounces: <strong>{scanResult.stats.bounces}</strong>,
              {' '}alleen geflagd op domein: <strong>{scanResult.stats.domainFlag}</strong>.
              {' '}Genegeerd: {scanResult.stats.tooOld} te oud, {scanResult.stats.ownDomain} eigen domein,
              {' '}{scanResult.stats.noMatch} geen match.
              {scanResult.applied.processed > 0 && (
                <> Verwerkt: {scanResult.applied.processed}, status gewijzigd bij {scanResult.applied.status_changed}.</>
              )}
              {scanResult.applied.skipped_known > 0 && <> {scanResult.applied.skipped_known} al eerder verwerkt.</>}
              {scanResult.answeredFound > 0 && (
                <> Bij {scanResult.answeredFound} prospect(s) bleek uit Sent Items dat er al geantwoord is.</>
              )}
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
      )}

      {/* Verzenden */}
      <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Verzenden</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {sentInfo.count} verstuurd tot nu toe
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              batch
              <input type="number" min={1} max={isLinkedIn ? 10 : 200} value={batchSize}
                onChange={e => setBatchSize(Math.max(1, Math.min(isLinkedIn ? 10 : 200, Number(e.target.value) || 1)))}
                title={isLinkedIn
                  ? 'Bij LinkedIn maximaal 10 per keer, met tientallen seconden ertussen'
                  : undefined}
                style={{ width: 58, padding: '4px 6px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 12 }} />
            </label>
            <button className="btn-ghost tiny" disabled={sending} onClick={() => callSend({ dryRun: true })}>
              {sending ? 'Bezig…' : 'Bekijk wat er uitgaat'}
            </button>
            {campaign.status === 'active' ? (
              <>
                <button className="btn-primary tiny" disabled={sending} onClick={doSend}>
                  Verstuur batch
                </button>
                <button className="btn-ghost tiny" disabled={busyStatus} onClick={() => setCampaignStatus('paused')}
                  title="Killswitch: stopt het versturen onmiddellijk">
                  Pauzeer
                </button>
              </>
            ) : (
              <button className="btn-ghost tiny" disabled={busyStatus} onClick={() => setCampaignStatus('active')}
                title="Nodig voordat er iets verstuurd kan worden">
                Campagne activeren
              </button>
            )}
          </div>
        </div>

        {campaign.status !== 'active' && (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            De campagne staat op <strong>{campaign.status}</strong>, dus er gaat niets uit. Een dry-run
            kun je wel doen. Activeer pas als je echt wil versturen.
          </div>
        )}

        {sendPlan && (
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7, background: 'var(--fill-1)', borderRadius: 6, padding: '8px 10px' }}>
            <div>
              <strong>{sendPlan.would_send}</strong> zouden nu uitgaan
              {' '}(bericht 1: {sendPlan.by_step?.['1'] ?? 0}, bericht 2: {sendPlan.by_step?.['2'] ?? 0}).
              {sendPlan.batch_limit ? ` Batch staat op ${sendPlan.batch_limit}.` : ''}
              {' '}Laatste 24 uur al verstuurd: {sendPlan.sent_last_24h} van dagcap {sendPlan.daily_cap}.
            </div>
            {sendPlan.skipped && Object.keys(sendPlan.skipped).length > 0 && (
              <div style={{ color: 'var(--text-3)' }}>
                Overgeslagen: {Object.entries(sendPlan.skipped).map(([k, v]) => `${v} ${k}`).join(', ')}.
              </div>
            )}
          </div>
        )}

        {sendResult && (
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>
            <span style={{ color: '#16a34a' }}>✓ {sendResult.sent} verstuurd.</span>
            {sendResult.claimed_elsewhere > 0 && (
              <span style={{ color: 'var(--text-3)' }}> {sendResult.claimed_elsewhere} al door een andere run gedaan.</span>
            )}
            {sendResult.failed > 0 && (
              <span style={{ color: '#dc2626' }}> {sendResult.failed} mislukt, die worden opnieuw geprobeerd.</span>
            )}
            {sendResult.failures?.length > 0 && (
              <div style={{ color: 'var(--text-3)', marginTop: 4 }}>
                Eerste fout: {sendResult.failures[0].to || sendResult.failures[0].email} ({sendResult.failures[0].status}) {sendResult.failures[0].error}
              </div>
            )}
          </div>
        )}

        {sendErr && <div style={{ fontSize: 12, color: '#dc2626' }}>{sendErr}</div>}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Zoek op naam, bedrijf of e-mail…"
          style={{ padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 12, minWidth: 240 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 12 }}>
          <option value="all">Alle statussen</option>
          <option value={AWAITING}>Onbeantwoord{counts[AWAITING] ? ` (${counts[AWAITING]})` : ''}</option>
          {Object.keys(STATUS_LABEL).map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}{counts[s] ? ` (${counts[s]})` : ''}</option>
          ))}
        </select>
        <select value={prioFilter} onChange={e => setPrioFilter(e.target.value)}
          title="Prioriteit uit de lijst"
          style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 12, maxWidth: 260 }}>
          <option value="all">Alle prioriteiten</option>
          {prioOptions.map(([label, n]) => (
            <option key={label} value={label}>{label}{n ? ` (${n})` : ''}</option>
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
                {['#', 'Naam', 'Bedrijf', 'Prioriteit', 'Status', 'Volgende actie', 'Toelichting'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '7px 10px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', borderBottom: '0.5px solid var(--sep)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 400).map(r => (
                <tr key={r.id} onClick={() => setOpenContact(r)}
                  title="Bekijk de mails die naar deze persoon gaan"
                  style={{ borderBottom: '0.5px solid var(--sep)', cursor: 'pointer' }}>
                  <td style={{ padding: '6px 10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {r.is_reserve ? 'res' : (r.outreach_prio ?? '')}
                  </td>
                  <td style={{ padding: '6px 10px' }}>
                    <div style={{ color: 'var(--text-1)' }}>
                      {[r.first_name, r.last_name].filter(Boolean).join(' ') || r.email}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.title || r.email}</div>
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-2)' }}>
                    {r.company || '-'}
                    {r.company_id && (
                      <span title="Dit bedrijf staat al als account in het CRM"
                        style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px', borderRadius: 3, border: '0.5px solid var(--sep)', color: 'var(--text-3)', verticalAlign: 'middle' }}>
                        CRM
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--text-2)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={r.priority_label || ''}>
                    {r.priority_label || '-'}
                  </td>
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                    <span style={{ color: STATUS_COLOR[r.status] || 'var(--text-2)', fontWeight: 500 }}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                    {needsOurReply(r) && (
                      <span title="Antwoord binnen, wij hebben nog niet gereageerd"
                        style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(217,119,6,0.15)', border: '0.5px solid rgba(217,119,6,0.5)', color: '#b45309' }}>
                        wacht op ons
                      </span>
                    )}
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
                <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: 'var(--text-3)' }}>Niets gevonden.</td></tr>
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

      {openContact && (
        <ContactMailsModal contact={openContact} campaign={campaign}
          onClose={() => setOpenContact(null)} onSent={load} />
      )}

      <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
        {isLinkedIn ? (
          <>Via LinkedIn gaat er precies een bericht per persoon, met tientallen seconden ertussen
          en maximaal 10 per keer. Een account dat in een paar minuten een reeks DM's afvuurt valt
          op, en een beperking op dat account is niet terug te draaien. Antwoorden lees je in de
          Comms-lane, die haalt LinkedIn live op.</>
        ) : (
          <>Bericht 2 gaat alleen uit als de inboxscan jonger is dan {STALE_HOURS} uur, zodat een
          opvolgmail nooit naar iemand gaat die inmiddels al geantwoord heeft. Bericht 1 heeft die
          rem niet, want op een eerste contact kan nog geen antwoord zijn.</>
        )}
      </div>
    </div>
  );
}

// Detail-modal: de mails zoals ze bij deze persoon aankomen, plus wat er al
// verstuurd of ontvangen is. De teksten worden hier pas opgehaald (ze zitten
// bewust niet in het lijstoverzicht) en gerenderd met exact dezelfde functie
// als het verzend-endpoint gebruikt, zodat de preview niet liegt.
function ContactMailsModal({ contact, campaign, onClose, onSent }) {
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState(1);

  // Handmatig antwoord sturen.
  const [composing, setComposing] = useState(false);
  const [rSubject, setRSubject] = useState('');
  const [rBody, setRBody] = useState('');
  const [rBusy, setRBusy] = useState(false);
  const [rResult, setRResult] = useState(null);

  // Outreach stoppen: nodig zodra uit een antwoord blijkt dat iemand hier niet
  // meer werkt, of om een andere reden niet meer benaderd moet worden.
  const [stopping, setStopping] = useState(false);
  const [stopReason, setStopReason] = useState('niet meer werkzaam bij dit bedrijf');
  const [stopBusy, setStopBusy] = useState(false);
  // Eigen kopie van de status. De prop komt uit de lijstregel en die wordt pas
  // ververst als de popup dicht is, dus zonder dit blijft er na het stoppen
  // gewoon 'Bericht 1 verstuurd' staan.
  const [status, setStatus] = useState(contact.status);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: d, error: e1 } = await supabase
          .from('outreach_contact')
          .select('msg1_subject,msg1_body,msg2_subject,msg2_body,unsubscribe_token,paused_reason,last_reply_summary,status')
          .eq('id', contact.id).single();
        if (e1) throw e1;
        const { data: h, error: e2 } = await supabase
          .from('outreach_message')
          .select('direction,sequence_step,subject,body_preview,sent_or_received_at,classification,classification_confidence,match_method,provider_message_id')
          .eq('contact_id', contact.id)
          .order('sent_or_received_at', { ascending: true, nullsFirst: false });
        if (e2) throw e2;
        if (!cancelled) {
          setDetail(d);
          if (d?.status) setStatus(d.status);
          setHistory(h || []);
          const lastIn = [...(h || [])].reverse().find(x => x.direction === 'inbound');
          const base = lastIn?.subject || d?.msg1_subject || '';
          setRSubject(/^re:\s/i.test(base) ? base : (base ? `Re: ${base}` : ''));
        }
      } catch (e) {
        if (!cancelled) setErr(e.message);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [contact.id]);

  const sendReply = async () => {
    setRBusy(true); setRResult(null);
    try {
      const resp = await apiFetch('/api/outreach-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contact.id, subject: rSubject, body: rBody }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setRResult({ ok: true, msg: `Verstuurd naar ${data.sent_to}. De opvolging met bericht 2 is stopgezet.` });
      setRBody(''); setComposing(false);
      if (onSent) await onSent();
    } catch (e) {
      setRResult({ ok: false, msg: e.message });
    }
    setRBusy(false);
  };

  const isLinkedIn = campaign?.channel === 'linkedin';

  // Stoppen is bewust 'paused' en geen aparte status: paused is precies wat de
  // verzendselectie overslaat, en het staat al in de statuslijst en de filters.
  // De reden komt in paused_reason, zodat later te zien is waarom iemand eruit
  // ligt. next_action_at op null, anders duikt de prospect bij de volgende ronde
  // gewoon weer op.
  const stopOutreach = async () => {
    setStopBusy(true); setRResult(null);
    const { error } = await supabase.from('outreach_contact').update({
      status: 'paused',
      next_action_at: null,
      paused_reason: (stopReason || '').trim() || 'handmatig gestopt',
      updated_at: new Date().toISOString(),
    }).eq('id', contact.id);
    setStopBusy(false);
    if (error) { setRResult({ ok: false, msg: 'Stoppen mislukt: ' + error.message }); return; }
    setStopping(false);
    setStatus('paused');
    setRResult({ ok: true, msg: 'Outreach gestopt. Deze persoon krijgt niets meer.' });
    if (onSent) await onSent();
  };

  // Hervatten zet de prospect terug op de stap waar hij stond, afgeleid uit wat
  // er daadwerkelijk verstuurd is. Zonder die afleiding zou iemand die al een
  // bericht kreeg terugvallen op 'klaar om te sturen' en het opnieuw krijgen.
  const resumeOutreach = async () => {
    setStopBusy(true); setRResult(null);
    const sentSteps = history.filter(h => h.direction === 'outbound' && h.sequence_step);
    const maxStep = sentSteps.reduce((m, h) => Math.max(m, h.sequence_step), 0);
    const nextStatus = maxStep >= 2 ? 'msg2_sent' : (maxStep === 1 ? 'msg1_sent' : 'queued');
    const { error } = await supabase.from('outreach_contact').update({
      status: nextStatus,
      next_action_at: nextStatus === 'queued' ? new Date().toISOString() : null,
      paused_reason: null,
      updated_at: new Date().toISOString(),
    }).eq('id', contact.id);
    setStopBusy(false);
    if (error) { setRResult({ ok: false, msg: 'Hervatten mislukt: ' + error.message }); return; }
    setStatus(nextStatus);
    setRResult({ ok: true, msg: `Hervat op status ${STATUS_LABEL[nextStatus] || nextStatus}.` });
    if (onSent) await onSent();
  };

  const unsubUrl = detail?.unsubscribe_token
    ? `${window.location.origin}/api/outreach-unsubscribe?t=${detail.unsubscribe_token}`
    : null;

  const subject = tab === 1
    ? (detail?.msg1_subject || null)
    : subjectForStep({ msg1_subject: detail?.msg1_subject, msg2_subject: detail?.msg2_subject }, 2);
  const body = tab === 1 ? detail?.msg1_body : detail?.msg2_body;
  const html = body ? outreachTextToHtml(body, { unsubscribeUrl: unsubUrl }) : null;

  const sentStep = (n) => history.find(h => h.direction === 'outbound' && h.sequence_step === n);

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 12, width: 'min(860px, 96vw)', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>

        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--sep)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {[contact.title, contact.company].filter(Boolean).join(' · ')}
              {contact.email ? ` · ${contact.email}` : ''}
              {isLinkedIn && contact.linkedin_url ? (
                <> · <a href={contact.linkedin_url} target="_blank" rel="noreferrer"
                  style={{ color: '#0a66c2' }}>LinkedIn-profiel</a></>
              ) : null}
            </div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: STATUS_COLOR[status] || 'var(--text-2)', fontWeight: 500 }}>
            {STATUS_LABEL[status] || status}
          </span>
          <button className="btn-ghost tiny" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Laden…</div>}
          {err && <div style={{ color: '#dc2626', fontSize: 12 }}>Kon de mails niet laden: {err}</div>}

          {!loading && !err && (
            <>
              {(detail?.paused_reason || detail?.last_reply_summary) && (
                <div style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--fill-1)', borderRadius: 6, padding: '8px 10px' }}>
                  {detail.last_reply_summary
                    ? <><strong>Antwoord:</strong> {detail.last_reply_summary}</>
                    : <><strong>Gepauzeerd:</strong> {detail.paused_reason}</>}
                </div>
              )}

              <div style={{ display: 'inline-flex', border: '0.5px solid var(--sep)', borderRadius: 6, overflow: 'hidden', alignSelf: 'flex-start' }}>
                {(isLinkedIn ? [1] : [1, 2]).map(n => {
                  const s = sentStep(n);
                  return (
                    <button key={n} type="button" className={tab === n ? 'btn-primary tiny' : 'btn-ghost tiny'}
                      style={{ borderRadius: 0 }} onClick={() => setTab(n)}>
                      Bericht {n}{s ? ' ✓' : ''}
                    </button>
                  );
                })}
              </div>

              {(() => {
                const s = sentStep(tab);
                return (
                  <div style={{ fontSize: 11, color: s ? '#16a34a' : 'var(--text-3)' }}>
                    {s
                      ? `Verstuurd op ${String(s.sent_or_received_at || '').slice(0, 16).replace('T', ' ')}`
                      : (tab === 2
                        ? 'Nog niet verstuurd. Gaat 5 tot 7 dagen na bericht 1, en alleen als er geen antwoord is.'
                        : (isLinkedIn
                          ? 'Nog niet verstuurd. Dit is het enige bericht dat via LinkedIn uitgaat.'
                          : 'Nog niet verstuurd.'))}
                  </div>
                );
              })()}

              {!body ? (
                <div style={{ fontSize: 12, color: '#b45309' }}>
                  Voor bericht {tab} is nog geen tekst ingevuld, dus dit kan niet verstuurd worden.
                </div>
              ) : (
                <>
                  {isLinkedIn ? (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        Directbericht vanaf het LinkedIn-account van {campaign?.sender_mailbox}.
                      </div>
                      <div style={{
                        border: '0.5px solid var(--sep)', borderRadius: 6, padding: '12px 14px',
                        whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, color: 'var(--text-1)',
                        background: 'var(--fill-1)', maxHeight: 380, overflow: 'auto',
                      }}>
                        {body}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        Dit is exact de tekst die verstuurd wordt. Een DM is platte tekst, dus geen
                        opmaak en geen afmeldlink.
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ border: '0.5px solid var(--sep)', borderRadius: 6, padding: '8px 10px' }}>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Onderwerp</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{subject || '(geen onderwerp)'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                          Van {campaign?.sender_mailbox} · antwoorden gaan naar {campaign?.sender_mailbox}
                        </div>
                      </div>
                      <iframe title={`preview-${tab}`} srcDoc={html} sandbox=""
                        style={{ width: '100%', height: 380, border: '0.5px solid var(--sep)', borderRadius: 6, background: '#fff' }} />
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        Dit is exact de HTML die verstuurd wordt, met dezelfde functie gerenderd als het
                        verzend-endpoint gebruikt.
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Stoppen. Staat los van antwoorden, want het is de tegenovergestelde
                  actie: dit is de uitweg als uit een antwoord blijkt dat iemand
                  hier niet meer werkt of gewoon niets meer moet krijgen. */}
              <div style={{ borderTop: '0.5px solid var(--sep)', paddingTop: 10 }}>
                {status === 'paused' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      Gestopt{detail?.paused_reason ? `: ${detail.paused_reason}` : ''}.
                    </span>
                    <button className="btn-ghost tiny" disabled={stopBusy} onClick={resumeOutreach}>
                      {stopBusy ? 'Bezig…' : 'Hervat outreach'}
                    </button>
                  </div>
                ) : !stopping ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn-ghost tiny" onClick={() => { setStopping(true); setRResult(null); }}>
                      Stop outreach
                    </button>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      Deze persoon krijgt niets meer. Later weer aan te zetten.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input value={stopReason} onChange={e => setStopReason(e.target.value)}
                      placeholder="Reden, bijvoorbeeld: niet meer werkzaam bij dit bedrijf"
                      style={{ flex: '1 1 320px', padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 13 }} />
                    <button className="btn-primary tiny" disabled={stopBusy} onClick={stopOutreach}>
                      {stopBusy ? 'Bezig…' : 'Bevestig stoppen'}
                    </button>
                    <button className="btn-ghost tiny" disabled={stopBusy} onClick={() => setStopping(false)}>Annuleren</button>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '0.5px solid var(--sep)', paddingTop: 10 }}>
                {isLinkedIn ? (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
                    Antwoorden doe je op LinkedIn zelf, of via de Comms-lane. Vanuit hier kan het
                    niet: die knop stuurt een e-mail en deze prospect heeft geen adres bij ons.
                  </div>
                ) : !composing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn-primary tiny" onClick={() => { setComposing(true); setRResult(null); }}>
                      Antwoord sturen
                    </button>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      Gaat vanaf {campaign?.sender_mailbox}. Zet de opvolging met bericht 2 stop.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input value={rSubject} onChange={e => setRSubject(e.target.value)} placeholder="Onderwerp"
                      style={{ padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 13 }} />
                    <textarea value={rBody} onChange={e => setRBody(e.target.value)} rows={8}
                      placeholder={'Typ je antwoord.\n\nWitregels blijven behouden en links worden klikbaar.'}
                      style={{ padding: 10, borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 13, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button className="btn-primary tiny" disabled={rBusy || !rSubject.trim() || !rBody.trim()}
                        onClick={sendReply}>
                        {rBusy ? 'Versturen…' : `Verstuur naar ${contact.email}`}
                      </button>
                      <button className="btn-ghost tiny" disabled={rBusy} onClick={() => setComposing(false)}>Annuleren</button>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        Vanaf {campaign?.sender_mailbox}, antwoorden komen daar ook terug.
                      </span>
                    </div>
                  </div>
                )}
                {rResult && (
                  <div style={{ fontSize: 12, marginTop: 8, color: rResult.ok ? '#16a34a' : '#dc2626' }}>
                    {rResult.ok ? '✓ ' : '✗ '}{rResult.msg}
                  </div>
                )}
              </div>

              {history.length > 0 && (
                <div style={{ borderTop: '0.5px solid var(--sep)', paddingTop: 10 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                    Verloop
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {history.map((h, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
                        <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {String(h.sent_or_received_at || '').slice(0, 16).replace('T', ' ') || '-'}
                        </span>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          {h.direction === 'outbound'
                            ? (h.sequence_step ? `→ bericht ${h.sequence_step}` : '→ ons antwoord')
                            : '← antwoord'}
                        </span>
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.classification
                            ? `${h.classification} (${Math.round((h.classification_confidence || 0) * 100)}%)`
                            : (h.subject || h.body_preview || '')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
