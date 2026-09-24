-- Listening-platform velden op companies (2026-09-24)
-- Doel: vastleggen welk employee listening / experience platform een account draait,
-- met datum en herkomst, zodat outreach niet uitgaat van een verkeerde aanname.
-- Bron van de eerste vulling: Sumble (technologieen genoemd in vacatureteksten).

alter table companies
  add column if not exists listening_platform        text,
  add column if not exists listening_platforms_all   text,
  add column if not exists listening_evidence_date   date,
  add column if not exists listening_glint_last_seen date,
  add column if not exists listening_source          text,
  add column if not exists listening_checked_at      timestamptz;

comment on column companies.listening_platform is
  'Meest waarschijnlijke employee listening / experience platform. Afgeleid, geen bevestiging door de klant.';
comment on column companies.listening_platforms_all is
  'Alle gevonden platforms als tekst: naam:aantal_vacatures:laatste_datum, gescheiden door puntkomma.';
comment on column companies.listening_evidence_date is
  'Datum van de meest recente vacature waarin een platform werd genoemd.';
comment on column companies.listening_glint_last_seen is
  'Laatste keer dat Glint, Viva Glint of Microsoft Viva Glint in een vacature voorkwam. Leeg = geen Glint-signaal.';
comment on column companies.listening_source is
  'Herkomst: sumble (afgeleid uit vacatureteksten), handmatig, of klant_bevestigd.';
comment on column companies.listening_checked_at is
  'Wanneer de check draaide. Data veroudert, ververs periodiek.';

create index if not exists idx_companies_listening_platform on companies (listening_platform);

-- Terugdraaien:
-- alter table companies
--   drop column if exists listening_platform,
--   drop column if exists listening_platforms_all,
--   drop column if exists listening_evidence_date,
--   drop column if exists listening_glint_last_seen,
--   drop column if exists listening_source,
--   drop column if exists listening_checked_at;
