import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Fetch and parse a webpage for relevant content
async function fetchPage(url, timeout = 8000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EclectikCRM/1.0)' }
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const html = await resp.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.substring(0, 6000);
  } catch (e) {
    return null;
  }
}

// Try to fetch news page or about page
async function fetchSubPages(baseUrl) {
  const pages = {};
  const base = baseUrl.replace(/\/$/, '');
  for (const path of ['/news', '/about', '/about-us', '/nieuws']) {
    const content = await fetchPage(`${base}${path}`, 5000);
    if (content && content.length > 200) {
      pages[path] = content.substring(0, 3000);
      if (Object.keys(pages).length >= 2) break;
    }
  }
  return pages;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { companyId, model } = req.body;
  const MODELS = {
    haiku: 'claude-haiku-4-20250414',
    sonnet: 'claude-sonnet-4-20250514',
    opus: 'claude-opus-4-20250514',
  };
  const selectedModel = MODELS[model] || MODELS.sonnet;
  if (!companyId) {
    return res.status(400).json({ error: 'companyId required' });
  }

  try {
    // Get company data + contacts + pipeline items
    const [{ data: company }, { data: companyContacts }, { data: companyItems }] = await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).single(),
      supabase.from('contacts').select('full_name, title, email').eq('company_id', companyId).limit(20),
      supabase.from('opportunities').select('topic, status, est_revenue, actual_revenue, stage, sub_status, product_line').eq('company_id', companyId).limit(10),
    ]);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Fetch website content
    let websiteContent = null;
    let subPages = {};
    if (company.website) {
      const url = company.website.startsWith('http') ? company.website : `https://${company.website}`;
      websiteContent = await fetchPage(url);
      subPages = await fetchSubPages(url);
    }

    // Build context for Claude
    const context = `
COMPANY DATA FROM CRM:
- Name: ${company.name}
- Type: ${company.type || 'Unknown'}
- Country: ${company.country || 'Unknown'}
- City: ${company.city || company.address || 'Unknown'}
- Industry: ${company.industry || 'Unknown'}
- Website: ${company.website || 'None'}
- Employees: ${company.employee_count || 'Unknown'}
- Annual revenue: ${company.annual_revenue ? '€' + Number(company.annual_revenue).toLocaleString('en') : 'Unknown'}
- Primary contact: ${company.primary_contact || 'Unknown'}

CONTACTS IN CRM (${(companyContacts || []).length}):
${(companyContacts || []).map(c => `- ${c.full_name} — ${c.title || 'no role'} (${c.email || 'no email'})`).join('\n') || 'No contacts'}

PIPELINE ITEMS:
${(companyItems || []).map(i => `- ${i.topic} — status: ${i.status}, stage: ${i.stage}, revenue: €${i.est_revenue || i.actual_revenue || 0}`).join('\n') || 'No items'}

${websiteContent ? `WEBSITE HOMEPAGE CONTENT:\n${websiteContent.substring(0, 4000)}` : 'No website content available.'}

${Object.entries(subPages).map(([path, content]) => `WEBSITE ${path.toUpperCase()} PAGE:\n${content}`).join('\n\n')}
`.trim();

    // Call Claude Sonnet for analysis
    const message = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Je bent een business development analist voor Eclectik, een B2B consultancy gespecialiseerd in:
1. AI Transformatie — AI readiness assessments, ROI modellen, implementatie
2. People Science / Glint — employee engagement, Viva Insights, cultuuranalyse
3. Microsoft 365 / Teams — implementatie, adoptie, change management
4. Technical — Azure, Teams, cloud migratie

Analyseer het volgende bedrijf en maak een gestructureerd overzicht in het Nederlands met deze secties:

## Bedrijfsprofiel
Korte samenvatting van het bedrijf, wat ze doen, hun marktpositie.

## Recente Ontwikkelingen
Wat is er recent veranderd of gaande bij dit bedrijf? (op basis van website content)

## Strategische Thema's
Welke thema's zijn relevant voor dit bedrijf? (AI, digitalisering, HR, duurzaamheid etc.)

## Kansen voor Eclectik
Concrete verkoopkansen gebaseerd op de analyse. Welke Eclectik-diensten sluiten aan bij de behoeften van dit bedrijf? Wees specifiek en actiegericht.

## Aanbevolen Acties
2-3 concrete volgende stappen voor het BD team.

Hier is de informatie:

${context}`
      }]
    });

    const summary = message.content[0]?.text || 'Analysis could not be generated.';

    // Extract sources
    const sources = [
      company.website ? { type: 'website', url: company.website } : null,
      ...Object.keys(subPages).map(path => ({
        type: 'subpage',
        url: `${company.website.replace(/\/$/, '')}${path}`,
        title: path.replace('/', '').replace('-', ' ')
      })),
    ].filter(Boolean);

    // Save to company_insights
    const { data: insight, error } = await supabase
      .from('company_insights')
      .insert({
        company_id: companyId,
        summary,
        news_items: [],
        sources,
        created_by: `claude-${model || 'sonnet'}`,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, insight });

  } catch (error) {
    console.error('Company insights error:', error);
    return res.status(500).json({ error: error.message });
  }
}
