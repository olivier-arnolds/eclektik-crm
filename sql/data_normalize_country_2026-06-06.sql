-- Normalize companies.country to consistent full English country names.
-- Unifies US / USA / United States → "United States" and collapses ISO codes
-- (CH, NL, GB, DE, …) into their full names so every region-aware view (Reporting,
-- Insights review, funnel stripe) agrees. NULL countries are left untouched.
-- Run once. Idempotent: canonical values map to themselves.

UPDATE companies SET country = m.canon
FROM (VALUES
  ('US','United States'),('USA','United States'),('United States','United States'),
  ('GB','United Kingdom'),('United Kingdom','United Kingdom'),
  ('CH','Switzerland'),('Switzerland','Switzerland'),
  ('NL','Netherlands'),('Netherlands','Netherlands'),
  ('DE','Germany'),('Germany','Germany'),
  ('FR','France'),('France','France'),
  ('IE','Ireland'),('Ireland','Ireland'),
  ('ES','Spain'),('IT','Italy'),('AT','Austria'),
  ('BE','Belgium'),('SE','Sweden'),('FI','Finland'),
  ('NO','Norway'),('Norway','Norway'),
  ('DK','Denmark'),('Danmark','Denmark'),
  ('IS','Iceland'),('LI','Liechtenstein'),('GR','Greece'),
  ('AE','United Arab Emirates'),
  ('ZA','South Africa'),('South Africa','South Africa'),
  ('BW','Botswana'),
  ('JP','Japan'),('Japan','Japan'),
  ('NZ','New Zealand'),('CL','Chile'),('Canada','Canada')
) AS m(raw, canon)
WHERE companies.country = m.raw AND companies.country IS DISTINCT FROM m.canon;
