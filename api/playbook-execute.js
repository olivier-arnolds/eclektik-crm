import { requireCron } from './_lib/guard.js';
// Playbook execution cron — graph-traversal versie (Plan 3).
//
// Trigger: Vercel cron, 0 8 * * 1-5 (8u NL-tijd werkdagen, configured in vercel.json).
//
// Per active enrollment:
//   1. Load playbook_versions snapshot (using enrollment.version_at_start)
//   2. Call traverseStep() to determine next action
//   3. Execute side-effect (insert into playbook_drafts, insert into tasks, etc.)
//   4. Update enrollment.current_node_id, next_action_at, status
//
// Email + LinkedIn/WA/IG drafts: created here, sent later by user via browser.

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { traverseStep } from '../src/components/playbooks/lib/playbookGraphTraversal.js';
import { substituteMergeFields, isAiMode, buildAiPrompt, getManualBody, getEmailSubject } from '../src/components/playbooks/lib/draftGeneration.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Style-rules voor ALLE AI-gegenereerde client-facing content.
// Zie CLAUDE.md §2b. Deze rules worden als system-prompt geïnjecteerd zodat
// individuele prompt-templates ze niet hoeven te herhalen.
const EXTERNAL_COMMUNICATION_RULES = `Je schrijft een bericht dat naar een echte persoon verstuurd wordt (email, LinkedIn, WhatsApp, Instagram). Volg deze regels strikt:

VERBODEN:
- Em-dashes (—). Gebruik gewone streepjes (-) met spaties, of komma's, of splits in zinnen.
- Markdown-headers (# of ##). Berichten worden letterlijk getoond.
- Bullet lists (- of *) tenzij expliciet om gevraagd.
- Filler-openingen zoals "Hopelijk gaat het goed!" of "I hope this message finds you well".
- Emoji-overload. Maximaal 1 emoji per bericht, alleen als het natuurlijk past.

VOORKEUREN:
- Korte zinnen, natuurlijke spreektaal.
- Persoonlijk en concreet — verwijs naar specifieke dingen, niet generiek.
- Eindig met óf een open vraag óf een duidelijke call-to-action, niet beide.

Geef alleen de pure berichttekst terug, geen omhullende tekst, geen labels, geen "Hier is je bericht:".`;

