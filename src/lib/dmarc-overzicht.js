// Van losse DMARC-regels naar het antwoord op de vraag die je stelt.
//
// DE VRAAG IS NIET 'HOEVEEL MAIL'
//   Een DMARC-rapport is een berg IP-adressen met aantallen. Waar je naar op
//   zoek bent is: gaat er mail namens ons uit die NIET slaagt, en van wie komt
//   die dan. Dat zijn twee heel verschillende gevallen en ze vragen om
//   tegengestelde actie:
//     - een eigen dienst die verkeerd staat ingesteld: repareren
//     - iemand anders die zich voordoet als ons: niets aan te doen behalve
//       DMARC aanzetten, en dan vangt de ontvanger het af
//   De bron zegt welk van de twee het is, dus die staat vooraan.
//
// EEN MAIL SLAAGT ALS ÉÉN VAN BEIDE SLAAGT
//   DMARC vraagt niet om SPF EN DKIM, maar om minstens een van de twee, mits
//   die uitgelijnd is met het afzenderdomein. Dat staat al uitgerekend in het
//   rapport zelf, in policy_evaluated. Zelf opnieuw beoordelen op de ruwe
//   SPF- en DKIM-uitslagen geeft een ander getal dan wat de ontvanger deed, en
//   dan ga je een verschil verklaren dat je zelf hebt gemaakt.

/** Slaagde deze regel voor DMARC volgens de ontvanger zelf? */
export function slaagt(rij) {
  return rij?.dkim_eval === 'pass' || rij?.spf_eval === 'pass';
}

// Bekende verzendwegen, op het domein dat in de authenticatie opduikt of op
// het IP-blok. Een naam zegt meer dan 40.107.22.55, en juist bij een falende
// bron wil je meteen weten of het er een van onszelf is.
const BEKEND = [
  { naam: 'Microsoft 365 (Outlook)', ip: /^(40\.9[2-3]\.|40\.107\.|52\.10[0-3]\.|104\.47\.)/ },
  { naam: 'Barracuda', ip: /^(35\.157\.190\.|18\.185\.115\.|18\.184\.203\.)/ },
  { naam: 'Resend (Amazon SES)', domein: /(^|\.)amazonses\.com$|(^|\.)resend\.com$|(^|\.)send\.eclectik\.co$/ },
];

/**
 * Een leesbare naam voor de verzender achter een regel.
 *
 * Valt terug op het domein uit de authenticatie, en pas daarna op het IP-adres.
 * Dat laatste is geen nederlaag: bij een onbekende bron IS het IP-adres het
 * enige wat je hebt, en dat is precies wat je wilt kunnen opzoeken.
 */
export function bronNaam(rij) {
  const ip = String(rij?.source_ip || '');
  const domeinen = [rij?.dkim_domain, rij?.spf_domain].filter(Boolean).map(d => String(d).toLowerCase());
  for (const b of BEKEND) {
    if (b.ip && b.ip.test(ip)) return b.naam;
    if (b.domein && domeinen.some(d => b.domein.test(d))) return b.naam;
  }
  // Een domein dat niet van ons is, is de interessantste aanwijzing die er is.
  const vreemd = domeinen.find(d => d && !d.endsWith('eclectik.co'));
  if (vreemd) return vreemd;
  return ip || 'onbekend';
}

/**
 * Alles samen tot één beeld.
 *
 * @param {Array} rijen   regels uit dmarc_record, verrijkt met de kop
 * @returns {{totaal, geslaagd, gefaald, percentage, bronnen, probleembronnen}}
 *
 * percentage is null bij nul mail, niet 0 of 100. Nul van nul is geen 100%
 * geslaagd en ook geen 0%: het is geen uitspraak, en als zo'n tab '0% geslaagd'
 * toont terwijl er simpelweg niets verstuurd is, gaat iemand iets repareren
 * wat niet stuk is.
 */
