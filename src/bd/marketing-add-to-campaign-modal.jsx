import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { apiFetch } from '../lib/apiFetch';
import { varsForContact } from '../lib/template-vars';

// "Add to campaign": een contact alsnog de mail van een al verstuurde campagne
// sturen.
//
// WAAROM DIT NODIG IS
//   Bij een bounce blijkt vaak dat iemand ergens weg is. Soms is die persoon bij
//   het nieuwe bedrijf juist interessant. Dan maak je een account aan, zoekt het
//   nieuwe adres op, en wil je diegene alsnog die ene mail sturen. Zonder dit
//   scherm moet je de campagne overdoen, en dan loop je het risico dat anderen
//   hem een tweede keer krijgen.
//
// HOE HET VERSTUURT
//   Via api/marketing-send met het campaign_id van de BESTAANDE campagne. Dat
//   endpoint stuurt per ontvanger en schrijft een campaign_sends-rij onder
//   diezelfde campagne, dus de statistieken, de webhook en de bounceafhandeling
//   blijven kloppen. De tekst komt uit de campagne zelf, dus deze persoon krijgt
//   letterlijk dezelfde mail als de rest.
//
// DE VEILIGHEID, EN WAAROM OP ADRES EN NIET OP PERSOON
//   Dezelfde uiting mag nooit twee keer bij iemand aankomen, dus we kijken wat er
//   al onder deze campagne verstuurd is. Maar dat moet op E-MAILADRES, niet op
//   contact-id: precies in het geval waar dit scherm voor bestaat is het dezelfde
//   contactpersoon met een NIEUW adres. Op contact-id matchen zou die persoon
//   uitsluiten terwijl de mail nooit is aangekomen, want hij bouncede op het oude
//   adres. Het adres bepaalt of een mail is aangekomen, de persoon niet.

const fmtDate = (iso) => (iso ? String(iso).slice(0, 10) : '');

/**
 * Verdeelt de selectie in wie de mail krijgt en wie niet, met de reden erbij.
 * Puur, zodat de regels toetsbaar zijn: dit stuk ging al een keer mis doordat
 * het op de persoon keek in plaats van op het adres.
 *
 * @param {Array} contacts           geselecteerde contacten
 * @param {Set}   verzondenAdressen  adressen waar deze campagne al heen ging
 */
export function splitsOntvangers(contacts, verzondenAdressen) {
  const reeds = verzondenAdressen || new Set();
  const mee = [], afvallers = [];
  for (const c of (contacts || [])) {
    const email = String(c?.email || '').trim().toLowerCase();
    // Inactief of former betekent meestal: deze persoon werkt hier niet meer.
    // Dat is juist de situatie die je met dit scherm oplost, dus je stuurt naar
    // de NIEUWE rol, niet de oude.
    if (c?.isInactive || c?.isFormer) { afvallers.push([c, 'staat op inactief of former']); continue; }
    if (c?.do_not_email) { afvallers.push([c, 'staat op do-not-email']); continue; }
    if (!email) { afvallers.push([c, 'geen e-mailadres']); continue; }
    if (reeds.has(email)) { afvallers.push([c, 'dit adres heeft de mail al gehad']); continue; }
    mee.push(c);
  }
  return { mee, afvallers };
}

