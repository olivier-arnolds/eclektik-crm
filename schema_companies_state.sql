-- Adds a "state" field to clients (companies) and backfills it for US clients,
-- derived from each company's city / address / postal code. A few rows had a
-- city that disagreed with the address (e.g. a London office on a US HQ record)
-- — for those the US HQ state was used. Non-US clients are left null.
--
-- Run in the Supabase SQL editor. companies already has RLS + the uniform
-- policy, so the column add needs nothing further. Re-runnable.

alter table public.companies add column if not exists state text;

update public.companies as c set state = v.state
from (values
  ('7d6219cc-4de8-429b-ac84-18b986cf4a1d', 'North Carolina'),  -- Alex Lee Inc. (Hickory)
  ('8e2f1984-945c-419b-b3ab-14912f74899f', 'Pennsylvania'),    -- American Eagle Outfitters (Pittsburgh)
  ('e3efb38b-6ff5-4f06-8dbb-223dd4da4dd2', 'Washington'),      -- Avanade (Seattle)
  ('99768695-5579-4987-9899-1eacac4caaeb', 'California'),      -- BetterUp (San Francisco)
  ('85f8f34e-9c73-4ffb-9eb5-9eb5425866ca', 'California'),      -- BioMarin (San Rafael)
  ('e9e89782-6433-40f0-9555-e4be4e57ce05', 'California'),      -- Blackhawk Network (Pleasanton)
  ('b4588dc3-fd5c-48aa-a9d3-bf9931b6e93f', 'Texas'),           -- BMC Software (Houston)
  ('7a1ba1bf-3603-42e6-aa7b-3d04db3b71e8', 'Massachusetts'),   -- Boston Red Sox (Boston)
  ('6eb4a048-4270-4a96-a12d-fff0e16e9aea', 'California'),      -- Capital Group (Los Angeles)
  ('70d873bc-857e-41dc-9af8-f7751bd696b2', 'New York'),        -- Celonis (US HQ New York)
  ('88eee30a-8548-437b-b411-b72a35d6d80a', 'Massachusetts'),   -- Cognex (Natick)
  ('159902f1-f561-4f3d-be67-a0dc12ea2820', 'North Carolina'),  -- Columbus Regional Healthcare (Whiteville)
  ('d230ee93-4d04-4de1-9654-3b0ee5ab919c', 'New York'),        -- Conde Nast (One WTC, New York)
  ('5cf2bae6-30e4-47db-8070-4aaf48330f00', 'New Jersey'),      -- Cross River Bank (Fort Lee)
  ('675754ef-1ec8-4c03-9bf2-ab27c8ca0172', 'California'),      -- Cubic Corporation (San Diego)
  ('73d42855-f0dc-4eac-9784-0c55056733e1', 'Massachusetts'),   -- Draper (Cambridge)
  ('aff8e940-9138-4150-80e5-170657b517b5', 'California'),      -- Edwards Life Sciences (Irvine)
  ('d65a2fc4-5e08-47b1-a8ae-ed08b35362ae', 'California'),      -- Farmers Insurance (Woodland Hills)
  ('076180f6-75f1-417c-aaec-63869dd3cfc0', 'Massachusetts'),   -- Fenway Sports Group (Boston)
  ('bded084c-d016-412f-99f7-03945082bc2b', 'Arizona'),         -- GoDaddy (Tempe / Scottsdale)
  ('ca164b63-caef-4778-9aa1-23f8a520b9df', 'New York'),        -- HiBob (US office New York)
  ('3684e1d8-ac0d-4698-9d72-3b5449f347a7', 'North Carolina'),  -- Indicor (Charlotte)
  ('0a29d5ae-aa62-402b-aa63-c615e9d2dc90', 'California'),      -- Kaiser Permanente (Oakland)
  ('8a870b5a-ff8b-4f12-a36d-7f3f60ae65c9', 'Kentucky'),        -- Kizan (Louisville)
  ('3284846a-9806-440d-8de0-3335d97d6ccf', 'Florida'),         -- LHH (Maitland / Jacksonville)
  ('ea1eaff1-cfb9-439f-8cae-0d37ed3b5fe2', 'California'),      -- Marvell Technology (Santa Clara)
  ('081f6a4b-8c00-4f32-a3b9-959eba7eb1eb', 'Washington'),      -- Microsoft (Redmond)
  ('5957526d-c68c-44db-801c-d1dde98c3635', 'Washington'),      -- Microsoft Corp (Redmond)
  ('6031f340-ece6-42d6-a51d-a0b4192d353a', 'California'),      -- Molina Healthcare (Long Beach)
  ('7f6bc299-9e6b-4124-82f5-68bfb64fa493', 'Mississippi'),     -- North Mississippi Health Services (Tupelo)
  ('cd558fa2-4b40-4357-9ba0-c7aa20cee4f5', 'Texas'),           -- NOV (Houston)
  ('41c6d2b4-d002-4785-9dab-664d8060f9b5', 'New York'),        -- Oscar Health (New York)
  ('4f27b051-e242-44cb-88d9-8f259c598edc', 'California'),      -- PIMCO (Newport Beach)
  ('0db2005b-b906-423c-bc68-08e30da8a3fe', 'California'),      -- Pacific Life Insurance (Newport Beach)
  ('4f2337e0-82e2-4619-a05a-edd97be677ed', 'Minnesota'),       -- Post Consumer Brands (Lakeville)
  ('81d10aba-daf1-481b-895a-652bd7edaca5', 'New York'),        -- PwC (New York)
  ('b6d53e3e-5d5b-4b51-92ed-5d86572d2083', 'New Jersey'),      -- Quest Diagnostics (Secaucus)
  ('ffcca089-2974-4774-81d2-686690960cfd', 'California'),      -- Redwood Credit Union (Santa Rosa)
  ('e24750a7-07aa-4aa9-8df1-36537ab2f077', 'Georgia'),         -- Republic National Distributing (Atlanta)
  ('5bd67051-b605-4843-bb58-239309c3f877', 'California'),      -- SoFi (San Francisco)
  ('11b271d0-bfe4-4e4a-8767-10b480032572', 'Texas'),           -- TDIndustries (Dallas / Farmers Branch)
  ('cd83e0ca-6003-4d64-b0eb-0d54132207d7', 'California'),      -- Ventura Foods (Irvine)
  ('d13d8314-3863-4e08-aad2-5e5a64a6b72f', 'Illinois'),        -- Walgreens (Deerfield)
  ('e3221483-3290-4f8d-a989-1eba3dca5496', 'Connecticut'),     -- Webster Bank (Waterbury / Stamford)
  ('5db85387-636d-4ec4-8864-386c83ef4549', 'Pennsylvania'),    -- Westinghouse (Cranberry Township)
  ('91c7429c-1ee9-4410-a88c-cbe2211c5f73', 'Illinois')         -- Zurich North America (Schaumburg)
) as v(id, state)
where c.id = v.id::uuid;
