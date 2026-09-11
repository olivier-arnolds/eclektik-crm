-- Weekcap op een outreachcampagne. Toegepast 2026-09-11.
--
-- WAAROM NAAST DE DAGCAP
--   LinkedIn rekent per week, niet per dag: voor een premium account ligt de
--   grens op circa 150 berichten per week aan eerstegraads connecties. Een dagcap
--   alleen beschermt daar niet tegen. 30 per dag lijkt binnen 150 te blijven,
--   maar dat geldt alleen bij vijf verzenddagen; zeven dagen achter elkaar is 210.
--
--   Rollende week, net als de dagcap een rollend etmaal is. Een kalenderweek zou
--   150 op zondagavond gevolgd door 150 op maandagochtend toestaan.
--
-- NULL = geen weeklimiet, dus de e-mailcampagnes veranderen niet.
alter table public.outreach_campaign
  add column if not exists weekly_cap int;

comment on column public.outreach_campaign.weekly_cap is
  'Bovengrens over een ROLLENDE week. NULL = geen weeklimiet. Bestaat voor LinkedIn: dat platform rekent per week (premium: 150 berichten aan eerstegraads connecties), en een dagcap beschermt daar niet tegen omdat 30 per dag over zeven dagen 210 is.';

-- De LinkedIn-campagne naar 30 per dag met 150 per week als harde grens.
update public.outreach_campaign
set daily_cap = 30, weekly_cap = 150, updated_at = now()
where channel = 'linkedin';
