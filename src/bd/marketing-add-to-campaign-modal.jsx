import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';

// "Add to campaign": een CRM-contact alsnog in een lopende outreachcampagne
// zetten, zodat die persoon de uitnodiging alsnog krijgt.
//
// WAAROM DIT NODIG IS
//   Bij een bounce blijkt vaak dat iemand ergens weg is. Soms is die persoon bij
//   het nieuwe bedrijf juist interessant. Dan maak je een account aan, zoekt het
//   nieuwe adres op, en wil je diegene alsnog de mail sturen. Zonder dit scherm
//   kan dat alleen via een nieuwe import, en dat is te zwaar voor een persoon.
//
// DE TEKST IS HET LASTIGE DEEL
//   Elke outreachtekst is met de hand per bedrijf geschreven en noemt dat bedrijf
//   ook letterlijk. Voor iemand bij een NIEUW bedrijf bestaat er dus geen tekst.
//   Daarom: staat er al iemand van hetzelfde bedrijf in de campagne, dan nemen we
//   die tekst over als startpunt (dat is precies wat je met de hand ook zou doen).
//   Anders begin je leeg. In beide gevallen lees en bewerk je de tekst voordat er
//   iets wordt weggeschreven.
//
//   De aanhef gaat via {{voornaam}}, die hier wordt ingevuld bij het opslaan. De
//   verzendkant doet bewust GEEN samenvoegen: die stuurt de tekst zoals hij in de
//   rij staat. Zo blijft wat je in de outreachtab ziet exact wat er uitgaat.

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();

export function applyMergeFields(text, contact) {
  const voornaam = (contact?.first_name || String(contact?.name || '').trim().split(/\s+/)[0] || '').trim();
  const bedrijf = (contact?.company_name || contact?.company || '').trim();
  return String(text || '')
    .replace(/\{\{\s*voornaam\s*\}\}/gi, voornaam)
    .replace(/\{\{\s*bedrijf\s*\}\}/gi, bedrijf);
}