export default function AddToCampaignModal({ contacts, onClose, onDone }) {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState('');
  const [reeds, setReeds] = useState(new Set());     // wie kreeg deze campagne al
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);
  const [negeerCooldown, setNegeerCooldown] = useState(false);

  const campaign = campaigns.find(c => c.id === campaignId) || null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id,name,subject,html_body,from_name,from_email,reply_to,status,sent_at,created_at,recipient_count')
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) { setErr(error.message); setLoading(false); return; }
      setCampaigns(data || []);
      if ((data || []).length) setCampaignId(data[0].id);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Naar welke ADRESSEN is deze campagne al gegaan? Bewust niet op contact_id,
  // zie de toelichting bovenaan.
  const laadVerzondenAdressen = async (id) => {
    const { data, error } = await supabase
      .from('campaign_sends')
      .select('recipient_email')
      .eq('campaign_id', id)
      .limit(5000);
    if (error) { setErr(error.message); return new Set(); }
    return new Set((data || [])
      .map(r => String(r.recipient_email || '').trim().toLowerCase())
      .filter(Boolean));
  };

  useEffect(() => {
    if (!campaignId) { setReeds(new Set()); setChecking(false); return; }
    let cancelled = false;
    setChecking(true);
    (async () => {
      const s = await laadVerzondenAdressen(campaignId);
      if (!cancelled) setReeds(s);
      // setChecking hoort NIET achter de cancelled-check: blijft die vlag per
      // ongeluk aan, dan is de verstuurknop voorgoed uitgeschakeld zonder dat
      // er iets zichtbaar misgaat.
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [campaignId]);

  const { mee, afvallers } = useMemo(
    () => splitsOntvangers(contacts, reeds), [contacts, reeds]);

  const versturen = async ({ negeer = negeerCooldown, lijst = mee } = {}) => {
    if (!campaign || lijst.length === 0) return;
    setBusy(true); setErr(null);
    try {
      const resp = await apiFetch('/api/marketing-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Het id van de BESTAANDE campagne: zo landen de verzendingen onder
          // dezelfde campagne en blijven de cijfers kloppen.
          campaign_id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          html_body: campaign.html_body,
          from_name: campaign.from_name || undefined,
          from_email: campaign.from_email || undefined,
          reply_to: campaign.reply_to || undefined,
          // Naverzending: de campagnerij mag niet overschreven worden, anders
          // springt recipient_count van 383 naar 1 en sent_at naar vandaag.
          append: true,
          ignoreCooldown: negeer,
          recipients: lijst.map(c => ({
            contact_id: c.id,
            email: String(c.email).trim(),
            vars: varsForContact({ ...c, company_name: c.company_name }),
          })),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setResult(data);
      if (onDone) await onDone();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  // Opnieuw proberen zonder afkoelperiode. Eerst de verzonden adressen opnieuw
  // ophalen: bij een gedeeltelijke verzending mag wie zojuist wel een mail kreeg
  // er geen tweede krijgen.
  const tochVersturen = async () => {
    if (!campaign) return;
    setBusy(true);
    const s = await laadVerzondenAdressen(campaign.id);
    setReeds(s);
    setNegeerCooldown(true);
    const { mee: rest } = splitsOntvangers(contacts, s);
    setBusy(false);
    if (rest.length === 0) { setErr('Er is niemand meer over om naar te versturen.'); return; }
    setResult(null);
    await versturen({ negeer: true, lijst: rest });
  };

  const klaar = !!campaign && mee.length > 0 && !checking;

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 12, width: 'min(720px, 96vw)', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>

        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--sep)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Toevoegen aan campagne</div>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{contacts.length} geselecteerd</span>
          <button className="btn-ghost tiny" style={{ marginLeft: 'auto' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Laden…</div>}

          {!loading && campaigns.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Er zijn nog geen campagnes.</div>
          )}

          {!loading && campaigns.length > 0 && !result && (
            <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Campagne</span>
                <select value={campaignId} onChange={e => setCampaignId(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 13 }}>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>
                      {fmtDate(c.sent_at || c.created_at)} · {c.name}
                      {c.recipient_count ? ` (${c.recipient_count} ontvangers)` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {campaign && (
                <div style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--fill-1)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.6 }}>
                  <div><strong>Onderwerp:</strong> {campaign.subject || '(geen onderwerp)'}</div>
                  <div style={{ color: 'var(--text-3)' }}>
                    Van {campaign.from_name ? `${campaign.from_name} <${campaign.from_email}>` : campaign.from_email}
                    {campaign.reply_to ? ` · antwoorden naar ${campaign.reply_to}` : ''}
                  </div>
                </div>
              )}

              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                {checking ? 'Controleren wie deze mail al gehad heeft…' : (
                  <>
                    <strong>{mee.length}</strong> {mee.length === 1 ? 'persoon krijgt' : 'personen krijgen'} deze mail
                    {mee.length > 0 && `: ${mee.map(c => c.name || [c.first_name, c.last_name].filter(Boolean).join(' ')).join(', ')}`}.
                    {afvallers.length > 0 && (
                      <div style={{ color: 'var(--text-3)', marginTop: 4 }}>
                        Niet verstuurd: {afvallers.map(([c, reden]) => `${c.name || c.first_name} (${reden})`).join(', ')}.
                      </div>
                    )}
                  </>
                )}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={negeerCooldown} onChange={e => setNegeerCooldown(e.target.checked)} />
                Negeer de afkoelperiode van 5 dagen
              </label>
              <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5, marginTop: -6 }}>
                Normaal slaat het systeem iemand over die net een marketingmail kreeg. Voor een
                vervanger die deze uiting nog nooit gehad heeft is dat meestal niet de bedoeling.
              </div>

              {err && <div style={{ fontSize: 12, color: '#dc2626' }}>{err}</div>}
            </>
          )}

          {result && (
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              <div style={{ color: '#16a34a' }}>✓ {result.sent || 0} verstuurd onder {campaign?.name}.</div>
              {result.failed > 0 && <div style={{ color: '#dc2626' }}>{result.failed} mislukt.</div>}
              {result.cooled_down > 0 && (
                <div style={{ color: '#b45309', marginTop: 6 }}>
                  {result.cooled_down} overgeslagen wegens de afkoelperiode. Die gaat op de
                  contactpersoon en niet op het adres, dus iemand die naar een nieuw adres is
                  verhuisd telt als recent gemaild terwijl die de mail nooit kreeg.
                  <div style={{ marginTop: 6 }}>
                    <button className="btn-primary tiny" disabled={busy} onClick={tochVersturen}>
                      {busy ? 'Bezig…' : 'Toch versturen'}
                    </button>
                  </div>
                </div>
              )}
              {result.aborted && <div style={{ color: '#dc2626' }}>Afgebroken: {result.abortReason}</div>}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '0.5px solid var(--sep)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {checking ? 'Controleren…' : (mee.length === 0
              ? 'Niemand om naar te versturen, zie de reden hierboven.'
              : 'Een adres dat deze mail al gehad heeft, valt er automatisch uit.')}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn-ghost tiny" onClick={onClose}>{result ? 'Sluiten' : 'Annuleren'}</button>
            {!result && (
              <button className="btn-primary tiny" disabled={!klaar || busy} onClick={versturen}>
                {busy ? 'Versturen…' : `Verstuur naar ${mee.length}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
