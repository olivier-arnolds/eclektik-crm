-- ============================================================================
-- People Science — portfolio-wide item backfill (batch 2)
-- Date: 2026-06-09 (overnight batch) · Run in: PS Supabase SQL Editor
-- 13 cycles / 139 item rows, extracted from raw IR decks on SharePoint.
-- Deck-printed values only; NULL = not printed; ambiguities flagged in meta.
-- Per-group audit blocks (content updates, no version bump) are included.
-- NOT covered (no deck): IMC 2023 baseline + 2025 deep-dives + 2026 in-flight,
-- Alex Lee Jan 2025 (reconstructed), EFTA pre-IR, Warburtons 2022-2024,
-- all YoY-synthesis cycles (synthesis-from-cycles by design).
-- ============================================================================

-- Alex Lee · Mar 2026 IR · extracted 2026-06-09 from "Alex Lee 2026 Insights Review 25mar 2026.pptx" (SharePoint Customers-AlexLeeInc)
-- Benchmark cohort: US 2025 Benchmark. vs_bm only where the deck literally prints a delta (Overview slide);
-- for all other items the printed benchmark VALUES (slide 24 "Comparison of Benchmarks" table) are kept in meta, vs_bm left NULL.
-- Driver-impact slide is image-only in the text export -> impact NULL for all Alex Lee items.
insert into items (cycle_id, name, score, vs_bm, yoy, impact, favourable, category, meta) values
('15d2060e-dd37-4768-bb55-af4277ba1117','eSat',72,-2,1,null,68,null,'{"bm_us_2025":74,"bm_food_beverages_2025":76,"bm_retail_2025":74,"bm_transport_logistics_2023":74,"favourable_note":"68% feel Engaged at Work (engagement favourable, printed next to eSat 72)","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Equal Opportunity',75,0,1,null,null,'strength','{"bm_us_2025":75,"bm_food_beverages_2025":73,"bm_retail_2025":74,"delta_note":"deck prints (up1, at BM)","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Work Life Balance',72,-1,1,null,null,'strength','{"bm_us_2025":73,"bm_food_beverages_2025":71,"bm_retail_2025":71,"bm_transport_logistics_2023":72,"provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Culture',71,-1,0,null,66,'strength','{"bm_us_2025":72,"bm_retail_2025":73,"provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Team',74,-8,1,null,null,'opportunity','{"bm_us_2025":82,"bm_retail_2025":78,"provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Rewards',57,-7,1,null,47,'opportunity','{"bm_us_2025":64,"bm_retail_2025":61,"provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Purpose',74,-7,1,null,null,'opportunity','{"bm_us_2025":81,"bm_food_beverages_2025":80,"bm_retail_2025":78,"bm_transport_logistics_2023":78,"provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Leadership',67,null,null,null,60,null,'{"bm_us_2025":69,"bm_food_beverages_2025":71,"bm_retail_2025":70,"bm_transport_logistics_2023":71,"note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Recommend',71,null,null,null,null,null,'{"bm_us_2025":73,"bm_food_beverages_2025":74,"bm_retail_2025":73,"bm_transport_logistics_2023":73,"note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Resources',69,null,null,null,null,null,'{"bm_us_2025":71,"bm_food_beverages_2025":70,"bm_retail_2025":71,"bm_transport_logistics_2023":70,"note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Feedback',75,null,null,null,null,null,'{"bm_us_2025":78,"bm_food_beverages_2025":76,"bm_retail_2025":77,"bm_transport_logistics_2023":76,"note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Inclusion',67,null,null,null,null,null,'{"bm_us_2025":70,"bm_food_beverages_2025":69,"bm_retail_2025":69,"bm_transport_logistics_2023":68,"note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Acceptance',78,null,null,null,null,null,'{"bm_us_2025":82,"note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Career',64,null,null,null,null,null,'{"bm_us_2025":68,"bm_retail_2025":67,"bm_transport_logistics_2023":66,"note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Recognition',66,null,null,null,null,null,'{"bm_us_2025":70,"bm_food_beverages_2025":69,"bm_retail_2025":69,"bm_transport_logistics_2023":67,"note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Action Taking',57,null,null,null,47,null,'{"bm_us_2025":62,"bm_food_beverages_2025":65,"bm_retail_2025":64,"bm_transport_logistics_2023":63,"favourable_note":"only 47% believe meaningful action will be taken (28% do not)","note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Empowerment',71,null,null,null,null,null,'{"bm_us_2025":76,"bm_food_beverages_2025":75,"bm_retail_2025":75,"bm_transport_logistics_2023":74,"deck_label":"Key Driver","note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Growth',67,null,null,null,null,null,'{"bm_us_2025":72,"bm_food_beverages_2025":72,"bm_retail_2025":71,"bm_transport_logistics_2023":69,"note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Prospects',67,null,null,null,null,null,'{"bm_us_2025":72,"bm_food_beverages_2025":75,"bm_retail_2025":73,"bm_transport_logistics_2023":74,"deck_label":"Key Driver","subgroup_note":"Alex Lee (subsidiary org) declined 5 on Prospects","note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Respect. Treatment',76,null,null,null,null,null,'{"bm_us_2025":81,"bm_retail_2025":79,"note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Retention',60,null,null,null,49,null,'{"bm_us_2025":65,"bm_retail_2025":64,"favourable_note":"only 49% rarely think about looking for another job","note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Role',76,null,null,null,null,null,'{"bm_us_2025":81,"bm_retail_2025":77,"note":"delta vs BM not printed","provenance":"deck"}'),
('15d2060e-dd37-4768-bb55-af4277ba1117','Manager',77,null,null,null,null,null,'{"bm_us_2025":83,"bm_retail_2025":79,"bm_transport_logistics_2023":79,"note":"delta vs BM not printed","provenance":"deck"}');