export default function AddToCampaignModal({ contacts, onClose, onDone }) {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState('');
  const [existing, setExisting] = useState([]);       // rijen die al in de campagne staan
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [bron, setBron] = useState(null);             // van wie we de tekst overnamen

  const campaign = campaigns.find(c => c.id === campaignId) || null;
  const isLinkedIn = campaign?.channel === 'linkedin';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('outreach_campaign')
        .select('id,name,channel,status,sender_mailbox')
        .neq('status', 'finished')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) { setErr(error.message); setLoading(false); return; }
      setCampaigns(data || []);
      if ((data || []).length) setCampaignId(data[0].id);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Wie zit er al in deze campagne, en is er een tekst van hetzelfde bedrijf?
  useEffect(() => {
    if (!campaignId) { setExisting([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('outreach_contact')
        .select('id,email,linkedin_url,company,company_id,msg1_subject,msg1_body')
        .eq('campaign_id', campaignId)
        .limit(3000);
      if (!cancelled) setExisting(data || []);
    })();
    return () => { cancelled = true; };
  }, [campaignId]);

  // Tekst voorstellen zodra we weten wat er al in de campagne staat.
  useEffect(() => {
    if (!existing.length || !contacts.length) return;
    const doel = contacts[0];
    const match = existing.find(e =>
      e.msg1_body && (
        (doel.company_id && e.company_id === doel.company_id) ||
        (norm(doel.company_name || doel.company) && norm(e.company) === norm(doel.company_name || doel.company))
      ));
    if (!match) { setBron(null); return; }
    setBron(match.company || 'hetzelfde bedrijf');
    // Alleen voorstellen zolang de gebruiker zelf nog niets getypt heeft.
    setSubject(s => s || match.msg1_subject || '');
    setBody(b => b || (match.msg1_body || '').replace(/^hi\s+[^,\n]+,/i, 'Hi {{voornaam}},'));
  }, [existing, contacts]);

  // Wie kan er mee, en wie niet, en waarom niet.
  const { mee, afvallers } = useMemo(() => {
    const reeds = new Set();
    for (const e of existing) {
      if (e.email) reeds.add(`e:${String(e.email).toLowerCase()}`);
      if (e.linkedin_url) reeds.add(`l:${String(e.linkedin_url).toLowerCase()}`);
    }
    const mee = [], afvallers = [];
    for (const c of contacts) {
      const email = String(c.email || '').trim().toLowerCase();
      const li = String(c.linkedin_url || '').trim().toLowerCase();
      // Inactief of 'former' betekent meestal: deze persoon werkt hier niet meer.
      // Dat is precies de situatie die je met dit scherm oplost, dus de NIEUWE
      // rol moet je toevoegen, niet de oude.
      if (c.isInactive || c.isFormer) { afvallers.push([c, 'staat op inactief of former']); continue; }
      if (c.do_not_email && !isLinkedIn) { afvallers.push([c, 'staat op do-not-email']); continue; }
      if (!isLinkedIn && !email) { afvallers.push([c, 'geen e-mailadres']); continue; }
      if (isLinkedIn && !li) { afvallers.push([c, 'geen LinkedIn-profiel']); continue; }
      if (reeds.has(`e:${email}`) || (li && reeds.has(`l:${li}`))) {
        afvallers.push([c, 'staat al in deze campagne']); continue;
      }
      mee.push(c);
    }
    return { mee, afvallers };
  }, [contacts, existing, isLinkedIn]);

  const insertToken = (token) => setBody(b => (b ? `${b}${b.endsWith(' ') ? '' : ' '}${token}` : token));

  const toevoegen = async () => {
    setBusy(true); setErr(null);
    const nu = new Date().toISOString();
    const rijen = mee.map(c => {
      const email = String(c.email || '').trim().toLowerCase() || null;
      return {
        campaign_id: campaignId,
        channel: isLinkedIn ? 'linkedin' : 'email',
        contact_id: c.id,
        company_id: c.company_id || null,
        first_name: c.first_name || (String(c.name || '').trim().split(/\s+/)[0] || null),
        last_name: c.last_name || null,
        title: c.title || null,
        email,
        email_domain: email && email.includes('@') ? email.split('@')[1] : null,
        company: c.company_name || c.company || null,
        linkedin_url: c.linkedin_url || null,
        // Handmatig toegevoegd is per definitie een bewuste keuze, dus tier top.
        // Zonder tier zouden ze achter de hele lijst aansluiten en de campagne
        // waarschijnlijk nooit halen.
        priority_tier: 'top',
        priority_label: 'Handmatig toegevoegd',
        outreach_prio: null,
        is_reserve: false,
        source: 'handmatig toegevoegd vanuit Contacts',
        msg1_subject: isLinkedIn ? null : (subject.trim() || null),
        msg1_body: applyMergeFields(body, c) || null,
        msg2_subject: null,
        msg2_body: null,
        status: 'queued',
        next_action_at: nu,
      };
    });

    const { data, error } = await supabase.from('outreach_contact').insert(rijen).select('id');
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setResult({ toegevoegd: (data || []).length });
    if (onDone) await onDone();
  };

  const klaar = campaignId && mee.length > 0 && body.trim() && (isLinkedIn || subject.trim());

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 12, width: 'min(760px, 96vw)', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>

        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--sep)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Toevoegen aan campagne</div>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{contacts.length} geselecteerd</span>
          <button className="btn-ghost tiny" style={{ marginLeft: 'auto' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Laden…</div>}

          {!loading && campaigns.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Er is geen lopende outreachcampagne.</div>
          )}

          {!loading && campaigns.length > 0 && !result && (
            <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Campagne</span>
                <select value={campaignId} onChange={e => setCampaignId(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 13 }}>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.channel === 'linkedin' ? 'LinkedIn-DM' : 'e-mail'}, {c.status})
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--fill-1)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.6 }}>
                <strong>{mee.length}</strong> {mee.length === 1 ? 'persoon wordt' : 'personen worden'} toegevoegd
                {mee.length > 0 && `: ${mee.map(c => c.name || [c.first_name, c.last_name].filter(Boolean).join(' ')).join(', ')}`}.
                {afvallers.length > 0 && (
                  <div style={{ color: 'var(--text-3)', marginTop: 4 }}>
                    Niet toegevoegd: {afvallers.map(([c, reden]) => `${c.name || c.first_name} (${reden})`).join(', ')}.
                  </div>
                )}
              </div>

              {!isLinkedIn && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Onderwerp</span>
                  <input value={subject} onChange={e => setSubject(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 13 }} />
                </label>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Bericht</span>
                  <button className="btn-ghost tiny" onClick={() => insertToken('{{voornaam}}')}>+ Voornaam</button>
                  <button className="btn-ghost tiny" onClick={() => insertToken('{{bedrijf}}')}>+ Bedrijf</button>
                </div>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={12}
                  placeholder={'Hi {{voornaam}},\n\n…'}
                  style={{ padding: 10, borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 13, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit' }} />
                <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
                  {bron
                    ? <>Tekst overgenomen van een bestaand contact bij <strong>{bron}</strong>. Lees hem na: er staat waarschijnlijk een bedrijfsnaam in.</>
                    : <>Er staat nog niemand van dit bedrijf in de campagne, dus er is geen tekst om over te nemen.</>}
                  {' '}{'{{voornaam}}'} en {'{{bedrijf}}'} worden per persoon ingevuld bij het opslaan.
                </div>
              </div>

              {err && <div style={{ fontSize: 12, color: '#dc2626' }}>{err}</div>}
            </>
          )}

          {result && (
            <div style={{ fontSize: 13, color: '#16a34a', lineHeight: 1.6 }}>
              ✓ {result.toegevoegd} toegevoegd aan {campaign?.name}. Ze staan klaar om te versturen en
              gaan mee in de eerstvolgende batch vanuit de Outreach-tab.
            </div>
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '0.5px solid var(--sep)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-ghost tiny" onClick={onClose}>{result ? 'Sluiten' : 'Annuleren'}</button>
          {!result && (
            <button className="btn-primary tiny" disabled={!klaar || busy} onClick={toevoegen}>
              {busy ? 'Bezig…' : `Voeg ${mee.length} toe`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
