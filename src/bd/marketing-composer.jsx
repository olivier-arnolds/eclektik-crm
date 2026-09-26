import { useState, useMemo, useRef, useEffect } from 'react';
// Ontbrak sinds 11 juni, terwijl de spam-preventie hieronder supabase wel
// aanroept. Die aanroep gooide dus een ReferenceError, de catch eromheen ving
// hem op met een console.warn, en de check liep altijd door zonder filter. Er
// is drieenhalve maand lang nooit gewaarschuwd voor een dubbele verzending.
// Gevonden door ESLint (no-undef) op de dag dat die werd aangezet.
import { supabase } from '../supabase';
import { useAuth } from '../lib/auth';
import { renderTemplate, varsForContact, KNOWN_VARS, bevatToken } from '../lib/template-vars';
import { apiFetch } from '../lib/apiFetch';
import { SENDERS, senderNameFor, hasSignature } from '../lib/senders';
import { addUtmToHtml, slugify, UTM_BRONNEN } from '../lib/utm';

const inputStyle = {
  width: '100%', padding: '7px 10px', borderRadius: 6,
  border: '0.5px solid var(--sep)', background: 'var(--bg-1)',
  fontSize: 12, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
};

// Composer for a Marketing campaign.
// Props:
//   recipients: array of contact objects (already filtered/selected)
//   onCancel: () => void
//   onSent: (campaign) => void
//   defaultFromName, defaultFromEmail (initiële afzender; keuzelijst hieronder)
export default function MarketingComposer({ recipients, onCancel, onSent, defaultFromName = 'Marketing', defaultFromEmail = 'marketing@eclectik.co' }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  // 'html' = ruwe HTML invoeren; 'text' = platte tekst die we bij verzenden naar
  // nette HTML omzetten. Beide bodies apart bewaard zodat wisselen niets wist.
  const [bodyMode, setBodyMode] = useState('html');
  const [textBody, setTextBody] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [fromEmail, setFromEmail] = useState(defaultFromEmail);
  const [fromName, setFromName] = useState(defaultFromName);
  // Handtekening meesturen? Standaard aan als de afzender een persoon met
  // handtekening is (Marco/Olivier/Yarmilla), uit bij Marketing@.
  const [sigOn, setSigOn] = useState(() => hasSignature(defaultFromEmail));
  // Links taggen voor Analytics. Standaard aan: zonder tags ziet Google verkeer
  // uit een mail als 'direct' en weet je achteraf niet meer welke uiting het
  // bezoek bracht. Uit te zetten voor het geval je links al met de hand tagt.
  const [utmOn, setUtmOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  // 'broadcast' = newsletter via Resend Broadcasts (marketingplan); 'transactional' = 1-op-1 via /emails.
  const [sendMode, setSendMode] = useState('broadcast');
  const fileInputRef = useRef(null);
  const { session } = useAuth();
  const sentBy = session?.user?.email || '';

  const loadHtmlFromFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setHtmlBody(text);

      // Auto-fill subject from <title>… (only if empty so user-typed values stay)
      const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch && !subject.trim()) {
        setSubject(decodeHtmlEntities(titleMatch[1]).trim());
      }

      // Auto-fill preheader from the first hidden div (display:none convention)
      const preheaderMatch = text.match(/<div[^>]*style="[^"]*display\s*:\s*none[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (preheaderMatch && !preheader.trim()) {
        const cleaned = preheaderMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        setPreheader(decodeHtmlEntities(cleaned));
      }

      // Auto-fill campaign name from the filename (strip .html / .htm)
      if (!name.trim()) {
        setName(file.name.replace(/\.(html?|htm)$/i, ''));
      }
    };
    reader.onerror = () => alert('Failed to read file: ' + (reader.error?.message || 'unknown error'));
    reader.readAsText(file);
    // Reset so the same file can be re-picked later
    e.target.value = '';
  };

  // Decode the most common HTML entities found in <title> / preheader text.
  function decodeHtmlEntities(s) {
    return s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  // De HTML die daadwerkelijk verstuurd wordt: in text-modus zetten we de platte
  // tekst om naar nette HTML; in html-modus is het de ruwe HTML. Merge-vars zoals
  // {{first_name}} blijven in beide gevallen intact.
  // De campagnenaam wordt de utm_campaign-waarde. Valt terug op het onderwerp,
  // want een naam is optioneel en een rapport met lege campagnenamen is nutteloos.
  const utmCampaign = useMemo(() => slugify(name || subject), [name, subject]);
  const utmOpts = useMemo(
    () => ({ ...UTM_BRONNEN.campagne, campaign: utmCampaign }),
    [utmCampaign],
  );

  const effectiveHtml = useMemo(() => {
    const basis = bodyMode === 'text' ? plainTextToHtml(textBody) : htmlBody;
    // Bewust hier en niet pas bij het versturen: zo tonen de preview en de
    // test-mail dezelfde links als de echte verzending, en staat de getagde
    // versie ook in de campagne zelf (waar je hem later terugleest).
    return utmOn && utmCampaign ? addUtmToHtml(basis, utmOpts) : basis;
  }, [bodyMode, textBody, htmlBody, utmOn, utmCampaign, utmOpts]);
  const hasBody = bodyMode === 'text' ? !!textBody.trim() : !!htmlBody.trim();

  // Merge-var op de cursor invoegen in het actieve tekstvak. Voorkomt typefouten
  // (renderTemplate matcht alleen exact {{first_name}} e.d.). Eén ref volstaat:
  // er is altijd maar één tekstvak zichtbaar (afhankelijk van bodyMode).
  const bodyRef = useRef(null);
  const insertVar = (token) => {
    const el = bodyRef.current;
    const val = bodyMode === 'text' ? textBody : htmlBody;
    const setVal = bodyMode === 'text' ? setTextBody : setHtmlBody;
    const start = el ? el.selectionStart : val.length;
    const end = el ? el.selectionEnd : val.length;
    setVal(val.slice(0, start) + token + val.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  };
  // Moet gelijk lopen met EMAIL_COOLDOWN_DAYS in api/marketing-send.js (default 5).
//
// Stond hier op 3 terwijl de server 5 aanhield. Iemand die vier dagen geleden
// gemaild was glipte daardoor langs dit venster, en werd daarna door de server
// geweigerd zonder dat je nog ergens op 'Verzend toch' kon klikken. Doodlopend,
// en de enige melding was een rode regel achteraf.
const COOLDOWN_DAGEN = 5;

const VAR_LABELS = {
    first_name: 'Voornaam', last_name: 'Achternaam', full_name: 'Volledige naam',
    company_name: 'Bedrijf', role: 'Functie', token: 'Uitnodigingstoken',
  };

  // Tokenmodus: staat {{token}} in de body, dan krijgt elke ontvanger een eigen
  // uitnodigingslink en gelden er extra regels. Staat hij er niet in, dan
  // verandert er niets aan het bestaande gedrag; dat is een harde eis, want
  // alle andere campagnes lopen hier ook langs.
  const tokenModus = useMemo(() => bevatToken(effectiveHtml), [effectiveHtml]);

  // Het echte token van de voorbeeldontvanger, als die er al een heeft. Wordt
  // opgehaald zodra de tokenmodus aan gaat, zodat de preview de werkelijkheid
  // toont. Null betekent: nog niet opgehaald of nog niet aangemaakt.
  const [previewToken, setPreviewToken] = useState(null);

  // Keuzevenster voor de spamcheck. window.confirm kan zijn knoppen niet
  // hernoemen, en met OK/Annuleren was volstrekt onduidelijk wat er gebeurde:
  // allebei verstuurden, alleen naar een andere groep. Nu twee knoppen die
  // zeggen wat ze doen, en een echte uitweg.
  const [spamVraag, setSpamVraag] = useState(null);
  const vraagSpamKeuze = (info) => new Promise((resolve) => setSpamVraag({ ...info, resolve }));
  const beantwoordSpam = (keuze) => {
    if (spamVraag?.resolve) spamVraag.resolve(keuze);
    setSpamVraag(null);
  };
  const previewEmail = recipients?.[0]?.email || null;
  useEffect(() => {
    if (!tokenModus || !previewEmail) { setPreviewToken(null); return; }
    let afgebroken = false;
    apiFetch('/api/session-invite-ensure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry_run: true, recipients: [{ email: previewEmail }] }),
    })
      .then(r => r.json())
      .then(d => { if (!afgebroken) setPreviewToken(d?.tokens?.[String(previewEmail).trim().toLowerCase()] || null); })
      .catch(() => { if (!afgebroken) setPreviewToken(null); });
    return () => { afgebroken = true; };
  }, [tokenModus, previewEmail]);

  // Live preview - render with the first recipient's vars (or empty)
  const previewVars = useMemo(() => {
    const basis = varsForContact(recipients?.[0] || {});
    if (!tokenModus) return basis;
    // Nooit een lege string bij een ontbrekend token: dan oogt de knop goed en
    // is de link dood, en dat is precies hoe de eerste testverzending mislukte.
    return { ...basis, token: previewToken || 'TOKEN-VOLGT-BIJ-VERZENDEN' };
  }, [recipients, tokenModus, previewToken]);
  const previewHtml = useMemo(() => renderTemplate(effectiveHtml, previewVars), [effectiveHtml, previewVars]);

  const send = async (testOnly) => {
    if (!subject.trim() || !hasBody) return;

    // Broadcast kan principieel geen token per ontvanger. Dat pad geeft de
    // ontvangers als contactenlijst aan Resend, en Resend rendert daarna EEN
    // body voor iedereen. Alleen /api/marketing-send rendert per ontvanger aan
    // onze kant.
    //
    // Bewust weigeren en niet stilletjes omschakelen: wie denkt een newsletter
    // te versturen moet weten dat het een transactionele verzending wordt, met
    // een andere limiet en een ander afmeldmechanisme.
    if (tokenModus && !testOnly && sendMode === 'broadcast') {
      setResult({
        ok: false,
        error: 'Deze mail bevat {{token}}, en dat kan niet via Broadcast. Resend rendert daar een '
          + 'body voor de hele lijst, dus iedereen zou dezelfde link krijgen. Kies Transactioneel; '
          + 'dan wordt de mail per ontvanger opgebouwd.',
      });
      return;
    }

    setBusy(true);
    setResult(null);

    // Server-side templating: stuur alleen merge-vars per recipient, niet de
    // volledige geïnlinete HTML. Voor 88+ recipients zou inline-HTML de
    // Vercel body-limit overschrijden (413 Request Entity Too Large).
    // Backend rendert html_body + per-recipient vars in marketing-send.js.
    let payloadRecipients = testOnly
      ? [{ contact_id: null, email: sentBy, vars: previewVars }]
      : recipients.filter(r => r.email).map(r => ({
          contact_id: r.id,
          email: r.email,
          vars: varsForContact(r),
        }));

    if (payloadRecipients.length === 0) {
      setResult({ ok: false, error: 'No recipients with an email address' });
      setBusy(false);
      return;
    }

    // ---- Uitnodigingstokens klaarzetten ----------------------------------
    // Alleen als {{token}} in de body staat. Staat hij er niet in, dan slaat
    // dit blok over en verandert er niets voor andere campagnes.
    //
    // Automatisch en niet achter een vinkje: een vinkje is iets om te vergeten,
    // en vergeten geeft precies de stille fout waar dit voor gebouwd is. Wel
    // eerst tonen wat er gaat gebeuren, want het schrijft in de database.
    if (tokenModus) {
      try {
        const lijst = payloadRecipients.map(r => ({
          email: r.email,
          first_name: r.vars?.first_name || null,
          company: r.vars?.company_name || null,
          contact_id: r.contact_id || null,
        }));

        const droog = await apiFetch('/api/session-invite-ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dry_run: true, recipients: lijst }),
        }).then(r => r.json());
        if (droog?.error) throw new Error(droog.error);

        if (droog.nieuw > 0 || droog.ongeldig?.length) {
          const regels = [
            `${droog.bestaand} ontvanger(s) hebben al een uitnodiging, die link blijft werken.`,
            `${droog.nieuw} krijgen er nu een aangemaakt.`,
          ];
          if (droog.ongeldig?.length) {
            regels.push(`${droog.ongeldig.length} zonder bruikbaar adres worden overgeslagen.`);
          }
          if (!confirm(`${regels.join('\n')}\n\nDoorgaan met versturen?`)) {
            setBusy(false);
            return;
          }
        }

        const echt = await apiFetch('/api/session-invite-ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dry_run: false, recipients: lijst }),
        }).then(r => r.json());
        if (echt?.error) throw new Error(echt.error);

        // Zonder token geen mail. Een dode link is erger dan een niet
        // verstuurde mail: de ontvanger klikt, belandt op /s/invalid, en jij
        // hoort er niets meer van.
        const tokens = echt.tokens || {};
        const zonderToken = [];
        payloadRecipients = payloadRecipients.filter((r) => {
          const t = tokens[String(r.email || '').trim().toLowerCase()];
          if (!t) { zonderToken.push(r.email); return false; }
          r.vars = { ...r.vars, token: t };
          return true;
        });

        if (payloadRecipients.length === 0) {
          setResult({ ok: false, error: 'Geen enkele ontvanger heeft een uitnodigingstoken gekregen, er is niets verstuurd.' });
          setBusy(false);
          return;
        }
        if (zonderToken.length > 0) {
          const namen = zonderToken.slice(0, 5).join(', ');
          const meer = zonderToken.length > 5 ? ` (en ${zonderToken.length - 5} meer)` : '';
          if (!confirm(`Voor ${zonderToken.length} ontvanger(s) lukte het aanmaken niet: ${namen}${meer}.\n\n`
            + `Die worden overgeslagen. Doorgaan met de overige ${payloadRecipients.length}?`)) {
            setBusy(false);
            return;
          }
        }
      } catch (e) {
        setResult({ ok: false, error: `Uitnodigingstokens klaarzetten mislukte: ${e.message}. Er is niets verstuurd.` });
        setBusy(false);
        return;
      }
    }

    // Overrulet de vijfdaagse cooldown in api/marketing-send.js. Bij een test
    // altijd: een testmail aan jezelf die stil wordt overgeslagen is nooit wat
    // je bedoelt, en je ziet nergens dat het gebeurd is.
    let negeerCooldown = !!testOnly;

    // Spam-preventie: check welke recipients in de afgelopen COOLDOWN_DAGEN al een
    // campaign-mail van ons hebben gehad (status sent of delivered). Skip die
    // by-default, met override-optie. Test-sends skippen deze check (eigen mail).
    // Broadcast-modus (newsletter) slaat de check over: je stuurt daar bewust
    // naar de hele geselecteerde lijst, en Resend regelt afmeldingen zelf.
    if (!testOnly && sendMode !== 'broadcast') {
      const sindsISO = new Date(Date.now() - COOLDOWN_DAGEN * 86400000).toISOString();
      const contactIds = payloadRecipients.map(r => r.contact_id).filter(Boolean);
      const emails = payloadRecipients.map(r => r.email);
      const recentIds = new Set();
      const recentEmails = new Set();
      try {
        if (contactIds.length > 0) {
          const { data } = await supabase
            .from('campaign_sends')
            .select('contact_id')
            .in('contact_id', contactIds)
            .in('status', ['sent', 'delivered'])
            .gte('sent_at', sindsISO);
          for (const r of (data || [])) if (r.contact_id) recentIds.add(r.contact_id);
        }
        if (emails.length > 0) {
          const { data } = await supabase
            .from('campaign_sends')
            .select('recipient_email')
            .in('recipient_email', emails)
            .in('status', ['sent', 'delivered'])
            .gte('sent_at', sindsISO);
          for (const r of (data || [])) if (r.recipient_email) recentEmails.add(r.recipient_email.toLowerCase());
        }
      } catch (err) {
        console.warn('Recent-send check faalde, doorgaan zonder filter:', err);
      }
      const skip = payloadRecipients.filter(r =>
        (r.contact_id && recentIds.has(r.contact_id)) || recentEmails.has((r.email || '').toLowerCase())
      );
      if (skip.length > 0) {
        const sample = skip.slice(0, 5).map(r => r.email).join(', ');
        const moreNote = skip.length > 5 ? ` (en ${skip.length - 5} meer)` : '';
        const keuze = await vraagSpamKeuze({
          skip: skip.length,
          totaal: payloadRecipients.length,
          voorbeeld: `${sample}${moreNote}`,
        });
        if (keuze !== 'toch') {
          setBusy(false);
          return;
        }
        // 'Verzend toch' overrulet ook de vijfdaagse cooldown aan de serverkant.
        // Anders kies je hier bewust voor versturen en slaat marketing-send
        // dezelfde mensen alsnog stil over, zonder dat je dat ergens ziet.
        negeerCooldown = true;
      }
      if (payloadRecipients.length === 0) {
        setResult({ ok: false, error: `Alle geselecteerde contacten kregen in de afgelopen ${COOLDOWN_DAGEN} dagen al een campaign-mail.` });
        setBusy(false);
        return;
      }
    }

    // Kies endpoint + body. Een REAL send via 'broadcast' gaat naar de Resend
    // Broadcasts-API; test-sends en 'transactional' blijven /api/marketing-send.
    const useBroadcast = !testOnly && sendMode === 'broadcast';
    const url = useBroadcast ? '/api/resend-broadcast' : '/api/marketing-send';
    const body = useBroadcast
      ? {
          campaign_name: name || subject,
          subject,
          html_body: effectiveHtml,
          from_name: fromName,
          from_email: fromEmail,
          reply_to: replyTo || null,
          append_signature: sigOn && hasSignature(fromEmail),
          recipients: recipients
            .filter(r => r.email)
            .map(r => ({ email: r.email, first_name: r.first_name || '', contact_id: r.id, do_not_email: r.do_not_email })),
          sent_by: sentBy,
        }
      : {
          name: name || subject,
          subject,
          preheader,
          html_body: effectiveHtml,
          from_name: fromName || undefined,
          from_email: fromEmail || undefined,
          reply_to: replyTo || null,
          append_signature: sigOn && hasSignature(fromEmail),
          audience_filter: testOnly ? { test: true } : null,
          recipients: payloadRecipients,
          sent_by: sentBy,
          ignoreCooldown: negeerCooldown,
        };

    try {
      const resp = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) {
        // Toon ook Resend's eigen foutdetail, zodat de echte oorzaak zichtbaar is
        // i.p.v. alleen de generieke tekst (bv. "broadcast versturen faalde").
        const detail = data?.detail
          ? (typeof data.detail === 'string' ? data.detail : (data.detail.message || JSON.stringify(data.detail)))
          : '';
        throw new Error((data?.error || `HTTP ${resp.status}`) + (detail ? ` - ${detail}` : ''));
      }
      if (useBroadcast) {
        setResult({ ok: true, sent: data.recipients, failed: data.failed || 0, testOnly: false });
      } else {
        setResult({ ok: true, sent: data.sent, failed: data.failed, testOnly });
      }
      if (!testOnly && onSent) onSent(data);
    } catch (e) {
      setResult({ ok: false, error: e.message });
    }
    setBusy(false);
  };

  const recipientsWithEmail = recipients.filter(r => r.email).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Campaign name</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Glint newsletter mei 2026"
            style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Audience</div>
          <div style={{ padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--fill-1)', fontSize: 12, color: 'var(--text-2)' }}>
            {recipients.length} contact{recipients.length !== 1 ? 's' : ''} ({recipientsWithEmail} with email)
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Verzenden via</div>
        <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="radio" name="sendmode" checked={sendMode === 'broadcast'} disabled={tokenModus}
              onChange={() => setSendMode('broadcast')} />
            Newsletter (Broadcast) <span style={{ color: 'var(--text-3)' }}>· marketingplan, personalisatie: voornaam</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="radio" name="sendmode" checked={sendMode === 'transactional'} onChange={() => setSendMode('transactional')} />
            Transactioneel (1-op-1)
          </label>
          {tokenModus && (
            /* Toelichting, geen foutmelding. Stond eerst in waarschuwingsoranje en
               begon met wat er niet kan; dat las als een blokkade terwijl er niets
               mis is. Nu eerst wat er gebeurt, dan pas waarom Broadcast afvalt. */
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Deze mail krijgt een eigen link per ontvanger, dus kies Transactioneel.
              Broadcast kan dat niet: Resend maakt daar een body voor de hele lijst,
              en dan zou iedereen dezelfde link krijgen.
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>From</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={fromName} onChange={e => setFromName(e.target.value)}
              placeholder="Weergavenaam" style={{ ...inputStyle, flex: 1 }} />
            <select value={fromEmail}
              onChange={e => {
                const email = e.target.value;
                setFromEmail(email);
                // Vul de weergavenaam automatisch mee bij een ander adres; blijft bewerkbaar.
                const s = SENDERS.find(x => x.email === email);
                if (s) setFromName(s.name);
                // Handtekening-default volgt de afzender (aan bij een persoon).
                setSigOn(hasSignature(email));
              }}
              style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
              {SENDERS.map(s => <option key={s.email} value={s.email}>{s.email}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Reply-to (optional)</div>
          <input value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder={sentBy} style={inputStyle} />
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={utmOn} onChange={e => setUtmOn(e.target.checked)} />
        <span>
          Links taggen voor Analytics
          <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>
            {utmCampaign
              ? `- eigen links krijgen utm_campaign=${utmCampaign}, zodat je in de Analytics-tab ziet wat deze mail opleverde`
              : '- vul eerst een naam of onderwerp in, dat wordt de campagnenaam in Analytics'}
          </span>
        </span>
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: hasSignature(fromEmail) ? 'pointer' : 'default' }}>
        <input type="checkbox" checked={sigOn && hasSignature(fromEmail)} disabled={!hasSignature(fromEmail)}
          onChange={e => setSigOn(e.target.checked)} />
        <span>
          Handtekening toevoegen
          <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>
            {hasSignature(fromEmail)
              ? `- handtekening van ${senderNameFor(fromEmail)}, zichtbaar in de test-mail (niet in de preview)`
              : '- geen handtekening bekend voor dit afzenderadres'}
          </span>
        </span>
      </label>

      <div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Subject</div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Viva Glint &amp; Pulse - May update" style={inputStyle} />
      </div>

      <div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Preheader</div>
        <input value={preheader} onChange={e => setPreheader(e.target.value)} placeholder="Copilot highlights, admin change…" style={inputStyle} />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Keuze boven het linkerframe: HTML of platte tekst */}
            <div style={{ display: 'inline-flex', border: '0.5px solid var(--sep)', borderRadius: 6, overflow: 'hidden' }}>
              <button type="button" className={bodyMode === 'html' ? 'btn-primary tiny' : 'btn-ghost tiny'}
                style={{ borderRadius: 0 }} onClick={() => setBodyMode('html')}>HTML</button>
              <button type="button" className={bodyMode === 'text' ? 'btn-primary tiny' : 'btn-ghost tiny'}
                style={{ borderRadius: 0 }} onClick={() => setBodyMode('text')}>Plain text</button>
            </div>
            {bodyMode === 'html' && (
              <>
                <button type="button" className="btn-ghost tiny" onClick={() => fileInputRef.current?.click()}>
                  📁 Open file…
                </button>
                <input ref={fileInputRef} type="file" accept=".html,.htm,text/html"
                  onChange={loadHtmlFromFile}
                  style={{ display: 'none' }} />
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'var(--text-3)', marginRight: 2 }}>Invoegen:</span>
            {KNOWN_VARS.map(v => (
              <button key={v} type="button" className="btn-ghost tiny"
                title={`Voegt {{${v}}} in - wordt per ontvanger vervangen`}
                onClick={() => insertVar(`{{${v}}}`)}>
                + {VAR_LABELS[v] || v}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, height: 380 }}>
          {bodyMode === 'text' ? (
            <textarea ref={bodyRef} value={textBody} onChange={e => setTextBody(e.target.value)}
              placeholder={'Typ hier je bericht in gewone tekst.\n\nRegels en witregels blijven behouden, links (https://…) worden klikbaar, en {{first_name}} wordt per ontvanger ingevuld.'}
              style={{ ...inputStyle, resize: 'none', height: '100%', padding: 10, fontSize: 13, lineHeight: 1.5 }} />
          ) : (
            <textarea ref={bodyRef} value={htmlBody} onChange={e => setHtmlBody(e.target.value)}
              placeholder="<html>...</html>"
              spellCheck={false}
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)', resize: 'none', height: '100%', padding: 10, fontSize: 11 }} />
          )}
          <iframe title="preview" srcDoc={previewHtml}
            sandbox=""
            style={{ width: '100%', height: '100%', border: '0.5px solid var(--sep)', borderRadius: 6, background: '#fff' }} />
        </div>
      </div>

      {result && (
        <div style={{ fontSize: 12, color: result.ok ? 'var(--good)' : 'var(--danger)' }}>
          {result.ok
            ? `✓ ${result.testOnly ? 'Test sent to ' + sentBy : `Sent ${result.sent} email${result.sent !== 1 ? 's' : ''}, ${result.failed} failed`}`
            : `✗ ${result.error}`}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn-ghost tiny" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn-ghost tiny" onClick={() => send(true)} disabled={busy || !subject.trim() || !hasBody}>
          {busy ? 'Sending…' : 'Test send → me'}
        </button>
        <button className="btn-primary tiny" onClick={() => {
          if (!confirm(`Send "${subject}" to ${recipientsWithEmail} recipients?`)) return;
          send(false);
        }} disabled={busy || recipientsWithEmail === 0 || !subject.trim() || !hasBody}>
          {busy ? 'Sending…' : `Send to ${recipientsWithEmail} recipient${recipientsWithEmail !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Spamcheck. Twee knoppen die zeggen wat ze doen, want met OK en
          Annuleren verstuurden ze allebei, alleen naar een andere groep, en
          was er geen enkele manier om ertussenuit te stappen. */}
      {spamVraag && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}
          onClick={() => beantwoordSpam('niet')}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 10,
            padding: 18, maxWidth: 480, width: '100%', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Spamcheck</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
              {spamVraag.skip} van de {spamVraag.totaal} ontvanger(s) kregen in de
              afgelopen {COOLDOWN_DAGEN} dagen al een campagnemail van ons.
            </div>
            <div style={{
              fontSize: 12, color: 'var(--text-3)', background: 'var(--fill-1)',
              borderRadius: 6, padding: '6px 8px', wordBreak: 'break-word',
            }}>
              {spamVraag.voorbeeld}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
              Verzend toch stuurt naar alle {spamVraag.totaal}, en zet ook de cooldown
              aan de serverkant opzij. Zonder dat zouden dezelfde mensen daar alsnog
              stil worden overgeslagen.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn-ghost tiny" onClick={() => beantwoordSpam('niet')}>
                Verzend niet
              </button>
              <button className="btn-primary tiny" onClick={() => beantwoordSpam('toch')}>
                Verzend toch ({spamVraag.totaal})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Zet platte tekst om naar nette, veilige HTML voor verzending/preview:
// - HTML wordt ge-escaped (geen injectie vanuit gewone tekst)
// - http(s)-links worden klikbaar (URL zelf blijft ongewijzigd in de href)
// - regelafbrekingen worden <br>
// - merge-vars zoals {{first_name}} blijven onaangeroerd (worden later ingevuld)
function plainTextToHtml(text) {
  const raw = String(text || '');
  const urlRe = /(https?:\/\/[^\s<]+)/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = urlRe.exec(raw)) !== null) {
    out += escapeHtml(raw.slice(last, m.index));
    const url = m[0];
    const safeHref = url.replace(/"/g, '%22');
    out += `<a href="${safeHref}" style="color:#2563eb">${escapeHtml(url)}</a>`;
    last = m.index + url.length;
  }
  out += escapeHtml(raw.slice(last));
  out = out.replace(/\r\n|\r|\n/g, '<br>');
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">${out}</div>`;
}
