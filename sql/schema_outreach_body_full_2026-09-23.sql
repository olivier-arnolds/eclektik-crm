-- Volledige antwoordtekst bij inkomende outreach-mail.
-- Toegepast via Supabase MCP op 2026-09-23 (schema_outreach_body_full_2026_09_23).
--
-- AANLEIDING
--   body_preview bevat wat Graph in de lijstopvraag teruggeeft, en dat veld is
--   per definitie de eerste 255 tekens. Van de 78 binnengekomen antwoorden
--   stonden er 49 op exact 255 en was er geen enkele langer. Niet alleen lelijk
--   in de tab: diezelfde tekst ging naar de classificatie die bepaalt of iemand
--   nog een opvolgmail krijgt.
--
-- De oude kolom blijft staan en wordt nog steeds gevuld, zodat er niets omvalt
-- en we kunnen zien wat er oorspronkelijk binnenkwam.

alter table public.outreach_message
  add column if not exists body_full text,
  add column if not exists body_fetched_at timestamptz;

comment on column public.outreach_message.body_preview is
  'Wat Graph in de lijstopvraag teruggeeft: de eerste 255 tekens van het bericht, door '
  'Microsoft afgekapt. Bewaard zoals ontvangen; gebruik body_full als die gevuld is.';

comment on column public.outreach_message.body_full is
  'De volledige tekst van het antwoord, apart per bericht opgehaald via Graph uniqueBody '
  '(het nieuwe deel zonder de geciteerde keten). Null betekent: nog niet opgehaald, of het '
  'bericht staat niet meer in de mailbox.';
