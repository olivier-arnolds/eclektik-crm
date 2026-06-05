// Unipile API proxy — handles LinkedIn messaging, profile lookup, and posts
// Routes: POST /api/unipile?action=send-message|start-chat|get-profile|get-posts

import { createClient } from '@supabase/supabase-js';

const DSN = process.env.UNIPILE_BASE_URL || process.env.UNIPILE_DSN;
const TOKEN = process.env.UNIPILE_API_KEY || process.env.UNIPILE_TOKEN;

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

// Map Unipile's LinkedIn company response to our `companies` schema.
// Returns only fields that have a value, so we don't blank existing data.
function mapUnipileCompanyToDb(c) {
  const updates = {};
  if (c.name) updates.name = c.name;
  if (c.website) updates.website = c.website;
  if (c.profile_url) updates.linkedin_url = c.profile_url;
  if (Array.isArray(c.industry) && c.industry[0]) updates.industry = c.industry[0];
  if (c.description) updates.description = c.description;
  if (c.employee_count) updates.employee_count = String(c.employee_count);
  if (c.foundation_date) {
    const m = String(c.foundation_date).match(/(\d{4})/);
    if (m) updates.founded_year = m[1];
  }
  if (Array.isArray(c.locations) && c.locations.length > 0) {
    const formatLoc = (loc) => {
      const street = Array.isArray(loc.street) ? loc.street.filter(Boolean).join(', ') : '';
      return [street, loc.postalCode, loc.city, loc.area].filter(Boolean).join(', ');
    };
    // Prefer HQ; if HQ has no concrete address, fall back to the first location with data.
    const hq = c.locations.find(l => l && l.is_headquarter);
    const detailed = c.locations.find(l => formatLoc(l));
    const pickAddr = formatLoc(hq) || formatLoc(detailed);
    if (pickAddr) updates.address = pickAddr;
    const country = (hq && hq.country) || (detailed && detailed.country);
    if (country) updates.country = country;
  }
  if (Array.isArray(c.hashtags) && c.hashtags.length > 0) {
    updates.specialities = c.hashtags.map(h => h.title).filter(Boolean).join(', ');
  }
  return updates;
}

async function unipileRequest(method, path, body, isFormData) {
  const url = `https://${DSN}/api/v1${path}`;
  const headers = {
    'X-API-KEY': TOKEN,
    'accept': 'application/json',
  };

  const options = { method, headers };

  if (body && isFormData) {
    // Use FormData for Unipile endpoints that require multipart/form-data
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    }
    headers['content-type'] = 'application/x-www-form-urlencoded';
    options.body = formData.toString();
  } else if (body) {
    headers['content-type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const resp = await fetch(url, options);
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!resp.ok) {
    return { error: data?.message || data?.error || `Unipile error ${resp.status}`, status: resp.status, details: data };
  }
  return { success: true, data };
}

