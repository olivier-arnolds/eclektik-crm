import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SURFE_API = 'https://api.surfe.com';
const SURFE_KEY = process.env.SURFE_API_KEY;
const WEBHOOK_URL = 'https://crm.eclectik-insights.co/api/surfe-webhook';

async function surfePost(endpoint, body) {
  const resp = await fetch(`${SURFE_API}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SURFE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return resp.json();
}

export default async function handler(req, res) {
  try {
    let contactsToEnrich = [];
    let companiestoEnrich = [];

    if (req.method === 'POST' && req.body?.ids) {
      // ── MANUAL: specific IDs selected by user ──
      const { type, ids } = req.body;

      if (type === 'contacts') {
        const { data } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, full_name, email, linkedin_url, company_name')
          .in('id', ids);
        contactsToEnrich = data || [];
      } else if (type === 'companies') {
        const { data } = await supabase
          .from('companies')
          .select('id, name, website, linkedin_url')
          .in('id', ids);
        companiestoEnrich = data || [];
      }
    } else {
      // ── CRON: auto-select contacts needing enrichment ──
      const { data: contactsNoEmail } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, full_name, email, linkedin_url, company_name')
        .or('email.is.null,email.eq.')
        .not('linkedin_url', 'is', null)
        .limit(20);

      const { data: contactsToRefresh } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, full_name, email, linkedin_url, company_name')
        .not('linkedin_url', 'is', null)
        .not('email', 'is', null)
        .order('updated_at', { ascending: true })
        .limit(30);

      const all = [...(contactsNoEmail || []), ...(contactsToRefresh || [])];
      const seen = new Set();
      contactsToEnrich = all.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
    }

    // ── ENRICH CONTACTS ──
    if (contactsToEnrich.length > 0) {
      const people = contactsToEnrich.map(c => {
        const nameParts = (c.full_name || `${c.first_name || ''} ${c.last_name || ''}`).trim().split(/\s+/);
        return {
          firstName: c.first_name || nameParts[0] || '',
          lastName: c.last_name || nameParts.slice(1).join(' ') || '',
          linkedinUrl: c.linkedin_url || undefined,
          companyName: c.company_name || undefined,
          externalID: c.id,
        };
      }).filter(p => p.linkedinUrl || (p.firstName && p.companyName));

      if (people.length > 0) {
        const result = await surfePost('/v2/people/enrich', {
          include: { email: true, mobile: true },
          people,
          notificationOptions: { webhookUrl: WEBHOOK_URL },
        });

        // Mark contacts as being enriched
        const ids = contactsToEnrich.map(c => c.id);
        await supabase.from('contacts').update({ last_enriched_at: new Date().toISOString() }).in('id', ids);

        console.log(`Surfe enrichment started: ${people.length} contacts`, result);
        return res.status(200).json({ count: people.length, type: 'contacts', surfeResponse: result });
      }
    }

    // ── ENRICH COMPANIES ──
    if (companiestoEnrich.length > 0) {
      // Surfe API requires 'domain' field — extract from website URL
      const companies = companiestoEnrich.map(c => {
        let domain = c.website || '';
        // Strip protocol and trailing slash to get clean domain
        domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();
        if (!domain) return null;
        return {
          domain,
          externalID: c.id,
        };
      }).filter(Boolean);

      if (companies.length > 0) {
        // Start enrichment
        const result = await surfePost('/v2/companies/enrich', {
          companies,
          notificationOptions: { webhookUrl: WEBHOOK_URL },
        });

        // Poll for results (wait up to 15 seconds)
        if (result.enrichmentID) {
          let enrichedData = null;
          for (let attempt = 0; attempt < 5; attempt++) {
            await new Promise(r => setTimeout(r, 3000));
            const resp = await fetch(`${SURFE_API}/v2/companies/enrich/${result.enrichmentID}`, {
              headers: { 'Authorization': `Bearer ${SURFE_KEY}` },
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data.companies?.some(c => c.status === 'SUCCESS')) {
                enrichedData = data.companies;
                break;
              }
            }
          }

          // Write enriched data directly to Supabase
          if (enrichedData) {
            for (const company of enrichedData) {
              if (company.status !== 'SUCCESS' || !company.externalID) continue;
              const updates = {};
              const website = Array.isArray(company.websites) ? company.websites[0] : null;
              if (website) updates.website = website;
              if (company.linkedInURL) updates.linkedin_url = company.linkedInURL;
              if (company.industry) updates.industry = company.industry;
              if (company.subIndustry) updates.sub_industry = company.subIndustry;
              if (company.employeeCount) updates.employee_count = String(company.employeeCount);
              if (company.description) updates.description = company.description;
              if (Array.isArray(company.keywords) && company.keywords.length > 0) updates.specialities = company.keywords.slice(0, 20).join(', ');
              if (company.hqCountry) updates.country = company.hqCountry;
              if (company.hqAddress) updates.address = company.hqAddress;
              const phone = Array.isArray(company.phones) ? company.phones[0] : null;
              if (phone) updates.phone = phone;
              if (company.founded) updates.founded_year = String(company.founded);
              if (company.revenue) updates.annual_revenue = company.revenue;
              if (company.parentOrganization?.name) updates.parent_account = company.parentOrganization.name;
              if (company.name) updates.name = company.name;
              updates.last_enriched_at = new Date().toISOString();
              updates.updated_at = new Date().toISOString();

              await supabase.from('companies').update(updates).eq('id', company.externalID);
              console.log(`Enriched company ${company.externalID}: ${Object.keys(updates).length} fields updated`);
            }
          }
        }

        const ids = companiestoEnrich.map(c => c.id);
        await supabase.from('companies').update({ last_enriched_at: new Date().toISOString() }).in('id', ids);

        console.log(`Surfe company enrichment completed: ${companies.length} companies`);
        return res.status(200).json({ count: companies.length, type: 'companies', surfeResponse: result });
      }
    }

    return res.status(200).json({ message: 'No enrichable items', count: 0 });

  } catch (error) {
    console.error('Surfe enrichment error:', error);
    return res.status(500).json({ error: error.message });
  }
}
