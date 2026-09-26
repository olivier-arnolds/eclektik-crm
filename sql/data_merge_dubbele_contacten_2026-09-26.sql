-- Twee dubbele contacten samengevoegd. Toegepast op 26 september 2026 via de
-- Supabase MCP, na back-up en na controle per gekoppelde tabel.
--
-- HEIDI  leidend: a62ef90a (Heidi Muhle)   opgeheven: 04005d9a (Heidi@eclectik.co)
-- BALAZS leidend: 907966a9 (Balazs Kadar)  opgeheven: f0441a09 (Kadar Balazs ESHU)
--
-- WAAROM DE VERHUIZING VOOR DE VERWIJDERING KOMT
--   account_links staat op CASCADE. Het opgeheven Heidi-record hing als enige
--   aan NOV (National Oilwell Varco); zonder deze volgorde was die koppeling
--   met het record meeverdwenen.
--   campaign_sends staat op SET NULL. De twee verzendingen van het opgeheven
--   Balazs-record (11 juni en 13 juli) zouden wees zijn geworden en uit de
--   historie verdwijnen.
--
-- NIET MEEGENOMEN
--   dynamics_id: die kolom heeft een unieke sleutel en de waarde zat nog op het
--   opgeheven record. Overzetten gaf een 23505. Volgens Olivier is dat veld niet
--   meer relevant, dus het is met het record verdwenen.
--   Tags: beide Balazs-records hadden dezelfde tag Glint, dus er viel niets over
--   te zetten. De dubbele is met de CASCADE meegegaan.

create table _dq_backup_merge_contacts_20260926 as
  select * from contacts where id in
    ('a62ef90a-1678-424d-aada-8c78c0d23263','04005d9a-036f-49a0-be35-9d38bfae6ea4',
     '907966a9-fcf6-4ec0-9da4-58b596c1c1d3','f0441a09-5795-4b19-81df-072274a2472f');
create table _dq_backup_merge_acctlinks_20260926 as
  select * from account_links where contact_id in
    ('a62ef90a-1678-424d-aada-8c78c0d23263','04005d9a-036f-49a0-be35-9d38bfae6ea4');
create table _dq_backup_merge_sends_20260926 as
  select * from campaign_sends where contact_id in
    ('907966a9-fcf6-4ec0-9da4-58b596c1c1d3','f0441a09-5795-4b19-81df-072274a2472f');
create table _dq_backup_merge_tags_20260926 as
  select * from contact_tags where contact_id in
    ('a62ef90a-1678-424d-aada-8c78c0d23263','04005d9a-036f-49a0-be35-9d38bfae6ea4',
     '907966a9-fcf6-4ec0-9da4-58b596c1c1d3','f0441a09-5795-4b19-81df-072274a2472f');

update account_links set contact_id = 'a62ef90a-1678-424d-aada-8c78c0d23263'
 where contact_id = '04005d9a-036f-49a0-be35-9d38bfae6ea4';

update campaign_sends set contact_id = '907966a9-fcf6-4ec0-9da4-58b596c1c1d3'
 where contact_id = 'f0441a09-5795-4b19-81df-072274a2472f';

delete from contacts
 where id in ('04005d9a-036f-49a0-be35-9d38bfae6ea4','f0441a09-5795-4b19-81df-072274a2472f');

-- Gemeten voor en na:
--   Heidi accountkoppelingen   13 -> 14   (NOV erbij)
--   Balazs verzendingen         2 ->  4   (11 juni en 13 juli erbij)
--   Wezen in campaign_sends              0
--   Records per adres                    1

-- Terugdraaien: de vier _dq_backup-tabellen bevatten de oude toestand.
