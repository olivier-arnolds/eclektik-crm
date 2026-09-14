import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { renderTemplate, varsForContact } from '../lib/template-vars';

export default function CampaignDetail({ campaignId, onBack }) {
  const [campaign, setCampaign] = useState(null);
  const [sends, setSends] = useState([]);
  const [loading, setLoading] = useState(true);
  // Welke ontvanger we in de preview invullen. Leeg = het kale sjabloon.
  const [previewFor, setPreviewFor] = useState('');
  const [showText, setShowText] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Twee aparte queries i.p.v. een nested FK-fetch op contacts.
      // Reden: er bestaat geen formele FK-constraint tussen
      // campaign_sends.contact_id en contacts.id, dus PostgREST kan
      // de embedded select niet resolven en faalt met 400.
      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from('campaigns').select('*').eq('id', campaignId).single(),
        supabase.from('campaign_sends')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('sent_at', { ascending: false, nullsFirst: false }),
      ]);
      if (cancelled) return;

      // Verzamel de unieke contact_ids en haal die contacten in één
      // separate call op. Join client-side via een lookup-map.
      const contactIds = [...new Set((s || []).map(r => r.contact_id).filter(Boolean))];
      let contactsById = {};
      if (contactIds.length > 0) {
        const { data: contactRows } = await supabase
          .from('contacts')
          .select('id, full_name, first_name, last_name, email, title, company_id')
          .in('id', contactIds);
        if (cancelled) return;
        // Bedrijfsnaam erbij, want {{company_name}} zit in veel sjablonen. Zonder
        // dit zou de preview daar een gat laten zien dat de ontvanger niet had.
        const companyIds = [...new Set((contactRows || []).map(r => r.company_id).filter(Boolean))];
        let companyById = {};
        if (companyIds.length > 0) {
          const { data: companyRows } = await supabase
            .from('companies').select('id, name').in('id', companyIds);
          if (cancelled) return;
          companyById = Object.fromEntries((companyRows || []).map(r => [r.id, r.name]));
        }
        contactsById = Object.fromEntries((contactRows || []).map(r => [
          r.id, { ...r, company_name: companyById[r.company_id] || '' },
        ]));
      }

      const enriched = (s || []).map(row => ({
        ...row,
        contacts: row.contact_id ? contactsById[row.contact_id] || null : null,
      }));

      setCampaign(c || null);
      setSends(enriched);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [campaignId]);

  // De opgeslagen tekst is het SJABLOON; de ontvanger kreeg de ingevulde versie.
  // Daarom vullen we hem hier per ontvanger in, met dezelfde functie als het
  // verzendendpoint gebruikt, zodat de preview niet iets anders laat zien dan
  // wat er werkelijk is aangekomen.
  const previewContact = useMemo(() => {
    if (!previewFor) return null;
    return sends.find(s => String(s.id) === String(previewFor))?.contacts || null;
  }, [previewFor, sends]);

  const previewHtml = useMemo(() => {
    const body = campaign?.html_body || '';
    if (!body) return '';
    return previewContact ? renderTemplate(body, varsForContact(previewContact)) : body;
  }, [campaign, previewContact]);

  // Eerste ontvanger met een gekoppeld contact, zodat je meteen een ingevulde
  // mail ziet in plaats van accolades.
  useEffect(() => {
    if (previewFor || sends.length === 0) return;
    const eerste = sends.find(s => s.contacts) || null;
    if (eerste) setPreviewFor(String(eerste.id));
  }, [sends, previewFor]);

  if (loading) return <div style={{ padding: 24, color: 'var(--text-3)' }}>Loading…</div>;
  if (!campaign) return <div style={{ padding: 24, color: 'var(--danger)' }}>Campaign not found.</div>;

  const total = sends.length;
  const opened = sends.filter(s => s.first_opened_at).length;
  const clicked = sends.filter(s => s.first_clicked_at).length;
  const bounced = sends.filter(s => s.status === 'bounced').length;
  const failed = sends.filter(s => s.status === 'failed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-ghost tiny" onClick={onBack}>← Back</button>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{campaign.name || campaign.subject}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {campaign.subject} · {campaign.sent_at ? `sent ${new Date(campaign.sent_at).toLocaleString()}` : 'not sent yet'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, padding: 12, background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8 }}>
        <Stat label="Recipients" value={total} />
        <Stat label="Opened" value={`${opened} (${total ? Math.round(100 * opened / total) : 0}%)`} />
        <Stat label="Clicked" value={`${clicked} (${total ? Math.round(100 * clicked / total) : 0}%)`} />
        {bounced > 0 && <Stat label="Bounced" value={bounced} color="var(--danger)" />}
        {failed > 0 && <Stat label="Failed" value={failed} color="var(--danger)" />}
      </div>

      {/* De verstuurde tekst. Stond er niet in, terwijl dit precies is wat je wil
          zien als je maanden later terugkijkt op een campagne. */}
      <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 12px', borderBottom: showText ? '0.5px solid var(--sep)' : 'none' }}>
          <button className="btn-ghost tiny" onClick={() => setShowText(v => !v)}>
            {showText ? '▾' : '▸'} Verstuurde tekst
          </button>
          {showText && sends.length > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
              zoals verstuurd aan
              <select value={previewFor} onChange={e => setPreviewFor(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--bg-1)', fontSize: 12, maxWidth: 280 }}>
                <option value="">(sjabloon, niet ingevuld)</option>
                {sends.slice(0, 200).map(s => {
                  const c = s.contacts || {};
                  const naam = c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
                  return <option key={s.id} value={s.id}>{naam || s.recipient_email}</option>;
                })}
              </select>
            </label>
          )}
        </div>

        {showText && (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12 }}>
              <div><strong>Onderwerp:</strong> {campaign.subject || '(geen onderwerp)'}</div>
              {campaign.preheader && (
                <div style={{ color: 'var(--text-3)' }}>Preheader: {campaign.preheader}</div>
              )}
              <div style={{ color: 'var(--text-3)' }}>
                Van {campaign.from_name ? `${campaign.from_name} <${campaign.from_email}>` : campaign.from_email}
                {campaign.reply_to ? ` · antwoorden naar ${campaign.reply_to}` : ''}
              </div>
            </div>

            {campaign.html_body ? (
              <iframe title="verstuurde-tekst" srcDoc={previewHtml} sandbox=""
                style={{ width: '100%', height: 420, border: '0.5px solid var(--sep)', borderRadius: 6, background: '#fff' }} />
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Deze campagne heeft geen tekst opgeslagen.
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
              Dit is de opgeslagen tekst met de samenvoegvelden ingevuld voor de gekozen
              ontvanger. De handtekening en de afmeldlink worden pas bij het versturen
              toegevoegd, dus die staan hier niet in.
            </div>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr', padding: '8px 12px', borderBottom: '0.5px solid var(--sep)', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <div>Recipient</div><div>Email</div><div>Status</div><div>Opened</div><div>Clicked</div><div>Sent</div>
        </div>
        {sends.map(s => {
          const c = s.contacts || {};
          const name = c.full_name || c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || s.recipient_email;
          return (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr', padding: '8px 12px', borderBottom: '0.5px solid var(--sep)', fontSize: 12, alignItems: 'center' }}>
              <div style={{ fontWeight: 500 }}>{name}</div>
              <div style={{ color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.recipient_email}</div>
              <div><StatusPill status={s.status} bounceReason={s.bounce_reason} /></div>
              <div style={{ color: s.open_count ? 'var(--good)' : 'var(--text-3)' }}>{s.open_count ? `${s.open_count}×` : '—'}</div>
              <div style={{ color: s.click_count ? 'var(--good)' : 'var(--text-3)' }}>{s.click_count ? `${s.click_count}×` : '—'}</div>
              <div style={{ color: 'var(--text-3)', fontSize: 11 }}>{s.sent_at ? new Date(s.sent_at).toLocaleDateString() : '—'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 500, color: color || 'var(--text-1)' }}>{value}</div>
    </div>
  );
}

function StatusPill({ status, bounceReason }) {
  const map = {
    queued:    { bg: 'var(--fill-2)', fg: 'var(--text-3)', label: 'queued' },
    sent:      { bg: 'var(--accent-tint)', fg: 'var(--accent)', label: 'sent' },
    delivered: { bg: 'var(--good-tint)', fg: 'var(--good)', label: 'delivered' },
    bounced:   { bg: 'var(--danger-tint)', fg: 'var(--danger)', label: 'bounced' },
    failed:    { bg: 'var(--danger-tint)', fg: 'var(--danger)', label: 'failed' },
  };
  const s = map[status] || map.queued;
  return (
    <span title={bounceReason || ''}
      style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, background: s.bg, color: s.fg, fontSize: 10, fontWeight: 500 }}>
      {s.label}
    </span>
  );
}
