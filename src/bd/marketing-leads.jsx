// Marketing → Leads: website-aanmeldingen (marketing_leads tabel).
// Losstaand van de sales-funnel; "Promoveer" maakt pas een leads-rij aan.
// Data wordt hier zelf opgehaald (zoals MarketingCampaigns) — geen props
// vanuit BDApp nodig.
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { bronLabel, gekomenVia } from '../lib/lead-bron';
import { fmtRelative } from './atoms';

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

    // Bron per lead uit de activiteit. Een lead heeft er meestal een.
    const ids = (data || []).map(r => r.id);
    if (ids.length) {
      const { data: acts } = await supabase.from('marketing_lead_activity')
        .select('marketing_lead_id, event, payload').in('marketing_lead_id', ids);
      const m = {};
      const u = {};
      for (const a of acts || []) {
        if (!m[a.marketing_lead_id]) m[a.marketing_lead_id] = bronLabel(a.event, a.payload);
        if (!u[a.marketing_lead_id]) u[a.marketing_lead_id] = gekomenVia(a.payload);
      }
      if (seq === loadSeq.current) { setBronPerLead(m); setViaPerLead(u); }
    } else if (seq === loadSeq.current) {
      setBronPerLead({});
      setViaPerLead({});
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
      `${lead.full_name || lead.email} promoveren naar sales lead?\n` +
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

  const evJa = eventBevestiging.filter(r => r.answer === 'yes');
  const evNee = eventBevestiging.filter(r => r.answer === 'no');
  const evStil = eventBevestiging.filter(r => !r.answer);
  // Wie zich bedacht heeft. Het laatste antwoord telt, maar dat iemand geschoven
  // is wil je zien: dat is vaak het moment om even te bellen.
  const evGeschoven = eventBevestiging.filter(r => (r.answer_count || 0) > 1);

  const th = { textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-dim, #888)', padding: '6px 10px', borderBottom: '0.5px solid var(--sep)' };
  const td = { fontSize: 13, padding: '8px 10px', borderBottom: '0.5px solid var(--sep)', verticalAlign: 'top' };

  return (
    <div>
      {/* Bevestigingen voor het event. Eigen blok bovenaan: dit is op dit moment
          de vraag waar het om draait, namelijk wie er daadwerkelijk komt. */}
      {eventBevestiging.length > 0 && (
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Event Amsterdam</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {evJa.length} komt &middot; {evNee.length} kan niet &middot; {evStil.length} nog
            geen antwoord, van {eventBevestiging.length} gevraagd
            {evGeschoven.length > 0 && (
              <> &middot; <span title="Heeft het antwoord later gewijzigd. Het laatste antwoord telt."
                style={{ color: '#b45309' }}>{evGeschoven.length} bedacht zich</span></>
            )}
          </span>
        </div>
        <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--fill-1)' }}>
              <tr>
                {['Naam', 'E-mail', 'Antwoord', 'Wanneer'].map(h => (<th key={h} style={th}>{h}</th>))}
              </tr>
            </thead>
            <tbody>
              {eventBevestiging.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.first_name || '-'}</td>
                  <td style={td}>{r.email}</td>
                  <td style={td}>
                    {/* Grijs voor wie nog niets zei: dat is geen uitkomst maar
                        een lege plek, en die hoort niet de aandacht te trekken. */}
                    <span style={{
                      fontWeight: r.answer ? 500 : 400,
                      color: r.answer === 'yes' ? '#15803d' : r.answer === 'no' ? '#b91c1c' : 'var(--text-3)',
                    }}>
                      {r.answer === 'yes' ? 'komt' : r.answer === 'no' ? 'kan niet' : 'nog niets'}
                    </span>
                    {(r.answer_count || 0) > 1 && (
                      <span title={`${r.answer_count} keer geantwoord, dit is het laatste`}
                        style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px', borderRadius: 3, border: '0.5px solid var(--sep)', color: '#b45309' }}>
                        gewijzigd
                      </span>
                    )}
                  </td>
                  <td style={{ ...td, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {r.answered_at ? fmtRelative(r.answered_at) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                  {['Naam', 'E-mail', 'Bedrijf', 'Voorkeursdata', 'Opmerking', 'Aangemeld door', 'Wanneer'].map(h => (
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
                        {(r.slots || []).length
                          ? (r.slots || []).map(sl => String(sl).replace('slot-', '')).join(', ')
                          : '-'}
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

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Website-aanmeldingen</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
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
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Naam</th><th style={th}>E-mail</th><th style={th}>Bedrijf</th>
              <th style={th}>Rol</th><th style={th}>Bron</th><th style={th}>Aanmelding</th>
              <th style={th}>Laatste activiteit</th><th style={th}>Status</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(lead => (
              <LeadRow key={lead.id} lead={lead}
                bron={lead.first_src || bronPerLead[lead.id] || null}
                via={viaPerLead[lead.id] || null}
                expanded={expanded === lead.id}
                activityRows={activity[lead.id]}
                busy={busyId === lead.id}
                onToggle={() => toggleExpand(lead)}
                onPromote={() => promote(lead)}
                onArchive={() => archive(lead)}
                onReactivate={() => reactivate(lead)}
                td={td}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function LeadRow({ lead, bron, via, expanded, activityRows, busy, onToggle, onPromote, onArchive, onReactivate, td }) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td style={td}>{lead.full_name || '-'}</td>
        <td style={td}>{lead.email}</td>
        <td style={td}>{lead.company || '-'}</td>
        <td style={td}>{lead.role || '-'}</td>
        {/* Bron is wat de deelnemer zelf opgeeft over hoe hij bij ons terecht
            is gekomen, niet wie de uitnodiging verstuurde. Hier stond sector,
            en die was bij de eventaanmeldingen niet eens gevuld. */}
        <td style={td}>
          {via
            ? <span className="chip" style={{ fontSize: 11 }}>{via}</span>
            : '-'}
        </td>
        <td style={td}>
          {bron
            ? <span className="chip" style={{ fontSize: 11 }}>{bron}</span>
            : '-'}
        </td>
        <td style={td}>{lead.last_activity_at ? fmtRelative(lead.last_activity_at) : '-'}</td>
        <td style={td}><span className="chip" style={{ fontSize: 11 }}>{lead.status}</span></td>
        <td style={{ ...td, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
          {lead.status === 'active' && (
            <>
              <button className="btn-primary tiny" disabled={busy} onClick={onPromote}>
                Promoveer
              </button>{' '}
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
          <td style={{ ...td, background: 'var(--bg-subtle, rgba(0,0,0,0.03))' }} colSpan={9}>
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
