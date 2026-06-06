-- Fill missing description / specialities for the 7 customers that lacked them
-- (2026-06-06). Text is written from general public knowledge of each company —
-- worth a quick eyeball, or re-enrich from LinkedIn for canonical specialities.
-- Only blank fields are set; existing values are left alone. Also corrects
-- Farmers Insurance's website (was wrongly microsoft.com).
--
-- Revert: set the same columns back to NULL for these ids (they were empty).

-- BMC Software — had a description, only specialities missing
update public.companies set specialities =
  'IT service management, AIOps, DevOps, mainframe (BMC AMI), workload automation (Control-M), digital service & operations management, enterprise software'
where id = 'b4588dc3-fd5c-48aa-a9d3-bf9931b6e93f';

-- Eppendorf
update public.companies set
  description = 'Eppendorf is a Germany-based life-science company that develops and manufactures laboratory instruments and consumables — pipettes and dispensers, centrifuges, freezers, and bioprocess and cell-handling systems — used in research, clinical and industrial laboratories worldwide.',
  specialities = 'Laboratory equipment, liquid handling / pipettes, centrifuges, bioprocess systems, cell handling, ultra-low temperature freezers, lab consumables'
where id = '237c2a6c-8ecc-4d4e-ad7d-a7f3bdac0538';

-- Farmers Insurance Group (+ website fix)
update public.companies set
  description = 'Farmers Insurance Group is one of the largest US insurers, offering auto, home, life and small-business insurance through a nationwide agent network. It operates as part of the Farmers Exchanges, managed by Farmers Group, a member of Zurich Insurance Group.',
  specialities = 'Auto insurance, home insurance, life insurance, commercial / business insurance, financial services',
  website = 'https://www.farmers.com'
where id = 'd65a2fc4-5e08-47b1-a8ae-ed08b35362ae';

-- IMC
update public.companies set
  description = 'IMC is a global proprietary trading firm and market maker, founded in Amsterdam, that provides liquidity on exchanges worldwide across equities, options, ETFs and other instruments using its own capital and technology.',
  specialities = 'Market making, proprietary trading, liquidity provision, options & ETF trading, low-latency trading technology, quantitative research'
where id = '686f8dbb-b9b1-473c-b5ca-9c694d2717e9';

-- M&C Saatchi Group
update public.companies set
  description = 'M&C Saatchi Group is a global advertising and marketing communications network headquartered in London, providing creative advertising, brand strategy, media, data and specialist communications across markets worldwide.',
  specialities = 'Advertising, brand strategy, creative, media, data & analytics, PR & communications, marketing'
where id = '219edb5e-c3b7-4f6a-8f31-5ac99cbf8e3a';

-- Maire — had a description, only specialities missing
update public.companies set specialities =
  'Engineering & construction (EPC), plant engineering, energy transition & sustainable technology, hydrocarbons & chemicals, technology licensing, project management'
where id = '8259bf3f-44fc-4783-b3a4-9181a9e0abca';

-- Trane Technologies
update public.companies set
  description = 'Trane Technologies is a global climate-innovation company (parent of the Trane and Thermo King brands) focused on heating, ventilation and air conditioning (HVAC) and transport refrigeration, with a strong emphasis on energy efficiency and decarbonisation.',
  specialities = 'HVAC systems, building climate control, energy efficiency & decarbonisation, transport refrigeration (Thermo King), building automation, sustainability solutions'
where id = 'a258c49b-da4e-48f0-8d91-6edacf8c1832';
