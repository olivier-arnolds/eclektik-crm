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

// Kleuren per advertentie. Vaste volgorde, nooit doorgedraaid: kleur volgt de
// ADVERTENTIE, niet haar plek in de ranglijst. Filter je op campagne, dan houdt
// wie overblijft dezelfde kleur; anders lijkt het alsof er iets veranderd is aan
// de cijfers terwijl je alleen iets hebt weggeklikt.
//
// Deze zes halen in licht en donker alle controles, ook op kleurenblindheid
// (gevalideerd met de dataviz-validator, slechtste paar dE 8.4 bij protanopie).
// Een zevende advertentie krijgt bewust geen verzonnen kleur maar valt in grijs;
// dan is de legenda nog leesbaar en de tabel eronder geeft de details.
const SERIEKLEUREN = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const REST = '#8b8b86';

const MATEN = [
  { sleutel: 'spend', label: 'Besteed', opmaak: (v) => ef.format(v) },
  { sleutel: 'impressions', label: 'Vertoningen', opmaak: (v) => nf.format(Math.round(v)), geheel: true },
  { sleutel: 'clicks', label: 'Kliks', opmaak: (v) => nf.format(Math.round(v)), geheel: true },
  { sleutel: 'ctr', label: 'CTR', opmaak: (v) => `${df.format(v)}%` },
];

// Welke waarden krijgen een lijn met een label. Bij een maat die alleen hele
// getallen kent heeft een middenlijn op 2,5 kliks geen betekenis, dus die valt
// weg zodra het maximum klein is. Halve kliks op een as laten staan is precies
// het soort detail dat een grafiek ongeloofwaardig maakt.
function asWaarden(maxY, geheel) {
  if (!geheel) return [0, 0.5, 1].map((f) => maxY * f);
  // Bij hele getallen moet de waarde zelf rond zijn, niet alleen het label.
  // Rond je pas bij het opmaken af, dan staat er "3" op de hoogte van 2,5 en
  // wijst de as iets anders aan dan waar de lijn ligt.
  if (maxY <= 4) {
    return Array.from({ length: Math.round(maxY) + 1 }, (_, i) => i);
  }
  return [...new Set([0, Math.round(maxY / 2), Math.round(maxY)])];
}

