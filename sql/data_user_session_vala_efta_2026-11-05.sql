-- Vala Jónsdóttir (EFTA) aanmelden voor de Glint user session.
--
-- Ze stond al in user_session_invites: ze had de uitnodigingsmail gekregen maar
-- nooit op de link geklikt (answer null). Dit is dus geen nieuwe rij maar het
-- vastleggen van een ja die langs een andere weg binnenkwam. Daarom ook
-- source = 'internal': de kolom 'Aangemeld door' hoort niet 'zelf' te zeggen
-- als zij zelf nooit iets heeft aangeklikt.
--
-- Back-up vooraf: _dq_backup_user_session_invites_20261105 (88 rijen).
-- Voor: 25 bevestigde ja. Na: 26. Rijaantal onveranderd (88).
-- Toegepast op 5 november 2026.

update public.user_session_invites
set answer = 'yes',
    answer_at = now(),
    confirmed = true,
    confirmed_at = now(),
    source = 'internal',
    registered_by = 'olivier@eclectik.co',
    company = coalesce(company, 'EFTA'),
    contact_id = coalesce(contact_id, '38f72a1d-40df-4cd9-ad1e-55bf72b14e87'::uuid),
    updated_at = now()
where lower(btrim(email)) = 'vala.jonsdottir@efta.int';

-- Terugdraaien: haal de oude waarden uit de back-uptabel.
--   update public.user_session_invites i
--   set answer = b.answer, answer_at = b.answer_at, confirmed = b.confirmed,
--       confirmed_at = b.confirmed_at, source = b.source,
--       registered_by = b.registered_by, company = b.company,
--       contact_id = b.contact_id
--   from public._dq_backup_user_session_invites_20261105 b
--   where b.id = i.id and lower(btrim(i.email)) = 'vala.jonsdottir@efta.int';
