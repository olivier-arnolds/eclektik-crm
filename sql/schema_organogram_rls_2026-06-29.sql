-- De organogram-tabellen kregen RLS aan via de rls_auto_enable event trigger,
-- maar ZONDER toegangs-policy (deny-all). Gevolg: de frontend (authenticated)
-- kon niet lezen/schrijven -> opslaan faalde stil, laden gaf leeg terug, en een
-- organogram "verdween" bij het wisselen van account.
--
-- Fix: voeg de uniforme project-policy toe (zelfde vorm als alle andere tabellen:
-- FOR ALL TO authenticated USING(true) WITH CHECK(true)).
-- Toegepast via Supabase MCP apply_migration op 2026-06-29.

create policy "Authenticated full access — organogram_nodes"
  on public.organogram_nodes for all to authenticated using (true) with check (true);

create policy "Authenticated full access — organogram_edges"
  on public.organogram_edges for all to authenticated using (true) with check (true);
