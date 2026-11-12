// Admin → E-mailreputatie: de DMARC-rapporten leesbaar gemaakt.
//
// WAAROM DEZE TAB BESTAAT
//   Elke grote ontvanger stuurt dagelijks een XML-rapport met wie er namens
//   eclectik.co mailt en of SPF en DKIM slaagden. Dat is de enige plek waar je
//   een kapotte verzendweg ziet voordat een klant klaagt dat de mail in de
//   spambox staat. In november 2026 bleek de SPF-regel maandenlang stuk en
//   stond het antwoord al die tijd in deze rapporten, die nergens aankwamen.
//
// UPLOADEN EN NIET OPHALEN, VOORLOPIG
//   Automatisch ophalen vraagt om een postvak dat de rapporten ontvangt. Zolang
//   dat er niet is, is slepen de enige weg die vandaag werkt. De inleeslogica
//   staat los in src/lib/dmarc-parse.js, dus een cron die straks een postvak
//   leegtrekt gebruikt precies dezelfde functie.
//
// HET INLEZEN GEBEURT IN DE BROWSER
//   Uitpakken en XML lezen kan hier net zo goed, en het scheelt een
//   serverfunctie plus het heen en weer sturen van bestanden. De rijen gaan via
//   de gewone Supabase-client naar binnen, net als elders in deze tab.
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../lib/auth';
import { leesDmarcBestand } from '../lib/dmarc-parse';
import { vatSamen, oordeel, periodeTekst } from '../lib/dmarc-overzicht';

const KLEUR = {
  groen: { rand: 'rgba(21,128,61,0.35)', vlak: 'rgba(21,128,61,0.08)', tekst: '#15803d' },
  oranje: { rand: 'rgba(180,83,9,0.35)', vlak: 'rgba(180,83,9,0.08)', tekst: '#b45309' },
  rood: { rand: 'rgba(185,28,28,0.35)', vlak: 'rgba(185,28,28,0.08)', tekst: '#b91c1c' },
  grijs: { rand: 'var(--sep)', vlak: 'transparent', tekst: 'var(--text-3)' },
};

