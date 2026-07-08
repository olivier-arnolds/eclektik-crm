// Marketing → Leads: website-aanmeldingen (marketing_leads tabel).
// Losstaand van de sales-funnel; "Promoveer" maakt pas een leads-rij aan.
// Data wordt hier zelf opgehaald (zoals MarketingCampaigns) — geen props
// vanuit BDApp nodig.
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { fmtRelative } from './atoms';

const STATUS_FILTERS = ['active', 'converted', 'archived', 'all'];

// auth-e-mail → OWNERS-id voor de owner op de gepromoveerde sales lead.
function ownerFromEmail(email) {
  const map = { olivier: 'OA', marco: 'MVG', yarmilla: 'YK' };
  return map[String(email || '').split('@')[0].toLowerCase()] || null;
}

function PayloadLines({ payload }) {
  const entries = Object.entries(payload || {});
  if (!entries.length) return <span style={{ color: 'var(--text-dim, #888)' }}>—</span>;
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
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('marketing_leads').select('*')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data, error } = await q;
    if (error) alert('Laden mislukt: ' + error.message);
    setRows(data || []);
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
        source: 'Website — marketing lead',
        status: 'New',
        owner: ownerFromEmail(auth?.user?.email),
        notes,
      }).select('id').single();
      if (insErr) throw insErr;

      const { error: updErr } = await supabase.from('marketing_leads')
        .update({ status: 'converted', converted_lead_id: created.id, updated_at: new Date().toISOString() })
        .eq('id', lead.id);
      if (updErr) throw updErr;
      await load();
    } catch (e) {
      alert('Promoveren mislukt: ' + (e?.message || e));
    } finally {
      setBusyId(null);
    }
  };

  const archive = async (lead) => {
    setBusyId(lead.id);
    const { error } = await supabase.from('marketing_leads')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', lead.id);
    if (error) alert('Archiveren mislukt: ' + error.message);
    await load();
    setBusyId(null);
  };

  const th = { textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-dim, #888)', padding: '6px 10px', borderBottom: '0.5px solid var(--sep)' };
  const td = { fontSize: 13, padding: '8px 10px', borderBottom: '0.5px solid var(--sep)', verticalAlign: 'top' };

  return (
    <div>
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
                expanded={expanded === lead.id}
                activityRows={activity[lead.id]}
                busy={busyId === lead.id}
                onToggle={() => toggleExpand(lead)}
                onPromote={() => promote(lead)}
                onArchive={() => archive(lead)}
                td={td}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function LeadRow({ lead, expanded, activityRows, busy, onToggle, onPromote, onArchive, td }) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td style={td}>{lead.full_name || '—'}</td>
        <td style={td}>{lead.email}</td>
        <td style={td}>{lead.company || '—'}</td>
        <td style={td}>{lead.role || '—'}</td>
        <td style={td}>{lead.sector || '—'}</td>
        <td style={td}>{lead.first_src || '—'}</td>
        <td style={td}>{lead.last_activity_at ? fmtRelative(lead.last_activity_at) : '—'}</td>
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
