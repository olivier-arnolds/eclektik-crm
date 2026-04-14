// Unipile API proxy — handles LinkedIn messaging, profile lookup, and posts
// Routes: POST /api/unipile?action=send-message|start-chat|get-profile|get-posts

const DSN = process.env.UNIPILE_BASE_URL || process.env.UNIPILE_DSN;
const TOKEN = process.env.UNIPILE_API_KEY || process.env.UNIPILE_TOKEN;

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
  if (!DSN || !TOKEN) {
    return res.status(500).json({ error: 'Unipile not configured (missing DSN or TOKEN)' });
  }

  const { action } = req.query;

  try {
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

    return res.status(400).json({ error: `Unknown action: ${action}. Available: start-chat, send-message, get-profile, list-accounts, search, get-posts, send-invite, search-people, get-comments, get-reactions, check-relation` });

  } catch (error) {
    console.error('Unipile proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
