-- DMARC-rapporten in de CRM: twee tabellen, een voor het rapport en een voor
-- de regels erin.
--
-- WAT EEN DMARC-RAPPORT IS
--   Elke grote ontvanger (Google, Microsoft, Barracuda) stuurt dagelijks een
--   XML-bestand met: per verzendend IP-adres, hoeveel mail er namens eclectik.co
--   binnenkwam en of SPF en DKIM slaagden. Dat is de enige manier om te zien wie
--   er namens je domein mailt, inclusief diensten die je zelf vergeten was en
--   partijen die zich voordoen als jou.
--
-- WAAROM TWEE TABELLEN
--   Een rapport bevat een kop (wie rapporteert, over welke periode, welk beleid
--   gold) en daaronder tientallen regels per IP-adres. Die regels zijn waar je
--   naar kijkt; de kop is waar je op filtert. In een tabel proppen zou de kop
--   bij elke regel herhalen en de periode onbetrouwbaar maken zodra twee
--   rapporten elkaar overlappen.
--
-- DUBBEL INLEZEN KAN NIET
--   De unieke sleutel is de combinatie van de rapporterende partij en hun eigen
--   rapport-id. Hetzelfde bestand twee keer uploaden werkt dus niet de cijfers
--   bij maar wordt geweigerd, en dat is de goede kant om op te falen: anders
--   tel je dezelfde mail twee keer en lijkt het probleem groter dan het is.
--
-- Nieuwe tabellen, dus niets te backuppen.

create table if not exists public.dmarc_report (
  id uuid primary key default gen_random_uuid(),
  -- De partij die rapporteert, bijvoorbeeld google.com of Barracuda.
  org_name text not null,
  org_email text,
  -- Hun eigen rapportnummer. Alleen uniek binnen die partij, vandaar de
  -- samengestelde sleutel hieronder.
  report_id text not null,
  date_begin timestamptz not null,
  date_end timestamptz not null,
  -- Het beleid dat gold tijdens deze periode. Bewaren en niet afleiden uit het
  -- huidige DNS-record: als je van none naar quarantine gaat wil je in oude
  -- rapporten kunnen zien wat er toen stond.
  policy_domain text,
  policy_p text,
  policy_sp text,
  policy_pct int,
  bestand text,
  ingelezen_op timestamptz not null default now(),
  ingelezen_door text,
  unique (org_name, report_id)
);

create table if not exists public.dmarc_record (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.dmarc_report(id) on delete cascade,
  -- Als tekst en niet als inet: IPv6 komt in allerlei schrijfwijzen binnen en
  -- een mislukte omzetting zou een heel rapport laten stranden op een adres.
  source_ip text not null,
  aantal int not null default 0,
  -- Wat de ontvanger met de mail deed: none, quarantine of reject.
  disposition text,
  -- Het DMARC-oordeel: slaagde de mail op SPF, op DKIM, of geen van beide.
  dkim_eval text,
  spf_eval text,
  header_from text,
  -- De details per controle, nodig om een falende bron te herkennen.
  dkim_domain text,
  dkim_selector text,
  dkim_result text,
  spf_domain text,
  spf_result text
);

create index if not exists idx_dmarc_record_report on public.dmarc_record (report_id);
create index if not exists idx_dmarc_report_periode on public.dmarc_report (date_begin desc);

-- RLS volgens de huisregel: aan, met de uniforme policy voor ingelogde
-- gebruikers. De event trigger rls_auto_enable zet RLS zelf al aan voor nieuwe
-- tabellen; zonder policy zou niemand erbij kunnen.
alter table public.dmarc_report enable row level security;
alter table public.dmarc_record enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='dmarc_report'
                 and policyname='auth users full access on dmarc_report') then
    create policy "auth users full access on dmarc_report" on public.dmarc_report
      for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='dmarc_record'
                 and policyname='auth users full access on dmarc_record') then
    create policy "auth users full access on dmarc_record" on public.dmarc_record
      for all to authenticated using (true) with check (true);
  end if;
end $$;

comment on table public.dmarc_report is
  'Kop van een DMARC-aggregaatrapport. Regels staan in dmarc_record.';
comment on table public.dmarc_record is
  'Een regel uit een DMARC-rapport: per verzendend IP hoeveel mail en of SPF/DKIM slaagden.';

-- Terugdraaien:
--   drop table if exists public.dmarc_record;
--   drop table if exists public.dmarc_report;
