-- Excel-artefact uit namen halen. _x000D_ is hoe Excel een regeleinde wegschrijft
-- in XML; gaat een lijst door Excel en daarna door een export, dan komt die code
-- als LETTERLIJKE tekst mee. In een spreadsheet zie je het niet, in een verstuurde
-- mail wel.
--
-- Trof 74 contacten, altijd aan het eind van de naam, en alleen in deze twee
-- velden: niet in voornamen, functies, adressen, bedrijfsnamen of de
-- outreachtabellen. Toegepast 2026-09-22.
-- Terug te draaien via _dq_backup_contacts_x000d_20260922.
update contacts
set last_name = nullif(btrim(replace(last_name, '_x000D_', '')), ''),
    full_name = nullif(btrim(replace(full_name, '_x000D_', '')), ''),
    updated_at = now()
where last_name like '%\_x000D\_%' or full_name like '%\_x000D\_%';

-- Eén los geval met spaties aan het eind, dezelfde soort importrommel.
update contacts
set last_name = btrim(last_name),
    full_name = btrim(regexp_replace(coalesce(full_name,''), '\s+', ' ', 'g')),
    updated_at = now()
where last_name <> btrim(last_name);
