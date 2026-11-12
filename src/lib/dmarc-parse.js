// Een DMARC-aggregaatrapport inlezen: uitpakken en de XML omzetten naar rijen.
//
// WAT ER BINNENKOMT
//   Elke rapporterende partij pakt het anders in. Google stuurt .zip, Yahoo en
//   Microsoft sturen .gz, en sommige partijen sturen de XML kaal. Alle drie
//   komen hier langs dezelfde deur binnen, want degene die het bestand uploadt
//   hoort daar niet over na te hoeven denken.
//
// GEEN BIBLIOTHEEK VOOR DE XML
//   Een DMARC-rapport is een vast, klein schema zonder namespaces, attributen
//   of CDATA. Een XML-bibliotheek zou een afhankelijkheid toevoegen die we voor
//   precies dit ene bestandstype binnenhalen. De lezer hieronder is bewust
//   beperkt tot wat dit schema gebruikt, en valt om bij alles daarbuiten in
//   plaats van er iets van te maken.
//
// ALLES IS PUUR EN TESTBAAR
//   Uitpakken gebruikt DecompressionStream, die zowel in de browser als in Node
//   bestaat. Daardoor draaien de tests zonder browser, en dat is precies waarom
//   deze logica hier staat en niet in de weergave.

/** Een XML-element als {naam, kinderen, tekst}. Alleen wat dit schema kent. */
function leesXml(tekst) {
  const schoon = String(tekst)
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const stapel = [{ naam: '#root', kinderen: [], tekst: '' }];
  // Eén reguliere uitdrukking over de tags heen; wat ertussen staat is tekst.
  const tags = /<\s*(\/?)\s*([A-Za-z0-9_:.-]+)([^>]*?)(\/?)\s*>/g;
  let m;
  let pos = 0;
  while ((m = tags.exec(schoon)) !== null) {
    const [heel, sluit, naam, , zelfsluitend] = m;
    const tussen = schoon.slice(pos, m.index);
    pos = m.index + heel.length;
    if (tussen.trim()) stapel[stapel.length - 1].tekst += tussen;
    if (sluit) {
      if (stapel.length > 1) stapel.pop();
      continue;
    }
    const knoop = { naam, kinderen: [], tekst: '' };
    stapel[stapel.length - 1].kinderen.push(knoop);
    if (!zelfsluitend) stapel.push(knoop);
  }
  return stapel[0];
}

/** Het eerste kind met deze naam, of null. */
function kind(knoop, naam) {
  return (knoop?.kinderen || []).find(k => k.naam === naam) || null;
}

/** Alle kinderen met deze naam. */
function kinderen(knoop, naam) {
  return (knoop?.kinderen || []).filter(k => k.naam === naam);
}

/** De tekst onder een pad als 'policy_published > p'. Leeg wordt null. */
function tekst(knoop, ...pad) {
  let n = knoop;
  for (const stap of pad) {
    n = kind(n, stap);
    if (!n) return null;
  }
  const t = ontsnap(n.tekst).trim();
  return t || null;
}