export function vatSamen(rijen) {
  const lijst = Array.isArray(rijen) ? rijen : [];
  let totaal = 0;
  let geslaagd = 0;
  const perBron = new Map();

  for (const r of lijst) {
    const n = Number(r?.aantal) || 0;
    const ok = slaagt(r);
    totaal += n;
    if (ok) geslaagd += n;

    const naam = bronNaam(r);
    const b = perBron.get(naam) || {
      naam, totaal: 0, geslaagd: 0, gefaald: 0,
      ips: new Set(), spfFouten: new Set(), dkimFouten: new Set(),
    };
    b.totaal += n;
    if (ok) b.geslaagd += n; else b.gefaald += n;
    if (r?.source_ip) b.ips.add(r.source_ip);
    if (!ok) {
      if (r?.spf_result && r.spf_result !== 'pass') b.spfFouten.add(r.spf_result);
      if (r?.dkim_result && r.dkim_result !== 'pass') b.dkimFouten.add(r.dkim_result);
      // Geen DKIM-handtekening is zelf ook een bevinding, en een lege verzameling
      // zou dat verzwijgen.
      if (!r?.dkim_result) b.dkimFouten.add('geen handtekening');
    }
    perBron.set(naam, b);
  }

  const bronnen = [...perBron.values()]
    .map(b => ({
      naam: b.naam,
      totaal: b.totaal,
      geslaagd: b.geslaagd,
      gefaald: b.gefaald,
      ips: [...b.ips].sort(),
      spfFouten: [...b.spfFouten].sort(),
      dkimFouten: [...b.dkimFouten].sort(),
    }))
    // De grootste bron bovenaan, want daar gaat het meeste verkeer doorheen.
    .sort((a, b) => b.totaal - a.totaal);

  return {
    totaal,
    geslaagd,
    gefaald: totaal - geslaagd,
    percentage: totaal === 0 ? null : Math.round((geslaagd / totaal) * 1000) / 10,
    bronnen,
    // Wat aandacht vraagt, los van de rest: hier kijk je als eerste naar.
    probleembronnen: bronnen.filter(b => b.gefaald > 0).sort((a, b) => b.gefaald - a.gefaald),
  };
}

/**
 * Het oordeel in één zin, zodat de tab iets zegt in plaats van alleen te tonen.
 *
 * De drempel ligt op 98% en niet op 100%: een enkele doorgestuurde mail breekt
 * SPF altijd, dat is normaal en geen reden tot actie. Pas als het structureel
 * is, is er iets aan de hand.
 */
export function oordeel(samenvatting) {
  const s = samenvatting || {};
  if (!s.totaal) {
    return { kleur: 'grijs', tekst: 'Nog geen rapporten ingelezen.' };
  }
  if (s.percentage >= 98) {
    return {
      kleur: 'groen',
      tekst: `${s.percentage}% van de mail namens het domein slaagt voor DMARC. Dat is gezond.`,
    };
  }
  if (s.percentage >= 85) {
    return {
      kleur: 'oranje',
      tekst: `${s.percentage}% slaagt. ${s.gefaald} berichten vielen af, genoeg om uit te zoeken `
        + 'waar ze vandaan komen voordat je DMARC strenger zet.',
    };
  }
  return {
    kleur: 'rood',
    tekst: `Maar ${s.percentage}% slaagt. ${s.gefaald} berichten vielen af. DMARC strenger zetten `
      + 'zou die nu tegenhouden, dus eerst de bron hieronder uitzoeken.',
  };
}

/** De periode die de ingelezen rapporten samen beslaan, als leesbare tekst. */
export function periodeTekst(rapporten) {
  const lijst = (rapporten || []).filter(r => r?.date_begin && r?.date_end);
  if (!lijst.length) return null;
  const begin = lijst.map(r => new Date(r.date_begin).getTime()).sort((a, b) => a - b)[0];
  const eind = lijst.map(r => new Date(r.date_end).getTime()).sort((a, b) => b - a)[0];
  const f = (t) => new Date(t).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  return f(begin) === f(eind) ? f(begin) : `${f(begin)} tot ${f(eind)}`;
}