-- Breitling · Apr 2025 IR · extracted 2026-06-09 from "Breitling April 2025" Viva Glint Insights deck (SharePoint, read via file URI)
-- Benchmark cohort: Global Top 10% -> vs_bm = printed "Top 10%" delta; printed "vs. Global" delta kept in meta.
-- Deck is short (~9 slides); subgroup tables (region/tenure) are image-only. No strength score cards printed; engagement vs-benchmark delta not printed.
insert into items (cycle_id, name, score, vs_bm, yoy, impact, favourable, category, meta) values
('f3777946-9e0a-4c92-929e-6f3fe6b8037a','Engagement',75,null,null,null,null,null,'{"label":"Feb 25 Engagement, Company 75","action_taking_subgroups":{"unfavorable_n299":51,"neutral_n389":68,"favorable_n789":87},"provenance":"deck"}'),
('f3777946-9e0a-4c92-929e-6f3fe6b8037a','Growth',69,-10,0,4,null,'opportunity','{"vs_global":-3,"slide_title":"Relative opportunities to reinforce","provenance":"deck"}'),
('f3777946-9e0a-4c92-929e-6f3fe6b8037a','Communication',65,-11,5,4,null,'opportunity','{"vs_global":-2,"slide_title":"Relative opportunities to reinforce","provenance":"deck"}'),
('f3777946-9e0a-4c92-929e-6f3fe6b8037a','Inclusion',74,-11,1,4,null,'opportunity','{"vs_global":-4,"slide_title":"Relative opportunities to reinforce","provenance":"deck"}');

-- Dentsu · Sep 2025 Check-In · extracted 2026-06-09 from "Dentsu September 2025 Check In" Viva Glint Insights deck (Feb 2026, SharePoint, read via file URI)
-- Cycle benchmark cohort given as Global Top 25%; the deck labels all printed deltas "vs. (Global) Benchmark" -> taken as vs_bm, label noted in meta.
-- Impact per the strength/opportunity cards; Top Drivers slide separately lists 13 "very high" impact items (conflicts noted in meta).
insert into items (cycle_id, name, score, vs_bm, yoy, impact, favourable, category, meta) values
('7e059ff5-b179-4e89-ac98-f3ba6666a4bb','Engagement',68,-7,0,null,61,null,'{"benchmark_value":75,"benchmark_label_in_deck":"Global Benchmark","yoy_note":"2024: No change","favourable_note":"61% feel Engaged at Work","response_rate_pct":81,"subgroup_engagement":{"IM Global":60,"EMEA":65,"Americas":68,"IM Central":65,"APAC":65,"Dentsu Global Services":76},"provenance":"deck"}'),
('7e059ff5-b179-4e89-ac98-f3ba6666a4bb','Survey Action',62,-2,null,null,null,null,'{"benchmark_label_in_deck":"Global Benchmark","note":"headline prints Survey Action = 62 (-2 vs Global Benchmark); Action Taking listed among very-high-impact drivers but mapping not explicit","provenance":"deck"}'),
('7e059ff5-b179-4e89-ac98-f3ba6666a4bb','Leadership',74,3,null,3,null,'strength','{"benchmark_label_in_deck":"Global Benchmark","impact_note":"card says High impact; Top Drivers slide lists Leadership among 13 very-high-impact items","provenance":"deck"}'),
('7e059ff5-b179-4e89-ac98-f3ba6666a4bb','Leadership Communication',71,2,3,4,null,'strength','{"benchmark_label_in_deck":"Global Benchmark","yoy_source":"narrative slide: notable increase (+3) in perceptions of leadership communications","provenance":"deck"}'),
('7e059ff5-b179-4e89-ac98-f3ba6666a4bb','Collaboration',73,4,null,3,null,'strength','{"benchmark_label_in_deck":"Global Benchmark","provenance":"deck"}'),
('7e059ff5-b179-4e89-ac98-f3ba6666a4bb','Rewards',55,-8,1,4,null,'opportunity','{"benchmark_label_in_deck":"Global Benchmark","provenance":"deck"}'),
('7e059ff5-b179-4e89-ac98-f3ba6666a4bb','Strategy',61,-8,-1,3,null,'opportunity','{"benchmark_label_in_deck":"Global Benchmark","impact_note":"card says High impact; Top Drivers slide lists Strategy among 13 very-high-impact items","provenance":"deck"}'),
('7e059ff5-b179-4e89-ac98-f3ba6666a4bb','Prospects',62,-11,-4,4,null,'opportunity','{"benchmark_label_in_deck":"Global Benchmark","provenance":"deck"}');

-- Audit block
insert into version_log (version, entry_type, occurred_at, title, body_md, product)
values (null,'content-update', now(), 'Item backfill: Alex Lee 2026 + Breitling 2025 + Dentsu 2025 (35 rows)', 'Backfilled item-level scores from three Insights Review decks: Alex Lee Mar 2026 IR (23 items, incl. full Comparison-of-Benchmarks table; vs_bm only set where the deck prints a delta - other US-benchmark values stored in meta; driver-impact slide was image-only so impact is NULL throughout), Breitling Apr 2025 IR (4 items; short deck, region/tenure tables image-only, no strength score cards printed, engagement delta vs Top 10% benchmark not printed), Dentsu Sep 2025 Check-In (8 items; deck labels deltas vs Global Benchmark while cycle cohort is recorded as Global Top 25% - noted in meta; two impact conflicts between strength/opportunity cards and the Top Drivers list noted in meta). All values deck-printed only, no computed deltas.', 'peoplescience');
insert into change_log (table_name, action, note, actor_email)
values ('items','INSERT','Deck item backfill: Alex Lee Mar 2026 (23), Breitling Apr 2025 (4), Dentsu Sep 2025 (8) = 35 rows','marco@eclectik.co');


