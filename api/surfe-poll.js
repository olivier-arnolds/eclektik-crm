const SURFE_API = 'https://api.surfe.com';

export default async function handler(req, res) {
  const { enrichmentID, type } = req.query;
  if (!enrichmentID || !type) {
    return res.status(400).json({ error: 'enrichmentID and type required' });
  }

  const SURFE_KEY = process.env.SURFE_API_KEY;
  const SB_URL = process.env.VITE_SUPABASE_URL;
  // Try service key first, fallback to anon key
  let SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  // If service key looks invalid (not starting with eyJ), use anon key
  if (!SB_KEY || !SB_KEY.startsWith('eyJ')) {
    SB_KEY = process.env.VITE_SUPABASE_KEY;
  }

  try {
    // 1. Fetch enrichment results from Surfe
    const endpoint = type === 'companies'
      ? `/v2/companies/enrich/${enrichmentID}`
      : `/v2/people/enrich/${enrichmentID}`;

    const surfeResp = await fetch(`${SURFE_API}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${SURFE_KEY}` },
    });
    if (!surfeResp.ok) return res.status(surfeResp.status).json({ error: 'Surfe API error' });
    const surfeData = await surfeResp.json();

    let updated = 0;
    const items = surfeData.companies || surfeData.people || [];

    for (const item of items) {
      if (item.status !== 'SUCCESS' || !item.externalID) continue;

      const table = type === 'companies' ? 'companies' : 'contacts';

      // Fetch existing record to avoid overwriting good data with less precise Surfe data
      const existingResp = await fetch(
        `${SB_URL}/rest/v1/${table}?id=eq.${item.externalID}&select=*`,
        { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
      );
      const existingRows = await existingResp.json();
      const existing = Array.isArray(existingRows) ? existingRows[0] : null;

      // Helper: only set if Surfe has a value AND existing field is empty
      const setIfEmpty = (field, value) => { if (value && (!existing || !existing[field])) return value; return undefined; };
      // Helper: always overwrite (for fields Surfe is authoritative on)
      const setAlways = (value) => value || undefined;

      let updates = {};

      if (type === 'companies') {
        updates.website = setIfEmpty('website', Array.isArray(item.websites) ? item.websites[0] : null);
        updates.linkedin_url = setIfEmpty('linkedin_url', item.linkedInURL);
        updates.industry = setIfEmpty('industry', item.industry);
        updates.sub_industry = setIfEmpty('sub_industry', item.subIndustry);
        updates.employee_count = setIfEmpty('employee_count', item.employeeCount ? String(item.employeeCount) : null);
        updates.description = setIfEmpty('description', item.description);
        updates.specialities = setAlways(Array.isArray(item.keywords) && item.keywords.length > 0 ? item.keywords.slice(0, 20).join(', ') : null);
        updates.country = setIfEmpty('country', item.hqCountry);
        updates.address = setIfEmpty('address', item.hqAddress);
        updates.phone = setIfEmpty('phone', Array.isArray(item.phones) ? item.phones[0] : null);
        updates.founded_year = setIfEmpty('founded_year', item.founded ? String(item.founded) : null);
        updates.annual_revenue = setIfEmpty('annual_revenue', item.revenue);
        updates.parent_account = setIfEmpty('parent_account', item.parentOrganization?.name);

        // Remove undefined values
        Object.keys(updates).forEach(k => { if (updates[k] === undefined) delete updates[k]; });
      } else {
        if (Array.isArray(item.emails) && item.emails[0]) updates.email = item.emails[0];
        if (Array.isArray(item.mobilePhones) && item.mobilePhones[0]) updates.phone = item.mobilePhones[0];
        if (item.linkedInUrl) updates.linkedin_url = item.linkedInUrl;
        if (item.jobTitle) updates.title = item.jobTitle;
      }

      updates.last_enriched_at = new Date().toISOString();
      updates.updated_at = new Date().toISOString();

      // 2. Write to Supabase via REST API
      const patchResp = await fetch(
        `${SB_URL}/rest/v1/${table}?id=eq.${item.externalID}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      const patchStatus = patchResp.status;
      if (patchStatus === 200 || patchStatus === 204) {
        updated++;
      } else {
        const errText = await patchResp.text();
        const errText2 = await patchResp.text().catch(() => '');
        console.error(`PATCH failed: ${patchStatus} ${errText}`);
      }
    }

    return res.status(200).json({ success: true, updated, total: items.length });
  } catch (error) {
    console.error('Poll error:', error);
    return res.status(500).json({ error: error.message });
  }
}