function ontsnap(s) {
  return String(s ?? '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Een getal, of null als er niets bruikbaars staat. */
function getal(waarde) {
  if (waarde === null || waarde === undefined || waarde === '') return null;
  const n = Number(waarde);
  return Number.isFinite(n) ? n : null;
}

/**
 * Een unix-tijd uit het rapport naar ISO.
 *
 * DMARC-rapporten geven seconden, geen milliseconden. Dat verschil van duizend
 * zet een rapport van vandaag in 1970, en dan valt het buiten elk filter op
 * periode zonder dat er een foutmelding komt.
 */
function tijd(seconden) {
  const n = getal(seconden);
  if (n === null) return null;
  return new Date(n * 1000).toISOString();
}

/**
 * De XML van één rapport naar {report, records}.
 *
 * @throws als het geen DMARC-rapport is. Dat is expres: een onherkenbaar
 *   bestand half inlezen levert een rapport op met nul regels, en dat leest
 *   als 'geen mail verstuurd' in plaats van als 'verkeerd bestand'.
 */
export function parseDmarcXml(xml, bestand = null) {
  const wortel = leesXml(xml);
  const feedback = kind(wortel, 'feedback');
  if (!feedback) throw new Error('Geen DMARC-rapport: het feedback-element ontbreekt');

  const meta = kind(feedback, 'report_metadata');
  const beleid = kind(feedback, 'policy_published');
  const orgNaam = tekst(meta, 'org_name');
  const rapportId = tekst(meta, 'report_id');
  if (!orgNaam || !rapportId) {
    throw new Error('Geen DMARC-rapport: org_name of report_id ontbreekt');
  }
  const begin = tijd(tekst(meta, 'date_range', 'begin'));
  const eind = tijd(tekst(meta, 'date_range', 'end'));
  if (!begin || !eind) throw new Error('Geen DMARC-rapport: de periode ontbreekt');

  const report = {
    org_name: orgNaam,
    org_email: tekst(meta, 'email'),
    report_id: rapportId,
    date_begin: begin,
    date_end: eind,
    policy_domain: tekst(beleid, 'domain'),
    policy_p: tekst(beleid, 'p'),
    policy_sp: tekst(beleid, 'sp'),
    policy_pct: getal(tekst(beleid, 'pct')),
    bestand,
  };

  const records = kinderen(feedback, 'record').map(r => {
    const rij = kind(r, 'row');
    const beoordeeld = kind(rij, 'policy_evaluated');
    const auth = kind(r, 'auth_results');
    // Een regel kan meerdere DKIM-handtekeningen dragen. De eerste die slaagt
    // is wat telt, want één geslaagde handtekening maakt de mail geldig; is er
    // geen geslaagde, dan zegt de eerste het meest over wat er misging.
    const dkims = kinderen(auth, 'dkim');
    const dkim = dkims.find(d => tekst(d, 'result') === 'pass') || dkims[0] || null;
    const spf = kind(auth, 'spf');
    return {
      source_ip: tekst(rij, 'source_ip') || '',
      aantal: getal(tekst(rij, 'count')) ?? 0,
      disposition: tekst(beoordeeld, 'disposition'),
      dkim_eval: tekst(beoordeeld, 'dkim'),
      spf_eval: tekst(beoordeeld, 'spf'),
      header_from: tekst(r, 'identifiers', 'header_from'),
      dkim_domain: tekst(dkim, 'domain'),
      dkim_selector: tekst(dkim, 'selector'),
      dkim_result: tekst(dkim, 'result'),
      spf_domain: tekst(spf, 'domain'),
      spf_result: tekst(spf, 'result'),
    };
  });

  return { report, records };
}

async function uitStream(bytes, formaat) {
  const stroom = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(formaat));
  return new Response(stroom).text();
}

/**
 * Eén bestand uit een zip halen.
 *
 * Alleen de eerste echte ingang, want een DMARC-rapport zit altijd alleen in
 * zijn zip. Een volwaardige zip-lezer binnenhalen voor dat ene geval zou meer
 * code zijn dan het rapport zelf.
 */
async function uitZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 0;
  while (p + 30 <= bytes.length) {
    if (dv.getUint32(p, true) !== 0x04034b50) break;   // geen lokale kop meer
    const methode = dv.getUint16(p + 8, true);
    const ingepakt = dv.getUint32(p + 18, true);
    const naamLengte = dv.getUint16(p + 26, true);
    const extraLengte = dv.getUint16(p + 28, true);
    const naam = new TextDecoder().decode(bytes.slice(p + 30, p + 30 + naamLengte));
    const start = p + 30 + naamLengte + extraLengte;
    const inhoud = bytes.slice(start, start + ingepakt);
    // Mappen en de rommel die macOS meeverpakt overslaan.
    if (!naam.endsWith('/') && !naam.startsWith('__MACOSX/')) {
      if (methode === 0) return new TextDecoder().decode(inhoud);
      if (methode === 8) return uitStream(inhoud, 'deflate-raw');
      throw new Error(`Zip gebruikt een compressie die we niet kennen (${methode})`);
    }
    p = start + ingepakt;
  }
  throw new Error('Geen bestand in de zip gevonden');
}

/**
 * Een geüpload bestand naar {report, records}. Herkent .xml, .gz en .zip.
 *
 * Kijkt naar de INHOUD en niet naar de extensie: de bestandsnamen die
 * rapporteurs gebruiken zijn lang en lopen door elkaar, en een .xml die
 * eigenlijk gezipt is zou dan stilletjes als onzin binnenkomen.
 */
export async function leesDmarcBestand(bytes, bestandsnaam = null) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let xml;
  if (b[0] === 0x1f && b[1] === 0x8b) {
    xml = await uitStream(b, 'gzip');
  } else if (b[0] === 0x50 && b[1] === 0x4b) {
    xml = await uitZip(b);
  } else {
    xml = new TextDecoder().decode(b);
  }
  return parseDmarcXml(xml, bestandsnaam);
}
