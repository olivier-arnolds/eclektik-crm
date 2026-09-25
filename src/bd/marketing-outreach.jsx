import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { apiFetch } from '../lib/apiFetch';
import { useAuth } from '../lib/auth';
import { getFolderEmails, getMailboxFolderEmails, getMailboxMessagesSince, getMessageBody, findMessageByInternetId } from '../lib/graph';
import { kiesBerichttekst } from '../lib/mail-body';
import {
  scanInbox, needsOurReply, matchRegistrations,
  conversatieStatus, reminderAdvies,
  CONV_GEEN, CONV_ANTWOORD, CONV_HEEN_EN_WEER,
  HERINNERING_KAN, HERINNERING_TE_VROEG, HERINNERING_AL, HERINNERING_NIET,
} from './outreach-match';
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

const CONV_LABEL = {
  [CONV_GEEN]: 'geen',
  [CONV_ANTWOORD]: 'antwoord',
  [CONV_HEEN_EN_WEER]: 'heen en weer',
};
const CONV_COLOR = {
  [CONV_GEEN]: 'var(--text-3)',
  [CONV_ANTWOORD]: '#d97706',
  [CONV_HEEN_EN_WEER]: '#16a34a',
};
const HERINNERING_LABEL = {
  [HERINNERING_KAN]: 'kan',
  [HERINNERING_TE_VROEG]: 'te vroeg',
  [HERINNERING_AL]: 'al herinnerd',
  [HERINNERING_NIET]: 'niet doen',
};
const HERINNERING_COLOR = {
  [HERINNERING_KAN]: '#16a34a',
  [HERINNERING_TE_VROEG]: 'var(--text-3)',
  [HERINNERING_AL]: 'var(--text-3)',
  [HERINNERING_NIET]: '#dc2626',
};

const CONTACT_COLS =
  'id,email,first_name,last_name,title,company,status,priority_tier,priority_label,outreach_prio,is_reserve,' +
  'next_action_at,paused_reason,last_reply_summary,contact_id,company_id,last_inbound_at,answered_at,linkedin_url';

const AWAITING = '__awaiting__';
const REGISTERED = '__registered__';
const OPENED = '__opened__';
const CLICKED = '__clicked__';

