-- Opslag voor de LinkedIn-advertentietab onder Marketing.
-- Ontwerp: docs/superpowers/specs/2026-09-23-linkedin-ads-tab-design.md
-- Toegepast via Supabase MCP op 2026-09-23 (migratie schema_linkedin_ads_2026_09_23).
--
-- De sleutel (stat_date, ad_id) is het hele punt: de export wordt met de hand
-- geupload, dus hetzelfde bestand twee keer erin slepen of een overlappende
-- periode exporteren moet ongevaarlijk zijn. Met deze sleutel overschrijft een
-- tweede upload; zonder telt hij alles dubbel, en dat merk je pas als een bedrag
-- niet klopt.

create table if not exists public.linkedin_ad_stats (
  stat_date        date        not null,
  ad_id            text        not null,
  account_name     text,
  currency         text,
  campaign_id      text,
  campaign_name    text,
  campaign_status  text,
  adset_id         text,
  adset_name       text,
  adset_objective  text,
  ad_name          text,
  ad_status        text,
  ad_intro         text,
  ad_headline      text,
  url              text,
  spend            numeric(12,2),
  impressions      bigint,
  clicks           bigint,
  ctr              numeric(10,4),
  cpm              numeric(12,2),
  cpc              numeric(12,2),
  engagements      bigint,
  conversions      bigint,
  leads            bigint,
  landing_clicks   bigint,
  raw              jsonb not null default '{}'::jsonb,
  source_file      text,
  imported_at      timestamptz not null default now(),
  primary key (stat_date, ad_id)
);

comment on table public.linkedin_ad_stats is
  'Advertentieprestaties uit LinkedIn Campaign Manager, handmatig geuploade export. '
  'Sleutel is (stat_date, ad_id): hetzelfde bestand of een overlappende periode opnieuw '
  'uploaden overschrijft dan in plaats van dubbel te tellen. De kolommen die het scherm '
  'gebruikt staan uitgepakt, de overige ~60 kolommen van de export blijven in raw, zodat '
  'een later gewenst cijfer geen nieuwe upload van alle historie vraagt.';

comment on column public.linkedin_ad_stats.ctr is
  'Percentage zoals LinkedIn het toont: 0.341 betekent 0,341 procent, niet 34,1.';

create index if not exists linkedin_ad_stats_datum_idx
  on public.linkedin_ad_stats (stat_date desc);
create index if not exists linkedin_ad_stats_campagne_idx
  on public.linkedin_ad_stats (campaign_id, stat_date desc);

alter table public.linkedin_ad_stats enable row level security;

drop policy if exists "auth users full access on linkedin_ad_stats" on public.linkedin_ad_stats;
create policy "auth users full access on linkedin_ad_stats"
  on public.linkedin_ad_stats for all to authenticated
  using (true) with check (true);