-- Draper · Sep 2025 IR · extracted 2026-06-09 from "Draper - Preview Insights Review 12sep2025.pptx"
-- Benchmark cohort: Top 25% Technology (deck wording: "Technology Benchmark" / "Tech")
-- Limitation: Driver Impact chart, Top Strengths & Opportunities table, and Most/Least Improved
-- comparison slides are image-only in the text export; item 0-100 scores and impact levels are not
-- printed as text, so score/impact are NULL for driver items.
insert into items (cycle_id, name, score, vs_bm, yoy, impact, favourable, category, meta) values
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','Engagement Index',76,0,3,null,77,null,'{"benchmark_label":"Technology Benchmark","note":"third consecutive increase of 3 points; 5% unfavorable; 77% favorable","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','How happy are you working at Draper?',null,-1,3,null,null,null,'{"esat":true,"note":"score not printed in deck text export","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','I would recommend Draper as a great place to work',null,1,2,null,null,null,'{"note":"score not printed in deck text export","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','Draper makes it easy for people from diverse backgrounds to be accepted',null,5,15,null,null,'strength','{"note":"score not printed in deck text export","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','I feel comfortable being myself at work',null,0,null,null,null,'strength','{"note":"new item, no trend printed; score not printed in deck text export","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','I feel satisfied with the recognition or praise I receive for my work',null,0,3,null,null,'strength','{"note":"score not printed in deck text export","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','Teams across Draper collaborate effectively to get things done',null,-11,2,null,49,'opportunity','{"note":"favourable % from headline slide; score not printed in deck text export","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','I understand how Draper plans to achieve its goal',null,-8,2,null,52,'opportunity','{"note":"favourable % from headline slide; score not printed in deck text export","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','Draper does a good job of communicating with employees',null,-8,0,null,null,'opportunity','{"note":"score not printed in deck text export","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','Confidence in leadership team',null,-8,3,null,null,null,'{"note":"listed under Other Notable Areas to Explore; score not printed","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','Resources to do my job well',null,-8,1,null,null,null,'{"note":"listed under Other Notable Areas to Explore; score not printed","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','Would recommend their manager',null,null,null,null,84,null,'{"note":"headline slide favourable % only","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','Empowered to make decisions regarding their work',null,null,null,null,77,null,'{"note":"headline slide favourable % only","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','Draper has the right culture to be successful in the future',null,null,null,null,60,null,'{"note":"headline slide favourable % only","provenance":"deck"}'),
('8ee3abf9-a0b0-4a6e-9b11-3b1dc76b64a5','Plan to be working at Draper two years from now',null,null,null,null,71,null,'{"note":"headline slide favourable % only","provenance":"deck"}');

-- IMC Trading · 2024 Sep IR (HRizons) · extracted 2026-06-09 from "SHARED_Presented_Preview_IMC Trading Viva Glint EC_2509.pdf"
-- Benchmark cohort: Global Top 10% (vs_bm = vs Top 10% Global; tech deltas in meta)
-- Limitation: subgroup heatmaps (region/tenure/gender) are image-only; gap-analysis items
-- (Purpose, Communication, Wellbeing, Culture, Collaboration, Recognition, eSat, Recommend)
-- have deltas printed but no 0-100 scores.
insert into items (cycle_id, name, score, vs_bm, yoy, impact, favourable, category, meta) values
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Engagement',83,1,-3,null,null,null,'{"vs_top10_tech":0,"note":"deltas printed vs 2023 benchmarks; response rate 89%","provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','eSat',null,null,-3,null,null,null,'{"note":"yoy from gap-analysis slide; score not printed","provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Recommend',null,null,-3,null,null,null,'{"note":"yoy from gap-analysis slide; score not printed","provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Empowerment',83,3,-1,3,null,'strength','{"vs_top10_tech":1,"bm_top10_global":83,"note":"deck prints Top 10% Global benchmark 83 alongside +3 delta (internally inconsistent)","provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Respectful Treatment',89,2,-1,3,null,'strength','{"bm_top10_global":87,"note":"vs Top 10% Tech printed as n/a","provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Growth',81,2,-2,3,null,'strength','{"vs_top10_tech":0,"bm_top10_global":79,"provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Global Leadership (ExCo)',73,-7,-2,3,null,'opportunity','{"vs_top10_tech":-8,"bm_top10_global":80,"provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Prospects',79,-4,0,4,null,'opportunity','{"vs_top10_tech":-6,"provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Feedback',79,-4,-3,null,null,'opportunity','{"vs_top10_tech":-5,"note":"impact printed inconsistently: High on S&O slide, Very high on recommendation slide; ambiguous in deck text export","provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Purpose',null,-11,null,null,null,null,'{"vs_top10_tech":-8,"note":"gap-analysis slide deltas only; score not printed","provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Communication',null,-2,-4,null,null,null,'{"vs_top10_tech":-6,"note":"gap-analysis slide deltas only; score not printed","provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Wellbeing',null,null,-4,null,null,null,'{"note":"gap-analysis slide yoy only; score not printed","provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Culture',null,null,-3,null,null,null,'{"note":"gap-analysis slide yoy only; score not printed","provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Collaboration',null,null,-3,null,null,null,'{"note":"gap-analysis slide yoy only; score not printed","provenance":"deck"}'),
('2bd69dfd-602c-4bcf-97c8-effe7470f93e','Recognition',null,null,-3,null,null,null,'{"note":"gap-analysis slide yoy only; score not printed","provenance":"deck"}');

-- IMC Trading · 2025 Global · extracted 2026-06-09 from "SHARED_IMC_Eclectik EC_010425_Executive Consultation.pptx"
-- Benchmark cohort: Global Top 10% (vs_bm = vs Top 10% Global; tech deltas in meta)
-- Limitation: appendix score-overview tables (highest/lowest, most improved/declined,
-- most above/below benchmark) are image-only; on the strengths slide the tech/trend delta
-- columns are jumbled in the text export for Initiative and Growth (set NULL).
insert into items (cycle_id, name, score, vs_bm, yoy, impact, favourable, category, meta) values
('c84f0430-aefe-4a03-8eac-a905f7ee9ec2','Engagement',82,1,-1,null,87,null,'{"vs_top10_tech":-1,"bm_top10_global":81,"note":"87% of people feel Engaged at Work; response rate 84%","provenance":"deck"}'),
('c84f0430-aefe-4a03-8eac-a905f7ee9ec2','Intent to Stay',81,-2,null,null,null,null,'{"vs_top10_tech":0,"bm_top10_global":83,"note":"trend printed as No Trend","provenance":"deck"}'),
('c84f0430-aefe-4a03-8eac-a905f7ee9ec2','Action Taking',63,-10,null,null,null,null,'{"vs_top10_tech":-14,"bm_top10_global":73,"global_avg":63,"note":"trend printed as No Trend","provenance":"deck"}'),
('c84f0430-aefe-4a03-8eac-a905f7ee9ec2','I feel empowered to make decisions regarding my work',84,4,1,3,null,'strength','{"vs_top10_tech":2,"theme":"Empowerment","provenance":"deck"}'),
('c84f0430-aefe-4a03-8eac-a905f7ee9ec2','I am encouraged to find new and better ways to get things done',83,2,null,3,null,'strength','{"theme":"Initiative","note":"tech and trend deltas ambiguous in deck text export","provenance":"deck"}'),
('c84f0430-aefe-4a03-8eac-a905f7ee9ec2','I have good opportunities to learn and grow at IMC',81,2,null,3,null,'strength','{"theme":"Growth","note":"tech and trend deltas ambiguous in deck text export","provenance":"deck"}'),
('c84f0430-aefe-4a03-8eac-a905f7ee9ec2','IMC does a good job of communicating with employees',70,-6,-4,3,null,'opportunity','{"vs_top10_tech":-10,"bm_top10_global":76,"theme":"Communication","provenance":"deck"}'),
('c84f0430-aefe-4a03-8eac-a905f7ee9ec2','I have confidence in IMC''s global leadership team (ExCo)',74,-5,1,3,null,'opportunity','{"vs_top10_tech":-7,"bm_top10_global":79,"theme":"Global Leadership","provenance":"deck"}'),
('c84f0430-aefe-4a03-8eac-a905f7ee9ec2','My manager provides me with feedback that helps me improve my performance',80,-4,1,3,null,'opportunity','{"vs_top10_tech":-4,"bm_top10_global":84,"theme":"Feedback","provenance":"deck"}');

-- Audit block
insert into version_log (version, entry_type, occurred_at, title, body_md, product)
values (null,'content-update', now(), 'Item backfill: Draper 2025 + IMC 2024 + IMC 2025 (39 rows)', 'Backfilled item-level scores from SharePoint Insights Review decks: Draper Sep 2025 IR (15 items), IMC Trading 2024 Sep IR HRizons (15 items), IMC Trading 2025 Global (9 items). Deck-printed values only. Limitations: Draper driver-impact and top strengths/opportunities tables are image-only so driver-item 0-100 scores and impact ratings are NULL (deltas vs Technology benchmark and trend arrows were printed as text); IMC 2024 gap-analysis items carry deltas without scores and Feedback impact is printed inconsistently (High vs Very High); IMC 2025 appendix score-overview tables are image-only and the strengths-slide tech/trend delta columns are jumbled in the text export for Initiative and Growth (set NULL with note).', 'peoplescience');
insert into change_log (table_name, action, note, actor_email)
values ('items','INSERT','Item backfill from IR decks: Draper Sep 2025 IR 15 rows, IMC 2024 Sep IR 15 rows, IMC 2025 Global 9 rows (39 total)','marco@eclectik.co');


-- Pepkor · Jul 2025 Dynamo · extracted 2026-06-09 from "Insights Review - July 2025 - 2107.pptx"
-- Benchmark cohort: Global Top 10%. Scores are 0-100 Glint average scores.
insert into items (cycle_id, name, score, vs_bm, yoy, impact, favourable, category, meta) values
('916cf34d-c518-458b-a5e0-b297196fb58e','Engagement',83,null,0,null,85,null,'{"provenance":"deck","benchmark_printed":81,"note":"vs-benchmark delta not printed, only benchmark value 81; yoy printed as +0 vs Jan 2025; 85% of people feel Engaged at Work","subgroup_engagement":{"Central Offices":81,"Distribution Centers":75,"Field":84},"response_rate_pct":82}'),
('916cf34d-c518-458b-a5e0-b297196fb58e','Continuous Improvement',84,8,null,3,null,'strength','{"provenance":"deck","note":"High impact on engagement; avg engagement for those favourable on all three strength drivers is 91"}'),
('916cf34d-c518-458b-a5e0-b297196fb58e','Action Taking',78,5,null,3,null,'strength','{"provenance":"deck","note":"High impact on engagement","engagement_by_segment":{"unfavorable_n251":58,"neutral_n485":72,"favorable_n2344":89}}'),
('916cf34d-c518-458b-a5e0-b297196fb58e','Change Communication',78,5,null,3,null,'strength','{"provenance":"deck","note":"High impact on engagement; deck flags Change Communication as an opportunity within Central Office (84% of Central Office grades below Global Top 10% benchmark on this item)"}'),
('916cf34d-c518-458b-a5e0-b297196fb58e','Work Life Balance',73,-6,-1,3,null,'opportunity','{"provenance":"deck","note":"High impact on engagement; declined 7 pts at PEP 2022-2025; Field declined 9 points since 2022"}'),
('916cf34d-c518-458b-a5e0-b297196fb58e','Inclusion - Team',80,-5,0,3,null,'opportunity','{"provenance":"deck","note":"High impact on engagement; yoy printed as 0 vs Jan 2025"}'),
('916cf34d-c518-458b-a5e0-b297196fb58e','Respectful Treatment',82,-5,0,3,null,'opportunity','{"provenance":"deck","note":"High impact on engagement; yoy printed as 0 vs Jan 2025"}');

-- Boston Red Sox · May 2025 HR Preview · extracted 2026-06-09 from "Boston Red Sox HR Preview.pptx"
-- Benchmark cohort: Glint Global benchmark. Driver-impact matrix and full benchmark
-- comparison tables are image-only in the deck export, so per-item 0-100 scores and
-- impact levels are not extractable; vs_bm and % favourable are taken from printed text.
insert into items (cycle_id, name, score, vs_bm, yoy, impact, favourable, category, meta) values
('785282ed-cc57-4393-80db-01d1ffcf697c','Engagement',80,6,null,null,80,null,'{"provenance":"deck","note":"Engagement Index 80, printed vs BENCHMARK: +6; first survey so no trend; 80% of people feel Engaged at Work; business-unit slides separately print Benchmark: 76","participation":"75% (436 of 581)"}'),
('785282ed-cc57-4393-80db-01d1ffcf697c','Purpose',null,9,null,null,91,'strength','{"provenance":"deck","item_text":"The work that I do is meaningful to me","unit":"pct-favourable","note":"0-100 score not printed in text export; 91% report their work being personally meaningful"}'),
('785282ed-cc57-4393-80db-01d1ffcf697c','Resources',null,8,null,null,null,'strength','{"provenance":"deck","item_text":"I have the resources I need to do my job well","note":"0-100 score not printed in text export"}'),
('785282ed-cc57-4393-80db-01d1ffcf697c','Initiative',null,6,null,null,82,'strength','{"provenance":"deck","item_text":"I am encouraged to find new and better ways to get things done","unit":"pct-favourable","note":"0-100 score not printed in text export"}'),
('785282ed-cc57-4393-80db-01d1ffcf697c','Speak My Mind',null,2,null,null,67,'opportunity','{"provenance":"deck","item_text":"I feel free to speak my mind without fear of negative consequences","unit":"pct-favourable","note":"0-100 score not printed in text export"}'),
('785282ed-cc57-4393-80db-01d1ffcf697c','Communication Team',null,0,null,null,76,'opportunity','{"provenance":"deck","item_text":"In our team, we communicate openly and honestly with each other","unit":"pct-favourable","vs_bm_printed":"at BM","note":"0-100 score not printed in text export"}'),
('785282ed-cc57-4393-80db-01d1ffcf697c','Work Life Balance',null,-9,null,null,54,'opportunity','{"provenance":"deck","item_text":"I am able to successfully balance my work and personal life","unit":"pct-favourable","unfavourable_pct":21,"note":"0-100 score not printed in text export"}'),
('785282ed-cc57-4393-80db-01d1ffcf697c','Feel comfortable being themselves',null,null,null,null,85,null,'{"provenance":"deck","unit":"pct-favourable","note":"headline slide only: 85% of employees feel comfortable being themselves; no Glint driver label or score printed"}');

-- Serco · Jan 2026 IR · extracted 2026-06-09 from "Serco  Insights Review Jan2026 Preview.pptx"
-- Benchmark cohort: Glint Global benchmark. Item-comparison tables and driver-impact
-- charts are image-only in the deck export; deck also states many items have no
-- benchmark mapping. Printed values are mostly % favourable (unit noted in meta).
insert into items (cycle_id, name, score, vs_bm, yoy, impact, favourable, category, meta) values
('cae4ade0-adb3-4a68-8e60-2692b5bc8882','Engagement',71,-4,-1,null,67,null,'{"provenance":"deck","note":"Engagement Index 71, -4 vs Global Benchmark, down 1 vs Sep 2024; 67% of people feel Engaged at Work","participation":"64% (27,441 of 42,877), down 4 points, benchmark 75%"}'),
('cae4ade0-adb3-4a68-8e60-2692b5bc8882','eSat',null,null,0,null,70,null,'{"provenance":"deck","item_text":"How happy are you working at Serco","unit":"pct-favourable","note":"70% (up 0) happy working at Serco; 0-100 score not printed"}'),
('cae4ade0-adb3-4a68-8e60-2692b5bc8882','Recommend',null,null,-1,null,63,null,'{"provenance":"deck","item_text":"I would recommend Serco as a great place to work","unit":"pct-favourable","note":"63% (down 1); 0-100 score not printed"}'),
('cae4ade0-adb3-4a68-8e60-2692b5bc8882','Psychological Safety',null,null,6,3,68,'strength','{"provenance":"deck","item_text":"Colleagues can voice opinions and report inappropriate behavior without fear of negative consequences","unit":"pct-favourable","vs_bm_printed":"High vs Benchmark (no value printed)","note":"68% (up 6); High Impact Driver"}'),
('cae4ade0-adb3-4a68-8e60-2692b5bc8882','Procedures',null,null,null,3,null,'strength','{"provenance":"deck","item_text":"Work is well organized (processes, procedures, orderly work environment)","vs_bm_printed":"High vs Benchmark (no value printed)","note":"High Impact Driver; no score printed in text export"}'),
('cae4ade0-adb3-4a68-8e60-2692b5bc8882','Communication - Manager',null,null,null,3,null,'strength','{"provenance":"deck","item_text":"My manager communicates effectively","vs_bm_printed":"High vs Benchmark (no value printed)","note":"High Impact Driver; no score printed in text export"}'),
('cae4ade0-adb3-4a68-8e60-2692b5bc8882','Pride',null,null,null,3,null,'opportunity','{"provenance":"deck","item_text":"I feel proud to work at Serco","vs_bm_printed":"Low vs Benchmark (no value printed)","note":"High Impact Driver; no score printed in text export"}'),
('cae4ade0-adb3-4a68-8e60-2692b5bc8882','Role',null,null,2,3,77,'opportunity','{"provenance":"deck","item_text":"My role is an excellent fit with my strengths","unit":"pct-favourable","vs_bm_printed":"Low vs Benchmark (no value printed)","note":"77% (up 2); High Impact Driver"}'),
('cae4ade0-adb3-4a68-8e60-2692b5bc8882','Prospects',null,-8,-1,3,55,'opportunity','{"provenance":"deck","item_text":"I am excited about Serco''s future","unit":"pct-favourable","note":"55% (down 1), -8 vs global benchmark; High Impact Driver"}'),
('cae4ade0-adb3-4a68-8e60-2692b5bc8882','Rewards',null,null,null,3,null,'opportunity','{"provenance":"deck","item_text":"I am fairly paid for the work that I do","vs_bm_printed":"Low vs Benchmark (no value printed)","note":"High Impact Driver; no score printed in text export"}'),
('cae4ade0-adb3-4a68-8e60-2692b5bc8882','Values',null,null,null,3,null,'opportunity','{"provenance":"deck","item_text":"People at Serco live the values (Trust, Care, Innovation, Pride)","vs_bm_printed":"Low vs Benchmark (no value printed)","note":"High Impact Driver; no score printed in text export"}'),
('cae4ade0-adb3-4a68-8e60-2692b5bc8882','Growth',null,null,-2,3,53,'opportunity','{"provenance":"deck","item_text":"I have good opportunities to learn and grow at Serco","unit":"pct-favourable","vs_bm_printed":"Low vs Benchmark (no value printed)","note":"53% (down 2); High Impact Driver"}'),
('cae4ade0-adb3-4a68-8e60-2692b5bc8882','Action Taking',null,null,-2,null,51,null,'{"provenance":"deck","item_text":"I believe meaningful action will be taken as a result of this survey","unit":"pct-favourable","note":"51% (down 2); not classified strength/opportunity in deck"}');

-- Audit block
insert into version_log (version, entry_type, occurred_at, title, body_md, product)
values (null,'content-update', now(), 'Item backfill: Pepkor 2025 + Red Sox 2025 + Serco 2026 (28 rows)', 'Backfilled item-level scores from three Insights Review decks on SharePoint: Pepkor Jul 2025 Dynamo (7 items, 0-100 scores vs Global Top 10% benchmark; engagement vs-benchmark delta not printed so left NULL with printed benchmark 81 in meta), Boston Red Sox May 2025 HR Preview (8 items, vs Glint Global benchmark; per-item 0-100 scores and driver-impact matrix are image-only in the deck so scores left NULL with printed % favourable and vs-BM deltas captured), Serco Jan 2026 IR Preview (13 items, vs Glint Global benchmark; deck prints mostly % favourable with trend arrows, item-comparison tables are image-only and many items have no benchmark mapping, so vs_bm only captured where literally printed). Deck-printed values only; nothing computed or inferred.', 'peoplescience');
insert into change_log (table_name, action, note, actor_email)
values ('items','INSERT','Item backfill from Insights Review decks: Pepkor Jul 2025 (7), Boston Red Sox May 2025 (8), Serco Jan 2026 (13) = 28 rows','marco@eclektik.co');


-- Sage Overall · Sep 2025 corp · Routes to Revenue · extracted 2026-06-09 from "Sage Insight Review September 2025 v0.2_EXT (1).pptx"
-- Benchmark cohort: Global Top 25%. Deck is image-heavy: engagement dashboard and most item scores are chart images, only the "Focus on a few" tiles print values in the text export.
insert into items (cycle_id, name, score, vs_bm, yoy, impact, favourable, category, meta) values
('c3cd1cea-a763-4675-ac26-99167d8531a3','Speak My Mind',81,7,1,null,null,'strength','{"provenance":"deck","item_text":"I feel free to speak my mind without fear of negative consequences"}'),
('c3cd1cea-a763-4675-ac26-99167d8531a3','Prospects',76,-3,null,4,62,'opportunity','{"provenance":"deck","item_text":"I am excited about Sages future","new_item":true,"note":"deck prints New item so no trend; 62% favourable printed; deck also prints 58% favourable on Strategy"}'),
('c3cd1cea-a763-4675-ac26-99167d8531a3','Demonstrate Culture',78,null,1,null,null,'opportunity','{"provenance":"deck","item_text":"People at Sage demonstrate our culture and values at work","custom_item":true,"note":"Custom Item, no Top 25% benchmark printed"}'),
('c3cd1cea-a763-4675-ac26-99167d8531a3','Strategy',null,null,null,null,58,null,'{"provenance":"deck","item_text":"I understand how Sage plans to achieve its goals","note":"score not printed in deck text export, only 58% favourable printed"}'),
('c3cd1cea-a763-4675-ac26-99167d8531a3','eSat',null,null,null,null,null,null,'{"provenance":"deck","note":"engagement score only in dashboard image, not printed in text export; deck prints cohort favourable on both opportunities has engagement 89, 13 points above Sage average; 8882 responses, 47% left a comment"}');

-- Sage Overall · May 2026 · extracted 2026-06-09 from "Sage Insight Review May 2026 v0.1_EXT.pptx"
-- Benchmark cohort: Global Top 25%. Same image-heavy IR template: only the "Focus on a few" tiles print values.
insert into items (cycle_id, name, score, vs_bm, yoy, impact, favourable, category, meta) values
('907355fc-8de5-4982-a9ff-815b7c3cd9ab','Speak My Mind',81,7,0,null,null,'strength','{"provenance":"deck","item_text":"I feel free to speak my mind without fear of negative consequences","note":"No change vs last survey printed"}'),
('907355fc-8de5-4982-a9ff-815b7c3cd9ab','Prospects',75,-5,-1,4,null,'opportunity','{"provenance":"deck","item_text":"I am excited about Sages future","note":"deck states very high impact and moving further from benchmark"}'),
('907355fc-8de5-4982-a9ff-815b7c3cd9ab','Customer Focus',73,-7,1,null,null,'opportunity','{"provenance":"deck","item_text":"People at Sage make decisions with their impact on the customer in mind","tile_label":"Purpose - Customer Focus - Culture","note":"deck states systemic weakness, underperforming benchmark across workforce except most junior levels"}'),
('907355fc-8de5-4982-a9ff-815b7c3cd9ab','eSat',null,null,null,null,null,null,'{"provenance":"deck","note":"engagement score only in dashboard image, not printed in text export; deck prints cohort favourable on both opportunities has engagement 89, 12 points above Sage average; 9473 responses, 66% left a comment"}');

-- Sage GTM · Sep 2025 R2R (Rosini) · extracted 2026-06-09 from "Sage_20250920_Routes to Revenue_Eclectik Results_25Sage_01CV.pptx"
-- Benchmark cohort: Global Top 25% Global BIC (June 2025). vs_sage_total in meta = printed delta vs Sage overall.
insert into items (cycle_id, name, score, vs_bm, yoy, impact, favourable, category, meta) values
('a5d8458e-bac6-44a0-be48-3d3515e10740','Engagement',76,-2,1,null,null,null,'{"provenance":"deck","vs_sage_total":0,"printed_benchmark":78,"printed_sage":76,"note":"RTR headline: Engagement = 76 (-2 vs Benchmark, +1 vs Trend, 0 vs Sage)"}'),
('a5d8458e-bac6-44a0-be48-3d3515e10740','Response Rate',81,6,1,null,null,null,'{"provenance":"deck","vs_sage_total":-1,"printed_benchmark":75,"printed_sage":82,"unit":"percent","note":"RTR headline: 81% (+6 vs Global Benchmark, +1 Trend, -1 vs Sage)"}'),
('a5d8458e-bac6-44a0-be48-3d3515e10740','Survey Action',54,-10,null,null,null,null,'{"provenance":"deck","unit":"percent","scope":"Sage overall global headline slide printed inside RTR deck, not an RTR-specific score","note":"Survey Action = 54% (-10 vs Global Benchmark)"}'),
('a5d8458e-bac6-44a0-be48-3d3515e10740','Empowerment',83,4,null,4,null,'strength','{"provenance":"deck","vs_sage_total":2,"printed_benchmark":79,"printed_sage":81,"item_text":"I feel empowered to make decisions regarding my work","note":"trend printed as -- (item last surveyed March 2023); impact label position-mapped in flattened export"}'),
('a5d8458e-bac6-44a0-be48-3d3515e10740','Speak My Mind',82,8,1,3,null,'strength','{"provenance":"deck","vs_sage_total":1,"printed_benchmark":74,"printed_sage":81,"item_text":"I feel free to speak my mind without fear of negative consequences","note":"impact label position-mapped in flattened export"}'),
('a5d8458e-bac6-44a0-be48-3d3515e10740','Prospects',77,-2,null,4,null,'strength','{"provenance":"deck","vs_sage_total":1,"printed_benchmark":79,"printed_sage":76,"item_text":"I am excited about Sages future","new_item":true,"note":"trend printed as -- (new item); listed on Relative Strengths slide; impact label position-mapped, consistent with Sage overall deck stating Prospects very high impact"}'),
('a5d8458e-bac6-44a0-be48-3d3515e10740','Strategy',73,0,-2,3,53,'opportunity','{"provenance":"deck","vs_sage_total":-2,"printed_benchmark":73,"printed_sage":75,"item_text":"I understand how Sage plans to achieve its goals","neutral_pct":39,"note":"action plan slide prints strategic clarity only 53% favourable with 39% neutral; impact label position-mapped in flattened export"}'),
('a5d8458e-bac6-44a0-be48-3d3515e10740','Demonstrate Culture',76,null,-2,4,null,'opportunity','{"provenance":"deck","vs_sage_total":-2,"printed_sage":78,"item_text":"People at Sage demonstrate our culture and values at work","note":"benchmark printed as -- (custom item); very high impact printed in prose: Driver Impact Analysis shows Demonstrating Culture has a very high impact on engagement"}'),
('a5d8458e-bac6-44a0-be48-3d3515e10740','Priorities - Manager',82,-1,0,4,null,'opportunity','{"provenance":"deck","vs_sage_total":-3,"printed_benchmark":83,"printed_sage":85,"item_text":"My manager keeps our team focused on clear priorities","note":"Very High impact on engagement printed adjacent to item in export"}'),
('a5d8458e-bac6-44a0-be48-3d3515e10740','Feedback',null,null,null,null,null,null,'{"provenance":"deck","printed_benchmark":82,"printed_sage":84,"item_text":"My manager provides me with feedback that helps me improve my performance","note":"RTR score only in chart image, not printed in text export; only benchmark and Sage reference values printed"}'),
('a5d8458e-bac6-44a0-be48-3d3515e10740','Contribution',null,null,null,null,null,null,'{"provenance":"deck","printed_benchmark":86,"printed_sage":84,"item_text":"I understand how the work I do contributes to achieving Sages strategy","note":"RTR score only in chart image, not printed in text export; only benchmark and Sage reference values printed"}'),
('a5d8458e-bac6-44a0-be48-3d3515e10740','Diversity Commitment',null,null,null,null,null,null,'{"provenance":"deck","printed_sage":80,"item_text":"Leaders demonstrate a commitment to diversity","note":"RTR score only in chart image, not printed in text export; only Sage reference value printed"}');

-- Sage GTM · May 2026 GTM (Bleeker) · extracted 2026-06-09 from "SHARE_240526 Go to Market_Eclectik Results_26Sage.pptx"
-- Benchmark cohort: Global Top 25% Global BIC (Dec 2025). vs_sage_total in meta = printed delta vs Sage overall.
-- Caution: deck is a working SHARE version with placeholders ("UPDATE when received from Nicola", "Check Vs Nicolas +/- Areas").
insert into items (cycle_id, name, score, vs_bm, yoy, impact, favourable, category, meta) values
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Engagement',78,0,0,null,null,null,'{"provenance":"deck","vs_sage_total":1,"printed_benchmark":78,"printed_sage":77,"note":"GTM headline: Engagement = 78 (0 vs Benchmark, 0 vs Trend, +1 vs Sage); % engaged ambiguous in deck text export (both 81% and 65% printed on dashboard slide)"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Response Rate',85,null,0,null,null,null,'{"provenance":"deck","printed_benchmark":75,"printed_sage":86,"unit":"percent","note":"May 26 dashboard: 85%, Sage 86%, Benchmark 75%, Sep 25: 0%; vs_bm delta not printed for May 26"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Speak My Mind',81,7,0,3,null,'strength','{"provenance":"deck","vs_sage_total":0,"printed_benchmark":74,"printed_sage":81,"item_text":"I feel free to speak my mind without fear of negative consequences","note":"High impact on engagement (all three strength tiles labelled High)"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Priorities - Manager',88,4,1,3,null,'strength','{"provenance":"deck","vs_sage_total":2,"printed_benchmark":83,"printed_sage":86,"item_text":"My manager keeps our team focused on clear priorities","note":"printed delta +4 vs benchmark is inconsistent with printed benchmark reference 83; both values kept as printed"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Accountability',85,7,0,3,null,'strength','{"provenance":"deck","vs_sage_total":1,"printed_benchmark":78,"printed_sage":85,"item_text":"Where I work, colleagues are held accountable for their work","note":"printed +1 vs Sage is inconsistent with printed Sage reference 85; both values kept as printed"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Customer Focus',72,-8,2,4,null,'opportunity','{"provenance":"deck","vs_sage_total":-1,"tile_label":"Purpose - Customer Focus","item_text":"People at Sage make decisions with their impact on the customer in mind","note":"Very High impact; -8 vs Top 25% consistent with Sage overall deck (Sage 73 at -7); detail slide prints Benchmark: 74 which is inconsistent with the -8 tile"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Prospects',75,-5,-2,3,null,'opportunity','{"provenance":"deck","vs_sage_total":0,"printed_benchmark":80,"printed_sage":75,"item_text":"I am excited about Sages future","note":"High impact on engagement"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Strategy',75,1,-1,null,null,null,'{"provenance":"deck","vs_sage_total":0,"printed_benchmark":74,"printed_sage":75,"item_text":"I understand how Sage plans to achieve its goals","note":"GTM headline: Strategy = 75 (+1 vs Benchmark, -1 vs Trend, 0 vs Sage)"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Demonstrate Culture',80,null,1,null,null,null,'{"provenance":"deck","vs_sage_total":1,"printed_sage":79,"item_text":"People at Sage demonstrate our culture and values at work","note":"NA Benchmark printed (custom item); GTM headline: 80 (NA Benchmark, +1 vs Trend, +1 Sage)"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Game Changers',90,null,null,null,null,null,'{"provenance":"deck","vs_sage_total":14,"subgroup":"EVP & MD only","item_text":"I clearly understand the Growth Game Changers as drivers of our Target Culture","new_item":true,"note":"headline: Game Changer Item scores 90 (+14 vs Sage)"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Collaboration Across Groups',83,null,null,null,null,null,'{"provenance":"deck","vs_sage_total":7,"subgroup":"EVP & MD only","tile_label":"EVP Collaboration across groups","item_text":"The teams I interact with collaborate well to get things done","note":"headline: 83 (+7 vs Sage)"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','AI Impact',81,null,null,null,null,null,'{"provenance":"deck","vs_sage_total":0,"item_text":"Using AI tools and resources helps me to be more effective in my day to day work at Sage","new_item":true,"note":"driver impact slide: AI Impact: 0 Sage (81); Sage reference printed inconsistently as 81 and 80 on detail slides"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','AI Skills',80,null,null,null,null,null,'{"provenance":"deck","vs_sage_total":0,"printed_sage":80,"item_text":"The AI skills I am developing are relevant and applicable to my role","new_item":true,"note":"driver impact slide: AI Skills: 0 Sage (80)"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Perseverance',80,null,null,null,null,null,'{"provenance":"deck","vs_sage_total":0,"item_text":"People at Sage continue to be productive during times of uncertainty or stress","new_item":true,"note":"driver impact slide: Perseverance - Culture 0 Sage (80)"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Identity',83,null,1,null,null,null,'{"provenance":"deck","vs_sage_total":1,"item_text":"My identity will never hold back my career progression at Sage","note":"driver impact slide: Identity: +1 2025 / +1 Sage (83); item extended from NA-only to all colleagues this cycle"}'),
('67c6e5da-b6e1-4f07-a162-44c4defa185d','Diversity Commitment',82,null,0,null,null,null,'{"provenance":"deck","vs_sage_total":2,"item_text":"Leaders demonstrate a commitment to diversity","note":"driver impact slide: Diversity Commitment: 0 2025 / +2 Sage (82)"}');

-- Audit block
insert into version_log (version, entry_type, occurred_at, title, body_md, product)
values (null,'content-update', now(), 'Item backfill: Sage Overall ×2 + Sage GTM ×2 (37 rows)', 'Backfilled item-level scores from four Sage Viva Glint Insights Review decks: Sage Overall Sep 2025 (5 rows), Sage Overall May 2026 (4 rows), Sage GTM Routes to Revenue Sep 2025 / Rosini (12 rows), Sage GTM Go to Market May 2026 / Bleeker (16 rows). All values are deck-printed only. Limitations: both Sage Overall decks use the image-heavy IR template, so engagement/eSat dashboard scores and most item scores live in chart images and could not be extracted from the flattened text export (eSat rows stored with NULL score plus provenance notes); the RTR deck prints function scores for 9 items but only benchmark/Sage reference values for Feedback, Contribution and Diversity Commitment (stored with NULL score); the GTM May 2026 deck is a working SHARE version with placeholders and contains three printed internal inconsistencies (Priorities-Manager delta vs benchmark, Accountability delta vs Sage, Customer Focus benchmark reference) which are flagged in row-level meta notes; impact labels in the RTR deck were position-mapped from the flattened column order and flagged as such in meta.', 'peoplescience');
insert into change_log (table_name, action, note, actor_email)
values ('items','INSERT','Sage item backfill from decks: Overall Sep25 (c3cd1cea) 5 rows, Overall May26 (907355fc) 4 rows, GTM R2R Sep25 (a5d8458e) 12 rows, GTM May26 (67c6e5da) 16 rows = 37 total','marco@eclektik.co');
