import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import {
  leesBestand, totalen, perAdvertentie, perDag, LEEG, ONLEESBAAR, AGGREGAAT,
} from '../lib/linkedin-ads-parse';

// Advertenties-tab onder Marketing. Toont wat LinkedIn-advertenties opleveren.
// Ontwerp: docs/superpowers/specs/2026-09-23-linkedin-ads-tab-design.md
//
// De cijfers komen uit een export die je zelf uit Campaign Manager haalt. Een
// dagelijkse koppeling kan niet: de API vraagt goedkeuring, Campaign Manager kan
// het rapport niet periodiek mailen, en een agent die inlogt zet het
// LinkedIn-account van de outreach op het spel.
//
// Bewust geen grafiekbibliotheek, net als in marketing-analytics.jsx.

const nf = new Intl.NumberFormat('nl-NL');
const ef = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
const df = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PERIODES = [
  { dagen: 7, label: '7 dagen' },
  { dagen: 28, label: '28 dagen' },
  { dagen: 90, label: '90 dagen' },
  { dagen: 0, label: 'Alles' },
];

const VAK = {
  border: '0.5px solid var(--sep)', borderRadius: 8, padding: '10px 12px',
};

function Tegel({ label, waarde, toelichting }) {
  return (
    <div style={{ ...VAK, flex: '1 1 140px' }}>
      <div style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
      }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>{waarde}</div>
      {toelichting && <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{toelichting}</div>}
    </div>
  );
}

