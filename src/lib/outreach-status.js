// De status van een prospect in een outreachcampagne, in leesbare vorm.
//
// WAAROM EEN GEDEELD BESTAND
//   Deze labels stonden als constanten in marketing-outreach.jsx. De Leads-tab
//   toont dezelfde status, en twee kopieën lopen uit elkaar: dan heet
//   msg1_sent op het ene scherm 'Bericht 1 verstuurd' en op het andere iets
//   anders, terwijl het hetzelfde feit is. Zelfde reden waarom signatures.js
//   destijds van api/_lib naar src/lib verhuisde.

export const STATUS_LABEL = {
  queued: 'Klaar om te sturen', msg1_sent: 'Bericht 1 verstuurd', msg2_sent: 'Bericht 2 verstuurd',
  replied: 'Heeft geantwoord', bounced: 'Gebounced', ooo: 'Afwezig', referred: 'Doorverwezen',
  opted_out: 'Afgemeld', paused: 'Gepauzeerd', done: 'Afgerond',
};

export const STATUS_COLOR = {
  queued: '#2563eb', msg1_sent: '#d97706', msg2_sent: '#d97706', replied: '#16a34a',
  bounced: '#dc2626', ooo: '#7c3aed', referred: '#0891b2', opted_out: '#6b7280',
  paused: '#6b7280', done: '#16a34a',
};

/**
 * Het label bij een status. Een status die we niet kennen geven we terug zoals
 * hij is: dat leest lelijk, maar het is eerlijker dan 'Onbekend' en het valt
 * op, zodat de nieuwe status hier alsnog een naam krijgt.
 */
export function statusLabel(status) {
  const s = String(status || '').trim();
  if (!s) return null;
  return STATUS_LABEL[s] || s;
}

/** De kleur bij een status, of grijs als we hem niet kennen. */
export function statusKleur(status) {
  return STATUS_COLOR[String(status || '').trim()] || '#6b7280';
}

/**
 * Een korter label voor in een lijst, waar de campagnenaam er al naast staat.
 * 'Bericht 1 verstuurd' wordt 'bericht 1', want 'verstuurd' voegt daar niets
 * toe: in een outreachcampagne is dat de enige richting die een bericht heeft.
 */
export const STATUS_KORT = {
  queued: 'nog niet gestuurd', msg1_sent: 'bericht 1', msg2_sent: 'bericht 2',
  replied: 'geantwoord', bounced: 'gebounced', ooo: 'afwezig', referred: 'doorverwezen',
  opted_out: 'afgemeld', paused: 'gepauzeerd', done: 'afgerond',
};

export function statusKort(status) {
  const s = String(status || '').trim();
  if (!s) return null;
  return STATUS_KORT[s] || s;
}

// De uitkomst die met de hand is gekozen: afspraak of geen interesse.
//
// DIE WINT VAN DE STATUS
//   Status beschrijft waar de reeks is gebleven ('heeft geantwoord'), uitkomst
//   beschrijft wat eruit kwam ('afspraak'). Als iemand de uitkomst heeft
//   ingevuld is dat het antwoord op de vraag die je stelt als je naar de lijst
//   kijkt, en dan is 'geantwoord' alleen nog ruis.
// HET LABEL HANGT AAN HET DOEL VAN DE CAMPAGNE
//   Bij een campagne die naar een event uitnodigt is 'afspraak' het verkeerde
//   woord: daar meld je je aan, je plant geen gesprek. De opgeslagen waarde
//   blijft wel 'afspraak', zodat er niets te migreren valt en de validatie aan
//   de serverkant onveranderd blijft. outreach_campaign.doel zegt dus hoe je
//   die waarde moet lezen, niet wat er staat.
export const OUTCOME_KORT = {
  afspraak: 'afspraak',
  geen_interesse: 'geen interesse',
};

export const OUTCOME_KORT_AANMELDING = {
  afspraak: 'aangemeld',
  geen_interesse: 'geen interesse',
};

export const OUTCOME_LABEL = {
  afspraak: 'Afspraak',
  geen_interesse: 'Geen interesse',
};

export const OUTCOME_LABEL_AANMELDING = {
  afspraak: 'Aangemeld',
  geen_interesse: 'Geen interesse',
};

/** De keuzes voor de uitkomstlijst, in de woorden die bij het doel horen. */
export function uitkomstKeuzes(doel) {
  const labels = doel === 'aanmelding' ? OUTCOME_LABEL_AANMELDING : OUTCOME_LABEL;
  return [
    { waarde: 'afspraak', label: labels.afspraak },
    { waarde: 'geen_interesse', label: labels.geen_interesse },
  ];
}

export const OUTCOME_KLEUR = {
  afspraak: '#15803d',
  geen_interesse: '#6b7280',
};

/**
 * Wat er van een prospect in een lijst getoond wordt: de uitkomst als die er
 * is, anders de status.
 *
 * @param {object} rij  { status, outcome, doel }
 * @returns {{tekst: string|null, kleur: string, isUitkomst: boolean}}
 */
export function weergaveVanProspect(rij) {
  const outcome = String(rij?.outcome || '').trim();
  if (outcome) {
    const kort = rij?.doel === 'aanmelding' ? OUTCOME_KORT_AANMELDING : OUTCOME_KORT;
    return {
      tekst: kort[outcome] || outcome,
      kleur: OUTCOME_KLEUR[outcome] || '#6b7280',
      isUitkomst: true,
    };
  }
  return { tekst: statusKort(rij?.status), kleur: statusKleur(rij?.status), isUitkomst: false };
}
