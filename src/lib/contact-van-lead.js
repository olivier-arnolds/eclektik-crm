// Een marketing lead omzetten naar een rij in contacts.
//
// WAAROM DIT NAAST PROMOVEREN BESTAAT
//   Promoveren maakt een sales lead: iemand waar een deal uit kan komen. Niet
//   elke aanmelding is dat. Wie zich voor een event inschrijft hoort wel in de
//   contactendatabase, zodat hij mee kan in de marketing, maar niet in de
//   funnel. Deze module levert de contactrij; wie hem wegschrijft staat in
//   src/bd/marketing-leads.jsx.
//
// PURE FUNCTIES, GEEN DATABASE
//   De keuzes hieronder (welke naam, welke opt-in, welk bedrijf) zijn regels
//   met uitzonderingen, en die horen vast te liggen in tests in plaats van in
//   een klikafhandeling.

/** 'Jan de Vries' wordt { first_name: 'Jan', last_name: 'de Vries' }. */
export function splitsNaam(volledig) {
  const schoon = String(volledig || '').trim().replace(/\s+/g, ' ');
  if (!schoon) return { first_name: null, last_name: null };
  const delen = schoon.split(' ');
  if (delen.length === 1) return { first_name: delen[0], last_name: null };
  return { first_name: delen[0], last_name: delen.slice(1).join(' ') };
}

/**
 * Mag deze persoon marketingmail krijgen?
 *
 * Komt uit consentMarketing in de aanmelding, dus uit wat de deelnemer zelf
 * heeft aangevinkt. Alles wat niet overtuigend ja is, is nee: een ontbrekend
 * vinkje is geen toestemming.
 */
export function magMarketing(payload) {
  const v = payload?.consentMarketing;
  if (v === true) return true;
  const tekst = String(v ?? '').trim().toLowerCase();
  return tekst === 'true' || tekst === 'ja' || tekst === 'yes' || tekst === '1' || tekst === 'on';
}

/** Normalisatie voor het vergelijken van een e-mailadres. */
export function normMail(v) {
  return String(v || '').trim().toLowerCase();
}

/**
 * Zoekt het bedrijf op naam, en alleen bij een exacte match na normaliseren.
 *
 * Bewust geen gedeeltelijke match: 'Sage' en 'Sage Global Services' zijn twee
 * verschillende klanten, en een contact aan het verkeerde account hangen is
 * erger dan een contact zonder account.
 */
export function zoekBedrijf(naam, bedrijven) {
  const norm = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const gezocht = norm(naam);
  if (!gezocht) return null;
  return (bedrijven || []).find(b => norm(b?.name) === gezocht) || null;
}

/**
 * Bouwt de contactrij uit een marketing lead en de bijbehorende aanmelding.
 *
 * @param {object} lead     een rij uit marketing_leads
 * @param {object} payload  de payload van de nieuwste aanmelding (mag leeg)
 * @param {object} opties   { owner, companyId }
 * @returns {object}        velden voor een insert in contacts
 */
export function contactVanLead(lead, payload = {}, { owner = null, companyId = null } = {}) {
  const naam = String(lead?.full_name || '').trim() || String(lead?.email || '').trim();
  const { first_name, last_name } = splitsNaam(lead?.full_name);
  return {
    full_name: naam,
    first_name,
    last_name,
    email: normMail(lead?.email) || null,
    // Het nummer dat met de hand op de lead is gezet gaat voor dat uit het
    // formulier: als iemand het heeft opgezocht, is dat het goede nummer.
    phone: lead?.phone || payload?.phone || null,
    title: lead?.role || payload?.role || null,
    company_id: companyId,
    company_name: lead?.company || payload?.company || null,
    country: payload?.country || null,
    owner,
    source: 'Website - marketing lead',
    marketing_content_opt_in: magMarketing(payload),
  };
}

/**
 * Wat er bij een BESTAAND contact bijgewerkt mag worden.
 *
 * Alleen lege velden aanvullen. Wat er al staat is door een mens gezet of uit
 * een eerdere verrijking gekomen, en een aanmeldformulier is geen reden om dat
 * te overschrijven.
 *
 * Eén uitzondering: de opt-in mag van uit naar aan, want daar heeft de
 * deelnemer zelf net toestemming voor gegeven. Andersom nooit, want dan zou een
 * aanmelding zonder vinkje een eerder gegeven toestemming wissen.
 */
export function aanvullingenVoorContact(bestaand, nieuw) {
  const uit = {};
  for (const veld of ['first_name', 'last_name', 'phone', 'title', 'company_name', 'country']) {
    const heeft = String(bestaand?.[veld] ?? '').trim();
    const komt = String(nieuw?.[veld] ?? '').trim();
    if (!heeft && komt) uit[veld] = nieuw[veld];
  }
  if (!bestaand?.company_id && nieuw?.company_id) uit.company_id = nieuw.company_id;
  if (nieuw?.marketing_content_opt_in && !bestaand?.marketing_content_opt_in) {
    uit.marketing_content_opt_in = true;
  }
  return uit;
}
