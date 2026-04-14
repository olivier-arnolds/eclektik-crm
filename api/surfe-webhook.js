import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Verify Surfe webhook signature
function verifySignature(body, signature, secret) {
  if (!signature || !secret) return false;
  try {
    const parts = signature.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
    const sig = parts.find(p => p.startsWith('v0='))?.slice(3);
    if (!timestamp || !sig) return false;

    const payload = `${timestamp}.${body}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch (e) {
    console.error('Signature verification error:', e);
    return false;
  }
}

// Match contact: email → linkedin_url → name+company
async function findContact(person) {
  const email = person.emails?.[0] || person.email;
  const linkedinUrl = person.linkedInUrl || person.linkedin_url;
  const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();
  const companyName = person.companyName || '';

  // 1. Match on email
  if (email) {
    const { data } = await supabase.from('contacts').select('id').eq('email', email).limit(1);
    if (data?.length > 0) return { id: data[0].id, matched: 'email' };
  }

  // 2. Match on LinkedIn URL
  if (linkedinUrl) {
    const { data } = await supabase.from('contacts').select('id').eq('linkedin_url', linkedinUrl).limit(1);
    if (data?.length > 0) return { id: data[0].id, matched: 'linkedin' };
  }

  // 3. Match on name + company
  if (fullName && companyName) {
    const { data } = await supabase.from('contacts').select('id')
      .ilike('full_name', fullName)
      .ilike('company_name', companyName)
      .limit(1);
    if (data?.length > 0) return { id: data[0].id, matched: 'name+company' };
  }

  return null;
}

// Match company: externalID → linkedin_url → website domain → name (fuzzy)
async function findCompany(company) {
  // 1. Match on externalID (Supabase UUID passed to Surfe)
  if (company.externalID) {
    const { data } = await supabase.from('companies').select('id').eq('id', company.externalID).limit(1);
    if (data?.length > 0) return { id: data[0].id, matched: 'externalID' };
  }

  // 2. Match on LinkedIn URL
  const linkedinUrl = company.linkedInURL || company.linkedInUrl || company.linkedin_url;
  if (linkedinUrl) {
    const { data } = await supabase.from('companies').select('id').eq('linkedin_url', linkedinUrl).limit(1);
    if (data?.length > 0) return { id: data[0].id, matched: 'linkedin' };
  }

  // 3. Match on website domain
  const websites = Array.isArray(company.websites) ? company.websites : (company.website ? [company.website] : []);
  for (const site of websites) {
    const domain = site.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase();
    if (domain) {
      const { data } = await supabase.from('companies').select('id').ilike('website', `%${domain}%`).limit(1);
      if (data?.length > 0) return { id: data[0].id, matched: 'website' };
    }
  }

  // 4. Match on name (exact)
  const name = company.name || company.companyName;
  if (name) {
    const { data } = await supabase.from('companies').select('id').ilike('name', name).limit(1);
    if (data?.length > 0) return { id: data[0].id, matched: 'name' };
  }

  // 5. Match on name (fuzzy — name contains or is contained in)
  if (name && name.length >= 3) {
    const { data } = await supabase.from('companies').select('id, name').ilike('name', `%${name}%`).limit(5);
    if (data?.length > 0) return { id: data[0].id, matched: 'name-fuzzy' };
    // Also try if DB name is contained in Surfe name
    const { data: data2 } = await supabase.from('companies').select('id, name');
    const match = (data2 || []).find(c => name.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(name.toLowerCase()));
    if (match) return { id: match.id, matched: 'name-contains' };
  }

  return null;
}

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify signature
  const signature = req.headers['x-surfe-signature'];
  const secret = process.env.SURFE_WEBHOOK_SECRET;
  const rawBody = JSON.stringify(req.body);

  if (secret && signature && !verifySignature(rawBody, signature, secret)) {
    console.error('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { eventType, data } = req.body;
  console.log('Surfe webhook received:', eventType);

  try {
    // ── PERSON ENRICHMENT ──
    if (eventType === 'person.enrichment.completed' && data?.person) {
      const person = data.person;
      const email = person.emails?.[0] || person.email;
      const phone = person.mobilePhones?.[0] || person.phone;
      const linkedinUrl = person.linkedInUrl || person.linkedin_url;
      const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();

      const match = await findContact(person);

      if (match) {
        // Update existing contact
        const updates = {};
        if (email) updates.email = email;
        if (phone) updates.phone = phone;
        if (linkedinUrl) updates.linkedin_url = linkedinUrl;
        if (person.jobTitle) updates.title = person.jobTitle;
        if (person.firstName) updates.first_name = person.firstName;
        if (person.lastName) updates.last_name = person.lastName;
        if (fullName) updates.full_name = fullName;
        updates.updated_at = new Date().toISOString();
        updates.last_enriched_at = new Date().toISOString();

        await supabase.from('contacts').update(updates).eq('id', match.id);
        console.log(`Updated contact ${match.id} (matched by ${match.matched})`);
        return res.status(200).json({ action: 'updated', contactId: match.id, matched: match.matched });
      } else {
        // Create new contact
        const newContact = {
          full_name: fullName,
          first_name: person.firstName || null,
          last_name: person.lastName || null,
          email: email || null,
          phone: phone || null,
          linkedin_url: linkedinUrl || null,
          title: person.jobTitle || null,
          company_name: person.companyName || null,
          stage: 'Active',
          source: 'Surfe',
          owner: 'MVG',
        };

        const { data: inserted } = await supabase.from('contacts').insert(newContact).select('id');
        console.log(`Created new contact: ${fullName}`);
        return res.status(200).json({ action: 'created', contactId: inserted?.[0]?.id });
      }
    }

    // ── COMPANY ENRICHMENT ──
    if (eventType === 'company.enrichment.completed' && data?.company) {
      const company = data.company;
      const match = await findCompany(company);

      if (match) {
        const updates = {};
        // Websites — take first from array or direct field
        const website = Array.isArray(company.websites) ? company.websites[0] : (company.website || company.websites);
        if (website) updates.website = website;
        // LinkedIn URL
        if (company.linkedInURL || company.linkedInUrl) updates.linkedin_url = company.linkedInURL || company.linkedInUrl;
        // Industry + sub-industry (apart)
        if (company.industry) updates.industry = company.industry;
        if (company.subIndustry) updates.sub_industry = company.subIndustry;
        // Employee count
        if (company.employeeCount) updates.employee_count = String(company.employeeCount);
        // Revenue → jaaromzet
        if (company.revenue) updates.annual_revenue = company.revenue;
        // Description
        if (company.description) updates.description = company.description;
        // Keywords as specialities
        if (Array.isArray(company.keywords) && company.keywords.length > 0) updates.specialities = company.keywords.join(', ');
        // HQ address and country
        if (company.hqCountry) updates.country = company.hqCountry;
        if (company.hqAddress) updates.address = company.hqAddress;
        // Phone — take first from array or direct
        const phone = Array.isArray(company.phones) ? company.phones[0] : company.phone;
        if (phone) updates.phone = phone;
        // Founded year
        if (company.founded) updates.founded_year = String(company.founded);
        // Followers count as tagline
        if (company.followersCountLinkedin) updates.tagline = `${company.followersCountLinkedin} LinkedIn followers`;
        // Annual revenue
        if (company.revenue) updates.annual_revenue = company.revenue;
        // Parent organization
        if (company.parentOrganization?.name) updates.parent_account = company.parentOrganization.name;

        updates.updated_at = new Date().toISOString();
        updates.last_enriched_at = new Date().toISOString();

        await supabase.from('companies').update(updates).eq('id', match.id);
        console.log(`Updated company ${match.id} (matched by ${match.matched})`);
        return res.status(200).json({ action: 'updated', companyId: match.id, matched: match.matched });
      } else {
        const newCompany = {
          name: company.name || company.companyName || 'Unknown',
          website: Array.isArray(company.websites) ? company.websites[0] : (company.website || null),
          linkedin_url: company.linkedInURL || company.linkedInUrl || null,
          industry: company.industry || null,
          sub_industry: company.subIndustry || null,
          employee_count: company.employeeCount ? String(company.employeeCount) : null,
          specialities: Array.isArray(company.keywords) ? company.keywords.join(', ') : null,
          country: company.hqCountry || null,
          address: company.hqAddress || null,
          phone: Array.isArray(company.phones) ? company.phones[0] : (company.phone || null),
          description: company.description || null,
          founded_year: company.founded ? String(company.founded) : null,
          tagline: company.followersCountLinkedin ? `${company.followersCountLinkedin} LinkedIn followers` : null,
          parent_account: company.parentOrganization?.name || null,
          annual_revenue: company.revenue || null,
          sub_industry: company.subIndustry || null,
          type: 'Prospect',
          stage: 'Active',
          owner: 'MVG',
        };

        const { data: inserted } = await supabase.from('companies').insert(newCompany).select('id');
        console.log(`Created new company: ${newCompany.name}`);
        return res.status(200).json({ action: 'created', companyId: inserted?.[0]?.id });
      }
    }

    // Unknown event
    console.log('Unhandled event type:', eventType);
    return res.status(200).json({ action: 'ignored', eventType });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