export default async function handler(req, res) {
  const { action } = req.query;

  // Debug endpoint — does NOT leak secret values
  if (action === 'debug') {
    return res.status(200).json({
      hasDSN: !!DSN,
      dsnLength: DSN ? DSN.length : 0,
      dsnPrefix: DSN ? DSN.split('.')[0] : null,
      hasToken: !!TOKEN,
      tokenLength: TOKEN ? TOKEN.length : 0,
      tokenPrefix: TOKEN ? TOKEN.slice(0, 6) + '…' : null,
      env: {
        UNIPILE_API_KEY: !!process.env.UNIPILE_API_KEY,
        UNIPILE_TOKEN: !!process.env.UNIPILE_TOKEN,
        UNIPILE_BASE_URL: !!process.env.UNIPILE_BASE_URL,
        UNIPILE_DSN: !!process.env.UNIPILE_DSN,
      }
    });
  }

  if (!DSN || !TOKEN) {
    return res.status(500).json({ error: 'Unipile not configured (missing DSN or TOKEN)' });
  }

  try {
    // ── GENERATE HOSTED AUTH LINK (for connecting a LinkedIn account) ──
    if (action === 'connect-linkedin') {
      const { redirect_url } = req.query;
      const successUrl = redirect_url || 'https://crm.eclectik-insights.co';
      // Expires 1 hour from now
      const expiresOn = new Date(Date.now() + 3600 * 1000).toISOString();
      const body = {
        type: 'create',
        providers: ['LINKEDIN'],
        api_url: `https://${DSN}`,
        expiresOn,
        success_redirect_url: successUrl,
        failure_redirect_url: successUrl,
      };
      const result = await unipileRequest('POST', '/hosted/accounts/link', body);
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── START NEW CHAT (send first message to a LinkedIn contact) ──
    if (action === 'start-chat' && req.method === 'POST') {
      const { account_id, attendee_id, text } = req.body;
      if (!account_id || !attendee_id || !text) {
        return res.status(400).json({ error: 'account_id, attendee_id, and text required' });
      }
      const result = await unipileRequest('POST', '/chats', {
        account_id,
        attendees_ids: attendee_id,
        text,
      }, true);
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── SEND MESSAGE TO EXISTING CHAT ──
    if (action === 'send-message' && req.method === 'POST') {
      const { chat_id, text } = req.body;
      if (!chat_id || !text) {
        return res.status(400).json({ error: 'chat_id and text required' });
      }
      const result = await unipileRequest('POST', `/chats/${chat_id}/messages`, { text }, true);
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── GET LINKEDIN PROFILE (by public identifier or URL) ──
    if (action === 'get-profile') {
      const { linkedin_url, account_id } = req.query;
      if (!linkedin_url || !account_id) {
        return res.status(400).json({ error: 'linkedin_url and account_id required' });
      }
      // Extract public identifier from URL
      const match = linkedin_url.match(/linkedin\.com\/in\/([^\/\?]+)/);
      const identifier = match ? match[1] : linkedin_url.replace(/^https?:\/\//, '').replace(/^www\./, '');
      const result = await unipileRequest('GET', `/users/${encodeURIComponent(identifier)}?account_id=${account_id}`);
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── RESOLVE LINKEDIN URL TO PROVIDER ID (for messaging) ──
    if (action === 'resolve-user') {
      const { linkedin_url, account_id } = req.query;
      if (!linkedin_url || !account_id) {
        return res.status(400).json({ error: 'linkedin_url and account_id required' });
      }
      const match = linkedin_url.match(/linkedin\.com\/in\/([^\/\?]+)/);
      const identifier = match ? match[1] : linkedin_url;
      const result = await unipileRequest('GET', `/users/${encodeURIComponent(identifier)}?account_id=${account_id}`);
      if (result.success && result.data) {
        // Return the provider_id needed for messaging
        const providerId = result.data.provider_id || result.data.id || result.data.member_id;
        return res.status(200).json({ success: true, provider_id: providerId, profile: result.data });
      }
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── GET LINKEDIN ACCOUNT ID (list connected accounts) ──
    if (action === 'list-accounts') {
      const result = await unipileRequest('GET', '/accounts');
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── SEARCH PROFILES ──
    if (action === 'search' && req.method === 'POST') {
      const { account_id, query } = req.body;
      if (!account_id || !query) {
        return res.status(400).json({ error: 'account_id and query required' });
      }
      const result = await unipileRequest('POST', '/users/search', { account_id, query }, true);
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── GET POSTS ──
    if (action === 'get-posts') {
      const { account_id, linkedin_url } = req.query;
      if (!account_id || !linkedin_url) {
        return res.status(400).json({ error: 'account_id and linkedin_url required' });
      }
      const companyMatch = linkedin_url.match(/linkedin\.com\/company\/([^\/\?]+)/);
      const personMatch = linkedin_url.match(/linkedin\.com\/in\/([^\/\?]+)/);
      const identifier = companyMatch ? companyMatch[1] : (personMatch ? personMatch[1] : linkedin_url);
      const isCompany = !!companyMatch;

      // Resolve the identifier to a provider_id that /users/{id}/posts accepts
      // For persons: resolve via /users/{slug} → provider_id
      // For companies: resolve via /linkedin/company/{slug} → try provider_id, then entity_urn numeric part
      let resolvedId = null;

      if (isCompany) {
        // Step 1: Resolve company slug to numeric ID via /linkedin/company/{slug}
        const companyResult = await unipileRequest('GET', `/linkedin/company/${encodeURIComponent(identifier)}?account_id=${account_id}`);
        if (req.query.debug === 'true') {
          return res.status(200).json({ companyData: companyResult });
        }
        if (companyResult.success && companyResult.data) {
          // Use the numeric ID from the company profile
          resolvedId = companyResult.data.id;
          // Fallback: extract from entity_urn
          if (!resolvedId && companyResult.data.entity_urn) {
            const numMatch = companyResult.data.entity_urn.match(/(\d+)$/);
            if (numMatch) resolvedId = numMatch[1];
          }
        }
        // Step 2: Fetch posts with is_company=true
        if (resolvedId) {
          const result = await unipileRequest('GET', `/users/${encodeURIComponent(resolvedId)}/posts?account_id=${account_id}&is_company=true`);
          return res.status(result.error ? 400 : 200).json(result);
        }
        return res.status(400).json({ error: 'Could not resolve company ID' });
      } else {
        // For persons: resolve public identifier to provider_id
        const personResult = await unipileRequest('GET', `/users/${encodeURIComponent(identifier)}?account_id=${account_id}`);
        if (personResult.success && personResult.data) {
          resolvedId = personResult.data.provider_id;
        }
        const userId = resolvedId || identifier;
        const result = await unipileRequest('GET', `/users/${encodeURIComponent(userId)}/posts?account_id=${account_id}`);
        return res.status(result.error ? 400 : 200).json(result);
      }
    }

    // ── GET CHATS (inbox) ──
    if (action === 'get-chats') {
      const { account_id, limit } = req.query;
      const params = new URLSearchParams();
      if (account_id) params.append('account_id', account_id);
      if (limit) params.append('limit', limit);
      const result = await unipileRequest('GET', `/chats?${params.toString()}`);
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── GET MESSAGES FROM A CHAT ──
    if (action === 'get-messages') {
      const { chat_id } = req.query;
      if (!chat_id) return res.status(400).json({ error: 'chat_id required' });
      const result = await unipileRequest('GET', `/chats/${chat_id}/messages`);
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── GET CHAT ATTENDEES (for resolving display names) ──
    if (action === 'get-chat-attendees') {
      const { chat_id } = req.query;
      if (!chat_id) return res.status(400).json({ error: 'chat_id required' });
      const result = await unipileRequest('GET', `/chats/${chat_id}/attendees`);
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── SEND INVITATION ──
    if (action === 'send-invite' && req.method === 'POST') {
      const { account_id, attendee_id, message } = req.body;
      if (!account_id || !attendee_id) {
        return res.status(400).json({ error: 'account_id and attendee_id required' });
      }
      const result = await unipileRequest('POST', '/users/invite', {
        provider_id: attendee_id,
        account_id,
        message: message || '',
      });
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── SEARCH PEOPLE (LinkedIn search) ──
    if (action === 'search-people' && req.method === 'POST') {
      const { account_id, company, keywords, linkedin_url, cursor } = req.body;
      if (!account_id) return res.status(400).json({ error: 'account_id required' });

      // Use LinkedIn company name (from URL slug) if available, otherwise CRM name
      let companySearchName = company;
      if (linkedin_url) {
        const match = linkedin_url.match(/linkedin\.com\/company\/([^\/\?]+)/);
        if (match) {
          companySearchName = match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
      }
      const searchQuery = [keywords, companySearchName].filter(Boolean).join(' ');
      const searchBody = {
        api: 'classic',
        category: 'people',
        keywords: searchQuery,
      };
      // Pagination support
      const endpoint = cursor
        ? `/linkedin/search?account_id=${account_id}&cursor=${encodeURIComponent(cursor)}`
        : `/linkedin/search?account_id=${account_id}`;
      const result = await unipileRequest('POST', endpoint, searchBody);
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── GET POST COMMENTS ──
    if (action === 'get-comments') {
      const { post_id, account_id } = req.query;
      const result = await unipileRequest('GET', `/posts/${post_id}/comments?account_id=${account_id}`);
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── GET POST REACTIONS ──
    if (action === 'get-reactions') {
      const { post_id, account_id } = req.query;
      const result = await unipileRequest('GET', `/posts/${post_id}/reactions?account_id=${account_id}`);
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── CHECK RELATION (connection status) ──
    if (action === 'check-relation') {
      const { account_id, linkedin_url } = req.query;
      if (!account_id || !linkedin_url) return res.status(400).json({ error: 'account_id and linkedin_url required' });
      const match = linkedin_url.match(/linkedin\.com\/in\/([^\/\?]+)/);
      const identifier = match ? match[1] : linkedin_url;
      // Get profile which includes network_distance field
      const result = await unipileRequest('GET', `/users/${encodeURIComponent(identifier)}?account_id=${account_id}`);
      if (result.success && result.data) {
        const distance = result.data.network_distance || '';
        const isRelationship = result.data.is_relationship;
        let status = 'not_connected';
        if (distance === 'FIRST_DEGREE' || distance === 'DISTANCE_1') status = 'connected';
        else if (distance === 'SECOND_DEGREE' || distance === 'DISTANCE_2') status = 'not_connected';
        else if (isRelationship) status = 'connected';
        return res.status(200).json({ success: true, data: { relation: status, network_distance: distance, is_relationship: isRelationship } });
      }
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── ENRICH COMPANY (replaces Surfe) ──
    // Pulls LinkedIn company data and writes mapped fields to Supabase.
    // Body: { company_id, linkedin_url }
    if (action === 'enrich-company' && req.method === 'POST') {
      if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
      const { company_id, linkedin_url } = req.body || {};
      if (!company_id || !linkedin_url) {
        return res.status(400).json({ error: 'company_id and linkedin_url required' });
      }
      const slugMatch = linkedin_url.match(/linkedin\.com\/company\/([^\/\?]+)/);
      if (!slugMatch) return res.status(400).json({ error: 'invalid LinkedIn company URL' });
      const slug = slugMatch[1];

      // Need an account_id for the LinkedIn provider call
      const acctsResp = await unipileRequest('GET', '/accounts');
      const liAcc = (acctsResp.data?.items || []).find(a => (a.type || '').toUpperCase() === 'LINKEDIN');
      if (!liAcc) return res.status(400).json({ error: 'No LinkedIn account connected in Unipile' });

      const lookup = await unipileRequest('GET', `/linkedin/company/${encodeURIComponent(slug)}?account_id=${liAcc.id}`);
      if (lookup.error || !lookup.data) {
        return res.status(400).json({ error: lookup.error || 'company not found', details: lookup.details });
      }

      const updates = mapUnipileCompanyToDb(lookup.data);
      updates.last_enriched_at = new Date().toISOString();
      updates.updated_at = updates.last_enriched_at;

      const { error: dbErr } = await supabase.from('companies').update(updates).eq('id', company_id);
      if (dbErr) return res.status(500).json({ error: dbErr.message });

      return res.status(200).json({
        success: true,
        company_id,
        fieldsUpdated: Object.keys(updates).filter(k => k !== 'updated_at' && k !== 'last_enriched_at'),
        updates,
      });
    }

    // ── FIND LINKEDIN-URL FOR A CONTACT (search by name + company) ──
    // Body: { contact_id }
    if (action === 'find-contact-linkedin' && req.method === 'POST') {
      if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
      const { contact_id } = req.body || {};
      if (!contact_id) return res.status(400).json({ error: 'contact_id required' });

      const { data: contact, error: getErr } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, full_name, company_name, companies(name)')
        .eq('id', contact_id)
        .single();
      if (getErr || !contact) return res.status(404).json({ error: 'contact not found' });

      const firstName = (contact.first_name || '').trim();
      const lastName = (contact.last_name || '').trim();
      const fullName = `${firstName} ${lastName}`.trim() || contact.full_name || '';
      if (!fullName) return res.status(400).json({ error: 'contact has no name to search' });
      const company = contact.company_name || contact.companies?.name || '';

      const acctsResp = await unipileRequest('GET', '/accounts');
      const liAcc = (acctsResp.data?.items || []).find(a => (a.type || '').toUpperCase() === 'LINKEDIN');
      if (!liAcc) return res.status(400).json({ error: 'No LinkedIn account connected in Unipile' });

      // Conservatieve multi-attempt: alleen searches MET company als disambiguator.
      // De "first+last" en "last alleen" attempts uit eerdere iteratie zijn weggehaald
      // omdat ze te veel false-positives geven (bv. 'Smith' / 'Jansen' matchen verkeerde
      // personen). Als een contact geen company_name heeft, faalt de enrich met
      // reason 'no-company' — bewuste trade-off voor accuracy boven recall.
      if (!company) {
        return res.status(200).json({
          success: false,
          reason: 'no-company',
          message: 'Contact heeft geen company_name; geen veilige search mogelijk',
        });
      }
      const attempts = [
        `${fullName} ${company}`,
        `${lastName} ${company}`,
      ];

      let items = [];
      let workingAttempt = null;
      let lastSearchError = null;
      for (const attempt of attempts) {
        const searchBody = { api: 'classic', category: 'people', keywords: attempt };
        const searchResult = await unipileRequest('POST', `/linkedin/search?account_id=${liAcc.id}`, searchBody);
        if (searchResult.error) { lastSearchError = searchResult.error; continue; }
        const found = searchResult.data?.items || searchResult.data?.data || [];
        if (found.length > 0) { items = found; workingAttempt = attempt; break; }
      }

      if (items.length === 0) {
        return res.status(200).json({
          success: false,
          reason: 'no-results',
          attempts_tried: attempts,
          last_error: lastSearchError,
        });
      }

      // Unipile classic-search candidates hebben GEEN first_name/last_name velden,
      // alleen profile_url + headline. Extract de slug uit de URL en match daarop.
      const firstLower = firstName.toLowerCase();
      const lastLower = lastName.toLowerCase();
      const companyLower = company.toLowerCase();
      const slugOf = (c) => {
        const url = c.profile_url || c.public_profile_url || '';
        const m = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
        return (m ? m[1] : '').toLowerCase();
      };

      // Tier 1: slug bevat BEIDE first + last (sterk match, bv. 'seymourdebbie' voor Debbie Seymour)
      const exactMatch = items.find(c => {
        const slug = slugOf(c);
        return firstLower && lastLower && slug.includes(firstLower) && slug.includes(lastLower);
      });
      // Tier 2: slug bevat last + headline mentions company (voor nickname-cases)
      const lastWithCompanyInHeadline = !exactMatch && items.find(c => {
        const slug = slugOf(c);
        const headline = (c.headline || c.occupation || '').toLowerCase();
        return slug.includes(lastLower) && headline.includes(companyLower);
      });
      const match = exactMatch || lastWithCompanyInHeadline;
      const matchType = exactMatch ? 'first+last-in-slug'
        : lastWithCompanyInHeadline ? 'last-in-slug+company-in-headline'
        : null;

      if (!match) {
        return res.status(200).json({
          success: false,
          reason: 'no-name-match',
          working_attempt: workingAttempt,
          candidates: items.length,
          sample: items.slice(0, 5).map(c => ({
            first: c.first_name,
            last: c.last_name,
            headline: c.headline || c.occupation,
            profile_url: c.profile_url || c.public_profile_url,
          })),
          raw_first_candidate: items[0], // FULL shape for debug — see all available fields
        });
      }

      const rawUrl = match.profile_url || match.public_profile_url
        || (match.public_identifier ? `https://www.linkedin.com/in/${match.public_identifier}` : null);
      if (!rawUrl) {
        return res.status(200).json({ success: false, reason: 'no-url-in-match' });
      }
      // Strip miniProfileUrn querystring — we willen alleen de canonical URL
      const url = rawUrl.split('?')[0];

      const { error: updErr } = await supabase.from('contacts').update({ linkedin_url: url }).eq('id', contact_id);
      if (updErr) return res.status(500).json({ error: updErr.message });

      return res.status(200).json({
        success: true,
        contact_id,
        linkedin_url: url,
        matched_headline: match.headline || match.occupation || null,
        match_type: matchType,
      });
    }

    // ── DOUBLECHECK CONTACT'S LINKEDIN-URL: side-by-side data ──
    // Body: { contact_id }
    if (action === 'doublecheck-contact-linkedin' && req.method === 'POST') {
      if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
      const { contact_id } = req.body || {};
      if (!contact_id) return res.status(400).json({ error: 'contact_id required' });

      const { data: contact, error: getErr } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, full_name, title, linkedin_url, company_name, companies(name)')
        .eq('id', contact_id)
        .single();
      if (getErr || !contact) return res.status(404).json({ error: 'contact not found' });
      if (!contact.linkedin_url) return res.status(400).json({ error: 'contact has no linkedin_url to doublecheck' });

      const slugMatch = contact.linkedin_url.match(/linkedin\.com\/in\/([^\/\?]+)/);
      if (!slugMatch) return res.status(400).json({ error: 'invalid LinkedIn URL on contact' });
      const slug = slugMatch[1];

      const acctsResp = await unipileRequest('GET', '/accounts');
      const liAcc = (acctsResp.data?.items || []).find(a => (a.type || '').toUpperCase() === 'LINKEDIN');
      if (!liAcc) return res.status(400).json({ error: 'No LinkedIn account connected in Unipile' });

      const profileResp = await unipileRequest('GET', `/users/${encodeURIComponent(slug)}?account_id=${liAcc.id}`);
      if (profileResp.error || !profileResp.data) {
        return res.status(400).json({ error: profileResp.error || 'profile fetch failed', details: profileResp.details });
      }
      const p = profileResp.data;

      // Extract from profile — multiple possible field names per Unipile shape
      const linkedinFirstName = p.first_name || '';
      const linkedinLastName = p.last_name || '';
      const linkedinName = `${linkedinFirstName} ${linkedinLastName}`.trim() || p.name || '';
      const linkedinHeadline = p.headline || p.occupation || '';
      // Current company: probably nested in work_experience or position
      const linkedinCompany =
        p.current_company?.name
        || p.work_experience?.[0]?.company
        || (Array.isArray(p.positions) && p.positions[0]?.company_name)
        || '';

      // DB side
      const dbName = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
      const dbCompany = contact.company_name || contact.companies?.name || '';
      const dbTitle = contact.title || '';

      // Match score: 100 = perfect, 0 = nothing matches
      const norm = s => (s || '').toLowerCase().trim();
      let score = 0;
      if (norm(linkedinFirstName) && norm(linkedinFirstName) === norm(contact.first_name)) score += 35;
      else if (norm(linkedinFirstName) && (norm(linkedinFirstName).includes(norm(contact.first_name)) || norm(contact.first_name).includes(norm(linkedinFirstName)))) score += 20;
      if (norm(linkedinLastName) && norm(linkedinLastName) === norm(contact.last_name)) score += 35;
      else if (norm(linkedinLastName) && (norm(linkedinLastName).includes(norm(contact.last_name)) || norm(contact.last_name).includes(norm(linkedinLastName)))) score += 20;
      if (norm(linkedinCompany) && norm(dbCompany) && (norm(linkedinCompany).includes(norm(dbCompany)) || norm(dbCompany).includes(norm(linkedinCompany)))) score += 20;
      // Also boost if company appears in headline (covers retired/recent-changes)
      else if (norm(dbCompany).length > 2 && norm(linkedinHeadline).includes(norm(dbCompany))) score += 15;
      score = Math.min(100, score);

      return res.status(200).json({
        success: true,
        contact_id,
        db: {
          name: dbName,
          company: dbCompany,
          title: dbTitle,
          linkedin_url: contact.linkedin_url,
        },
        linkedin: {
          name: linkedinName,
          company: linkedinCompany,
          title: linkedinHeadline,
          profile_url: contact.linkedin_url, // we doublechecken het bestaande URL-slug
        },
        match_score: score,
      });
    }

    // ── ENRICH CONTACT FROM LINKEDIN PROFILE ──
    // Body: { contact_id, linkedin_url }
    if (action === 'enrich-contact' && req.method === 'POST') {
      if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
      const { contact_id, linkedin_url } = req.body || {};
      if (!contact_id || !linkedin_url) {
        return res.status(400).json({ error: 'contact_id and linkedin_url required' });
      }
      const slugMatch = linkedin_url.match(/linkedin\.com\/in\/([^\/\?]+)/);
      if (!slugMatch) return res.status(400).json({ error: 'invalid LinkedIn profile URL' });
      const slug = slugMatch[1];

      const acctsResp = await unipileRequest('GET', '/accounts');
      const liAcc = (acctsResp.data?.items || []).find(a => (a.type || '').toUpperCase() === 'LINKEDIN');
      if (!liAcc) return res.status(400).json({ error: 'No LinkedIn account connected in Unipile' });

      const lookup = await unipileRequest('GET', `/users/${encodeURIComponent(slug)}?account_id=${liAcc.id}`);
      if (lookup.error || !lookup.data) {
        return res.status(400).json({ error: lookup.error || 'profile not found', details: lookup.details });
      }

      const p = lookup.data;
      const updates = {};
      // Title: prefer headline > occupation. Always refresh (titles change frequently)
      if (p.headline) updates.title = p.headline;
      else if (p.occupation) updates.title = p.occupation;
      // First/last name: only set if currently empty (don't overwrite curated names)
      const { data: existing } = await supabase.from('contacts').select('first_name, last_name').eq('id', contact_id).single();
      if (p.first_name && !existing?.first_name) updates.first_name = p.first_name;
      if (p.last_name && !existing?.last_name) updates.last_name = p.last_name;

      if (Object.keys(updates).length === 0) {
        return res.status(200).json({ success: true, contact_id, fieldsUpdated: [], message: 'No new fields to set' });
      }

      const { error: dbErr } = await supabase.from('contacts').update(updates).eq('id', contact_id);
      if (dbErr) return res.status(500).json({ error: dbErr.message });

      return res.status(200).json({
        success: true,
        contact_id,
        fieldsUpdated: Object.keys(updates),
        updates,
      });
    }

    // ── REGISTER WEBHOOK ──
    if (action === 'register-webhook' && req.method === 'POST') {
      const webhookUrl = 'https://crm.eclectik-insights.co/api/unipile-webhook';
      const result = await unipileRequest('POST', '/webhooks', {
        request_url: webhookUrl,
        source: 'messaging',
        format: 'json',
        events: ['message_received'],
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        enabled: true,
        name: 'eclectik-crm',
      });
      return res.status(result.error ? 400 : 200).json(result);
    }

    // ── LIST WEBHOOKS ──
    if (action === 'list-webhooks') {
      const result = await unipileRequest('GET', '/webhooks');
      return res.status(result.error ? 400 : 200).json(result);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (error) {
    console.error('Unipile proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
