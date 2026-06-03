-- ============================================================
-- Eclectik CRM — Playbooks v2 Plan 4: signal_subjects backfill
-- ============================================================
-- Vult signal_subjects met auto_added=true entries voor:
--   - Companies van active/sleeping opportunities (linkedin_company_post tracking)
--   - Contacten gelinkt aan diezelfde opportunities (linkedin_user_post tracking)
--
-- Veilig herhaal-baar: ON CONFLICT DO NOTHING.
-- ============================================================

-- =====================
-- STAP 1: Track companies van active/sleeping deals
-- =====================

insert into public.signal_subjects (company_id, source_type, enabled, auto_added)
select distinct o.company_id, 'linkedin_company_post', true, true
from public.opportunities o
where o.company_id is not null
  and (
    o.stage in ('active', 'onboarding', 'qualify', 'develop', 'proposal')
    or (o.stage = 'past' and o.status = 'Won')  -- sleeping
  )
on conflict do nothing;

-- =====================
-- STAP 2: Track contacten van diezelfde deals
-- =====================
-- Aanname: contacts hebben company_id, en alle contacten van een tracked company tellen mee.
-- Als jullie een aparte contact_opportunities junction-tabel hebben, gebruik die i.p.v.

insert into public.signal_subjects (contact_id, source_type, enabled, auto_added)
select distinct c.id, 'linkedin_user_post', true, true
from public.contacts c
where c.company_id in (
  select distinct o.company_id
  from public.opportunities o
  where o.company_id is not null
    and (
      o.stage in ('active', 'onboarding', 'qualify', 'develop', 'proposal')
      or (o.stage = 'past' and o.status = 'Won')
    )
)
on conflict do nothing;

-- =====================
-- STAP 3: Verify
-- =====================

select
  source_type,
  count(*) as cnt,
  count(*) filter (where enabled = true) as enabled_cnt
from public.signal_subjects
group by source_type;
-- Expected: 2 rijen (linkedin_company_post + linkedin_user_post), beide met enabled count > 0
