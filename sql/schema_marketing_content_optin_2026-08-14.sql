-- Globale opt-in voor marketingcontent (Content Calendar-mails). Losstaand van
-- do_not_email (dat is transactioneel/campagne-blokkade): een contact ontvangt
-- content-mails alleen als marketing_content_opt_in = true EN de juiste tag heeft.
-- Toggle in de contactdetails (inline-details.jsx), naast de email-status.
-- Toegepast via Supabase MCP apply_migration (add_marketing_content_optin_to_contacts) op 2026-08-14.
alter table public.contacts
  add column if not exists marketing_content_opt_in boolean not null default false;
comment on column public.contacts.marketing_content_opt_in is
  'Globale opt-in voor Content Calendar-mails. Ontvanger = deze vlag true EN item.target_tag aanwezig op het contact.';

-- Terugdraaien: alter table public.contacts drop column marketing_content_opt_in;
