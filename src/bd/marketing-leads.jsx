// Marketing → Leads: website-aanmeldingen (marketing_leads tabel).
// Losstaand van de sales-funnel; "Add to funnel" maakt pas een leads-rij aan.
// Data wordt hier zelf opgehaald (zoals MarketingCampaigns) — geen props
// vanuit BDApp nodig.
import { useEffect, useRef, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import {
  bronLabel, gekomenVia, telefoonVan, telHref,
  datumIsActueel,
} from '../lib/lead-bron';
import { matchAanmeldingCampagnes } from './outreach-match';
import { contactVanLead, aanvullingenVoorContact, zoekBedrijf, normMail } from '../lib/contact-van-lead';
import { maakBlokken, BLOK_EVENT } from './leads-blokken';
import { weergaveVanProspect } from '../lib/outreach-status';
import { fetchAllRows } from '../hooks/usePipelineData';
import { fmtRelative } from './atoms';
import { apiFetch } from '../lib/apiFetch';

const STATUS_FILTERS = ['active', 'converted', 'archived', 'all'];

// Het bronlabel komt uit de activiteit zelf; zie src/lib/lead-bron.js. first_src
// is bij de eventaanmeldingen niet gevuld, dus zonder dit toont de kolom Bron
// alleen streepjes terwijl we wel weten waar iemand vandaan komt.


// auth-e-mail → OWNERS-id voor de owner op de gepromoveerde sales lead.
// ownerIdFromName in adapters.js mapt weergavenamen (geen e-mails), dus hier
// een eigen map op e-mailprefix.
// LET OP: houd in sync met OWNERS in atoms.jsx en de alias-mapping in
// adapters.js (zie CLAUDE.md over owner-drift).
function ownerFromEmail(email) {
  const map = { olivier: 'OA', marco: 'MVG', yarmilla: 'YK' };
  return map[String(email || '').split('@')[0].toLowerCase()] || null;
}

function PayloadLines({ payload }) {
  const entries = Object.entries(payload || {});
  if (!entries.length) return <span style={{ color: 'var(--text-dim, #888)' }}>-</span>;
  return (
    <span>
      {entries.map(([k, v]) => (
        <span key={k} style={{ marginRight: 10 }}>
          <b>{k}</b>: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
        </span>
      ))}
    </span>
  );
}

export default function MarketingLeads() {
  const [rows, setRows] = useState([]);
  const [activity, setActivity] = useState({}); // leadId -> activity rows
  // Reacties op de uitnodiging voor de user session. Komen uit de view
  // user_session_results en NIET uit de onderliggende tabel: die bevat het
  // token, en wie een token heeft kan namens die persoon antwoorden.
  const [sessie, setSessie] = useState([]);
  // Bevestigingen voor het event zelf. Ook uit een view en niet uit de tabel:
  // die draagt het token, en wie een token heeft kan namens die persoon
  // antwoorden. Zelfde reden als bij de user session hierboven.
  const [eventBevestiging, setEventBevestiging] = useState([]);
  // lead-id -> kant-en-klaar bronlabel, afgeleid uit de activiteit.
  const [bronPerLead, setBronPerLead] = useState({});
  // lead-id -> via wie de deelnemer zegt binnengekomen te zijn
  // (Eclectik / Zoom/Workvivo / Other), opgegeven in het aanmeldformulier.
  const [viaPerLead, setViaPerLead] = useState({});
  // lead-id -> telefoonnummer uit de aanmelding. Staat niet op marketing_leads
  // maar in de payload van de activiteit, net als de bron en de eventdatum.
  const [telPerLead, setTelPerLead] = useState({});
  // De activiteiten zelf, want de lijst is per blok gegroepeerd op activiteit
  // en niet op lead. Iemand die zich voor twee events aanmeldt hoort in beide
  // tabellen te staan.
  const [activiteiten, setActiviteiten] = useState([]);
  // activiteit-id -> de outreachcampagnes waar die aanmelding uit lijkt te
  // komen. Zie matchAanmeldingCampagnes in outreach-match.js.
  const [campagnesPerAanmelding, setCampagnesPerAanmelding] = useState(new Map());
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  // Staleness-guard: bij snel wisselen van statusfilter mag een oudere
  // (tragere) response een nieuwere niet overschrijven.
  const loadSeq = useRef(0);

  const load = async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    let q = supabase.from('marketing_leads').select('*')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data, error } = await q;
    if (seq !== loadSeq.current) return;
    if (error) alert('Laden mislukt: ' + error.message);
    setRows(data || []);

    // Bron per lead uit de activiteit.
    //
    // GESORTEERD OPHALEN, EN BEWUST KIEZEN WELKE WINT
    //   Dit haalde op zonder sortering en nam de eerste de beste rij. Bij
    //   iemand met twee activiteiten bepaalde het toeval dus wat er in de
    //   kolom Bron stond, en met de blokken erbij zou het toeval ook gaan
    //   bepalen waar diegene landt. De nieuwste eventaanmelding wint; is er
    //   geen eventaanmelding, dan de nieuwste activiteit die er wel is.
    const ids = (data || []).map(r => r.id);
    if (ids.length) {
      const { data: acts } = await supabase.from('marketing_lead_activity')
        .select('id, marketing_lead_id, event, payload, occurred_at')
        .in('marketing_lead_id', ids)
        .order('occurred_at', { ascending: false, nullsFirst: false });
      const rijen = acts || [];
      const m = {};
      const u = {};
      const tel = {};
      const isEvent = {};
      for (const a of rijen) {
        const lead = a.marketing_lead_id;
        const eventRij = a.event === 'event_registered';
        // Een eventaanmelding verdringt een eerder gekozen niet-event.
        if (!(lead in m) || (eventRij && !isEvent[lead])) {
          m[lead] = bronLabel(a.event, a.payload);
          u[lead] = gekomenVia(a.payload);
          tel[lead] = telefoonVan(a.payload);
          isEvent[lead] = eventRij;
        }
      }
      if (seq === loadSeq.current) {
        setBronPerLead(m); setViaPerLead(u); setTelPerLead(tel); setActiviteiten(rijen);
      }

      // De campagnes erbij. Losse query en in de browser koppelen, want er is
      // geen sleutelrelatie tussen een aanmelding en een outreachprospect:
      // iemand meldt zich aan met het adres dat hij zelf kiest. Zelfde
      // redenering als in de Outreach-tab, en daarom ook dezelfde semantiek.
      try {
        const leadById = Object.fromEntries((data || []).map(l => [l.id, l]));
        const aanmeldingen = rijen.map(a => ({
          id: a.id,
          email: leadById[a.marketing_lead_id]?.email || null,
          full_name: leadById[a.marketing_lead_id]?.full_name || null,
        }));
        // Alle rijen, niet de eerste duizend. PostgREST kapt stil af op 1000
        // en een hogere .limit() verandert dat niet; zie fetchAllRows in usePipelineData.js.
        // Greg Mills en Natalie Viskozki stonden daardoor op 'niet benaderd'
        // terwijl ze in de outreach op afspraak stonden.
        const cts = await fetchAllRows(() => supabase.from('outreach_contact')
          .select('campaign_id, status, outcome, email, first_name, last_name, outreach_campaign(name, doel)')
          .order('id', { ascending: true }));
        if (seq === loadSeq.current) {
          setCampagnesPerAanmelding(matchAanmeldingCampagnes(aanmeldingen, cts));
        }
      } catch {
        // Geen campagnes kunnen ophalen is niet fataal: de rest van de tab
        // werkt gewoon, er ontbreekt alleen een chip.
        if (seq === loadSeq.current) setCampagnesPerAanmelding(new Map());
      }
    } else if (seq === loadSeq.current) {
      setBronPerLead({});
      setViaPerLead({});
      setTelPerLead({});
      setActiviteiten([]);
      setCampagnesPerAanmelding(new Map());
    }

    const { data: ses } = await supabase.from('user_session_results')
      .select('*').order('submitted_at', { ascending: false, nullsFirst: false });
    if (seq === loadSeq.current) setSessie(ses || []);

    const { data: ev } = await supabase.from('event_confirm_results')
      .select('*').order('answered_at', { ascending: false, nullsFirst: false });
    if (seq === loadSeq.current) setEventBevestiging(ev || []);

    setLoading(false);
  };
  useEffect(() => { load(); }, [statusFilter]);

  const toggleExpand = async (lead) => {
    if (expanded === lead.id) { setExpanded(null); return; }
    setExpanded(lead.id);
    if (!activity[lead.id]) {
      const { data } = await supabase.from('marketing_lead_activity')
        .select('*').eq('marketing_lead_id', lead.id)
        .order('occurred_at', { ascending: false });
      setActivity(a => ({ ...a, [lead.id]: data || [] }));
    }
  };

  const promote = async (lead) => {
    const ok = window.confirm(
      `${lead.full_name || lead.email} toevoegen aan de funnel?\n` +
      'Er wordt een rij in de sales-funnel aangemaakt en deze marketing lead krijgt status "converted".'
    );
    if (!ok) return;
    setBusyId(lead.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const acts = activity[lead.id] || [];
      const notes = [
        lead.sector ? `Sector: ${lead.sector}` : null,
        lead.first_src ? `Campagnebron: ${lead.first_src}` : null,
        `Website-activiteit: ${acts.length ? `${acts.length} event(s)` : 'zie Marketing → Leads'}, eerste aanmelding ${new Date(lead.created_at).toLocaleDateString('nl-NL')}`,
      ].filter(Boolean).join('\n');

      const { data: created, error: insErr } = await supabase.from('leads').insert({
        full_name: lead.full_name || lead.email,
        email: lead.email,
        company_name: lead.company || null,
        title: lead.role || null,
        source: 'Website - marketing lead',
        status: 'New',
        owner: ownerFromEmail(auth?.user?.email),
        notes,
      }).select('id').single();
      if (insErr) throw insErr;

      // Status-guard: alleen updaten als de lead nog 'active' is (een ander
      // tabblad kan hem intussen gearchiveerd/gepromoveerd hebben).
      const { data: updated, error: updErr } = await supabase.from('marketing_leads')
        .update({ status: 'converted', converted_lead_id: created.id, updated_at: new Date().toISOString() })
        .eq('id', lead.id).eq('status', 'active').select('id');
      if (updErr) throw updErr;
      if (!updated?.length) {
        alert(
          'De sales lead is aangemaakt, maar de status van deze marketing lead was intussen al veranderd - ' +
          'controleer de lijst (en de sales-funnel) op dubbelingen. Lijst wordt ververst.'
        );
      }
      await load();
    } catch (e) {
      alert('Promoveren mislukt: ' + (e?.message || e));
    } finally {
      setBusyId(null);
    }
  };

  // Toevoegen aan de contactendatabase ZONDER een sales lead te maken.
  //
  // WAAROM NAAST PROMOVEREN
  //   Promoveren maakt een rij in de funnel, en daarmee de belofte dat er een
  //   deal in zit. Dat geldt niet voor iedereen die zich voor een event
  //   aanmeldt. Zo iemand hoort wel in contacts, zodat hij mee kan in de
  //   marketing, maar niet in de funnel. De regels staan in
  //   src/lib/contact-van-lead.js, met tests.
  const voegContactToe = async (lead) => {
    const ok = window.confirm(
      `${lead.full_name || lead.email} toevoegen aan BD?\n` +
      'Er komt een rij in de contactendatabase. Er wordt GEEN sales lead aangemaakt.'
    );
    if (!ok) return;
    setBusyId(lead.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      // De nieuwste aanmelding levert telefoon, land en het marketingvinkje.
      const payload = activiteiten.find(
        a => a.marketing_lead_id === lead.id && a.event === 'event_registered')?.payload
        || activiteiten.find(a => a.marketing_lead_id === lead.id)?.payload
        || {};

      // Bedrijf alleen bij een exacte naam; zie zoekBedrijf.
      let companyId = null;
      if (lead.company) {
        const { data: bedrijven } = await supabase.from('companies')
          .select('id, name').ilike('name', lead.company.trim());
        companyId = zoekBedrijf(lead.company, bedrijven)?.id || null;
      }

      const nieuw = contactVanLead(lead, payload, {
        owner: ownerFromEmail(auth?.user?.email), companyId,
      });

      // Bestaat dit adres al? Dan koppelen in plaats van een tweede rij maken.
      // Dat is hier de regel en niet de uitzondering: veel aanmelders staan al
      // in de marketingdatabase, en een dubbel contact is precies de rommel die
      // deze knop moet voorkomen.
      let contactId = null;
      let hergebruikt = false;
      if (nieuw.email) {
        const { data: gevonden } = await supabase.from('contacts')
          .select('id, email, first_name, last_name, phone, title, company_name, company_id, country, marketing_content_opt_in')
          .ilike('email', nieuw.email).limit(5);
        // ilike leest % en _ als jokertekens. Een adres met zo'n teken erin zou
        // dus iemand anders kunnen opleveren, en aan het verkeerde contact
        // koppelen is erger dan een dubbele rij. Daarom hier nog een keer
        // letterlijk vergelijken.
        const rij = (gevonden || []).find(c => normMail(c.email) === nieuw.email) || null;
        if (rij) {
          contactId = rij.id;
          hergebruikt = true;
          const bij = aanvullingenVoorContact(rij, nieuw);
          if (Object.keys(bij).length) {
            await supabase.from('contacts')
              .update({ ...bij, updated_at: new Date().toISOString() }).eq('id', rij.id);
          }
        }
      }

      if (!contactId) {
        const { data: gemaakt, error: insErr } = await supabase.from('contacts')
          .insert(nieuw).select('id').single();
        if (insErr) throw insErr;
        contactId = gemaakt.id;
      }

      const { error: updErr } = await supabase.from('marketing_leads')
        .update({ contact_id: contactId, updated_at: new Date().toISOString() })
        .eq('id', lead.id);
      if (updErr) throw updErr;

      if (hergebruikt) {
        alert(`${nieuw.email} stond al in de contacten. Die rij is aangevuld; er is geen tweede contact aangemaakt.`);
      }
      await load();
    } catch (e) {
      alert('Toevoegen aan contacten mislukt: ' + (e?.message || e));
    } finally {
      setBusyId(null);
    }
  };

  const archive = async (lead) => {
    const ok = window.confirm(
      `${lead.full_name || lead.email} archiveren? De lead verdwijnt uit de actieve lijst.`
    );
    if (!ok) return;
    setBusyId(lead.id);
    const { data: updated, error } = await supabase.from('marketing_leads')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', lead.id).eq('status', 'active').select('id');
    if (error) alert('Archiveren mislukt: ' + error.message);
    else if (!updated?.length) alert('Status is intussen veranderd - lijst wordt ververst.');
    await load();
    setBusyId(null);
  };

  const reactivate = async (lead) => {
    setBusyId(lead.id);
    const { data: updated, error } = await supabase.from('marketing_leads')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', lead.id).eq('status', 'archived').select('id');
    if (error) alert('Heractiveren mislukt: ' + error.message);
    else if (!updated?.length) alert('Status is intussen veranderd - lijst wordt ververst.');
    await load();
    setBusyId(null);
  };

  // Telefoonnummer met de hand bijwerken.
  //
  // SCHRIJFT NAAR marketing_leads.phone EN NIET NAAR DE AANMELDING
  //   Het nummer dat de lijst tot nu toe toonde komt uit de payload van de
  //   aanmelding, en dat is het formulier zoals de deelnemer het zelf invulde.
  //   Daar overheen schrijven zou dat formulier vervalsen. Een nummer dat wij
  //   ergens opzoeken hoort dus op de lead zelf.
  //
  // De invoer wordt niet opgeschoond. Een eigen poging tot normaliseren maakt
  // van een buitenlands nummer zo iets onbelbaars; zelfde redenering als
  // telefoonVan() in src/lib/lead-bron.js.
  const zetTelefoon = async (lead, waarde) => {
    const nieuw = String(waarde || '').trim() || null;
    const { data: updated, error } = await supabase.from('marketing_leads')
      .update({ phone: nieuw, updated_at: new Date().toISOString() })
      .eq('id', lead.id).select('id');
    if (error) return { ok: false, msg: error.message };
    if (!updated?.length) return { ok: false, msg: 'Lead niet gevonden, ververs de lijst.' };
    setRows(prev => prev.map(r => (r.id === lead.id ? { ...r, phone: nieuw } : r)));
    return { ok: true };
  };

  // Alleen wie ja zegt hoort in dit blok. De rest is geen lead: 74 mensen hebben
  // niets gedaan en zijn alleen uitgenodigd, en een nee is een antwoord maar geen
  // aanknopingspunt. De aantallen blijven wel in de kop staan, want een lijst van
  // acht zonder noemer zegt niets over hoe de uitvraag loopt.
  // bot_suspected dekt twee dingen: de user-agentcontrole van de site, en een
  // antwoord dat binnen drie minuten na verzenden binnenkwam. Dat laatste bleek
  // bij de eerste verzending elf van de dertien antwoorden te zijn, allemaal
  // van een scanner die ook de bevestigingspagina uitvoert.
  const echt = sessie.filter(r => !r.bot_suspected);
  const sessieJa = echt.filter(r => r.answer === 'yes');
  const sessieNee = echt.filter(r => r.answer === 'no');
  const sessieRuis = sessie.filter(r => r.bot_suspected && r.answer);
  const sessieStil = sessie.filter(r => !r.answer);
  // Geklikt op Ja maar niet bevestigd. Valt anders stilzwijgend onder 'nog geen
  // antwoord', terwijl het een warm signaal kan zijn: iemand die begon en is
  // afgehaakt. Kan ook een scanner zijn, vandaar apart en niet bij de ja's.
  const sessieHalf = echt.filter(r => !r.answer && r.pending_answer === 'yes');

  // Bevestigingen op e-mailadres, zodat ze in de bestaande lijst passen en er
  // geen tweede lijst bij komt. Een inschrijving en een bevestiging zijn immers
  // dezelfde persoon, alleen op twee momenten.
  const bevestigingPerMail = useMemo(() => {
    const m = {};
    for (const r of eventBevestiging) m[String(r.email || '').trim().toLowerCase()] = r;
    return m;
  }, [eventBevestiging]);

  // De leads die door het statusfilter komen, op id. Dit is meteen de filter
  // die maakBlokken gebruikt: een activiteit van een lead die er niet in zit
  // hoort nergens te verschijnen.
  const leadById = useMemo(() => new Map(rows.map(r => [r.id, r])), [rows]);

  // De lijst in blokken. De regels staan in leads-blokken.js, met tests:
  // wie waar hoort is een beslissing met uitzonderingen en die hoort niet in
  // een renderfunctie te verdwijnen.
  const blokken = useMemo(
    () => maakBlokken(activiteiten, leadById), [activiteiten, leadById]);

  // Het antwoord met de hand zetten. Nodig omdat de mail met de knop slecht
  // aankomt: mensen mailen rechtstreeks terug en dat moet vastgelegd kunnen
  // worden. Gaat via een endpoint, want event_confirm_invites staat op RLS
  // zonder policies; de frontend kan er niet in schrijven.
  const [zetBezig, setZetBezig] = useState(null);   // e-mailadres waar we op wachten
  const [zetFout, setZetFout] = useState(null);
  const zetAntwoord = async (email, antwoord) => {
    const sleutel = String(email || '').trim().toLowerCase();

    // Bij 'komt' en 'bevestigd' de vraag of de bevestigingsmail mee moet. Bij
    // 'kan niet' niet: een bevestiging van een stoel klopt dan nooit. Bij het
    // terugzetten naar niets ook niet. Geen tweede 'weet je het zeker': de
    // afweging is al gemaakt voordat deze keuzelijst openging.
    let stuurMail = false;
    if (antwoord === 'yes' || antwoord === 'confirmed') {
      // Staat er al een verzenddatum, dan zegt de vraag dat erbij. Dennis Pekel
      // kreeg de bevestiging vier keer doordat de tab zijn status niet toonde en
      // elke nieuwe poging opnieuw verstuurde; de vraag hoort te laten zien wat
      // er al gebeurd is.
      const al = eventBevestiging.find(
        r => String(r.email || '').trim().toLowerCase() === sleutel)?.confirmation_sent_at;
      // De knoppen van window.confirm heten OK en Annuleren en dat is niet te
      // veranderen. Daarom staat in de TEKST wat elke knop doet: zonder dat
      // leest 'Annuleren' alsof je de hele statuswijziging afbreekt, terwijl
      // alleen de mail wegvalt.
      const uitleg = '\n\nOK = status opslaan en de mail versturen'
        + '\nAnnuleren = alleen de status opslaan, geen mail';
      stuurMail = window.confirm(al
        ? `Let op: de bevestiging is al verstuurd op ${new Date(al).toLocaleString('nl-NL')}.`
          + '\n\nNog een keer versturen vanaf olivier@eclectik.co?' + uitleg
        : 'Bevestigingsmail versturen vanaf olivier@eclectik.co?' + uitleg);
    }

    setZetBezig(sleutel);
    setZetFout(null);
    try {
      const resp = await apiFetch('/api/event-confirm-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sleutel, answer: antwoord, send_mail: stuurMail }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.error) throw new Error(data?.error || `status ${resp.status}`);
      // Pas na een bevestigd antwoord bijwerken. Optimistisch tonen zou een
      // mislukte opslag laten lijken alsof hij gelukt is, en juist hier is dat
      // erg: dan staat er in beeld dat iemand komt terwijl dat nergens vastligt.
      //
      // Een rij die het endpoint NET heeft aangemaakt zit nog niet in deze lijst,
      // want die is bij het laden opgehaald. Zonder de regel hieronder sprong de
      // keuzelijst terug naar 'nog niets' terwijl de keuze wel was opgeslagen, en
      // stuurde elke volgende poging opnieuw een bevestigingsmail.
      setEventBevestiging(rijen => {
        const bekend = rijen.some(r => String(r.email || '').trim().toLowerCase() === sleutel);
        if (!bekend) return data?.rij ? [...rijen, data.rij] : rijen;
        return rijen.map(r => (
        String(r.email || '').trim().toLowerCase() === sleutel
          ? {
            ...r,
            answer: antwoord,
            answered_at: antwoord ? new Date().toISOString() : null,
            answer_count: antwoord ? (r.answer_count || 0) + 1 : r.answer_count,
            answer_source: antwoord ? 'manual' : null,
            confirmation_sent_at: data?.mail?.sent
              ? new Date().toISOString() : r.confirmation_sent_at,
          }
          : r));
      });
    } catch (e) {
      setZetFout(`Opslaan mislukte voor ${sleutel}: ${e.message}`);
    } finally {
      setZetBezig(null);
    }
  };

  // De aanwezigheid bij de user session vastleggen. Gaat via een endpoint, want
  // user_session_invites staat op RLS zonder policies: de tabel draagt per
  // genodigde een token. De frontend leest de view en kan niet schrijven.
  const [aanwezigBezig, setAanwezigBezig] = useState(null); // id waar we op wachten
  const [aanwezigFout, setAanwezigFout] = useState(null);
  const zetAanwezigheid = async (id, waarde) => {
    setAanwezigBezig(id);
    setAanwezigFout(null);
    try {
      const resp = await apiFetch('/api/session-attendance-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, attendance: waarde || null }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.error) throw new Error(data?.error || `status ${resp.status}`);
      // Pas bijwerken na een bevestigde opslag. Optimistisch tonen zou een
      // mislukte schrijfactie laten lijken alsof hij gelukt is, en dan staat er
      // 'aanwezig' in beeld terwijl dat nergens vastligt.
      setSessie(rijen => rijen.map(r => (r.id === id
        ? { ...r, attendance: data?.rij?.attendance ?? null } : r)));
    } catch (e) {
      setAanwezigFout(`Aanwezigheid opslaan mislukte: ${e.message}`);
    } finally {
      setAanwezigBezig(null);
    }
  };

  const th = { textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-dim, #888)', padding: '6px 10px', borderBottom: '0.5px solid var(--sep)' };
  const td = { fontSize: 13, padding: '8px 10px', borderBottom: '0.5px solid var(--sep)', verticalAlign: 'top' };

  return (
    <div>
      {/* Een mislukt opslaan moet je zien. Zonder deze regel zou de keuzelijst
          terugspringen zonder uitleg, en dat leest als een hapering in plaats
          van als een antwoord dat nergens is vastgelegd. */}
      {zetFout && (
        <div style={{
          fontSize: 12, color: '#b91c1c', background: 'rgba(185,28,28,0.08)',
          border: '0.5px solid rgba(185,28,28,0.35)', borderRadius: 6,
          padding: '6px 10px', marginBottom: 12,
        }}>
          {zetFout}{' '}
          <button className="btn-ghost tiny" onClick={() => setZetFout(null)}>sluiten</button>
        </div>
      )}
      {aanwezigFout && (
        <div style={{
          fontSize: 12, color: '#b91c1c', background: 'rgba(185,28,28,0.08)',
          border: '0.5px solid rgba(185,28,28,0.35)', borderRadius: 6,
          padding: '6px 10px', marginBottom: 12,
        }}>
          {aanwezigFout}{' '}
          <button className="btn-ghost tiny" onClick={() => setAanwezigFout(null)}>sluiten</button>
        </div>
      )}

      {/* Reacties op de uitnodiging voor de user session. Bewust een eigen blok
          met een eigen kop: het zijn geen website-aanmeldingen en ze horen niet
          tussen de eventaanmeldingen te verdwijnen. */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Customer session</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {sessieJa.length} ja &middot; {sessieNee.length} nee &middot; {sessieStil.length} nog
            geen antwoord, van {sessie.length} uitgenodigd
            {sessieRuis.length > 0 && (
              <> &middot; <span title="Antwoord binnen drie minuten na verzenden, of de site vermoedde een scanner. Die tellen niet mee."
                style={{ color: 'var(--text-3)' }}>
                {sessieRuis.length} als ruis weggelaten
              </span></>
            )}
            {sessieHalf.length > 0 && (
              <> &middot; <span style={{ color: '#b45309' }}>
                {sessieHalf.length} klikte ja zonder te bevestigen
              </span></>
            )}
          </span>
        </div>
        {sessieJa.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)', border: '0.5px dashed var(--sep)', borderRadius: 6, padding: '10px 12px' }}>
            {sessie.length === 0
              ? 'Nog geen reacties. Ze verschijnen hier zodra iemand op Ja klikt en dat op de landingspagina bevestigt.'
              : `Nog niemand heeft ja gezegd. Van de ${sessie.length} uitgenodigden hebben er ${sessieNee.length} nee gezegd en ${sessieStil.length} nog niet gereageerd.`}
          </div>
        ) : (
          <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--fill-1)' }}>
                <tr>
                  {['Naam', 'E-mail', 'Bedrijf', 'Aanwezigheid', 'Opmerking', 'Aangemeld door', 'Wanneer'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessieJa.map(r => {
                  return (
                    <tr key={r.id}>
                      <td style={td}>
                        {r.first_name || '-'}
                        {r.bot_suspected && (
                          <span title="De site vermoedde een scanner in plaats van een mens"
                            style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px', borderRadius: 3, border: '0.5px solid var(--sep)', color: '#b45309' }}>
                            bot?
                          </span>
                        )}
                      </td>
                      <td style={td}>{r.email}</td>
                      <td style={td}>{r.company || '-'}</td>
                      <td style={td}>
                        <AanwezigheidKeuze rij={r} onZet={zetAanwezigheid}
                          bezig={aanwezigBezig === r.id} />
                      </td>
                      <td style={{ ...td, maxWidth: 260 }}>{r.note || '-'}</td>
                      {/* Wie de aanmelding deed. 'zelf' is de klant via de link in
                          de uitnodiging; bij een interne aanmelding staat er het
                          adres van de collega die hem via /s/intern opgaf. */}
                      <td style={{ ...td, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                        {r.source === 'internal'
                          ? (r.registered_by || 'collega')
                          : 'zelf'}
                      </td>
                      <td style={{ ...td, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                        {r.submitted_at ? fmtRelative(r.submitted_at) : (r.pending_at ? fmtRelative(r.pending_at) : '-')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Het statusfilter hoort één keer bovenaan en werkt over alle blokken.
          Per blok een eigen stel knoppen zou vier keer dezelfde vraag stellen
          en de blokken uit de pas kunnen laten lopen. */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {STATUS_FILTERS.map(s => (
          <button key={s}
            className={statusFilter === s ? 'btn-primary tiny' : 'btn-ghost tiny'}
            onClick={() => setStatusFilter(s)}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim, #888)' }}>Laden…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim, #888)' }}>
          Geen marketing leads{statusFilter !== 'all' ? ` met status "${statusFilter}"` : ''}.
        </div>
      ) : blokken.map(blok => (
        <AanmeldingenBlok key={blok.sleutel} blok={blok} statusFilter={statusFilter}
          leadById={leadById}
          bronPerLead={bronPerLead} viaPerLead={viaPerLead} telPerLead={telPerLead}
          campagnesPerAanmelding={campagnesPerAanmelding}
          bevestigingPerMail={bevestigingPerMail}
          onZetTelefoon={zetTelefoon} onZetAntwoord={zetAntwoord} zetBezig={zetBezig}
          onVoegContactToe={voegContactToe}
          expanded={expanded} activity={activity} busyId={busyId}
          onToggle={toggleExpand} onPromote={promote} onArchive={archive}
          onReactivate={reactivate}
          th={th} td={td}
        />
      ))}
    </div>
  );
}

// Eén blok: een kop met het aantal aanmeldingen en daaronder de tabel.
//
// DE KOP TELT AANMELDINGEN EN GEEN MENSEN
//   De blokken zijn op activiteit gegroepeerd, dus iemand die zich voor twee
//   events aanmeldt telt in allebei mee. 'leads' zou dan een optelsom
//   suggereren die niet klopt.
function AanmeldingenBlok({
  blok, statusFilter, leadById, bronPerLead, viaPerLead, telPerLead,
  campagnesPerAanmelding, bevestigingPerMail, onZetTelefoon, onZetAntwoord, zetBezig,
  expanded, activity, busyId, onToggle, onPromote, onArchive, onReactivate,
  onVoegContactToe, th, td,
}) {
  // De campagnechip hoort bij de eventtabellen. Bij een afspraak uit outreach
  // staat de campagne al in de kolom Aanmelding, en bij waitlist en scorecard
  // is er geen aanmelding om aan te koppelen.
  const toonCampagne = blok.soort === BLOK_EVENT;
  const kolommen = ['Naam', 'E-mail', 'Bedrijf', 'Rol', 'Telefoon', 'Zegt via',
    ...(toonCampagne ? ['Uit campagne'] : []),
    'Aanmelding', 'Laatste activiteit', 'Status', ''];

  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{blok.titel}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {blok.rijen.length}{' '}
          {(blok.eenheid || ['aanmelding', 'aanmeldingen'])[blok.rijen.length === 1 ? 0 : 1]}
        </span>
      </div>

      {blok.rijen.length === 0 ? (
        <div style={{
          fontSize: 12, color: 'var(--text-3)', border: '0.5px dashed var(--sep)',
          borderRadius: 6, padding: '10px 12px',
        }}>
          Nog geen {(blok.eenheid || ['aanmelding', 'aanmeldingen'])[1]}
          {statusFilter !== 'all' ? ` met status "${statusFilter}"` : ''}.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {kolommen.map((h, i) => <th key={`${h}-${i}`} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {blok.rijen.map(a => {
              const lead = leadById.get(a.marketing_lead_id);
              if (!lead) return null;
              const sleutel = String(lead.email || '').trim().toLowerCase();
              return (
                <LeadRow key={a.id} lead={lead} aanmelding={a}
                  // Het bronlabel komt uit DEZE aanmelding en niet uit de
                  // nieuwste van de lead: in het Amsterdam-blok hoort de
                  // Amsterdam-datum te staan, ook als iemand zich daarna voor
                  // Zürich aanmeldde.
                  // In een eventblok staat de datum al in de kop, dus een
                  // label 'Event 17 nov' op elke rij herhaalt alleen wat je
                  // net gelezen hebt. Alleen als een aanmelding op een ANDERE
                  // datum staat zegt het nog iets, en dan valt hij op tussen
                  // de rijen die niets tonen. Buiten de eventblokken blijft
                  // het label staan: daar zegt geen kop waar iemand vandaan
                  // komt.
                  bron={blok.soort === BLOK_EVENT && datumIsActueel(blok.slug, a.payload)
                    ? null
                    : (a.event === 'event_registered' || a.event === 'outreach_meeting'
                      ? bronLabel(a.event, a.payload)
                      : (lead.first_src || bronPerLead[lead.id] || null))}
                  // Staat er wel een label in een eventblok, dan klopt de
                  // datum dus niet. Oranje, want dat is precies het geval dat
                  // je wilt zien.
                  datumWijktAf={blok.soort === BLOK_EVENT}
                  via={gekomenVia(a.payload) || viaPerLead[lead.id] || null}
                  campagnes={toonCampagne ? (campagnesPerAanmelding.get(a.id) || []) : null}
                  // De status uit de outreachcampagne. Bij meerdere campagnes
                  // tonen we ze allemaal: iemand kan in de mailcampagne al
                  // geantwoord hebben en op LinkedIn nog klaarstaan.
                  // In een eventblok staat de status al bij de campagnechip,
                  // dus daar niet nog een keer. In de andere blokken is er
                  // geen campagnekolom en hoort hij hier.
                  outreachStatussen={toonCampagne ? [] : (campagnesPerAanmelding.get(a.id) || [])}
                  kolomAantal={kolommen.length}
                  telefoon={lead.phone || telefoonVan(a.payload) || telPerLead[lead.id] || null}
                  onZetTelefoon={onZetTelefoon}
                  bevestiging={bevestigingPerMail[sleutel] || null}
                  onZetAntwoord={onZetAntwoord}
                  zetBezig={zetBezig === sleutel}
                  expanded={expanded === lead.id}
                  activityRows={activity[lead.id]}
                  busy={busyId === lead.id}
                  onToggle={() => onToggle(lead)}
                  onPromote={() => onPromote(lead)}
                  onArchive={() => onArchive(lead)}
                  onReactivate={() => onReactivate(lead)}
                  onVoegContactToe={() => onVoegContactToe(lead)}
                  td={td}
                />
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// De campagnes waar een aanmelding uit lijkt te komen.
//
// EEN VRAAGTEKEN IS GEEN VERSIERING
//   Koppeling op e-mailadres is zeker, op naam waarschijnlijk. Dat onderscheid
//   komt uit matchAanmeldingCampagnes en moet zichtbaar blijven, anders leest
//   een gok als een feit. Geen campagne is een streepje: dat is de organische
//   stroom, en die telt net zo goed.
function CampagneChips({ campagnes }) {
  if (!campagnes?.length) {
    return <span style={{ color: 'var(--text-3)' }} title="Geen koppeling met een outreachcampagne gevonden; deze aanmelding kwam organisch binnen">-</span>;
  }
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
      {campagnes.map(c => {
        // Naam en status in ÉÉN chip. Ze stonden in twee kolommen: 'Amsterdam
        // 2026' hier en 'bericht 2' bij de aanmelding, terwijl het één feit is
        // en je ze zelf moest koppelen. Bij twee campagnes werd dat raden welk
        // bericht bij welke campagne hoorde.
        const { tekst, kleur, isUitkomst } = weergaveVanProspect(c);
        return (
          <span key={c.campaignId} className="chip" style={{ fontSize: 11 }}
            title={[
              c.method === 'email'
                ? 'Gekoppeld op e-mailadres'
                : 'Gekoppeld op naam, niet op adres. Waarschijnlijk dezelfde persoon, zeker is het niet.',
              isUitkomst ? 'Met de hand vastgelegde uitkomst' : null,
            ].filter(Boolean).join(' | ')}>
            {c.campaign || 'campagne'}{c.method === 'naam' ? '?' : ''}
            {tekst ? (
              <>
                <span style={{ color: 'var(--text-3)' }}> · </span>
                <span style={{ color: kleur, fontWeight: 500 }}>{tekst}</span>
              </>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

// De cel Telefoon: tonen, bellen en met de hand wijzigen.
//
// KLIKKEN OP HET NUMMER BELT, KLIKKEN ERNAAST BEWERKT
//   Het nummer blijft een belkoppeling, want deze lijst wordt ook vanaf een
//   telefoon gebruikt. Zou de hele cel het invoerveld openen, dan kon je niet
//   meer bellen. De koppeling houdt de klik dus bij zich; de rest van de cel
//   opent het invoerveld. Een lege cel heeft geen koppeling en opent overal.
function TelefoonCel({ lead, telefoon, onZet, td }) {
  const [bewerkt, setBewerkt] = useState(false);
  const [waarde, setWaarde] = useState('');
  const [bezig, setBezig] = useState(false);

  const open = () => { setWaarde(telefoon || ''); setBewerkt(true); };

  const bewaar = async () => {
    if (bezig) return;
    const nieuw = waarde.trim();
    // Niets veranderd: sluiten zonder schrijfactie. Scheelt een rondje naar de
    // database bij een klik die per ongeluk het veld opende.
    if (nieuw === String(telefoon || '')) { setBewerkt(false); return; }
    setBezig(true);
    const res = await onZet(lead, nieuw);
    setBezig(false);
    if (!res?.ok) { alert('Opslaan mislukt: ' + (res?.msg || 'onbekende fout')); return; }
    setBewerkt(false);
  };

  if (bewerkt) {
    return (
      <td style={{ ...td, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          value={waarde}
          disabled={bezig}
          onChange={e => setWaarde(e.target.value)}
          onBlur={bewaar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); bewaar(); }
            // Escape annuleert, dus het veld sluit zonder te schrijven. De blur
            // die daarop volgt mag niet alsnog bewaren, vandaar eerst sluiten.
            if (e.key === 'Escape') { e.preventDefault(); setBewerkt(false); }
          }}
          placeholder="+31 6 ..."
          style={{ width: 130, fontSize: 12, padding: '2px 4px' }}
        />
      </td>
    );
  }

  return (
    <td style={{ ...td, whiteSpace: 'nowrap', cursor: 'text' }}
      title="Klik naast het nummer om het te wijzigen"
      onClick={(e) => { e.stopPropagation(); open(); }}>
      {telefoon
        ? (telHref(telefoon)
          ? <a href={telHref(telefoon)} style={{ color: 'var(--text-1)' }}
            onClick={e => e.stopPropagation()}>{telefoon}</a>
          : telefoon)
        : <span style={{ color: 'var(--text-3)' }}>+ nummer</span>}
    </td>
  );
}

// Vastleggen of iemand naar het event komt.
//
// EEN KEUZELIJST EN GEEN LABEL
//   De mail met de knop komt slecht aan, dus mensen mailen rechtstreeks terug
//   en dat moet hier met de hand vastgelegd kunnen worden.
//
//   De keuzelijst staat er ALTIJD, ook zonder uitnodigingsrij. Die stond
//   vroeger alleen bij wie een uitnodiging had, en daardoor ontbrak hij juist
//   bij wie zich net via de site had aangemeld. Het endpoint maakt de rij aan
//   zodra je kiest.
function BevestigingKeuze({ lead, bevestiging, onZetAntwoord, zetBezig }) {
  return (
    <>
      <select
        value={bevestiging?.answer || ''}
        disabled={zetBezig}
        onClick={e => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          onZetAntwoord(bevestiging?.email || lead.email, e.target.value || null);
        }}
        title={[
          bevestiging?.answer_source === 'manual'
            ? `Met de hand gezet${bevestiging.answer_by ? ` door ${bevestiging.answer_by}` : ''}`
            : bevestiging?.answer
              ? 'De deelnemer klikte zelf op de bevestigingspagina'
              : 'Nog geen antwoord',
          bevestiging?.confirmation_sent_at
            ? `Bevestigingsmail verstuurd op ${new Date(bevestiging.confirmation_sent_at).toLocaleString('nl-NL')}`
            : 'Nog geen bevestigingsmail verstuurd',
        ].join(' | ')}
        style={{
          marginLeft: 6, fontSize: 11, fontFamily: 'inherit', padding: '1px 4px',
          borderRadius: 4, border: '0.5px solid var(--sep)', cursor: 'pointer',
          background: 'var(--bg-1)', opacity: zetBezig ? 0.5 : 1,
          fontWeight: bevestiging?.answer ? 500 : 400,
          color: bevestiging?.answer === 'confirmed' ? '#15803d'
            : bevestiging?.answer === 'yes' ? '#15803d'
              : bevestiging?.answer === 'no' ? '#b91c1c' : 'var(--text-3)',
        }}>
        <option value="">nog niets</option>
        <option value="yes">komt</option>
        <option value="confirmed">bevestigd</option>
        <option value="no">kan niet</option>
      </select>
      {/* Een envelopje zodra de bevestiging echt weg is. Zonder dit zie je aan
          'bevestigd' niet of de mail ook gestuurd is, en dat is precies waar je
          bij twijfel naar zoekt. */}
      {bevestiging?.confirmation_sent_at && (
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}
          title={`Bevestigingsmail verstuurd op ${new Date(bevestiging.confirmation_sent_at).toLocaleString('nl-NL')}`}>
          ✉
        </span>
      )}
      {bevestiging?.answer_count > 1 && (
        <span title={`${bevestiging.answer_count} keer geantwoord, dit is het laatste`}
          style={{ fontSize: 9, color: '#b45309' }}>gewijzigd</span>
      )}
    </>
  );
}

// Aanwezigheid bij de user session: aangemeld, aanwezig of afwezig.
//
// AANGEMELD IS DE LEGE WAARDE
//   Iedereen in dit blok heeft ja gezegd, dus elke rij begint op aangemeld. Een
//   lege keuzelijst met 'nog niets' zou een vraag stellen die al beantwoord is.
//   Terugzetten naar aangemeld maakt de kolom weer leeg; zie
//   api/_lib/session-attendance-lib.js.
function AanwezigheidKeuze({ rij, onZet, bezig }) {
  const waarde = rij.attendance || 'aangemeld';
  return (
    <select
      value={waarde}
      disabled={bezig}
      onChange={e => onZet(rij.id, e.target.value)}
      title={rij.attendance_at
        ? `Vastgelegd op ${new Date(rij.attendance_at).toLocaleString('nl-NL')}`
          + (rij.attendance_by ? ` door ${rij.attendance_by}` : '')
        : 'Aangemeld, nog niets waargenomen'}
      style={{
        fontSize: 11, fontFamily: 'inherit', padding: '1px 4px',
        borderRadius: 4, border: '0.5px solid var(--sep)', cursor: 'pointer',
        background: 'var(--bg-1)', opacity: bezig ? 0.5 : 1,
        fontWeight: rij.attendance ? 500 : 400,
        color: rij.attendance === 'aanwezig' ? '#15803d'
          : rij.attendance === 'afwezig' ? '#b91c1c' : 'var(--text-3)',
      }}>
      <option value="aangemeld">aangemeld</option>
      <option value="aanwezig">aanwezig</option>
      <option value="afwezig">afwezig</option>
    </select>
  );
}

// De status van deze persoon in de outreachcampagnes waar hij in zit.
//
// ALLE CAMPAGNES, NIET EEN
//   Iemand kan in de mailcampagne al geantwoord hebben en op LinkedIn nog
//   klaarstaan. Eén status tonen zou de verkeerde kunnen zijn, en juist het
//   verschil tussen die twee is de informatie.
//
//   Geen campagne betekent niet 'geen status' maar 'niet benaderd': deze
//   persoon kwam organisch binnen. Dat is een antwoord, dus zeggen we het.
function OutreachStatusChips({ statussen }) {
  // Zit iemand in geen enkele campagne, dan staat er niets. 'Niet benaderd'
  // stond eerst op bijna elke rij, want de meeste aanmelders komen organisch
  // binnen, en dan is het geen informatie maar ruis. Een lege cel zegt
  // hetzelfde zonder de lijst vol te zetten.
  if (!statussen?.length) return null;
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, marginLeft: 6 }}>
      {statussen.map(c => {
        // De uitkomst wint van de status: wie op afspraak staat hoeft niet te
        // lezen dat hij ook geantwoord heeft.
        const { tekst, kleur, isUitkomst } = weergaveVanProspect(c);
        if (!tekst) return null;
        return (
          <span key={c.campaignId} className="chip"
            style={{ fontSize: 11, color: kleur, fontWeight: 500 }}
            title={`${c.campaign || 'campagne'}: ${tekst}${isUitkomst
              ? ' (met de hand vastgelegde uitkomst)' : ''}${c.method === 'naam'
              ? '. Gekoppeld op naam, niet op adres, dus waarschijnlijk maar niet zeker dezelfde persoon.'
              : ''}`}>
            {tekst}{c.method === 'naam' ? '?' : ''}
          </span>
        );
      })}
    </span>
  );
}

function LeadRow({ lead, bron, datumWijktAf, via, campagnes, outreachStatussen, kolomAantal, telefoon, onZetTelefoon, bevestiging, onZetAntwoord, zetBezig, expanded, activityRows, busy, onToggle, onPromote, onArchive, onReactivate, onVoegContactToe, td }) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td style={td}>{lead.full_name || '-'}</td>
        <td style={td}>{lead.email}</td>
        <td style={td}>{lead.company || '-'}</td>
        <td style={td}>{lead.role || '-'}</td>
        {/* Telefoon: uit de aanmelding, of het nummer dat hier met de hand is
            ingevuld. Als belkoppeling, want deze lijst wordt ook vanaf een
            telefoon gebruikt. */}
        <TelefoonCel lead={lead} telefoon={telefoon} onZet={onZetTelefoon} td={td} />
        {/* 'Zegt via' is wat de deelnemer zelf opgaf over hoe hij bij ons
            terecht is gekomen (Eclectik, Zoom/Workvivo, Other), niet wie de
            uitnodiging verstuurde. Let op het verschil met 'Uit campagne'
            hiernaast: dat is wat wij weten, dit is wat hij zegt. */}
        <td style={td}>
          {via
            ? <span className="chip" style={{ fontSize: 11 }}>{via}</span>
            : '-'}
        </td>
        {campagnes && <td style={td}><CampagneChips campagnes={campagnes} /></td>}
        <td style={td}>
          {/* In een eventblok staat hier alleen iets als de aanmelding op een
              andere datum staat dan het event nu, en dan oranje: dat is het
              geval dat je moet zien. Buiten de eventblokken is het gewoon het
              bronlabel. Geen streepje als er niets is: de kop zegt het al. */}
          {bron ? (
            <span className="chip" style={datumWijktAf
              ? { fontSize: 11, color: '#b45309', background: 'rgba(180,83,9,0.13)', fontWeight: 500 }
              : { fontSize: 11 }}
              title={datumWijktAf
                ? 'Deze aanmelding staat op een andere datum dan waarop het event nu gepland staat'
                : undefined}>{bron}</span>
          ) : null}
          {/* Komt deze persoon naar het event? Lezen en wijzigen op dezelfde
              plek: dit is de kolom waar je ernaar kijkt, dus een klik extra om
              het te kunnen zetten is er een te veel. De outreachstatus staat
              bij de campagnechip, dus hier botsen ze niet meer. */}
          <BevestigingKeuze lead={lead} bevestiging={bevestiging}
            onZetAntwoord={onZetAntwoord} zetBezig={zetBezig} />
          {/* De status uit de outreachcampagne. */}
          <OutreachStatusChips statussen={outreachStatussen} />
        </td>
        <td style={td}>{lead.last_activity_at ? fmtRelative(lead.last_activity_at) : '-'}</td>
        <td style={td}><span className="chip" style={{ fontSize: 11 }}>{lead.status}</span></td>
        <td style={{ ...td, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
          {lead.status === 'active' && (
            <>
              <button className="btn-primary tiny" disabled={busy} onClick={onPromote}>
                Add to funnel
              </button>{' '}
              {/* Toevoegen aan de contacten maakt GEEN sales lead. Staat het
                  contact er al, dan is de knop een merkteken en niet opnieuw
                  een knop: twee keer klikken zou een dubbel contact opleveren,
                  en dat is precies wat deze knop moet voorkomen. */}
              {lead.contact_id ? (
                <span className="chip" style={{ fontSize: 11, color: 'var(--text-3)' }}
                  title="Deze persoon staat in de contactendatabase">
                  toegevoegd aan BD
                </span>
              ) : (
                <button className="btn-warn tiny" disabled={busy} onClick={onVoegContactToe}
                  title="Zet deze persoon in de contactendatabase, zonder een sales lead aan te maken">
                  Add to BD
                </button>
              )}{' '}
              <button className="btn-ghost tiny" disabled={busy} onClick={onArchive}>
                Archiveer
              </button>
            </>
          )}
          {lead.status === 'archived' && (
            <button className="btn-ghost tiny" disabled={busy} onClick={onReactivate}>
              Heractiveer
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td style={{ ...td, background: 'var(--bg-subtle, rgba(0,0,0,0.03))' }} colSpan={kolomAantal}>
            {!activityRows ? 'Laden…' : activityRows.length === 0 ? 'Geen activiteit.' : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {activityRows.map(a => (
                  <div key={a.id} style={{ fontSize: 12 }}>
                    <b>{a.event}</b>
                    {' · '}{new Date(a.occurred_at).toLocaleString('nl-NL')}
                    {a.src ? <> {' · bron: '}{a.src}</> : null}
                    {' · '}<PayloadLines payload={a.payload} />
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
