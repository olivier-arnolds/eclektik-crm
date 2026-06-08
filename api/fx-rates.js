// Live EUR conversion rates for the Reporting weighted forecast.
// Fetched server-side (frankfurter.dev / ECB) so the browser calls a same-origin
// endpoint — no CORS, CSP or ad-blocker issues. Returns EUR per 1 unit:
//   { usd, gbp, date }  e.g. usd 0.87 means 1 USD = 0.87 EUR.
// Falls back to 1:1 (no conversion) if the upstream is unavailable.

export default async function handler(req, res) {
  try {
    const r = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP');
    const j = await r.json();
    const usd = j && j.rates && j.rates.USD ? 1 / j.rates.USD : 1;
    const gbp = j && j.rates && j.rates.GBP ? 1 / j.rates.GBP : 1;
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ usd, gbp, date: (j && j.date) || null });
  } catch (e) {
    return res.status(200).json({ usd: 1, gbp: 1, date: null, error: String(e) });
  }
}
