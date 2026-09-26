// Marketing → Leads: website-aanmeldingen (marketing_leads tabel).
// Losstaand van de sales-funnel; "Promoveer" maakt pas een leads-rij aan.
// Data wordt hier zelf opgehaald (zoals MarketingCampaigns) — geen props
// vanuit BDApp nodig.
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { fmtRelative } from './atoms';

const STATUS_FILTERS = ['active', 'converted', 'archived', 'all'];

// Leesbare bron per soort activiteit. first_src is bij de aanmeldingen voor
// 6 oktober niet gevuld, dus zonder deze vertaling toont de kolom Bron enkel
// streepjes terwijl we wel weten waar iemand vandaan komt.
const BRON_LABEL = {
  event_registered: 'Event 6 okt',
};

// Antwoord op de uitnodiging voor de user session. Geklikt maar niet bevestigd
// is bewust een eigen stand: de klik zet alleen pending_answer, en pas de
// landingspagina maakt er een antwoord van. Zo kan een linkscanner van Outlook
// of Mimecast nooit namens iemand ja zeggen.
function sessieAntwoord(r) {
  if (r?.answer === 'yes') return { tekst: 'Ja', kleur: '#16a34a', vet: true };
  if (r?.answer === 'no') return { tekst: 'Nee', kleur: '#6b7280', vet: false };
  if (r?.pending_answer) return { tekst: `${r.pending_answer === 'yes' ? 'Ja' : 'Nee'} geklikt, niet bevestigd`, kleur: '#b45309', vet: false };
  return { tekst: 'nog niets', kleur: 'var(--text-3)', vet: false };
}

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
  // lead-id -> bron, afgeleid uit de activiteit. first_src is bij de
  // aanmeldingen voor 6 oktober leeg, dus zonder dit toont de kolom Bron
  // alleen streepjes terwijl we wel degelijk weten waar ze vandaan komen.
  const [bronPerLead, setBronPerLead] = useState({});
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
        .select('marketing_lead_id, event').in('marketing_lead_id', ids);
      const m = {};
      for (const a of acts || []) if (!m[a.marketing_lead_id]) m[a.marketing_lead_id] = a.event;
      if (seq === loadSeq.current) setBronPerLead(m);
    } else if (seq === loadSeq.current) {
      setBronPerLead({});
    }

    const { data: ses } = await supabase.from('user_session_results')
      .select('*').order('submitted_at', { ascending: false, nullsFirst: false });
    if (seq === loadSeq.current) setSessie(ses || []);

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

  const th = { textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-dim, #888)', padding: '6px 10px', borderBottom: '0.5px solid var(--sep)' };
  const td = { fontSize: 13, padding: '8px 10px', borderBottom: '0.5px solid var(--sep)', verticalAlign: 'top' };

  return (
    <div>
      {/* Reacties op de uitnodiging voor de user session. Bewust een eigen blok
          met een eigen kop: het zijn geen website-aanmeldingen en ze horen niet
          tussen de leads van 6 oktober te verdwijnen. */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Customer session</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            reacties op de uitnodiging, {sessie.filter(r => r.answer === 'yes').length} van
            de {sessie.length} zeggen ja
          </span>
        </div>
        {sessie.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-3)', border: '0.5px dashed var(--sep)', borderRadius: 6, padding: '10px 12px' }}>
            Nog geen reacties. Ze verschijnen hier zodra iemand op Ja of Nee klikt en dat op de
            landingspagina bevestigt.
          </div>
        ) : (
          <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--fill-1)' }}>
                <tr>
                  {['Naam', 'E-mail', 'Bedrijf', 'Antwoord', 'Voorkeursdata', 'Opmerking', 'Wanneer'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessie.map(r => {
                  const a = sessieAntwoord(r);
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
                      <td style={{ ...td, color: a.kleur, fontWeight: a.vet ? 600 : 400, whiteSpace: 'nowrap' }}>
                        {a.tekst}
                      </td>
                      <td style={td}>
                        {(r.slots || []).length
                          ? (r.slots || []).map(sl => String(sl).replace('slot-', '')).join(', ')
                          : '-'}
                      </td>
                      <td style={{ ...td, maxWidth: 260 }}>{r.note || '-'}</td>
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
              <th style={th}>Rol</th><th style={th}>Sector</th><th style={th}>Bron</th>
              <th style={th}>Laatste activiteit</th><th style={th}>Status</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(lead => (
              <LeadRow key={lead.id} lead={lead}
                bron={lead.first_src || BRON_LABEL[bronPerLead[lead.id]] || bronPerLead[lead.id] || null}
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

function LeadRow({ lead, bron, expanded, activityRows, busy, onToggle, onPromote, onArchive, onReactivate, td }) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td style={td}>{lead.full_name || '-'}</td>
        <td style={td}>{lead.email}</td>
        <td style={td}>{lead.company || '-'}</td>
        <td style={td}>{lead.role || '-'}</td>
        <td style={td}>{lead.sector || '-'}</td>
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
