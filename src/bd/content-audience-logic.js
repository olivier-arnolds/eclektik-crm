// Pure filter- en samenvattingslogica voor de content-doelgroepkiezer.
// Werkt over de verrijkte contacts uit useBDData. Geen React/Supabase.

// contact: { accountId, tags:[{id,name}], email, isFormer, marketing_content_opt_in }
// filters: { tagIds?, statuses?, countries?, industries?, hasEmail?, optIn? }
// accountMetaById: Map<accountId, { type, country, industry }>
export function contactMatchesAudience(c, f = {}, accountMetaById) {
  if (c.isFormer) return false;
  const meta = (accountMetaById && accountMetaById.get(c.accountId)) || {};
  if (f.tagIds && f.tagIds.length) {
    const ids = (c.tags || []).map(t => t.id);
    if (!ids.some(id => f.tagIds.includes(id))) return false;
  }
  if (f.statuses && f.statuses.length && !f.statuses.includes(meta.type)) return false;
  if (f.countries && f.countries.length && !f.countries.includes(meta.country)) return false;
  if (f.industries && f.industries.length && !f.industries.includes(meta.industry)) return false;
  if (f.hasEmail === true && !c.email) return false;
  if (f.hasEmail === false && c.email) return false;
  if (f.optIn === true && !c.marketing_content_opt_in) return false;
  if (f.optIn === false && c.marketing_content_opt_in) return false;
  return true;
}

export function filterAudience(contacts, filters, accountMetaById) {
  return (contacts || []).filter(c => contactMatchesAudience(c, filters, accountMetaById));
}

// selection: display-ready labels — { statuses?, countries?, industries?, tagNames?, hasEmail?, optIn? }
export function audienceSummary(selection = {}, count = 0) {
  const parts = [];
  const push = (arr) => { if (arr && arr.length) parts.push(arr.join('/')); };
  push(selection.statuses);
  push(selection.countries);
  push(selection.industries);
  if (selection.tagNames && selection.tagNames.length) parts.push('tags: ' + selection.tagNames.join('/'));
  if (selection.hasEmail === true) parts.push('e-mail aanwezig');
  if (selection.optIn === true) parts.push('opt-in');
  const head = parts.length ? parts.join(', ') : 'alle contacten';
  const noun = count === 1 ? 'contact' : 'contacten';
  return `${head} - ${count} ${noun}`;
}

// Samenvatting voor een opgetelde ('samengestelde') doelgroep. Bij een
// opgetelde selectie uit meerdere filterrondes zeggen de losse filterlabels
// niets meer, dus tonen we alleen de telling.
export function audienceCountLabel(count = 0) {
  const n = Number(count) || 0;
  const noun = n === 1 ? 'contact' : 'contacten';
  return `${n} ${noun} in doelgroep`;
}

// --- Rangorde per bedrijf (voor 'max per bedrijf'-ontdubbeling) ---
const titleOf = (c) => String(c.role || c.title || '').toLowerCase();

// Senioriteit-tier op basis van functietitel. Volgorde van checks is belangrijk:
// 'managing director' moet als exec tellen, niet als director.
export function seniorityScore(title) {
  const t = String(title || '').toLowerCase();
  // VP/Head-tier eerst, zodat "vice president" niet door de exec-regel
  // (\bpresident\b) wordt opgeslokt en als C-level scoort.
  if (/\b(vp|svp|evp|vice president|head of|global head)\b/.test(t)) return 80;
  if (/\b(chief|chro|cfo|ceo|coo|cto|cpo|cmo|cio|founder|co-?founder|owner|president|managing director|managing partner)\b/.test(t)) return 100;
  if (/\bdirector\b/.test(t)) return 60;
  if (/\b(manager|lead|principal)\b/.test(t)) return 40;
  return 20;
}

// HR/People-relevantie (Glint-koper). 'employee engagement' voluit om marketing-
// 'engagement' niet mee te pakken.
export function isHrRole(title) {
  const t = String(title || '').toLowerCase();
  return /\b(hr|human resources|people|talent|culture|workforce|chro|l&d|learning and development|learning & development|total rewards|dei|diversity|employee experience|employee engagement)\b/.test(t);
}

export function contactRank(c) {
  const title = titleOf(c);
  return seniorityScore(title)
    + (isHrRole(title) ? 25 : 0)
    + (c.email ? 2 : 0)
    + (c.marketing_content_opt_in ? 1 : 0);
}

// Geeft de contact-ids terug die door 'max N per bedrijf' worden uitgesloten
// (de lager-rangschikkende boven de top-N per accountId). maxPerCompany null/0 =
// geen limiet. Contacten zonder accountId worden niet gelimiteerd.
export function surplusExclusions(contacts, maxPerCompany) {
  const n = Number(maxPerCompany) || 0;
  if (!n) return [];
  const byCompany = new Map();
  for (const c of (contacts || [])) {
    if (!c.accountId) continue; // geen bedrijf → nooit limiteren
    if (!byCompany.has(c.accountId)) byCompany.set(c.accountId, []);
    byCompany.get(c.accountId).push(c);
  }
  const excluded = [];
  for (const group of byCompany.values()) {
    if (group.length <= n) continue;
    const sorted = group.slice().sort((a, b) => contactRank(b) - contactRank(a));
    for (const c of sorted.slice(n)) excluded.push(c.id);
  }
  return excluded;
}