// Stoppen is een ingreep, hervatten draait die terug. Dezelfde kleuren als de
// statussen elders in deze tab, zodat de knop meteen leest als wat hij doet.
const STOP_STIJL = {
  color: '#dc2626', borderColor: 'rgba(220,38,38,0.45)', background: 'rgba(220,38,38,0.08)',
};
const INPUT_STIJL = {
  flex: '1 1 130px', minWidth: 0, padding: '5px 8px', borderRadius: 6,
  border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 13,
};
const HERVAT_STIJL = {
  color: '#16a34a', borderColor: 'rgba(22,163,74,0.45)', background: 'rgba(22,163,74,0.08)',
};

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
  const [sentInfo, setSentInfo] = useState({ count: 0, firstAt: null, last24h: 0, last7d: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [scanning, setScanning] = useState(false);
  const [scanErr, setScanErr] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [herstel, setHerstel] = useState(null);
  const [herstelBezig, setHerstelBezig] = useState(false);

  // LinkedIn-inboxscan. liScanDroog vult zich alleen bij een VOLLEDIG afgeronde
  // droge run; die state is de sleutel van de verwerkknop, zie liVerwerk.
  const [liBezig, setLiBezig] = useState(false);
  const [liVoortgang, setLiVoortgang] = useState(null);
  const [liScanDroog, setLiScanDroog] = useState(null);
  const [liScanEcht, setLiScanEcht] = useState(null);
  // Herscan beoordeelt ook contacten die al verwerkt zijn, op de volledige
  // gespreksdraad. Nodig geweest toen bleek dat de scan eerst alleen het laatste
  // inkomende bericht bewaarde: Josja van der Maas antwoordde met alleen haar
  // e-mailadres en kwam daardoor op 'other' met 0.30 zekerheid uit.
  //
  // Het omzetten van dit vinkje gooit een eerdere droge run weg. Anders kun je
  // een gewone run bekijken, daarna het vinkje aanzetten en op Verwerken
  // klikken, en dan pas je iets anders toe dan wat je gezien hebt.
  const [liHerscan, setLiHerscanState] = useState(false);
  const setLiHerscan = (aan) => { setLiHerscanState(aan); setLiScanDroog(null); setLiScanEcht(null); };
  const [liErr, setLiErr] = useState(null);

  const [sending, setSending] = useState(false);
  const [sendPlan, setSendPlan] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [sendErr, setSendErr] = useState(null);
  const [batchSize, setBatchSize] = useState(25);
  const [busyStatus, setBusyStatus] = useState(false);

  const [openContact, setOpenContact] = useState(null);
  // Aanmeldingen voor het event, per prospect. Komt uit marketing_lead_activity,
  // want de website schrijft elke inschrijving daarheen.
  const [aanmeldingen, setAanmeldingen] = useState(new Map());
  // Opens en kliks per prospect. Staan per BERICHT in de database (een prospect
  // kan er twee hebben), dus hier opgeteld tot een beeld per persoon.
  const [betrokkenheid, setBetrokkenheid] = useState(new Map());
  // Onze laatste uitgaande datum per prospect. Voedt reminderAdvies.
  const [laatsteVerzending, setLaatsteVerzending] = useState(new Map());

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

      // Verbruik van de caps, zodat je zonder dry-run ziet hoeveel ruimte er nog
      // is. Rollende vensters, precies zoals het verzendendpoint ze telt.
      const nu = Date.now();
      const [{ count: c24 }, { count: c7 }] = await Promise.all([
        supabase.from('outreach_message').select('id', { count: 'exact', head: true })
          .eq('campaign_id', camp.id).eq('direction', 'outbound')
          .gte('sent_or_received_at', new Date(nu - 86400000).toISOString()),
        supabase.from('outreach_message').select('id', { count: 'exact', head: true })
          .eq('campaign_id', camp.id).eq('direction', 'outbound')
          .gte('sent_or_received_at', new Date(nu - 7 * 86400000).toISOString()),
      ]);
      setSentInfo({
        count: count || 0,
        firstAt: firstOut?.[0]?.sent_or_received_at || null,
        last24h: c24 || 0,
        last7d: c7 || 0,
      });

      // Opens en kliks per prospect.
      try {
        const { data: msgs } = await supabase
          .from('outreach_message')
          .select('contact_id, open_count, click_count, delivered_at, sent_or_received_at')
          .eq('campaign_id', camp.id).eq('direction', 'outbound')
          .limit(5000);
        const m = new Map();
        // Onze laatste uitgaande datum per contact, in dezelfde lus. Nodig voor
        // reminderAdvies; outreach_contact heeft geen last_sent_at-kolom.
        const verzonden = new Map();
        for (const r of (msgs || [])) {
          if (!r.contact_id) continue;
          const v = m.get(r.contact_id) || { opens: 0, clicks: 0, delivered: 0 };
          v.opens += r.open_count || 0;
          v.clicks += r.click_count || 0;
          if (r.delivered_at) v.delivered += 1;
          m.set(r.contact_id, v);

          const vorige = verzonden.get(r.contact_id);
          if (r.sent_or_received_at
            && (!vorige || new Date(r.sent_or_received_at) > new Date(vorige))) {
            verzonden.set(r.contact_id, r.sent_or_received_at);
          }
        }
        setBetrokkenheid(m);
        setLaatsteVerzending(verzonden);
      } catch {
        setBetrokkenheid(new Map());
        setLaatsteVerzending(new Map());
      }

      // Aanmeldingen erbij. Losse query en client-side koppelen, want er is geen
      // sleutelrelatie tussen een outreach-prospect en een inschrijving: iemand
      // meldt zich aan met het adres dat hij zelf kiest.
      try {
        const { data: acts } = await supabase
          .from('marketing_lead_activity')
          .select('marketing_lead_id, occurred_at, payload')
          .eq('event', 'event_registered')
          .order('occurred_at', { ascending: false })
          .limit(1000);
        const leadIds = [...new Set((acts || []).map(a => a.marketing_lead_id).filter(Boolean))];
        let leads = [];
        if (leadIds.length) {
          const { data } = await supabase
            .from('marketing_leads').select('id, email, full_name').in('id', leadIds);
          leads = data || [];
        }
        const leadById = Object.fromEntries(leads.map(l => [l.id, l]));
        const regs = (acts || []).map(a => ({
          email: leadById[a.marketing_lead_id]?.email || null,
          full_name: leadById[a.marketing_lead_id]?.full_name || null,
          occurred_at: a.occurred_at,
          event: a.payload?.eventSlug || null,
        }));
        setAanmeldingen(matchRegistrations(cts || [], regs));
      } catch {
        // Geen aanmeldingen kunnen ophalen is niet fataal: de rest van de tab
        // werkt gewoon, er ontbreekt alleen een label.
        setAanmeldingen(new Map());
      }

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
    c[REGISTERED] = wave.filter(r => aanmeldingen.has(r.id)).length;
    c[OPENED] = wave.filter(r => (betrokkenheid.get(r.id)?.opens || 0) > 0).length;
    c[CLICKED] = wave.filter(r => (betrokkenheid.get(r.id)?.clicks || 0) > 0).length;
    return c;
  }, [wave, aanmeldingen, betrokkenheid]);

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
      else if (statusFilter === REGISTERED) { if (!aanmeldingen.has(r.id)) return false; }
      else if (statusFilter === OPENED) { if (!((betrokkenheid.get(r.id)?.opens || 0) > 0)) return false; }
      else if (statusFilter === CLICKED) { if (!((betrokkenheid.get(r.id)?.clicks || 0) > 0)) return false; }
      else if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (prioFilter !== 'all' && (r.priority_label || '') !== prioFilter) return false;
      if (!needle) return true;
      return [r.email, r.company, r.first_name, r.last_name, r.title]
        .some(v => String(v || '').toLowerCase().includes(needle));
    });
  }, [rows, showReserve, statusFilter, prioFilter, q, aanmeldingen, betrokkenheid]);

  // Bepaalt welk Graph-pad we gebruiken: eigen mailbox of gedeelde leesrechten.
  const myEmail = String(session?.user?.email || '').toLowerCase();
  const senderMailbox = String(campaign?.sender_mailbox || '').toLowerCase();
  const isSender = !!myEmail && myEmail === senderMailbox;

  const age = hoursSince(sync?.last_synced_at);
  const stale = age === null || age > STALE_HOURS;


  // Eenmalige herstelactie voor antwoorden die zijn opgeslagen toen de scan nog
  // bodyPreview bewaarde (de eerste 255 tekens die Graph teruggeeft). Haalt de
  // volledige tekst alsnog op en laat opnieuw beoordelen.
  const herstelAfgekapt = async () => {
    if (!campaign) return;
    setHerstelBezig(true); setHerstel(null);
    try {
      const { data, error } = await supabase
        .from('outreach_message')
        .select('id, provider_message_id, internet_message_id, body_preview')
        .eq('campaign_id', campaign.id)
        .eq('direction', 'inbound')
        .is('body_full', null)
        .is('body_fetched_at', null)
        .limit(200);
      if (error) throw new Error(error.message);

      const afgekapt = (data || []).filter(r => (r.body_preview || '').length >= 255);
      if (!afgekapt.length) {
        setHerstel({ stats: { bekeken: 0 }, klaar: true, veranderingen: [] });
        setHerstelBezig(false);
        return;
      }

      const mailbox = isSender ? null : campaign.sender_mailbox;
      const klaar = [];
      for (const r of afgekapt) {
        let vol = null;
        try {
          vol = await getMessageBody(mailbox, r.provider_message_id);
          // Graph geeft een bericht een NIEUW id zodra het naar een andere map
          // verhuist, dus het opgeslagen id kan verlopen zijn. Het
          // internetMessageId verandert nooit; daarmee vinden we het terug.
          if (!vol && r.internet_message_id) {
            const versId = await findMessageByInternetId(mailbox, r.internet_message_id);
            if (versId) vol = await getMessageBody(mailbox, versId);
          }
        } catch (e) {
          console.warn('[outreach] herstel ophalen faalde', r.id, e.message);
        }
        klaar.push({ id: r.id, bodyFull: kiesBerichttekst(vol) });
      }

      const totaal = { bekeken: 0, tekst_bijgewerkt: 0, opnieuw_beoordeeld: 0, veranderd: 0, niet_gevonden: 0, fouten: 0 };
      const veranderingen = [];
      for (let i = 0; i < klaar.length; i += CLASSIFY_BATCH) {
        const resp = await apiFetch('/api/outreach-reclassify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: klaar.slice(i, i + CLASSIFY_BATCH) }),
        });
        const d = await resp.json();
        if (!resp.ok) throw new Error(d?.error || `HTTP ${resp.status}`);
        for (const k of Object.keys(totaal)) totaal[k] += (d.stats?.[k] || 0);
        veranderingen.push(...(d.veranderingen || []));
      }
      setHerstel({ stats: totaal, veranderingen, klaar: true });
      await load();
    } catch (e) {
      setHerstel({ fout: e.message });
    } finally {
      setHerstelBezig(false);
    }
  };

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

      // De lijstopvraag levert alleen bodyPreview, en dat is bij Graph per
      // definitie de eerste 255 tekens. Voor de handvol berichten die als
      // antwoord herkend zijn halen we daarom de volledige tekst apart op. Een
      // bericht dat inmiddels verplaatst of verwijderd is geeft null; dan blijft
      // de afgekorte tekst staan en gaat de scan gewoon door.
      for (const k of candidates) {
        try {
          const vol = await getMessageBody(isSender ? null : campaign.sender_mailbox, k.messageId);
          const tekst = kiesBerichttekst(vol);
          if (tekst) k.bodyFull = tekst;
        } catch (e) {
          console.warn('[outreach] volledige tekst ophalen faalde', k.messageId, e.message);
        }
      }

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

  // Loopt /api/outreach-linkedin-scan af in rondes van 40 contacten, tot het
  // endpoint volgende_offset null teruggeeft. MAX_RONDES is een noodrem: een
  // bug in volgende_offset zou anders eindeloos doorpompen.
  const LI_MAX_RONDES = 20;
  const liLoop = async (dryRun) => {
    const totalen = { totaal: 0, verwerkt: 0, met_antwoord: 0, geschreven: 0, fouten: 0, overgeslagen: 0 };
    const resultaten = [];
    let offset = 0;
    let ronde = 0;
    let compleet = false;

    while (ronde < LI_MAX_RONDES) {
      ronde += 1;
      setLiVoortgang({ ronde, offset, dryRun });
      const resp = await apiFetch('/api/outreach-linkedin-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id, offset, dry_run: dryRun, herscan: liHerscan }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);

      totalen.totaal = data.totaal ?? totalen.totaal;
      totalen.verwerkt += data.verwerkt || 0;
      totalen.met_antwoord += data.met_antwoord || 0;
      totalen.geschreven += data.geschreven || 0;
      totalen.fouten += data.fouten || 0;
      totalen.overgeslagen += data.overgeslagen || 0;
      for (const r of data.resultaten || []) resultaten.push(r);

      if (data.volgende_offset === null || data.volgende_offset === undefined) { compleet = true; break; }
      offset = Number(data.volgende_offset);
    }

    return { ...totalen, resultaten, compleet, rondes: ronde, dryRun };
  };

  const liDrogeRun = async () => {
    if (!campaign) return;
    setLiBezig(true); setLiErr(null); setLiScanDroog(null); setLiScanEcht(null);
    try {
      const uitkomst = await liLoop(true);
      setLiScanDroog(uitkomst);
      if (!uitkomst.compleet) {
        setLiErr(`Gestopt na ${LI_MAX_RONDES} rondes zonder einde. Verwerken kan zo niet, meld dit.`);
      }
    } catch (e) {
      setLiErr(e.message || String(e));
    }
    setLiVoortgang(null);
    setLiBezig(false);
  };

  const liAntwoordRijen = (liScanDroog?.resultaten || []).filter(r => r.uitkomst === 'antwoord');
  // Verwerken mag pas na een VOLLEDIG afgeronde droge run met antwoorden.
  const liKanVerwerken = !!liScanDroog && liScanDroog.compleet && liAntwoordRijen.length > 0;

  const liVerwerk = async () => {
    if (!campaign || !liKanVerwerken) return;
    if (!window.confirm(liHerscan
      ? `${liAntwoordRijen.length} antwoorden OPNIEUW beoordelen? Dit overschrijft de eerder vastgelegde tekst en classificatie, en kan de status wijzigen.`
      : `${liAntwoordRijen.length} antwoorden verwerken en de status bijwerken?`)) return;
    setLiBezig(true); setLiErr(null); setLiScanEcht(null);
    try {
      const uitkomst = await liLoop(false);
      setLiScanEcht(uitkomst);
      await load();
    } catch (e) {
      setLiErr(e.message || String(e));
    }
    setLiVoortgang(null);
    setLiBezig(false);
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

  // Automatisch versturen aan of uit. Los van de status: 'active' blijft de
  // killswitch, dit bepaalt alleen of de cron de dagcap over de dag uitsmeert.
  const setAutoSend = async (value) => {
    setBusyStatus(true);
    const { error } = await supabase.from('outreach_campaign')
      .update({ auto_send: value, updated_at: new Date().toISOString() }).eq('id', campaign.id);
    setBusyStatus(false);
    if (error) { setSendErr('Automatisch versturen wijzigen mislukt: ' + error.message); return; }
    await load();
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
  // Rollende vensters, net als aan de verzendkant: 'vandaag' is de afgelopen 24
  // uur, niet de kalenderdag.
  const dagRuimte = Math.max(0, (campaign.daily_cap || 0) - sentInfo.last24h);
  const weekRuimte = campaign.weekly_cap
    ? Math.max(0, campaign.weekly_cap - sentInfo.last7d)
    : null;

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
          {campaign.weekly_cap ? ` · weekcap ${campaign.weekly_cap}` : ''}
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
        {!isLinkedIn && kpi('Geopend', counts[OPENED] || 0, '#0891b2', OPENED)}
        {!isLinkedIn && kpi('Geklikt', counts[CLICKED] || 0, '#7c3aed', CLICKED)}
        {kpi('Aangemeld', counts[REGISTERED] || 0, '#16a34a', REGISTERED)}
        {!isLinkedIn && kpi('Gebounced', counts.bounced || 0, STATUS_COLOR.bounced, 'bounced')}
        {kpi('Gepauzeerd', counts.paused || 0, STATUS_COLOR.paused, 'paused')}
        {kpi('Reserve', rows.length - wave.length, 'var(--text-3)')}
      </div>

      {/* Inboxscan. Bij e-mail leest hij de mailbox van de afzender; bij LinkedIn
          leest api/outreach-linkedin-scan.js de chats via Unipile. Twee aparte
          paneeltjes, want de knoppen en de uitkomst verschillen. */}
      {isLinkedIn ? (
        <div style={{
          border: '0.5px solid var(--sep)', borderRadius: 8, padding: 12,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>LinkedIn-inboxscan</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-3)', cursor: 'pointer' }}
                title="Beoordeelt ook antwoorden die al verwerkt zijn, nu op de volledige gespreksdraad in plaats van alleen het laatste bericht">
                <input type="checkbox" checked={liHerscan} disabled={liBezig}
                  onChange={e => setLiHerscan(e.target.checked)} />
                Opnieuw beoordelen
              </label>
              <button className="btn-primary tiny" disabled={liBezig} onClick={liDrogeRun}
                title={`Leest de LinkedIn-gesprekken van ${campaign.sender_mailbox} en toont welke prospects geantwoord hebben. Schrijft niets.`}>
                {liBezig ? 'Bezig…' : 'Scan LinkedIn (droge run)'}
              </button>
              {liKanVerwerken && (
                <button className="btn-ghost tiny" disabled={liBezig} onClick={liVerwerk}
                  title="Legt de gevonden antwoorden vast en werkt de status van die prospects bij">
                  Verwerk deze antwoorden
                </button>
              )}
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            Scant de LinkedIn-gesprekken van <strong>{campaign.sender_mailbox}</strong>, per ronde 40 contacten.
            {' '}De droge run schrijft niets; pas daarna kun je verwerken.
          </div>

          {liVoortgang && (
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {liVoortgang.dryRun ? 'Droge run' : 'Verwerken'} bezig: ronde {liVoortgang.ronde}, vanaf contact {liVoortgang.offset + 1}.
            </div>
          )}

          {liErr && (
            <div style={{ fontSize: 12, color: '#dc2626' }}>Scan mislukt: {liErr}</div>
          )}

          {(liScanEcht || liScanDroog) && (() => {
            const res = liScanEcht || liScanDroog;
            const antwoorden = (res.resultaten || []).filter(r => r.uitkomst === 'antwoord');
            const foutRijen = (res.resultaten || []).filter(r => r.uitkomst === 'fout');
            return (
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                <strong>{res.dryRun ? 'Droge run' : 'Verwerkt'}:</strong> {res.verwerkt} van {res.totaal} contacten bekeken,
                {' '}<strong>{res.met_antwoord}</strong> met antwoord, {res.fouten} fout(en), {res.overgeslagen} overgeslagen.
                {!res.dryRun && <> {res.geschreven} status(sen) bijgewerkt.</>}
                {!res.compleet && (
                  <span style={{ color: '#b45309' }}> Gestopt op de veiligheidsrem van {LI_MAX_RONDES} rondes.</span>
                )}

                {antwoorden.length > 0 && (
                  <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                    {antwoorden.map(r => (
                      <li key={r.id} style={{ marginBottom: 6 }}>
                        <strong>{r.naam}</strong>{r.bedrijf ? ` (${r.bedrijf})` : ''}:
                        {' '}{r.classificatie || 'onbekend'} ({Math.round((r.confidence || 0) * 100)}%),
                        {' '}{r.status_nu || 'onbekend'} naar {r.status_straks || 'onbekend'}
                        {r.beoordeling_nodig && (
                          <span style={{ color: '#b45309', fontWeight: 600 }}> · handmatig beoordelen</span>
                        )}
                        <div style={{ color: 'var(--text-3)', marginTop: 2 }}>{r.tekst}</div>
                      </li>
                    ))}
                  </ul>
                )}

                {foutRijen.length > 0 && (
                  <ul style={{ margin: '8px 0 0 16px', padding: 0, color: '#dc2626' }}>
                    {foutRijen.map(r => (
                      <li key={`f-${r.id}`}>{r.naam}: {r.detail || 'onbekende fout'}</li>
                    ))}
                  </ul>
                )}

                {res.dryRun && antwoorden.length === 0 && res.compleet && (
                  <div style={{ color: 'var(--text-3)', marginTop: 4 }}>
                    Geen nieuwe antwoorden gevonden. Er valt dus niets te verwerken.
                  </div>
                )}
              </div>
            );
          })()}
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
              <button className="btn-ghost tiny" disabled={herstelBezig || !hasGraphToken}
                onClick={herstelAfgekapt}
                title="Haalt de volledige tekst op van antwoorden die eerder afgekapt zijn opgeslagen, en laat ze opnieuw beoordelen">
                {herstelBezig ? 'Ophalen…' : 'Afgekapte antwoorden herstellen'}
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            Scant de mailbox van <strong>{campaign.sender_mailbox}</strong>
            {isSender ? ' (dat ben jij)' : `, via gedeelde leesrechten op jouw login (${myEmail})`}.
            {' '}Alle mappen, dus ook wat al opgeruimd of gearchiveerd is.
          </div>

          {herstel && (
            <div style={{ fontSize: 12, border: '0.5px solid var(--sep)', borderRadius: 8, padding: '8px 10px' }}>
              {herstel.fout ? (
                <span style={{ color: '#dc2626' }}>Herstel mislukt: {herstel.fout}</span>
              ) : herstel.stats.bekeken === 0 ? (
                <>Geen afgekapte antwoorden meer gevonden.</>
              ) : (
                <>
                  {herstel.stats.tekst_bijgewerkt} antwoorden volledig opgehaald en opnieuw beoordeeld.
                  {herstel.stats.niet_gevonden > 0 && (
                    <> {herstel.stats.niet_gevonden} niet meer in de mailbox gevonden; die houden de oude tekst.</>
                  )}
                  {herstel.stats.fouten > 0 && <> {herstel.stats.fouten} mislukt.</>}
                  {herstel.veranderingen.length > 0 ? (
                    <div style={{ marginTop: 6 }}>
                      <strong>{herstel.veranderingen.length}</strong> kregen een andere beoordeling.
                      De status is bewust niet automatisch aangepast, want een deel is inmiddels
                      met de hand afgehandeld. Ze staan gemarkeerd voor handwerk:
                      <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                        {herstel.veranderingen.map(v => (
                          <li key={v.id}>{v.from}: {v.was || 'onbekend'} wordt {v.wordt}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <> Geen enkele beoordeling veranderde.</>
                  )}
                </>
              )}
            </div>
          )}

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
          {/* Ruimte in de caps, altijd zichtbaar. Zonder dit moest je een dry-run
              doen om te weten of er vandaag nog iets kon, en dat is precies de
              vraag die je stelt na een batch. */}
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 999,
            border: '0.5px solid var(--sep)',
            color: dagRuimte > 0 ? 'var(--text-2)' : '#b45309',
          }}>
            vandaag {sentInfo.last24h} van {campaign.daily_cap}
            {dagRuimte > 0 ? ` · nog ${dagRuimte}` : ' · dagcap bereikt'}
          </span>
          {campaign.weekly_cap ? (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 999,
              border: '0.5px solid var(--sep)',
              color: weekRuimte > 0 ? 'var(--text-2)' : '#b45309',
            }}>
              deze week {sentInfo.last7d} van {campaign.weekly_cap}
              {weekRuimte > 0 ? ` · nog ${weekRuimte}` : ' · weekcap bereikt'}
            </span>
          ) : null}
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
            <button className="btn-ghost tiny" disabled={filtered.length === 0}
              onClick={() => setOpenContact(filtered[0])}
              title="Bekijk het bericht zoals het bij een prospect aankomt">
              Bekijk tekst
            </button>
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

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          border: '0.5px solid var(--sep)', borderRadius: 6, padding: '8px 10px',
          background: campaign.auto_send ? 'rgba(22,163,74,0.06)' : 'transparent',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!campaign.auto_send} disabled={busyStatus}
              onChange={e => setAutoSend(e.target.checked)} />
            Automatisch versturen
          </label>
          <span style={{ fontSize: 11, color: 'var(--text-3)', flex: '1 1 320px' }}>
            {campaign.auto_send
              ? `Aan: elke 20 minuten gaan er een paar uit op werkdagen tussen 09:00 en 17:00, tot de dagcap van ${campaign.daily_cap}. Je hoeft niets te klikken. Pauzeer de campagne om het onmiddellijk te stoppen.`
              : `Uit: er gaat alleen iets uit als je op Verstuur batch klikt, maximaal ${isLinkedIn ? 10 : 200} per keer. De rest van de dagcap vraagt dus een volgende klik.`}
          </span>
        </div>

        {campaign.status === 'active' && !campaign.auto_send && isLinkedIn && dagRuimte > 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Voor de resterende {dagRuimte} van vandaag klik je nog {Math.ceil(dagRuimte / 10)} keer,
            of je zet hierboven automatisch versturen aan.
          </div>
        )}

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
              {sendPlan.weekly_cap
                ? ` Deze week: ${sendPlan.sent_last_7d} van weekcap ${sendPlan.weekly_cap}.`
                : ''}
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
          <option value={REGISTERED}>Aangemeld{counts[REGISTERED] ? ` (${counts[REGISTERED]})` : ''}</option>
          <option value={OPENED}>Geopend{counts[OPENED] ? ` (${counts[OPENED]})` : ''}</option>
          <option value={CLICKED}>Geklikt{counts[CLICKED] ? ` (${counts[CLICKED]})` : ''}</option>
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
                {['#', 'Naam', 'Bedrijf', 'Prioriteit', 'Status',
                  ...(isLinkedIn ? [] : ['Geopend', 'Geklikt']),
                  'Conversatie', 'Herinnering', 'Volgende actie', 'Toelichting'].map(h => (
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
                    {aanmeldingen.has(r.id) && (
                      <span title={`Aangemeld op ${String(aanmeldingen.get(r.id).at || '').slice(0, 10)}`
                        + (aanmeldingen.get(r.id).method === 'naam'
                          ? ' (gekoppeld op naam, het adres wijkt af)'
                          : ' (gekoppeld op e-mailadres)')}
                        style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(22,163,74,0.15)', border: '0.5px solid rgba(22,163,74,0.5)', color: '#15803d' }}>
                        aangemeld{aanmeldingen.get(r.id).method === 'naam' ? '?' : ''}
                      </span>
                    )}
                    {needsOurReply(r) && (
                      <span title="Antwoord binnen, wij hebben nog niet gereageerd"
                        style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(217,119,6,0.15)', border: '0.5px solid rgba(217,119,6,0.5)', color: '#b45309' }}>
                        wacht op ons
                      </span>
                    )}
                  </td>
                  {!isLinkedIn && (
                    <>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)',
                        color: (betrokkenheid.get(r.id)?.opens || 0) > 0 ? '#0e7490' : 'var(--text-3)' }}>
                        {(betrokkenheid.get(r.id)?.opens || 0) > 0 ? `${betrokkenheid.get(r.id).opens}x` : '—'}
                      </td>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)',
                        color: (betrokkenheid.get(r.id)?.clicks || 0) > 0 ? '#6d28d9' : 'var(--text-3)' }}>
                        {(betrokkenheid.get(r.id)?.clicks || 0) > 0 ? `${betrokkenheid.get(r.id).clicks}x` : '—'}
                      </td>
                    </>
                  )}
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                    {(() => {
                      const c = conversatieStatus(r);
                      return (
                        <span style={{ color: CONV_COLOR[c], fontWeight: c === CONV_GEEN ? 400 : 500 }}>
                          {CONV_LABEL[c]}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                    {(() => {
                      const a = reminderAdvies({
                        status: r.status,
                        last_inbound_at: r.last_inbound_at,
                        next_action_at: r.next_action_at,
                        laatsteVerzendingISO: laatsteVerzending.get(r.id) || null,
                      });
                      return (
                        <span title={a.reden}
                          style={{ color: HERINNERING_COLOR[a.advies], fontWeight: a.advies === HERINNERING_KAN ? 500 : 400 }}>
                          {HERINNERING_LABEL[a.advies]}
                        </span>
                      );
                    })()}
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
                <tr><td colSpan={isLinkedIn ? 9 : 11} style={{ padding: 16, textAlign: 'center', color: 'var(--text-3)' }}>Niets gevonden.</td></tr>
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
        <ContactMailsModal contact={openContact} campaign={campaign} rows={filtered}
          registratie={aanmeldingen.get(openContact.id) || null}
          onClose={() => setOpenContact(null)} onSent={load} />
      )}

      <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
        {!isLinkedIn && (
          <div style={{ marginBottom: 6 }}>
            Een open wordt gemeten met een onzichtbaar plaatje. Mailprogramma's die plaatjes
            blokkeren tellen niet mee, en Apple laadt ze juist vooraf voor iedereen. Lees het
            aantal opens dus als een richting. Een klik is wel hard.
          </div>
        )}
        {isLinkedIn ? (
          <>Via LinkedIn gaat er precies een bericht per persoon, met tientallen seconden ertussen
          en maximaal 10 per keer. Een account dat in een paar minuten een reeks DM's afvuurt valt
          op, en een beperking op dat account is niet terug te draaien. Antwoorden haalt de scan
          hierboven binnen; de volledige gespreksdraad lees je in de Comms-lane, die LinkedIn live
          ophaalt.</>
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
function ContactMailsModal({ contact, campaign, rows = [], registratie = null, onClose, onSent }) {
  // De prop is alleen het startpunt. Met de keuzelijst blader je door de lijst
  // zonder de popup te sluiten, en dat is ook wat de knop 'Bekijk tekst'
  // gebruikt: die opent hier gewoon de eerste persoon.
  const [current, setCurrent] = useState(contact);

  // Naam en adres corrigeren. Nodig na een bounce: vaak klopt de schrijfwijze
  // niet of is het adres veranderd, en dan wil je dat hier kunnen rechtzetten
  // zonder de hele lijst opnieuw te importeren.
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '' });
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveErr, setSaveErr] = useState(null);

  // Een openstaand bewerkformulier hoort bij de persoon die je bekeek. Laat je
  // dat staan bij het wisselen, dan sla je zo diens naam op bij iemand anders.
  useEffect(() => { setCurrent(contact); setEditing(false); setSaveErr(null); }, [contact]);
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
  // Bewust leeg. Een voorgevulde reden ('niet meer werkzaam bij dit bedrijf')
  // werd gewoon meegeschreven als je hem liet staan, en legde dan een aanname
  // vast die vaak niet klopt. Een reden invullen mag, hoeft niet.
  const [stopReason, setStopReason] = useState('');
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
          .eq('id', current.id).single();
        if (e1) throw e1;
        const { data: h, error: e2 } = await supabase
          .from('outreach_message')
          .select('direction,sequence_step,subject,body_preview,sent_or_received_at,classification,classification_confidence,match_method,provider_message_id,open_count,click_count,delivered_at')
          .eq('contact_id', current.id)
          .order('sent_or_received_at', { ascending: true, nullsFirst: false });
        if (e2) throw e2;
        if (!cancelled) {
          setDetail(d);
          setStatus(d?.status || current.status);
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
  }, [current.id]);

  const sendReply = async () => {
    setRBusy(true); setRResult(null);
    try {
      const resp = await apiFetch('/api/outreach-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: current.id, subject: rSubject, body: rBody }),
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
      paused_reason: (stopReason || '').trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', current.id);
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
    }).eq('id', current.id);
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

  const startEdit = () => {
    setForm({
      first_name: current.first_name || '',
      last_name: current.last_name || '',
      email: current.email || '',
    });
    setSaveErr(null);
    setEditing(true);
  };

  const saveEdit = async () => {
    const email = form.email.trim().toLowerCase();
    // Bij een e-mailcampagne is het adres de enige manier om iemand te bereiken,
    // en de database weigert daar een lege waarde. Vang dat hier af met een
    // leesbare melding in plaats van een constraint-fout.
    if (!isLinkedIn && !email) { setSaveErr('Een e-mailcampagne heeft een adres nodig.'); return; }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setSaveErr('Dat ziet er niet uit als een e-mailadres.'); return; }

    setSaveBusy(true); setSaveErr(null);
    const patch = {
      first_name: form.first_name.trim() || null,
      last_name: form.last_name.trim() || null,
      email: email || null,
      // Het domein is afgeleid en wordt elders gebruikt: voor het koppelen van
      // antwoorden en voor de regel van maximaal zoveel per bedrijf per week.
      // Laat je dit staan, dan wijst het naar het oude bedrijf.
      email_domain: email.includes('@') ? email.split('@')[1] : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('outreach_contact').update(patch).eq('id', current.id);
    setSaveBusy(false);
    if (error) {
      setSaveErr(/duplicate|unique/i.test(error.message)
        ? 'Dat adres staat al in deze campagne.'
        : error.message);
      return;
    }
    setCurrent(c => ({ ...c, ...patch }));
    setEditing(false);
    if (onSent) await onSent();
  };

  const sentStep = (n) => history.find(h => h.direction === 'outbound' && h.sequence_step === n);

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 12, width: 'min(860px, 96vw)', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>

        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--sep)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    placeholder="Voornaam" style={INPUT_STIJL} />
                  <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    placeholder="Achternaam" style={INPUT_STIJL} />
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder={isLinkedIn ? 'E-mailadres (optioneel)' : 'E-mailadres'}
                    style={{ ...INPUT_STIJL, flex: '2 1 240px' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn-primary tiny" disabled={saveBusy} onClick={saveEdit}>
                    {saveBusy ? 'Opslaan…' : 'Opslaan'}
                  </button>
                  <button className="btn-ghost tiny" disabled={saveBusy} onClick={() => setEditing(false)}>Annuleren</button>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    Past alleen deze campagne aan, niet het contact in het CRM.
                  </span>
                </div>
                {saveErr && <div style={{ fontSize: 12, color: '#dc2626' }}>{saveErr}</div>}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {[current.first_name, current.last_name].filter(Boolean).join(' ') || current.email || '(naamloos)'}
                  <button className="btn-ghost tiny" onClick={startEdit}
                    title="Naam en e-mailadres aanpassen">Bewerk</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {[current.title, current.company].filter(Boolean).join(' · ')}
                  {current.email ? ` · ${current.email}` : ''}
                  {isLinkedIn && current.linkedin_url ? (
                    <> · <a href={current.linkedin_url} target="_blank" rel="noreferrer"
                      style={{ color: '#0a66c2' }}>LinkedIn-profiel</a></>
                  ) : null}
                </div>
              </>
            )}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: STATUS_COLOR[status] || 'var(--text-2)', fontWeight: 500 }}>
            {STATUS_LABEL[status] || status}
          </span>
          <button className="btn-ghost tiny" onClick={onClose}>✕</button>
        </div>

        {rows.length > 1 && (
          <div style={{ padding: '10px 18px', borderBottom: '0.5px solid var(--sep)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Bekijk de tekst van</span>
            <select value={current.id} onChange={e => {
              const r = rows.find(x => String(x.id) === e.target.value);
              if (r) {
                setCurrent(r); setComposing(false); setRResult(null);
                setStopping(false); setEditing(false); setSaveErr(null);
              }
            }}
              style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 12 }}>
              {rows.map(r => {
                const naam = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || r.linkedin_url;
                return (
                  <option key={r.id} value={r.id}>
                    {r.outreach_prio ? `${r.outreach_prio}. ` : ''}{naam}{r.company ? ` — ${r.company}` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Laden…</div>}
          {err && <div style={{ color: '#dc2626', fontSize: 12 }}>Kon de mails niet laden: {err}</div>}

          {!loading && !err && (
            <>
              {registratie && (
                <div style={{
                  fontSize: 12, lineHeight: 1.6, borderRadius: 6, padding: '8px 10px',
                  background: 'rgba(22,163,74,0.08)', border: '0.5px solid rgba(22,163,74,0.4)', color: '#15803d',
                }}>
                  <strong>Heeft zich aangemeld</strong>
                  {registratie.at ? ` op ${String(registratie.at).slice(0, 10)}` : ''}
                  {registratie.event ? ` voor ${registratie.event}` : ''}.
                  {registratie.method === 'naam' && (
                    <div style={{ color: 'var(--text-3)', marginTop: 2 }}>
                      Gekoppeld op naam, niet op adres: deze persoon meldde zich aan met een ander
                      e-mailadres dan waarop wij hem benaderden. Vaak betekent dat een nieuwe baan.
                    </div>
                  )}
                </div>
              )}

              {(detail?.paused_reason || detail?.last_reply_summary) && (
                <div style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--fill-1)', borderRadius: 6, padding: '8px 10px' }}>
                  {detail.last_reply_summary
                    ? <><strong>Antwoord:</strong> {detail.last_reply_summary}</>
                    : <><strong>Gepauzeerd:</strong> {detail.paused_reason}</>}
                </div>
              )}

              {/* Stoppen. Bewust bovenaan, boven de berichten: het is de uitweg
                  als uit een antwoord blijkt dat iemand hier niet meer werkt, en
                  daar ga je niet eerst een mailvoorbeeld voor doorscrollen. */}
              <div>
                {status === 'paused' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn-ghost tiny" style={HERVAT_STIJL}
                      disabled={stopBusy} onClick={resumeOutreach}>
                      {stopBusy ? 'Bezig…' : 'Hervat outreach'}
                    </button>
                  </div>
                ) : !stopping ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn-ghost tiny" style={STOP_STIJL}
                      onClick={() => { setStopping(true); setRResult(null); }}>
                      Stop outreach
                    </button>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      Deze persoon krijgt niets meer. Later weer aan te zetten.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input value={stopReason} onChange={e => setStopReason(e.target.value)}
                      placeholder="Reden (optioneel)"
                      style={{ flex: '1 1 320px', padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 13 }} />
                    <button className="btn-primary tiny" style={STOP_STIJL}
                      disabled={stopBusy} onClick={stopOutreach}>
                      {stopBusy ? 'Bezig…' : 'Bevestig stoppen'}
                    </button>
                    <button className="btn-ghost tiny" disabled={stopBusy} onClick={() => setStopping(false)}>Annuleren</button>
                  </div>
                )}
              </div>

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
                        {rBusy ? 'Versturen…' : `Verstuur naar ${current.email}`}
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
                        {h.direction === 'outbound' && (h.open_count || h.click_count) ? (
                          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                            {h.open_count ? `${h.open_count}x geopend` : ''}
                            {h.open_count && h.click_count ? ' · ' : ''}
                            {h.click_count ? `${h.click_count}x geklikt` : ''}
                          </span>
                        ) : null}
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
