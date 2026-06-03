-- ============================================================
-- Eclectik CRM — Playbooks v2 Plan 4: Warm Outreach playbook seed
-- ============================================================
-- Maakt een minimal playbook aan dat getriggerd wordt door
-- LinkedIn-user-post signaal. Drie nodes: trigger -> LinkedIn-draft (AI) -> End.
--
-- Safe to re-run: skip if "Warm Outreach" playbook al bestaat.
-- ============================================================

do $$
declare
  pb_id uuid;
  trigger_id uuid;
  draft_id uuid;
  end_id uuid;
begin
  -- Skip if already exists
  if exists (select 1 from public.playbooks where name = 'Warm Outreach') then
    raise notice 'Warm Outreach playbook already exists - skipping seed.';
    return;
  end if;

  -- Create playbook
  pb_id := gen_random_uuid();
  insert into public.playbooks (id, name, status, version, trigger_type, trigger_config)
  values (
    pb_id,
    'Warm Outreach',
    'active',
    1,
    'linkedin_user_post',
    '{}'::jsonb
  );

  -- Trigger node
  trigger_id := gen_random_uuid();
  insert into public.playbook_nodes (id, playbook_id, node_type, config, pos_x, pos_y)
  values (trigger_id, pb_id, 'trigger_linkedin_user_post',
          jsonb_build_object('min_relevance', 0.6),
          0, 0);

  -- LinkedIn-draft (AI mode)
  draft_id := gen_random_uuid();
  insert into public.playbook_nodes (id, playbook_id, node_type, config, pos_x, pos_y)
  values (draft_id, pb_id, 'action_linkedin_draft',
          jsonb_build_object(
            'use_ai', 'ai',
            'ai_prompt', E'Schrijf een korte (2-3 zinnen) warme LinkedIn-reactie op deze post van {{first_name}} ({{role}} bij {{company}}).\n\nPost-inhoud:\n"{{signal_context}}"\n\nToon: oprecht geinteresseerd, niet salesy. Begin met een specifieke observatie uit de post. Eindig met een open vraag. NIET vermelden: Eclectik, advisory, of welke dienst dan ook.'
          ),
          0, 120);

  -- End node
  end_id := gen_random_uuid();
  insert into public.playbook_nodes (id, playbook_id, node_type, config, pos_x, pos_y)
  values (end_id, pb_id, 'logic_end', '{}'::jsonb, 0, 240);

  -- Edges
  insert into public.playbook_edges (playbook_id, source_node_id, target_node_id)
  values
    (pb_id, trigger_id, draft_id),
    (pb_id, draft_id, end_id);

  -- Initial published version snapshot
  insert into public.playbook_versions (playbook_id, version, graph_snapshot, published_by)
  values (
    pb_id,
    1,
    jsonb_build_object(
      'version', 1,
      'nodes', jsonb_build_array(
        jsonb_build_object('id', trigger_id::text, 'node_type', 'trigger_linkedin_user_post', 'config', jsonb_build_object('min_relevance', 0.6), 'pos_x', 0, 'pos_y', 0),
        jsonb_build_object('id', draft_id::text, 'node_type', 'action_linkedin_draft', 'config', jsonb_build_object('use_ai', 'ai', 'ai_prompt', E'Schrijf een korte (2-3 zinnen) warme LinkedIn-reactie op deze post van {{first_name}}...'), 'pos_x', 0, 'pos_y', 120),
        jsonb_build_object('id', end_id::text, 'node_type', 'logic_end', 'config', '{}'::jsonb, 'pos_x', 0, 'pos_y', 240)
      ),
      'edges', jsonb_build_array(
        jsonb_build_object('source', trigger_id::text, 'target', draft_id::text),
        jsonb_build_object('source', draft_id::text, 'target', end_id::text)
      )
    ),
    'system-seed'
  );

  raise notice 'Warm Outreach playbook seeded: %', pb_id;
end $$;

-- Verify
select id, name, status, trigger_type
from public.playbooks
where name = 'Warm Outreach';
-- Expected: 1 row, active, linkedin_user_post