export default function DmarcPanel() {
  const { session } = useAuth();
  const [rapporten, setRapporten] = useState([]);
  const [regels, setRegels] = useState([]);
  const [laden, setLaden] = useState(true);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState(null);
  const [fouten, setFouten] = useState([]);
  const invoer = useRef(null);

  const laad = useCallback(async () => {
    setLaden(true);
    const { data: reps } = await supabase.from('dmarc_report')
      .select('*').order('date_begin', { ascending: false });
    const { data: rows } = await supabase.from('dmarc_record')
      .select('*').order('aantal', { ascending: false });
    setRapporten(reps || []);
    setRegels(rows || []);
    setLaden(false);
  }, []);

  useEffect(() => { laad(); }, [laad]);

  const verwerk = async (bestanden) => {
    if (!bestanden?.length) return;
    setBezig(true);
    setMelding(null);
    const mislukt = [];
    let gelukt = 0;
    let dubbel = 0;

    for (const f of bestanden) {
      try {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const { report, records } = await leesDmarcBestand(bytes, f.name);
        const { data: kop, error } = await supabase.from('dmarc_report')
          .insert({ ...report, ingelezen_door: session?.user?.email || null })
          .select('id').single();
        if (error) {
          // 23505 is de unieke sleutel: ditzelfde rapport zit er al in. Dat is
          // geen fout maar de bedoeling, en het hoort ook zo te lezen.
          if (error.code === '23505') { dubbel++; continue; }
          throw new Error(error.message);
        }
        if (records.length) {
          const { error: rErr } = await supabase.from('dmarc_record')
            .insert(records.map(r => ({ ...r, report_id: kop.id })));
          // De kop staat er al, de regels niet. Die kop weghalen, anders telt
          // hij als ingelezen mee terwijl er niets onder hangt en blokkeert hij
          // bij de volgende poging de unieke sleutel.
          if (rErr) {
            await supabase.from('dmarc_report').delete().eq('id', kop.id);
            throw new Error(rErr.message);
          }
        }
        gelukt++;
      } catch (e) {
        mislukt.push({ naam: f.name, reden: e.message });
      }
    }

    setFouten(mislukt);
    const delen = [];
    if (gelukt) delen.push(`${gelukt} ${gelukt === 1 ? 'rapport' : 'rapporten'} ingelezen`);
    if (dubbel) delen.push(`${dubbel} ${dubbel === 1 ? 'stond' : 'stonden'} er al in`);
    if (mislukt.length) delen.push(`${mislukt.length} mislukt`);
    setMelding(delen.join(', ') || 'Niets te doen');
    setBezig(false);
    if (invoer.current) invoer.current.value = '';
    if (gelukt) laad();
  };

  const samen = vatSamen(regels);
  const uitspraak = oordeel(samen);
  const kleur = KLEUR[uitspraak.kleur] || KLEUR.grijs;
  const periode = periodeTekst(rapporten);

  const th = { textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-dim, #888)', padding: '6px 10px', borderBottom: '0.5px solid var(--sep)' };
  const td = { fontSize: 13, padding: '8px 10px', borderBottom: '0.5px solid var(--sep)', verticalAlign: 'top' };

  return (
    <div>
      {/* Het oordeel bovenaan, want dat is waar je voor komt. De tabel eronder
          legt uit waaróm, en die lees je alleen als het oordeel daar aanleiding
          toe geeft. */}
      <div style={{
        border: `0.5px solid ${kleur.rand}`, background: kleur.vlak,
        borderRadius: 8, padding: '12px 14px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: kleur.tekst, marginBottom: 4 }}>
          {uitspraak.tekst}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {samen.totaal > 0
            ? <>{samen.totaal.toLocaleString('nl-NL')} berichten in {rapporten.length}{' '}
              {rapporten.length === 1 ? 'rapport' : 'rapporten'}{periode ? `, ${periode}` : ''}.</>
            : 'Sleep hieronder de rapportbestanden erin die je van Google, Microsoft of Barracuda krijgt.'}
        </div>
      </div>

      {/* Uploaden. Accepteert losse bestanden en hele mappen tegelijk, want ze
          komen per stuk per dag per rapporteur binnen en dat zijn er snel
          tientallen. */}
      <div style={{ marginBottom: 20 }}>
        <input ref={invoer} type="file" multiple
          accept=".xml,.gz,.zip,application/gzip,application/zip,text/xml"
          disabled={bezig}
          onChange={e => verwerk([...e.target.files])}
          style={{ fontSize: 12 }} />
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 10 }}>
          {bezig ? 'Bezig met inlezen…' : 'XML, .gz of .zip. Meerdere tegelijk mag.'}
        </span>
        {melding && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>{melding}</div>
        )}
        {fouten.length > 0 && (
          <div style={{
            fontSize: 12, color: '#b91c1c', background: 'rgba(185,28,28,0.08)',
            border: '0.5px solid rgba(185,28,28,0.35)', borderRadius: 6,
            padding: '6px 10px', marginTop: 8,
          }}>
            {fouten.map(f => <div key={f.naam}><b>{f.naam}</b>: {f.reden}</div>)}
          </div>
        )}
      </div>

      {laden ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim, #888)' }}>Laden…</div>
      ) : samen.totaal === 0 ? null : (
        <>
          {/* Wat faalt staat apart en bovenaan. In de grote tabel zou het
              wegvallen tussen de bronnen die het goed doen, en juist dit is
              waar je iets mee moet. */}
          {samen.probleembronnen.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Hier gaat het mis
              </div>
              <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--fill-1)' }}>
                    <tr>{['Bron', 'Mislukt', 'SPF', 'DKIM', 'IP-adressen'].map(h => (
                      <th key={h} style={th}>{h}</th>))}</tr>
                  </thead>
                  <tbody>
                    {samen.probleembronnen.map(b => (
                      <tr key={b.naam}>
                        <td style={{ ...td, fontWeight: 500 }}>{b.naam}</td>
                        <td style={{ ...td, color: '#b91c1c', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {b.gefaald.toLocaleString('nl-NL')}
                          {b.geslaagd > 0 && (
                            <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>
                              {' '}van {b.totaal.toLocaleString('nl-NL')}
                            </span>
                          )}
                        </td>
                        <td style={td}>{b.spfFouten.join(', ') || '-'}</td>
                        <td style={td}>{b.dkimFouten.join(', ') || '-'}</td>
                        <td style={{ ...td, fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
                          {b.ips.slice(0, 4).join(', ')}
                          {b.ips.length > 4 ? ` en ${b.ips.length - 4} meer` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
                Een eigen dienst die hier staat, is verkeerd ingesteld en moet gerepareerd.
                Een onbekende bron is meestal iemand die zich voordoet als ons, of een mail
                die door iemand is doorgestuurd. Daar valt niets aan te repareren; DMARC
                strenger zetten is dan het antwoord.
              </div>
            </div>
          )}

          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Alle verzenders</div>
          <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--fill-1)' }}>
                <tr>{['Bron', 'Berichten', 'Geslaagd', 'Mislukt', 'IP-adressen'].map(h => (
                  <th key={h} style={th}>{h}</th>))}</tr>
              </thead>
              <tbody>
                {samen.bronnen.map(b => (
                  <tr key={b.naam}>
                    <td style={{ ...td, fontWeight: 500 }}>{b.naam}</td>
                    <td style={td}>{b.totaal.toLocaleString('nl-NL')}</td>
                    <td style={{ ...td, color: b.geslaagd ? '#15803d' : 'var(--text-3)' }}>
                      {b.geslaagd.toLocaleString('nl-NL')}
                    </td>
                    <td style={{ ...td, color: b.gefaald ? '#b91c1c' : 'var(--text-3)' }}>
                      {b.gefaald ? b.gefaald.toLocaleString('nl-NL') : '0'}
                    </td>
                    <td style={{ ...td, fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
                      {b.ips.slice(0, 3).join(', ')}
                      {b.ips.length > 3 ? ` en ${b.ips.length - 3} meer` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* De rapporten zelf, zodat te zien is wat er ingelezen is en van
              wanneer. Zonder dit weet je niet of een stille week betekent dat
              alles goed ging of dat er niets geüpload is. */}
          <div style={{ fontSize: 13, fontWeight: 600, margin: '22px 0 8px 0' }}>
            Ingelezen rapporten
          </div>
          <div style={{ border: '0.5px solid var(--sep)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--fill-1)' }}>
                <tr>{['Rapporteur', 'Periode', 'Beleid', 'Bestand'].map(h => (
                  <th key={h} style={th}>{h}</th>))}</tr>
              </thead>
              <tbody>
                {rapporten.map(r => (
                  <tr key={r.id}>
                    <td style={td}>{r.org_name}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      {new Date(r.date_begin).toLocaleDateString('nl-NL')}
                    </td>
                    <td style={td}>
                      <span className="chip" style={{ fontSize: 11 }}>p={r.policy_p || '?'}</span>
                    </td>
                    <td style={{ ...td, color: 'var(--text-3)', fontSize: 11 }}>{r.bestand || '-'}</td>
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