// Twee lijnen in een vaste viewBox: besteding en kliks delen de x-as maar hebben
// een eigen schaal, want euro's en kliks liggen een orde uit elkaar.
function Verloop({ dagen }) {
  const vorm = useMemo(() => {
    const w = 1000, h = 200, pad = 32;
    if (!dagen.length) return null;
    const maxSpend = Math.max(0.01, ...dagen.map(d => d.spend));
    const maxImpr = Math.max(1, ...dagen.map(d => d.impressions));
    const stap = dagen.length > 1 ? (w - pad * 2) / (dagen.length - 1) : 0;
    const pad_ = (veld, max) => dagen
      .map((d, i) => `${pad + i * stap},${h - pad - ((d[veld] || 0) / max) * (h - pad * 2)}`)
      .join(' ');
    return {
      w, h, pad, maxSpend, maxImpr,
      besteding: pad_('spend', maxSpend),
      vertoningen: pad_('impressions', maxImpr),
      punten: dagen.map((d, i) => ({
        x: pad + i * stap,
        y: h - pad - ((d.spend || 0) / maxSpend) * (h - pad * 2),
        d,
      })),
    };
  }, [dagen]);

  if (!vorm) return null;
  if (dagen.length === 1) {
    return (
      <div style={{ ...VAK, fontSize: 12, color: 'var(--text-3)' }}>
        Er is maar één dag aan gegevens, dus er valt nog geen verloop te tekenen.
        Exporteer in Campaign Manager een ruimere periode met uitsplitsing per dag.
      </div>
    );
  }
  return (
    <div style={VAK}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>
        <span style={{ color: '#2563eb' }}>■</span> besteding{'  '}
        <span style={{ color: '#16a34a' }}>■</span> vertoningen
      </div>
      <svg viewBox={`0 0 ${vorm.w} ${vorm.h}`} preserveAspectRatio="none"
        style={{ width: '100%', height: 200 }}>
        <polyline points={vorm.vertoningen} fill="none" stroke="#16a34a" strokeWidth="2" />
        <polyline points={vorm.besteding} fill="none" stroke="#2563eb" strokeWidth="2" />
        {vorm.punten.map((p) => (
          <circle key={p.d.datum} cx={p.x} cy={p.y} r="3" fill="#2563eb">
            <title>{`${p.d.datum}: ${ef.format(p.d.spend)}, ${nf.format(p.d.impressions)} vertoningen, ${nf.format(p.d.clicks)} kliks`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)' }}>
        <span>{dagen[0].datum}</span>
        <span>{dagen[dagen.length - 1].datum}</span>
      </div>
    </div>
  );
}

export default function MarketingAds() {
  const [rijen, setRijen] = useState([]);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState(null);
  const [periode, setPeriode] = useState(28);
  const [campagne, setCampagne] = useState('');
  const [voorbeeld, setVoorbeeld] = useState(null);   // wat een upload gaat doen
  const [meldingen, setMeldingen] = useState([]);     // lege of onleesbare bestanden
  const [bezig, setBezig] = useState(false);
  const [sleep, setSleep] = useState(false);
  const invoer = useRef(null);

  const ophalen = useCallback(async () => {
    setLaden(true);
    const { data, error } = await supabase
      .from('linkedin_ad_stats')
      .select('*')
      .order('stat_date', { ascending: true })
      .limit(20000);
    if (error) setFout(error.message);
    else { setRijen(data || []); setFout(null); }
    setLaden(false);
  }, []);

  useEffect(() => { ophalen(); }, [ophalen]);

  // Lezen en klaarzetten. Bewust nog niet wegschrijven: eerst tonen wat er gaat
  // gebeuren, want een verkeerd bestand is makkelijker tegen te houden dan terug
  // te draaien.
  const verwerkBestanden = useCallback(async (bestanden) => {
    const alle = [];
    const problemen = [];
    for (const f of bestanden) {
      try {
        const r = await leesBestand(f);
        if (r.fout) problemen.push({ soort: r.fout, tekst: r.melding });
        else alle.push(...r.rijen.map(x => ({ ...x, source_file: f.name })));
      } catch (e) {
        problemen.push({ soort: ONLEESBAAR, tekst: `${f.name} kon niet gelezen worden: ${e.message}` });
      }
    }
    setMeldingen(problemen);
    if (!alle.length) { setVoorbeeld(null); return; }

    const bestaand = new Set(rijen.map(r => `${r.stat_date}|${r.ad_id}`));
    const sleutels = new Set();
    const uniek = [];
    // Binnen één upload kan dezelfde sleutel twee keer voorkomen als je twee
    // overlappende exports tegelijk sleept. De laatste wint, net als bij de
    // upsert; anders zou de database er een willekeurige van de twee kiezen.
    for (const r of alle) {
      const k = `${r.stat_date}|${r.ad_id}`;
      if (sleutels.has(k)) uniek[uniek.findIndex(x => `${x.stat_date}|${x.ad_id}` === k)] = r;
      else { sleutels.add(k); uniek.push(r); }
    }
    const nieuw = uniek.filter(r => !bestaand.has(`${r.stat_date}|${r.ad_id}`)).length;
    const datums = uniek.map(r => r.stat_date).sort();
    setVoorbeeld({
      rijen: uniek,
      nieuw,
      bijgewerkt: uniek.length - nieuw,
      van: datums[0],
      tot: datums[datums.length - 1],
      campagnes: [...new Set(uniek.map(r => r.campaign_name).filter(Boolean))],
    });
  }, [rijen]);

  const opslaan = useCallback(async () => {
    if (!voorbeeld) return;
    setBezig(true);
    const { error } = await supabase
      .from('linkedin_ad_stats')
      .upsert(voorbeeld.rijen, { onConflict: 'stat_date,ad_id' });
    setBezig(false);
    if (error) { setFout(error.message); return; }
    setVoorbeeld(null);
    setMeldingen([]);
    ophalen();
  }, [voorbeeld, ophalen]);

  const zichtbaar = useMemo(() => {
    let r = rijen;
    if (campagne) r = r.filter(x => x.campaign_name === campagne);
    if (periode > 0) {
      const grens = new Date(Date.now() - periode * 86400000).toISOString().slice(0, 10);
      r = r.filter(x => x.stat_date >= grens);
    }
    return r;
  }, [rijen, campagne, periode]);

  const t = useMemo(() => totalen(zichtbaar), [zichtbaar]);
  const advertenties = useMemo(() => perAdvertentie(zichtbaar), [zichtbaar]);
  const dagen = useMemo(() => perDag(zichtbaar), [zichtbaar]);
  const campagnes = useMemo(
    () => [...new Set(rijen.map(r => r.campaign_name).filter(Boolean))].sort(), [rijen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Uploadvak */}
      <div
        onDragOver={(e) => { e.preventDefault(); setSleep(true); }}
        onDragLeave={() => setSleep(false)}
        onDrop={(e) => {
          e.preventDefault(); setSleep(false);
          verwerkBestanden([...e.dataTransfer.files]);
        }}
        style={{
          ...VAK,
          borderStyle: 'dashed',
          borderColor: sleep ? 'var(--accent, #2563eb)' : 'var(--sep)',
          background: sleep ? 'var(--bg-2, transparent)' : 'transparent',
          textAlign: 'center', padding: '16px 12px',
        }}>
        <div style={{ fontSize: 13 }}>
          Sleep hier de export uit Campaign Manager, of{' '}
          <button className="btn-ghost tiny" onClick={() => invoer.current?.click()}>kies bestanden</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
          Meerdere bestanden mag, Nederlands of Engels. Kies in Campaign Manager de hele
          looptijd met de uitsplitsing op dag: zonder die uitsplitsing telt de export de
          hele periode op tot één regel, en dan zijn het geen dagcijfers meer.
        </div>
        <input ref={invoer} type="file" multiple accept=".csv,.tsv,.txt" style={{ display: 'none' }}
          onChange={(e) => { verwerkBestanden([...e.target.files]); e.target.value = ''; }} />
      </div>

      {/* Drie uitkomsten, drie toonzettingen, want de gebruiker moet er iets
          anders mee:
            leeg       grijs   normaal, er was die periode geen activiteit
            aggregaat  oranje  verkeerde exportinstelling, opnieuw exporteren
            onleesbaar rood    verkeerd bestand
          Ze op één hoop gooien laat iemand zoeken naar een fout die er niet is. */}
      {meldingen.map((m, i) => {
        const kleur = m.soort === LEEG ? null : m.soort === AGGREGAAT ? '#b45309' : '#dc2626';
        return (
          <div key={i} style={{
            ...VAK, fontSize: 12,
            borderColor: kleur || 'var(--sep)',
            color: kleur || 'var(--text-3)',
          }}>{m.tekst}</div>
        );
      })}

      {/* Bevestiging vooraf */}
      {voorbeeld && (
        <div style={{ ...VAK, borderColor: '#2563eb' }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            <strong>{nf.format(voorbeeld.rijen.length)}</strong> regels gelezen over{' '}
            {voorbeeld.van === voorbeeld.tot ? voorbeeld.van : `${voorbeeld.van} tot en met ${voorbeeld.tot}`}
            {voorbeeld.campagnes.length > 0 && <> voor {voorbeeld.campagnes.join(', ')}</>}.
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
            {nf.format(voorbeeld.nieuw)} nieuw, {nf.format(voorbeeld.bijgewerkt)} wordt bijgewerkt.
            Bijwerken overschrijft; er wordt niets dubbel geteld.
          </div>
          <button className="btn-primary tiny" disabled={bezig} onClick={opslaan}>
            {bezig ? 'Bezig…' : 'Opslaan'}
          </button>{' '}
          <button className="btn-ghost tiny" disabled={bezig}
            onClick={() => { setVoorbeeld(null); setMeldingen([]); }}>Annuleren</button>
        </div>
      )}

      {fout && <div style={{ ...VAK, borderColor: '#dc2626', color: '#dc2626', fontSize: 12 }}>{fout}</div>}

      {laden && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Laden…</div>}

      {!laden && !rijen.length && !voorbeeld && (
        <div style={{ ...VAK, fontSize: 12, color: 'var(--text-3)' }}>
          Nog geen advertentiegegevens. Upload een export om te beginnen.
        </div>
      )}

      {!laden && rijen.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {PERIODES.map(p => (
              <button key={p.dagen}
                className={periode === p.dagen ? 'btn-primary tiny' : 'btn-ghost tiny'}
                onClick={() => setPeriode(p.dagen)}>{p.label}</button>
            ))}
            {campagnes.length > 1 && (
              <select value={campagne} onChange={(e) => setCampagne(e.target.value)}
                style={{ fontSize: 12, marginLeft: 8 }}>
                <option value="">Alle campagnes</option>
                {campagnes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>
              {nf.format(dagen.length)} {dagen.length === 1 ? 'dag' : 'dagen'} met activiteit
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Tegel label="Besteed" waarde={ef.format(t.spend)} />
            <Tegel label="Vertoningen" waarde={nf.format(t.impressions)} />
            <Tegel label="Kliks" waarde={nf.format(t.clicks)} />
            <Tegel label="CTR" waarde={`${df.format(t.ctr)}%`} toelichting="kliks per vertoning" />
            <Tegel label="Kosten per klik" waarde={t.clicks ? ef.format(t.cpc) : '–'}
              toelichting={t.clicks ? null : 'nog geen kliks'} />
            <Tegel label="Kosten per 1.000" waarde={ef.format(t.cpm)} toelichting="vertoningen" />
          </div>

          <Verloop dagen={dagen} />

          {/* Per advertentie, met de tekst erbij. Dat is de hele reden voor deze
              tabel: je wilt niet weten dat advertentie 1 beter loopt, je wilt
              weten welke boodschap beter loopt. */}
          <div style={VAK}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
              Per advertentie
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-3)' }}>
                  <th style={{ padding: '4px 6px' }}>Advertentie</th>
                  <th style={{ padding: '4px 6px', textAlign: 'right' }}>Besteed</th>
                  <th style={{ padding: '4px 6px', textAlign: 'right' }}>Vertoningen</th>
                  <th style={{ padding: '4px 6px', textAlign: 'right' }}>Kliks</th>
                  <th style={{ padding: '4px 6px', textAlign: 'right' }}>CTR</th>
                  <th style={{ padding: '4px 6px', textAlign: 'right' }}>Per klik</th>
                </tr>
              </thead>
              <tbody>
                {advertenties.map(a => (
                  <tr key={a.ad_id} style={{ borderTop: '0.5px solid var(--sep)' }}>
                    <td style={{ padding: '6px' }}>
                      <div style={{ fontWeight: 500 }}>{a.ad_headline || a.ad_name}</div>
                      {a.ad_intro && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', maxWidth: 520 }}>
                          {a.ad_intro.length > 140 ? `${a.ad_intro.slice(0, 140)}…` : a.ad_intro}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                        {a.campaign_name} · {a.ad_name} · {a.dagen} {a.dagen === 1 ? 'dag' : 'dagen'}
                      </div>
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{ef.format(a.spend)}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{nf.format(a.impressions)}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{nf.format(a.clicks)}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{df.format(a.ctr)}%</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>
                      {a.clicks ? ef.format(a.cpc) : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
