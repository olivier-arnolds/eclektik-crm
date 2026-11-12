import { describe, it, expect } from 'vitest';
import { parseDmarcXml, leesDmarcBestand } from './dmarc-parse.js';

// Een rapport zoals Google het stuurt: twee regels, een die slaagt en een die
// faalt. De tweede is het geval waar deze hele tab voor bestaat.
const XML = `<?xml version="1.0" encoding="UTF-8" ?>
<feedback>
  <report_metadata>
    <org_name>google.com</org_name>
    <email>noreply-dmarc-support@google.com</email>
    <report_id>12345678901234567890</report_id>
    <date_range>
      <begin>1794355200</begin>
      <end>1794441600</end>
    </date_range>
  </report_metadata>
  <policy_published>
    <domain>eclectik.co</domain>
    <adkim>r</adkim>
    <aspf>r</aspf>
    <p>none</p>
    <sp>none</sp>
    <pct>100</pct>
  </policy_published>
  <record>
    <row>
      <source_ip>40.107.22.55</source_ip>
      <count>12</count>
      <policy_evaluated>
        <disposition>none</disposition>
        <dkim>pass</dkim>
        <spf>pass</spf>
      </policy_evaluated>
    </row>
    <identifiers><header_from>eclectik.co</header_from></identifiers>
    <auth_results>
      <dkim><domain>eclectik.co</domain><selector>selector1</selector><result>pass</result></dkim>
      <spf><domain>eclectik.co</domain><result>pass</result></spf>
    </auth_results>
  </record>
  <record>
    <row>
      <source_ip>203.0.113.9</source_ip>
      <count>3</count>
      <policy_evaluated>
        <disposition>none</disposition>
        <dkim>fail</dkim>
        <spf>fail</spf>
      </policy_evaluated>
    </row>
    <identifiers><header_from>eclectik.co</header_from></identifiers>
    <auth_results>
      <spf><domain>eclectik.co</domain><result>permerror</result></spf>
    </auth_results>
  </record>
</feedback>`;

describe('parseDmarcXml', () => {
  it('leest de kop van het rapport', () => {
    const { report } = parseDmarcXml(XML, 'google.xml');
    expect(report).toMatchObject({
      org_name: 'google.com',
      org_email: 'noreply-dmarc-support@google.com',
      report_id: '12345678901234567890',
      policy_domain: 'eclectik.co',
      policy_p: 'none',
      policy_pct: 100,
      bestand: 'google.xml',
    });
  });

  it('KRITIEK: de periode is seconden, geen milliseconden', () => {
    // Een factor duizend verkeerd zet elk rapport in 1970. Dat valt dan buiten
    // elk filter op periode, zonder foutmelding.
    const { report } = parseDmarcXml(XML);
    expect(report.date_begin).toBe('2026-11-11T00:00:00.000Z');
    expect(report.date_end).toBe('2026-11-12T00:00:00.000Z');
  });

  it('leest elke regel met zijn aantal en oordeel', () => {
    const { records } = parseDmarcXml(XML);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      source_ip: '40.107.22.55', aantal: 12,
      dkim_eval: 'pass', spf_eval: 'pass',
      dkim_domain: 'eclectik.co', dkim_selector: 'selector1', dkim_result: 'pass',
      spf_domain: 'eclectik.co', spf_result: 'pass',
      header_from: 'eclectik.co',
    });
    expect(records[1]).toMatchObject({
      source_ip: '203.0.113.9', aantal: 3,
      dkim_eval: 'fail', spf_eval: 'fail',
      dkim_result: null, spf_result: 'permerror',
    });
  });

  it('kiest de DKIM-handtekening die slaagt als er meerdere zijn', () => {
    // Een mail mag meerdere handtekeningen dragen; één geslaagde maakt hem
    // geldig. De eerste pakken zou een geldige mail als mislukt tonen.
    const meerdere = XML.replace(
      '<dkim><domain>eclectik.co</domain><selector>selector1</selector><result>pass</result></dkim>',
      '<dkim><domain>oud.example</domain><selector>oud</selector><result>fail</result></dkim>'
      + '<dkim><domain>eclectik.co</domain><selector>selector1</selector><result>pass</result></dkim>');
    const { records } = parseDmarcXml(meerdere);
    expect(records[0].dkim_result).toBe('pass');
    expect(records[0].dkim_selector).toBe('selector1');
  });

  it('weigert iets dat geen DMARC-rapport is', () => {
    // Half inlezen zou een rapport met nul regels opleveren, en dat leest als
    // 'geen mail verstuurd' in plaats van als 'verkeerd bestand'.
    expect(() => parseDmarcXml('<html><body>hallo</body></html>')).toThrow(/Geen DMARC-rapport/);
    expect(() => parseDmarcXml('<feedback><report_metadata/></feedback>')).toThrow(/Geen DMARC-rapport/);
  });

  it('overleeft zelfsluitende elementen en commentaar', () => {
    const raar = XML.replace('<sp>none</sp>', '<sp/>').replace('<feedback>', '<feedback><!-- notitie -->');
    const { report, records } = parseDmarcXml(raar);
    expect(report.policy_sp).toBeNull();
    expect(records).toHaveLength(2);
  });
});

async function pak(tekst, formaat) {
  const stroom = new Blob([tekst]).stream().pipeThrough(new CompressionStream(formaat));
  return new Uint8Array(await new Response(stroom).arrayBuffer());
}

/** Een zip met één ongecomprimeerde ingang, met de hand opgebouwd. */
function maakStoredZip(naam, inhoud) {
  const n = new TextEncoder().encode(naam);
  const d = new TextEncoder().encode(inhoud);
  const kop = new Uint8Array(30 + n.length);
  const dv = new DataView(kop.buffer);
  dv.setUint32(0, 0x04034b50, true);
  dv.setUint16(8, 0, true);            // methode 0 = opgeslagen
  dv.setUint32(18, d.length, true);    // ingepakte lengte
  dv.setUint32(22, d.length, true);    // uitgepakte lengte
  dv.setUint16(26, n.length, true);
  dv.setUint16(28, 0, true);
  kop.set(n, 30);
  return new Uint8Array([...kop, ...d]);
}

describe('leesDmarcBestand', () => {
  it('leest kale XML', async () => {
    const bytes = new TextEncoder().encode(XML);
    const { report } = await leesDmarcBestand(bytes, 'rapport.xml');
    expect(report.org_name).toBe('google.com');
  });

  it('pakt een .gz uit', async () => {
    const { report, records } = await leesDmarcBestand(await pak(XML, 'gzip'), 'rapport.xml.gz');
    expect(report.org_name).toBe('google.com');
    expect(records).toHaveLength(2);
  });

  it('pakt een zip uit, zowel opgeslagen als gecomprimeerd', async () => {
    const opgeslagen = maakStoredZip('rapport.xml', XML);
    expect((await leesDmarcBestand(opgeslagen)).report.org_name).toBe('google.com');
  });

  it('KRITIEK: kijkt naar de inhoud en niet naar de extensie', async () => {
    // Rapporteurs geven gezipte bestanden soms een .xml-naam. Op de extensie
    // afgaan laat die stilletjes als onzin binnenkomen.
    const gezipt = await pak(XML, 'gzip');
    const { report } = await leesDmarcBestand(gezipt, 'heet-wel-xml.xml');
    expect(report.org_name).toBe('google.com');
  });
});