export default async function handler(req, res) {
  // Auth guard (v1.39.0): Vercel cron invocations only.
  if (!requireCron(req, res)) return;

  const force = req.query?.force === 'true';
  const stats = { processed: 0, drafts_created: 0, tasks_created: 0, completed: 0, errors: [] };

  try {
    const now = new Date();
    const query = supabase
      .from('playbook_enrollments')
      .select('*, contacts(*, companies(*))')
      .eq('status', 'active');

    const filter = force
      ? query
      : query.or(`next_action_at.lte.${now.toISOString()},next_action_at.is.null`);

    const { data: enrollments, error } = await filter;
    if (error) throw new Error(`Failed to fetch enrollments: ${error.message}`);

    for (const enrollment of enrollments || []) {
      try {
        await processEnrollment(enrollment, now, stats);
        stats.processed++;
      } catch (err) {
        stats.errors.push({ enrollment_id: enrollment.id, error: err.message });
      }
    }

    res.status(200).json({ status: 'ok', stats });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
}

async function processEnrollment(enrollment, now, stats) {
  const { data: versionRow, error } = await supabase
    .from('playbook_versions')
    .select('graph_snapshot')
    .eq('playbook_id', enrollment.playbook_id)
    .eq('version', enrollment.version_at_start)
    .single();

  if (error || !versionRow) {
    throw new Error(`No version snapshot found for playbook ${enrollment.playbook_id} v${enrollment.version_at_start}`);
  }

  const graph = versionRow.graph_snapshot;
  const ctx = await buildContext(enrollment, now);

  // Loop until we hit wait/complete/error. Safety: max 20 iterations per tick.
  for (let i = 0; i < 20; i++) {
    const result = traverseStep({ graph, enrollment, context: ctx });

    if (result.action === 'complete') {
      await supabase.from('playbook_enrollments')
        .update({ status: 'completed', completed_at: now.toISOString() })
        .eq('id', enrollment.id);
      stats.completed++;
      return;
    }

    if (result.action === 'error') {
      throw new Error(result.error);
    }

    if (result.action === 'wait_until') {
      await supabase.from('playbook_enrollments')
        .update({ current_node_id: result.next_node_id, next_action_at: result.next_action_at })
        .eq('id', enrollment.id);
      return;
    }

    // execute_node — first the side-effect, then advance
    if (result.side_effect) {
      await executeSideEffect(result.side_effect, enrollment, ctx, stats);
    }

    if (!result.next_node_id) {
      await supabase.from('playbook_enrollments')
        .update({ status: 'completed', completed_at: now.toISOString() })
        .eq('id', enrollment.id);
      stats.completed++;
      return;
    }

    enrollment.current_node_id = result.next_node_id;
    await supabase.from('playbook_enrollments')
      .update({ current_node_id: result.next_node_id })
      .eq('id', enrollment.id);

    if (result.side_effect && result.side_effect.type.endsWith('_draft')) {
      await supabase.from('playbook_enrollments')
        .update({ status: 'awaiting_review' })
        .eq('id', enrollment.id);
      return;
    }
  }
}

async function buildContext(enrollment, now) {
  const contact = enrollment.contacts || {};
  const company = enrollment.contacts?.companies || null;
  // Geen direct deal-link op enrollment — lookup latest active opportunity voor company (best-effort).
  let deal = null;
  if (company?.id) {
    const { data: deals } = await supabase
      .from('opportunities')
      .select('id, name, value, owner_name, stage, status')
      .eq('company_id', company.id)
      .in('stage', ['active', 'onboarding', 'qualify', 'develop', 'proposal'])
      .order('created_at', { ascending: false })
      .limit(1);
    deal = deals?.[0] || null;
  }
  const ownerFirstName = (deal?.owner_name || '').split(' ')[0] || '';
  return {
    now,
    contact,
    deal,
    company,
    owner: { first_name: ownerFirstName },
    signal_context: enrollment.source_context?.signal_content || '',
  };
}

async function executeSideEffect(sideEffect, enrollment, ctx, stats) {
  const { type, config, node_id } = sideEffect;

  if (['action_email_draft','action_linkedin_draft','action_whatsapp_draft','action_instagram_draft'].includes(type)) {
    const channelMap = {
      action_email_draft: 'email',
      action_linkedin_draft: 'linkedin',
      action_whatsapp_draft: 'whatsapp',
      action_instagram_draft: 'instagram'
    };
    const channel = channelMap[type];

    let body, subject = null;
    if (isAiMode(config) && anthropic) {
      const prompt = buildAiPrompt(config, ctx);
      try {
        const msg = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          system: EXTERNAL_COMMUNICATION_RULES,
          messages: [{ role: 'user', content: prompt }],
        });
        body = msg.content[0]?.text || '';
      } catch (err) {
        // Fallback model
        const msg = await anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 600,
          system: EXTERNAL_COMMUNICATION_RULES,
          messages: [{ role: 'user', content: prompt }],
        });
        body = msg.content[0]?.text || '';
      }
    } else {
      body = getManualBody(config, ctx);
    }
    if (type === 'action_email_draft') subject = getEmailSubject(config, ctx);

    await supabase.from('playbook_drafts').insert({
      enrollment_id: enrollment.id,
      node_id,
      channel,
      to_contact_id: enrollment.contact_id,
      subject,
      body,
      body_original: body,
      status: 'pending',
    });
    stats.drafts_created++;
    return;
  }

  if (type === 'action_internal_task') {
    const dueDate = new Date(ctx.now);
    if (config.days_due) dueDate.setDate(dueDate.getDate() + Number(config.days_due));
    await supabase.from('tasks').insert({
      title: substituteMergeFields(config.title || '', ctx),
      type: 'playbook_task',
      due_date: dueDate.toISOString().split('T')[0],
      contact_id: enrollment.contact_id,
      opportunity_id: ctx.deal?.id || null,
      owner: ctx.deal?.owner_name || null,
      status: 'pending',
    });
    stats.tasks_created++;
    return;
  }

  if (type === 'action_stage_update') {
    const newStage = config.new_stage;
    if (newStage && ctx.deal?.id) {
      await supabase.from('opportunities').update({ stage: newStage }).eq('id', ctx.deal.id);
    }
    return;
  }
}