// Een lijn per advertentie, EEN maat tegelijk.
//
// Eerst stonden besteding en vertoningen samen in dit vak, elk op hun eigen
// schaal. Dat leest makkelijk verkeerd: twee lijnen die elkaar kruisen zeggen
// dan niets, want ze staan niet in dezelfde eenheid. Een maat kiezen en de
// advertenties ertegen afzetten beantwoordt bovendien de vraag die je hier
// stelt, namelijk welke boodschap het beter doet.
function Verloop({ rijen, kleurVan }) {
  const [maat, setMaat] = useState('impressions');
  // De grafiek wordt in ECHTE pixels getekend, niet in een vaste viewBox die
  // meeschaalt. Met een vaste viewBox krimpt bij een smal venster alles mee,
  // ook de aslabels, en die zijn dan niet meer te lezen; bovendien houd je lege
  // banden boven en onder omdat de verhouding niet klopt. Daarom meten we de
  // breedte en rekenen we daarmee.
  const vak = useRef(null);
  const [breedte, setBreedte] = useState(880);
  useEffect(() => {
    const el = vak.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => {
      const b = e?.contentRect?.width;
      if (b && Math.abs(b - breedte) > 2) setBreedte(b);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [breedte]);

  const m = MATEN.find((x) => x.sleutel === maat) || MATEN[0];

  const vorm = useMemo(() => {
    const h = 220, onder = 22, boven = 10, rechts = 10;
    const datums = [...new Set(rijen.map((r) => r.stat_date))].sort();
    if (!datums.length) return null;

    const perAd = new Map();
    for (const r of rijen) {
      if (!perAd.has(r.ad_id)) {
        perAd.set(r.ad_id, { ad_id: r.ad_id, naam: r.ad_headline || r.ad_name || r.ad_id, punten: [] });
      }
      perAd.get(r.ad_id).punten.push(r);
    }

    // Per dag optellen binnen een advertentie: bij meerdere advertentiesets kan
    // dezelfde advertentie twee regels op een dag hebben.
    const reeksen = [...perAd.values()].map((a) => {
      const perDatum = new Map();
      for (const p of a.punten) perDatum.set(p.stat_date, [...(perDatum.get(p.stat_date) || []), p]);
      return {
        ...a,
        waarden: [...perDatum.entries()]
          .map(([d, ps]) => ({ datum: d, ...totalen(ps) }))
          .sort((x, y) => x.datum.localeCompare(y.datum)),
      };
    }).sort((a, b) => String(a.ad_id).localeCompare(String(b.ad_id)));

    const maxRuw = Math.max(...reeksen.flatMap((r) => r.waarden.map((v) => v[maat] || 0)), 0);
    const maxY = maxRuw > 0 ? maxRuw : 1;
    // Ruimte links precies zo breed als het langste aslabel nodig heeft, anders
    // loopt "€ 21,70" over de lijnen of houd je een onnodig gat.
    const links = Math.min(90, Math.max(34, m.opmaak(maxY).length * 7 + 12));
    const w = Math.max(240, breedte);

    const x = (d) => (datums.length === 1
      ? links + (w - links - rechts) / 2
      : links + (datums.indexOf(d) / (datums.length - 1)) * (w - links - rechts));
    const y = (v) => h - onder - ((v || 0) / maxY) * (h - boven - onder);

    return { w, h, links, rechts, onder, datums, reeksen, maxY, x, y };
  }, [rijen, maat, breedte, m]);

  const knop = (actief) => (actief ? 'btn-primary tiny' : 'btn-ghost tiny');

  return (
    <div style={VAK} ref={vak}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {MATEN.map((x) => (
          <button key={x.sleutel} className={knop(maat === x.sleutel)}
            onClick={() => setMaat(x.sleutel)}>{x.label}</button>
        ))}
      </div>

      {/* Legenda. Verplicht bij meer dan een reeks: identiteit mag nooit alleen
          aan kleur hangen, en de kop van de advertentie zegt meer dan het
          volgnummer waar LinkedIn hem onder wegschrijft. */}
      {vorm && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
          {vorm.reeksen.map((r) => (
            <span key={r.ad_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{
                width: 10, height: 10, borderRadius: 2, background: kleurVan(r.ad_id), flex: 'none',
              }} />
              <span style={{ color: 'var(--text-2, var(--text-3))' }}>
                {r.naam.length > 46 ? `${r.naam.slice(0, 46)}\u2026` : r.naam}
              </span>
            </span>
          ))}
        </div>
      )}

      {!vorm ? null : vorm.datums.length === 1 ? (
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Er is maar een dag aan gegevens, dus er valt nog geen verloop te tekenen.
          Exporteer in Campaign Manager een ruimere periode met de uitsplitsing op dag.
        </div>
      ) : (
        <>
          <svg width={vorm.w} height={vorm.h} viewBox={`0 0 ${vorm.w} ${vorm.h}`}
            style={{ display: 'block', maxWidth: '100%' }}
            role="img" aria-label={`${m.label} per advertentie, ${vorm.datums[0]} tot ${vorm.datums[vorm.datums.length - 1]}`}>
            {/* Raster en aslabels terughoudend: de lijnen zijn het onderwerp. */}
            {asWaarden(vorm.maxY, m.geheel).map((waarde) => {
              const yy = vorm.y(waarde);
              return (
                <g key={waarde}>
                  <line x1={vorm.links} x2={vorm.w - vorm.rechts} y1={yy} y2={yy}
                    stroke="var(--sep)" strokeWidth="1" />
                  <text x={vorm.links - 8} y={yy + 4} textAnchor="end"
                    fontSize="11" fill="var(--text-3)">{m.opmaak(waarde)}</text>
                </g>
              );
            })}

            {vorm.reeksen.map((r) => (
              <g key={r.ad_id}>
                <polyline
                  points={r.waarden.map((v) => `${vorm.x(v.datum)},${vorm.y(v[maat])}`).join(' ')}
                  fill="none" stroke={kleurVan(r.ad_id)} strokeWidth="2"
                  strokeLinejoin="round" strokeLinecap="round" />
                {r.waarden.map((v) => (
                  <g key={v.datum}>
                    {/* Ring in de achtergrondkleur, zodat twee punten die elkaar
                        raken los van elkaar te zien blijven. */}
                    <circle cx={vorm.x(v.datum)} cy={vorm.y(v[maat])} r="4"
                      fill={kleurVan(r.ad_id)} stroke="var(--bg, #fff)" strokeWidth="2" />
                    {/* Ruimer trefvlak dan de stip zelf, anders is aanwijzen priegelen. */}
                    <circle cx={vorm.x(v.datum)} cy={vorm.y(v[maat])} r="13" fill="transparent">
                      <title>{`${v.datum} - ${r.naam}\n${m.label}: ${m.opmaak(v[maat])}`}</title>
                    </circle>
                  </g>
                ))}
              </g>
            ))}
          </svg>
          <div style={{
            display: 'flex', justifyContent: 'space-between', fontSize: 10,
            color: 'var(--text-3)', paddingLeft: vorm.links, paddingRight: vorm.rechts,
          }}>
            <span>{vorm.datums[0]}</span>
            <span>{vorm.datums[vorm.datums.length - 1]}</span>
          </div>
        </>
      )}
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

  // Kleur per advertentie, bepaald op ALLE rijen en niet op wat er nu zichtbaar
  // is. Zou hij van de zichtbare selectie afhangen, dan verschiet de grafiek
  // zodra je op campagne filtert of een andere periode kiest, en dat leest als
  // een verandering in de cijfers.
  const kleurVan = useMemo(() => {
    const ids = [...new Set(rijen.map(r => r.ad_id))].sort((a, b) => String(a).localeCompare(String(b)));
    const kaart = new Map(ids.map((id, i) => [id, SERIEKLEUREN[i] || REST]));
    return (id) => kaart.get(id) || REST;
  }, [rijen]);

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

          <Verloop rijen={zichtbaar} kleurVan={kleurVan} />

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
                      <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: 2, flex: 'none',
                          background: kleurVan(a.ad_id),
                        }} />
                        {a.ad_headline || a.ad_name}
                      </div>
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
