# Playbooks v2 — Plan 3: Execution Engine + Drafts + AI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Bouw de execution-engine die playbook-enrollments door hun graph laat lopen, drafts genereert (handmatige body óf AI-gegenereerd via Claude API), en review-flow in de Playbooks Hub. Eindstand: een gepubliceerde playbook draait via cron, genereert drafts in de Drafts-tab, gebruiker reviewt en verzendt via bestaande Graph/Unipile-channels.

**Architecture:** Pure graph-traversal library (testbaar zonder DB) + cron-handler die per active enrollment de volgende node bepaalt + draft-generation library die merge-fields/AI-prompts resolvet via Claude Haiku API. Drafts review/send blijft **browser-side** (Graph token + Unipile via bestaande api/unipile.js). Reply-detection via Unipile-webhook (real-time) voor LinkedIn/WA/IG; email-reply-detection uitgesteld naar later (vereist server-side Graph). Test-run mode hergebruikt traversal-library in dry-run modus.

**Tech Stack:** Anthropic SDK (`@anthropic-ai/sdk`), Supabase, MS Graph (browser-side), Unipile, React 19, bestaande Vercel cron-infrastructuur.

---

## File Structure

**Nieuwe files (9):**
- `src/components/playbooks/lib/playbookGraphTraversal.js` — pure traversal-functie (input: graph + enrollment-state, output: next-node-id + side-effect-spec)
- `src/components/playbooks/lib/draftGeneration.js` — merge-field substitutie + AI-prompt resolution
- `src/components/playbooks/lib/sendChannels.js` — browser-side send helpers (Graph email, Unipile LI/WA/IG)
- `src/components/playbooks/tabs/DraftsTab.jsx` — drafts hub-tab (list + preview + actions)
- `src/components/playbooks/tabs/RunningTab.jsx` — lopende enrollments
- `src/components/playbooks/tabs/CompletedTab.jsx` — completed enrollments
- `src/components/playbooks/builder/TestRunModal.jsx` — test-run UI
- `api/anthropic-generate.js` — serverless wrapper voor test-run (browser-side AI calls)
- `api/playbook-graph-webhook.js` — Unipile-webhook handler uitbreiding (optioneel/integratie)

**Aangepaste files (5):**
- `api/playbook-execute.js` — volledig herschreven naar graph-traversal
- `api/unipile-webhook.js` — uitbreiden met reply-detection voor playbook enrollments
- `src/components/playbooks/nodes/NodeTypes.js` — `ai_prompt` field toevoegen aan 4 draft-action types
- `src/components/playbooks/panels/PropertyPanel.jsx` — Manual/AI toggle voor draft-action nodes
- `src/components/playbooks/PlaybooksHub.jsx` — wire DraftsTab/RunningTab/CompletedTab
- `src/components/playbooks/PlaybookFlowBuilder.jsx` — Test-run button in toolbar
- `src/components/playbooks/lib/playbookValidation.js` — accept `body` OR `ai_prompt`
- `package.json` — `@anthropic-ai/sdk` toevoegen

**Out-of-scope voor Plan 3:**
- Email-reply-detection (vereist server-side Graph subscriptions) — V4 of later
- Stage-change suggestion-creation via DB-trigger → Plan 4 (signals + suggesties)
- Signal-poll cron (LinkedIn posts → signals → suggestions) → Plan 4
- Sleeping Reactivation playbook seeded → Plan 5
- Branch-condition evaluation voor non-event-based condities (deal.value > X) — V1 supports only `event_check` and `time_check`, `field_compare` is V2

---

## Important context for implementers

**Merge-field naming**: Plan 2 design + this plan use **snake_case** (`{{first_name}}`, `{{company}}`, `{{signal_context}}`). The legacy `api/playbook-execute.js` uses camelCase (`{{FirstName}}`) but is being replaced — no compat needed.

**Email send is browser-side**: `playbook_drafts` rows of channel='email' are NOT sent by the cron. They appear in DraftsTab; user clicks Verzend → that triggers `sendChannels.sendEmail()` which uses the localStorage `graph_token` to POST to Graph. Cron just creates the draft row.

**Cron schedule**: existing `0 8 * * 1-5` in vercel.json. We reuse this, just change what `api/playbook-execute.js` does inside it.

**Anthropic API key**: new env var `ANTHROPIC_API_KEY` (server-side, no VITE_ prefix). Used in both `api/playbook-execute.js` (cron) and `api/anthropic-generate.js` (test-run endpoint).

**No automated tests** in this codebase. Verification = manual browser checks + structured smoke-test in Task 13.

---

## Task 1: Install Anthropic SDK + env var

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install package**

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Configure env var in Vercel** (manual user action — document for runbook)

Olivier doet zelf in Vercel dashboard:
1. Vercel → eclektik-crm project → Settings → Environment Variables
2. Add: `ANTHROPIC_API_KEY` = `sk-ant-...` (haalt 'm uit Anthropic console)
3. Apply to: Production + Preview + Development

NIET in code zetten. NIET in `.env` van repo (zit niet in git toch, maar dubbel-check).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): install @anthropic-ai/sdk for draft generation

Plan 3 foundation — Claude API SDK voor AI-prompt draft-generation
in cron + test-run mode. ANTHROPIC_API_KEY env var moet door Olivier
in Vercel dashboard worden gezet (server-side, geen VITE_ prefix).

Plan 3, Task 1.
EOF
)"
```

---

## Task 2: Add ai_prompt config field to draft-action node types

**Files:**
- Modify: `src/components/playbooks/nodes/NodeTypes.js`

- [ ] **Step 1: Update NodeTypes.js — 4 draft action types**

Voor elk van `action_email_draft`, `action_linkedin_draft`, `action_whatsapp_draft`, `action_instagram_draft`:

Op de bestaande `fields` array, voeg deze field ervoor toe (of na):
```js
{ key: 'use_ai', label: 'Generatie-modus', type: 'select', required: true,
  options: ['manual', 'ai'] },
{ key: 'ai_prompt', label: 'AI prompt template (alleen bij ai-modus)', type: 'textarea', required: false },
```

**Belangrijk**: bestaande `body` (en `subject` voor email) blijven staan maar worden conditioneel required afhankelijk van `use_ai`. Validation handelt dat in Task 4.

Voorbeeld voor `action_linkedin_draft` final shape:
```js
action_linkedin_draft: {
  category: 'ACTION',
  icon: 'in',
  label: 'LinkedIn-draft',
  description: 'Genereer LinkedIn-bericht voor review',
  maxOutgoing: 1,
  maxIncoming: 1,
  fields: [
    { key: 'use_ai', label: 'Generatie-modus', type: 'select', required: true,
      options: ['manual', 'ai'] },
    { key: 'body', label: 'Body (manual-modus)', type: 'textarea', required: false },
    { key: 'ai_prompt', label: 'AI prompt template (ai-modus)', type: 'textarea', required: false },
  ],
},
```

Default voor `use_ai` is `'manual'` zodat nieuwe nodes backward-compatible werken.

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/playbooks/nodes/NodeTypes.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): add ai_prompt + use_ai config fields to draft-actions

4 draft-action types (email/linkedin/whatsapp/instagram) krijgen
'use_ai' select (manual/ai) + 'ai_prompt' textarea voor prompt-template.
Bestaande body-field blijft, wordt conditional-required in validation.

Plan 3, Task 2.
EOF
)"
```

---

## Task 3: PropertyPanel — conditional rendering voor manual/ai modus

**Files:**
- Modify: `src/components/playbooks/panels/PropertyPanel.jsx`

- [ ] **Step 1: Add conditional rendering logic**

Zoek de `nodeType.fields.map(field => ...)` loop. Wrap de field-render in een conditional die velden verbergt bij verkeerde use_ai-modus:

```jsx
{nodeType.fields.map(field => {
  // Skip 'body' field if use_ai is 'ai'
  if (field.key === 'body' && config.use_ai === 'ai') return null;
  // Skip 'ai_prompt' field if use_ai is 'manual' (default)
  if (field.key === 'ai_prompt' && (config.use_ai || 'manual') === 'manual') return null;

  return (
    <div key={field.key} style={{ marginBottom:10 }}>
      {/* ... existing field rendering ... */}
    </div>
  );
})}
```

- [ ] **Step 2: Build + smoke-test**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/playbooks/panels/PropertyPanel.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): PropertyPanel conditional manual/ai modus

Hide body-field als use_ai='ai', hide ai_prompt-field als use_ai='manual'
(of niet gezet). User ziet alleen de relevante input afhankelijk van
gekozen generatie-modus.

Plan 3, Task 3.
EOF
)"
```

---

## Task 4: Update validation — body OR ai_prompt required

**Files:**
- Modify: `src/components/playbooks/lib/playbookValidation.js`

- [ ] **Step 1: Add conditional validation rule**

Zoek in `validatePlaybook` de "Rule 3: required config fields ingevuld" sectie. Daar staat een loop die `field.required` checkt. Voeg na die loop een nieuwe regel toe:

```js
  // Rule 3b: voor draft-action nodes: body OR ai_prompt moet gevuld zijn
  for (const n of nodes) {
    const def = NODE_TYPES[n.data.nodeType];
    if (!def) continue;
    const isDraftAction = ['action_email_draft','action_linkedin_draft','action_whatsapp_draft','action_instagram_draft'].includes(n.data.nodeType);
    if (!isDraftAction) continue;
    const config = n.data.config || {};
    const useAi = config.use_ai || 'manual';
    if (useAi === 'manual' && !config.body) {
      issues.push({ severity: 'error', nodeId: n.id, message: `${def.label}: 'Body' is verplicht bij manual-modus.` });
    }
    if (useAi === 'ai' && !config.ai_prompt) {
      issues.push({ severity: 'error', nodeId: n.id, message: `${def.label}: 'AI prompt template' is verplicht bij ai-modus.` });
    }
    if (n.data.nodeType === 'action_email_draft' && !config.subject) {
      issues.push({ severity: 'error', nodeId: n.id, message: `${def.label}: 'Onderwerp' is verplicht.` });
    }
  }
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/playbooks/lib/playbookValidation.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): validation rule 3b — conditional body/ai_prompt

Voor draft-action nodes: bij use_ai='manual' is body required,
bij use_ai='ai' is ai_prompt required. Email-drafts vereisen ook
subject onafhankelijk van modus.

Plan 3, Task 4.
EOF
)"
```

---

## Task 5: Pure graph-traversal library

**Files:**
- Create: `src/components/playbooks/lib/playbookGraphTraversal.js`

- [ ] **Step 1: Maak file met dit content:**

```js
// Pure graph-traversal logic for playbook execution engine.
//
// Geen DB-toegang, geen side-effects — alleen graph + state in, decisions out.
// Hierdoor testbaar in isolatie + bruikbaar voor zowel runtime (cron) als
// test-run (dry-run modus) in de builder.
//
// Input:
//   graph: { nodes: [...], edges: [...] }  — uit playbook_versions snapshot
//   enrollment: { current_node_id, replied_at, version_at_start, ... }
//   context: { now: Date, contact: {...}, deal: {...}, signal_context?: string }
//
// Output:
//   { action: 'noop' | 'execute_node' | 'wait_until' | 'complete' | 'error',
//     next_node_id?, next_action_at?, error?, side_effect? }

export function traverseStep({ graph, enrollment, context }) {
  if (!enrollment.current_node_id) {
    return { action: 'error', error: 'enrollment has no current_node_id' };
  }

  const currentNode = graph.nodes.find(n => n.id === enrollment.current_node_id);
  if (!currentNode) {
    return { action: 'error', error: `current node ${enrollment.current_node_id} not found in graph` };
  }

  const nodeType = currentNode.node_type;
  const config = currentNode.config || {};

  // ===== Logic nodes =====
  if (nodeType === 'logic_end') {
    return { action: 'complete' };
  }

  if (nodeType === 'logic_wait') {
    const days = Number(config.days) || 0;
    const nextActionAt = new Date(context.now.getTime() + days * 86400 * 1000);
    const outgoingEdges = graph.edges.filter(e => e.source === currentNode.id);
    if (outgoingEdges.length === 0) return { action: 'complete' }; // dead-end = complete
    return {
      action: 'wait_until',
      next_node_id: outgoingEdges[0].target,
      next_action_at: nextActionAt.toISOString(),
    };
  }

  if (nodeType === 'logic_wait_until_or') {
    const maxDays = Number(config.max_days) || 0;
    const eventType = config.event_type;
    const outgoingEdges = graph.edges.filter(e => e.source === currentNode.id);

    // Convention: edge with condition_label === 'event' is event-path, 'timeout' is timeout-path.
    // Else: first edge is event-path, second is timeout-path.
    const eventEdge = outgoingEdges.find(e => e.condition_label === 'event') || outgoingEdges[0];
    const timeoutEdge = outgoingEdges.find(e => e.condition_label === 'timeout') || outgoingEdges[1];

    // Has the event happened?
    const eventHappened = checkEvent(eventType, enrollment, context);
    if (eventHappened) {
      return { action: 'execute_node', next_node_id: eventEdge?.target || null };
    }

    // Has timeout elapsed?
    const enteredAt = new Date(enrollment.next_action_at || enrollment.enrolled_at);
    const timeoutAt = new Date(enteredAt.getTime() + maxDays * 86400 * 1000);
    if (context.now >= timeoutAt) {
      return { action: 'execute_node', next_node_id: timeoutEdge?.target || null };
    }

    // Still waiting
    return { action: 'wait_until', next_node_id: currentNode.id, next_action_at: timeoutAt.toISOString() };
  }

  if (nodeType === 'logic_branch') {
    const conditionType = config.condition_type;
    const outgoingEdges = graph.edges.filter(e => e.source === currentNode.id);

    if (conditionType === 'event_check') {
      // Look for 'ja' / 'nee' labeled edges
      const yesEdge = outgoingEdges.find(e => e.condition_label === 'ja' || e.condition_label === 'yes');
      const noEdge = outgoingEdges.find(e => e.condition_label === 'nee' || e.condition_label === 'no');
      const result = checkEvent(config.condition_field, enrollment, context);
      return { action: 'execute_node', next_node_id: (result ? yesEdge?.target : noEdge?.target) || outgoingEdges[0]?.target };
    }

    if (conditionType === 'time_check') {
      // Simplified: check if N days have passed since enrollment.enrolled_at
      const enteredAt = new Date(enrollment.enrolled_at);
      const daysPassed = (context.now - enteredAt) / (86400 * 1000);
      const threshold = Number(config.condition_value) || 0;
      const result = daysPassed >= threshold;
      const yesEdge = outgoingEdges.find(e => e.condition_label === 'ja' || e.condition_label === 'yes');
      const noEdge = outgoingEdges.find(e => e.condition_label === 'nee' || e.condition_label === 'no');
      return { action: 'execute_node', next_node_id: (result ? yesEdge?.target : noEdge?.target) || outgoingEdges[0]?.target };
    }

    // field_compare = V2 — for now: take default path
    return { action: 'execute_node', next_node_id: outgoingEdges[0]?.target };
  }

  // ===== Action nodes (draft generation, task creation, etc.) =====
  if (nodeType.startsWith('action_')) {
    const outgoingEdges = graph.edges.filter(e => e.source === currentNode.id);
    const nextNode = outgoingEdges[0]?.target;
    return {
      action: 'execute_node',
      next_node_id: nextNode,
      side_effect: { type: nodeType, config, node_id: currentNode.id },
    };
  }

  // ===== Trigger nodes (just pass through) =====
  if (nodeType.startsWith('trigger_')) {
    const outgoingEdges = graph.edges.filter(e => e.source === currentNode.id);
    return { action: 'execute_node', next_node_id: outgoingEdges[0]?.target };
  }

  return { action: 'error', error: `unknown node_type: ${nodeType}` };
}

function checkEvent(eventType, enrollment, context) {
  if (eventType === 'reply_received' || eventType === 'linkedin_reply' || eventType === 'any_inbound') {
    return !!enrollment.replied_at;
  }
  // email_opened: niet ondersteund in V1 (geen Graph webhook)
  return false;
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/playbooks/lib/playbookGraphTraversal.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): pure graph-traversal library

Stateless traversal-functie: input is graph + enrollment-state + context,
output is next-action descriptor (execute_node / wait_until / complete / error).
Geen DB, geen side-effects — testbaar in isolatie. Hergebruikt door cron
en test-run mode.

Supports: trigger pass-through, action with side-effect, logic_wait,
logic_wait_until_or (event/timeout branching), logic_branch (event_check
+ time_check; field_compare deferred to V2).

Plan 3, Task 5.
EOF
)"
```

---

## Task 6: Draft generation library

**Files:**
- Create: `src/components/playbooks/lib/draftGeneration.js`

- [ ] **Step 1: Maak file met dit content:**

```js
// Draft generation: merge-field substitutie + AI-prompt resolution.
//
// substituteMergeFields() werkt op zowel manual-bodies als AI-prompts.
// generateDraftBody() decideert tussen manual en AI-modus.
//
// Anthropic API call wordt vanuit cron (api/playbook-execute.js) of test-run
// endpoint (api/anthropic-generate.js) gedaan — niet vanuit deze browser-lib.
// Deze module exporteert alleen helpers; de actual fetch zit elders.

export function substituteMergeFields(template, ctx) {
  if (!template) return '';
  const fields = {
    first_name: ctx.contact?.first_name || '',
    last_name: ctx.contact?.last_name || '',
    full_name: ctx.contact?.full_name || `${ctx.contact?.first_name || ''} ${ctx.contact?.last_name || ''}`.trim(),
    role: ctx.contact?.title || ctx.contact?.role || '',
    company: ctx.contact?.company_name || ctx.company?.name || '',
    project_name: ctx.deal?.name || '',
    sector_topic: ctx.company?.industry || '',
    sender_first_name: ctx.owner?.first_name || '',
    deal_value: ctx.deal?.value || '',
    months_since_sleeping: ctx.deal?.months_since_sleeping || '',
    signal_context: ctx.signal_context || '',
  };
  let out = template;
  for (const [key, val] of Object.entries(fields)) {
    out = out.replaceAll(`{{${key}}}`, String(val));
  }
  return out;
}

export function isAiMode(config) {
  return config.use_ai === 'ai';
}

export function buildAiPrompt(config, ctx) {
  // Resolve merge-fields in the prompt template
  return substituteMergeFields(config.ai_prompt || '', ctx);
}

export function getManualBody(config, ctx) {
  return substituteMergeFields(config.body || '', ctx);
}

export function getEmailSubject(config, ctx) {
  return substituteMergeFields(config.subject || '', ctx);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/playbooks/lib/draftGeneration.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): draftGeneration library — merge-fields + ai-prompt resolution

Helpers voor: substituteMergeFields (snake_case), isAiMode, buildAiPrompt,
getManualBody, getEmailSubject. Stateless. Het daadwerkelijk Anthropic-call
gebeurt in cron + test-run-endpoint (niet hier — die module blijft browser-safe).

Plan 3, Task 6.
EOF
)"
```

---

## Task 7: Execution engine — herschrijf api/playbook-execute.js

**Files:**
- Rewrite: `api/playbook-execute.js`

- [ ] **Step 1: Vervang volledige content van api/playbook-execute.js met:**

```js
// Playbook execution cron — graph-traversal versie (Plan 3).
//
// Trigger: Vercel cron, 0 8 * * 1-5 (8u NL-tijd werkdagen, configured in vercel.json).
//
// Per active enrollment:
//   1. Load playbook_version snapshot (using enrollment.version_at_start)
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

export default async function handler(req, res) {
  const force = req.query?.force === 'true';
  const stats = { processed: 0, drafts_created: 0, tasks_created: 0, completed: 0, errors: [] };

  try {
    // Get all active enrollments due for processing
    const now = new Date();
    const { data: enrollments, error } = await supabase
      .from('playbook_enrollments')
      .select('*, contacts(*), opportunities(*, companies(*))')
      .eq('status', 'active')
      .or(force ? 'next_action_at.not.is.null,next_action_at.is.null' : `next_action_at.lte.${now.toISOString()},next_action_at.is.null`);

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
  // Load graph snapshot from playbook_versions
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

  // Loop until we hit a node that requires waiting or completes
  // Max 20 iterations per enrollment per tick — safety against accidental loops
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

    // result.action === 'execute_node'
    // First execute the side-effect (if any) of the CURRENT node
    if (result.side_effect) {
      await executeSideEffect(result.side_effect, enrollment, ctx, stats);
    }

    // Then advance to next node
    if (!result.next_node_id) {
      // No outgoing — complete
      await supabase.from('playbook_enrollments')
        .update({ status: 'completed', completed_at: now.toISOString() })
        .eq('id', enrollment.id);
      stats.completed++;
      return;
    }

    // Update enrollment locally to continue traversal
    enrollment.current_node_id = result.next_node_id;
    await supabase.from('playbook_enrollments')
      .update({ current_node_id: result.next_node_id })
      .eq('id', enrollment.id);

    // Check if we need to pause on an awaiting_review state (draft just created)
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
  const deal = enrollment.opportunities || null;
  const company = deal?.companies || null;
  // Owner lookup (best-effort) — uses opportunity.owner_name
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

  if (type === 'action_email_draft' || type === 'action_linkedin_draft' || type === 'action_whatsapp_draft' || type === 'action_instagram_draft') {
    const channelMap = { action_email_draft: 'email', action_linkedin_draft: 'linkedin', action_whatsapp_draft: 'whatsapp', action_instagram_draft: 'instagram' };
    const channel = channelMap[type];

    let body, subject = null;
    if (isAiMode(config) && anthropic) {
      const prompt = buildAiPrompt(config, ctx);
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });
      body = msg.content[0]?.text || '';
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
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add api/playbook-execute.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): rewrite api/playbook-execute.js as graph-traversal cron

Volledig herschreven van linear step-iterator naar graph-traversal:
- Laad playbook_versions snapshot per enrollment
- Loop via traverseStep() lib tot wait/complete
- Side-effects: email/LI/WA/IG drafts (manual OR AI-generated via Claude Haiku),
  internal tasks, stage updates
- Pause enrollment op 'awaiting_review' bij drafts (gebruiker reviewt browser-side)
- Safety: max 20 iteraties per enrollment per tick

Plan 3, Task 7.
EOF
)"
```

---

## Task 8: DraftsTab component — list + preview

**Files:**
- Create: `src/components/playbooks/tabs/DraftsTab.jsx`

- [ ] **Step 1: Maak file met dit content:**

```jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';

export default function DraftsTab() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('playbook_drafts')
      .select('*, contacts(*), playbook_nodes(node_type, config), playbook_enrollments(playbook_id, playbooks(name))')
      .eq('status', 'pending')
      .order('generated_at', { ascending: false });
    if (error) { setError(error.message); setLoading(false); return; }
    setDrafts(data || []);
    if (data?.length > 0 && !selectedId) setSelectedId(data[0].id);
    setLoading(false);
  }

  const selected = drafts.find(d => d.id === selectedId);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#888780' }}>Loading...</div>;
  if (error) return <div style={{ padding:40, color:'#dc2626' }}>Error: {error}</div>;
  if (drafts.length === 0) return <div style={{ padding:40, textAlign:'center', color:'#888780', fontSize:13 }}>Geen drafts wachtend op review.</div>;

  return (
    <div style={{ display:'flex', height:'100%' }}>
      {/* List */}
      <div style={{ width:300, borderRight:'0.5px solid #D3D1C7', overflowY:'auto', background:'#fff' }}>
        {drafts.map(d => {
          const isSelected = d.id === selectedId;
          const ageHours = Math.round((Date.now() - new Date(d.generated_at).getTime()) / 3600000);
          const stale = ageHours > 120;
          return (
            <div key={d.id} onClick={() => setSelectedId(d.id)} style={{
              padding:'10px 14px',
              borderBottom:'0.5px solid #f1f5f9',
              cursor:'pointer',
              background: isSelected ? '#f0fdfa' : (stale ? '#fef9c3' : '#fff'),
              borderLeft: isSelected ? '3px solid #14b8a6' : '3px solid transparent',
            }}>
              <div style={{ fontSize:10, color:'#92400e', fontWeight:600 }}>
                {d.channel.toUpperCase()} {stale && '· STALE'}
              </div>
              <div style={{ fontSize:12, fontWeight:500, marginTop:2 }}>{d.contacts?.full_name || d.contacts?.first_name || 'Unknown'}</div>
              <div style={{ fontSize:10, color:'#6b7280', marginTop:2 }}>{d.playbook_enrollments?.playbooks?.name}</div>
              <div style={{ fontSize:9, color:'#9ca3af', marginTop:2 }}>{ageHours}u geleden</div>
            </div>
          );
        })}
      </div>
      {/* Preview */}
      <div style={{ flex:1, padding:20, overflowY:'auto', background:'#fafafa' }}>
        {selected ? (
          <DraftPreview draft={selected} onAction={load} />
        ) : (
          <div style={{ color:'#888780', fontSize:12 }}>Selecteer een draft.</div>
        )}
      </div>
    </div>
  );
}

function DraftPreview({ draft, onAction }) {
  const [body, setBody] = useState(draft.body || '');
  const [subject, setSubject] = useState(draft.subject || '');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setBody(draft.body || '');
    setSubject(draft.subject || '');
  }, [draft.id]);

  async function handleSave() {
    await supabase.from('playbook_drafts')
      .update({ body, subject, edited_at: new Date().toISOString() })
      .eq('id', draft.id);
  }

  async function handleSkip() {
    if (!confirm('Skip deze step?')) return;
    setSending(true);
    await supabase.from('playbook_drafts')
      .update({ status: 'skipped', resolved_at: new Date().toISOString() })
      .eq('id', draft.id);
    await supabase.from('playbook_enrollments')
      .update({ status: 'active', next_action_at: new Date().toISOString() })
      .eq('id', draft.enrollment_id);
    onAction();
    setSending(false);
  }

  // Send button wired up in Task 9 via sendChannels helper

  return (
    <div>
      <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>
        {draft.channel.toUpperCase()} draft → {draft.contacts?.full_name}
      </div>

      {draft.channel === 'email' && (
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:10, color:'#6b7280', textTransform:'uppercase', fontWeight:600 }}>Subject</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onBlur={handleSave}
            style={{ width:'100%', padding:'6px 10px', fontSize:12, border:'0.5px solid #D3D1C7', borderRadius:4, marginTop:4, fontFamily:'inherit' }}
          />
        </div>
      )}

      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:10, color:'#6b7280', textTransform:'uppercase', fontWeight:600 }}>Body</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onBlur={handleSave}
          rows={14}
          style={{ width:'100%', padding:'8px 12px', fontSize:12, border:'0.5px solid #D3D1C7', borderRadius:4, marginTop:4, fontFamily:'inherit', resize:'vertical' }}
        />
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <button
          disabled={sending}
          onClick={() => alert('Send wordt wired-up in Task 9 (sendChannels)')}
          style={{ padding:'8px 16px', background:'#14b8a6', color:'#fff', border:'none', borderRadius:4, fontSize:12, fontWeight:600, cursor: sending ? 'not-allowed' : 'pointer' }}>
          ▶ Verzend
        </button>
        <button
          disabled={sending}
          onClick={handleSkip}
          style={{ padding:'8px 16px', background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:4, fontSize:12, cursor:'pointer' }}>
          Skip step
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/playbooks/tabs/DraftsTab.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): DraftsTab — list + preview + edit + skip

Two-pane layout: drafts list (links) + preview/edit (rechts).
Inline editable subject/body, auto-save on blur. Skip-action sets
status='skipped' en herstart enrollment. Send button wordt wired-up
in Task 9 (sendChannels integration).

Plan 3, Task 8.
EOF
)"
```

---

## Task 9: sendChannels library + wire Verzend-knop

**Files:**
- Create: `src/components/playbooks/lib/sendChannels.js`
- Modify: `src/components/playbooks/tabs/DraftsTab.jsx`

- [ ] **Step 1: Maak sendChannels.js:**

```js
// Browser-side send helpers per channel.
// Email: MS Graph via localStorage graph_token
// LinkedIn / WhatsApp / Instagram: via bestaande /api/unipile.js endpoint

import { supabase } from '../../../supabase';

export async function sendDraft(draft) {
  const fn = {
    email: sendEmail,
    linkedin: sendLinkedIn,
    whatsapp: sendWhatsApp,
    instagram: sendInstagram,
  }[draft.channel];
  if (!fn) throw new Error(`Unknown channel: ${draft.channel}`);
  await fn(draft);
  // Mark draft + advance enrollment
  await supabase.from('playbook_drafts')
    .update({ status: 'sent', resolved_at: new Date().toISOString() })
    .eq('id', draft.id);
  await supabase.from('playbook_enrollments')
    .update({ status: 'active', next_action_at: new Date().toISOString() })
    .eq('id', draft.enrollment_id);
}

async function sendEmail(draft) {
  const token = localStorage.getItem('graph_token');
  if (!token) throw new Error('Niet ingelogd bij Microsoft (graph_token mist) — heraanmelden');

  const { data: contact } = await supabase
    .from('contacts')
    .select('email')
    .eq('id', draft.to_contact_id)
    .single();
  if (!contact?.email) throw new Error('Contact heeft geen email-adres');

  const resp = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject: draft.subject || '',
        body: { contentType: 'Text', content: draft.body || '' },
        toRecipients: [{ emailAddress: { address: contact.email } }],
      },
      saveToSentItems: true,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Graph sendMail failed (${resp.status}): ${err.slice(0, 200)}`);
  }
  // Graph doesn't return message ID from sendMail — saved to Sent Items async.
  // For reply-detection later (V2), we'd need to query Sent folder.
}

async function sendLinkedIn(draft) {
  return sendViaUnipile(draft, 'linkedin');
}

async function sendWhatsApp(draft) {
  return sendViaUnipile(draft, 'whatsapp');
}

async function sendInstagram(draft) {
  return sendViaUnipile(draft, 'instagram');
}

async function sendViaUnipile(draft, providerType) {
  const { data: contact } = await supabase
    .from('contacts')
    .select('linkedin_url, phone, instagram_username')
    .eq('id', draft.to_contact_id)
    .single();

  const identifier = providerType === 'linkedin' ? contact?.linkedin_url
                   : providerType === 'whatsapp' ? contact?.phone
                   : contact?.instagram_username;
  if (!identifier) throw new Error(`Contact heeft geen ${providerType} identifier`);

  // Existing api/unipile.js handles send. We POST to it.
  const resp = await fetch('/api/unipile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'send_message',
      provider: providerType,
      identifier,
      text: draft.body,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Unipile send failed (${resp.status}): ${err.slice(0, 200)}`);
  }
}
```

- [ ] **Step 2: Modify DraftsTab.jsx — wire de Verzend-knop**

In `DraftPreview` component, vervang het onClick van de Verzend-knop:

```jsx
// Add import top of file:
import { sendDraft } from '../lib/sendChannels';

// Inside DraftPreview, replace the alert-call onClick:
onClick={async () => {
  setSending(true);
  try {
    await handleSave(); // ensure latest edits persisted
    await sendDraft({ ...draft, body, subject });
    onAction();
  } catch (err) {
    alert('Send failed: ' + err.message);
  } finally {
    setSending(false);
  }
}}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/playbooks/lib/sendChannels.js src/components/playbooks/tabs/DraftsTab.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): sendChannels — Verzend-knop wired per channel

Browser-side send: email via MS Graph (localStorage token), LinkedIn/WA/IG
via bestaande /api/unipile endpoint. Bij send: draft → status='sent',
enrollment → status='active' + next_action_at=now (cron pakt 'm direct op).

Plan 3, Task 9.
EOF
)"
```

---

## Task 10: Unipile webhook — reply detection

**Files:**
- Modify: `api/unipile-webhook.js`

- [ ] **Step 1: Lees huidige content**

```bash
cat api/unipile-webhook.js | head -80
```

Begrijp hoe inbound messages momenteel worden verwerkt.

- [ ] **Step 2: Voeg reply-matching toe**

In de handler waar inbound LinkedIn/WA/IG-bericht binnenkomt, voeg toe:

```js
// After existing inbound-message logic, before final response.send():
//
// Match inbound message tegen pending enrollments waiting on reply
const { data: matchedEnrollments } = await supabase
  .from('playbook_enrollments')
  .select('id, contact_id')
  .eq('contact_id', resolvedContactId) // resolvedContactId = de contact_id die je al hebt uit de webhook
  .in('status', ['active', 'awaiting_review'])
  .is('replied_at', null);

if (matchedEnrollments?.length > 0) {
  await supabase.from('playbook_enrollments')
    .update({ replied_at: new Date().toISOString(), next_action_at: new Date().toISOString() })
    .in('id', matchedEnrollments.map(e => e.id));
  console.log(`Marked ${matchedEnrollments.length} enrollment(s) as replied for contact ${resolvedContactId}`);
}
```

**Belangrijk**: alleen integreren als de webhook al een `resolvedContactId` heeft uit eerdere logica. Als die variable nog niet bestaat, gebruik de juiste lookup (kijk hoe de bestaande webhook het contact resolvet via LinkedIn URN / email).

- [ ] **Step 3: Commit**

```bash
git add api/unipile-webhook.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): unipile-webhook — mark playbook enrollments as replied

Bij inbound LinkedIn/WhatsApp/Instagram bericht: zoek matching enrollments
(zelfde contact_id, status active/awaiting_review, replied_at IS NULL).
Mark als replied + zet next_action_at=now zodat cron 'm direct doorzet.

Email-reply-detection: NIET in deze plan (vereist server-side Graph
subscriptions). Wait-until/or met email-event-type valt altijd in
timeout-pad in V1.

Plan 3, Task 10.
EOF
)"
```

---

## Task 11: Anthropic API endpoint voor test-run

**Files:**
- Create: `api/anthropic-generate.js`

- [ ] **Step 1: Maak file met dit content:**

```js
// Server-side wrapper voor Claude API — gebruikt door test-run modus
// in builder. Frontend kan niet direct Anthropic aanroepen (key zou
// lekken).

import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!anthropic) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { prompt, max_tokens = 600 } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt (string) required' });
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0]?.text || '';
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add api/anthropic-generate.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): /api/anthropic-generate endpoint for test-run

Server-side wrapper voor Claude Haiku — laat builder test-run modus
echt content genereren zonder ANTHROPIC_API_KEY in frontend te lekken.
POST {prompt, max_tokens?} → {text}.

Plan 3, Task 11.
EOF
)"
```

---

## Task 12: Test-run mode in builder

**Files:**
- Create: `src/components/playbooks/builder/TestRunModal.jsx`
- Modify: `src/components/playbooks/PlaybookFlowBuilder.jsx`

- [ ] **Step 1: Maak TestRunModal.jsx:**

```jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { traverseStep } from '../lib/playbookGraphTraversal';
import { substituteMergeFields, isAiMode, buildAiPrompt, getManualBody, getEmailSubject } from '../lib/draftGeneration';

export default function TestRunModal({ playbookId, nodes, edges, onClose }) {
  const [contacts, setContacts] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);

  useEffect(() => {
    supabase.from('contacts').select('id, full_name, first_name, last_name, company_name, title')
      .order('full_name', { ascending: true }).limit(50)
      .then(({ data }) => setContacts(data || []));
  }, []);

  async function runSimulation() {
    if (!selectedContactId) return;
    setRunning(true);
    setLog([]);

    const contact = contacts.find(c => c.id === selectedContactId);
    const graph = {
      nodes: nodes.map(n => ({ id: n.id, node_type: n.data.nodeType, config: n.data.config || {}, pos_x: n.position.x, pos_y: n.position.y })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, condition_label: e.label || null })),
    };

    // Find trigger node as starting point
    const trigger = graph.nodes.find(n => n.node_type.startsWith('trigger_'));
    if (!trigger) {
      setLog([{ level: 'error', msg: 'Geen trigger node gevonden.' }]);
      setRunning(false);
      return;
    }

    let enrollment = {
      id: 'test-' + Date.now(),
      current_node_id: trigger.id,
      enrolled_at: new Date().toISOString(),
      replied_at: null,
      next_action_at: null,
    };

    const ctx = { now: new Date(), contact, deal: null, company: null, owner: { first_name: 'OA' } };
    const logs = [{ level: 'info', msg: `Start simulation voor ${contact.full_name || contact.first_name}` }];

    for (let i = 0; i < 20; i++) {
      const result = traverseStep({ graph, enrollment, context: ctx });
      const node = graph.nodes.find(n => n.id === enrollment.current_node_id);

      if (result.action === 'complete') {
        logs.push({ level: 'success', msg: 'Playbook compleet.' });
        break;
      }
      if (result.action === 'error') {
        logs.push({ level: 'error', msg: 'Error: ' + result.error });
        break;
      }

      if (result.side_effect) {
        const eff = result.side_effect;
        if (eff.type.endsWith('_draft')) {
          const channel = eff.type.replace('action_', '').replace('_draft', '');
          let body;
          if (isAiMode(eff.config)) {
            const prompt = buildAiPrompt(eff.config, ctx);
            logs.push({ level: 'info', msg: `[${node.node_type}] AI-prompt resolved: ${prompt.slice(0, 100)}...` });
            try {
              const resp = await fetch('/api/anthropic-generate', {
                method: 'POST', headers: { 'Content-Type':'application/json' },
                body: JSON.stringify({ prompt, max_tokens: 400 }),
              });
              const data = await resp.json();
              body = data.text || '(geen output)';
            } catch (err) {
              body = `(AI-call failed: ${err.message})`;
            }
          } else {
            body = getManualBody(eff.config, ctx);
          }
          logs.push({ level: 'draft', msg: `[${channel.toUpperCase()} draft] ${eff.type === 'action_email_draft' ? `Subject: ${getEmailSubject(eff.config, ctx)}\n` : ''}${body}` });
        } else if (eff.type === 'action_internal_task') {
          logs.push({ level: 'info', msg: `[TASK] ${substituteMergeFields(eff.config.title, ctx)}` });
        } else if (eff.type === 'action_stage_update') {
          logs.push({ level: 'info', msg: `[STAGE UPDATE] → ${eff.config.new_stage}` });
        }
      } else if (result.action === 'wait_until') {
        logs.push({ level: 'info', msg: `[WAIT] tot ${new Date(result.next_action_at).toLocaleDateString('nl-NL')} — skip in simulation` });
      }

      if (!result.next_node_id) {
        logs.push({ level: 'info', msg: 'Geen volgende node — eind van pad.' });
        break;
      }
      enrollment.current_node_id = result.next_node_id;
      setLog([...logs]);
    }

    setLog(logs);
    setRunning(false);
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:8, padding:24, width:600, maxHeight:'80vh', overflowY:'auto' }}>
        <h2 style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Test-run playbook</h2>

        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, color:'#6b7280' }}>Test-contact</label>
          <select
            value={selectedContactId}
            onChange={e => setSelectedContactId(e.target.value)}
            disabled={running}
            style={{ width:'100%', padding:'6px 10px', fontSize:12, border:'0.5px solid #D3D1C7', borderRadius:4, marginTop:4 }}>
            <option value="">— kies contact —</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.full_name || `${c.first_name} ${c.last_name}`}</option>)}
          </select>
        </div>

        <button
          disabled={!selectedContactId || running}
          onClick={runSimulation}
          style={{ padding:'6px 14px', fontSize:12, background:'#14b8a6', color:'#fff', border:'none', borderRadius:4, cursor:'pointer', opacity:running?0.5:1 }}>
          {running ? 'Running...' : '▶ Run simulation'}
        </button>

        {log.length > 0 && (
          <div style={{ marginTop:16, background:'#0f172a', color:'#e2e8f0', padding:14, borderRadius:6, fontFamily:'monospace', fontSize:11, whiteSpace:'pre-wrap', maxHeight:300, overflowY:'auto' }}>
            {log.map((l, i) => (
              <div key={i} style={{ color: l.level==='error' ? '#fca5a5' : l.level==='success' ? '#86efac' : l.level==='draft' ? '#fcd34d' : '#e2e8f0' }}>
                {l.msg}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop:14, textAlign:'right' }}>
          <button onClick={onClose} style={{ padding:'6px 14px', fontSize:12, background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:4, cursor:'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modify PlaybookFlowBuilder.jsx — voeg Test-run knop toe in BuilderToolbar**

Eerst, import TestRunModal:
```jsx
import TestRunModal from './builder/TestRunModal';
```

Voeg state toe in FlowCanvas:
```jsx
const [showTestRun, setShowTestRun] = useState(false);
```

In BuilderToolbar's parent JSX (de wrap), voeg toe net na BuilderToolbar:
```jsx
{showTestRun && (
  <TestRunModal
    playbookId={playbookId}
    nodes={nodes}
    edges={edges}
    onClose={() => setShowTestRun(false)}
  />
)}
```

In BuilderToolbar.jsx, voeg een Test-run knop toe naast Save Draft. Modify de file:

Pas BuilderToolbar.jsx aan zodat 't `onTestRun` als prop accepteert. Voeg toe vóór Save Draft:
```jsx
<button
  onClick={onTestRun}
  disabled={saving || publishing}
  style={{ padding:'4px 10px', fontSize:11, background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:4, cursor: 'pointer' }}>
  ▷ Test-run
</button>
```

En in PlaybookFlowBuilder.jsx waar BuilderToolbar gerendered wordt, geef `onTestRun={() => setShowTestRun(true)}` door.

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/playbooks/builder/TestRunModal.jsx src/components/playbooks/PlaybookFlowBuilder.jsx src/components/playbooks/panels/BuilderToolbar.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): test-run mode — dry-run simulation in builder

Test-run-knop in toolbar opent modal: kies test-contact, run simulation
die de graph doorlopen toont in een log. Manual drafts toont resolved body,
AI-drafts roept echte /api/anthropic-generate aan voor preview. Geen DB
side-effects (geen drafts/tasks gecreëerd).

Plan 3, Task 12.
EOF
)"
```

---

## Task 13: RunningTab + CompletedTab — enrollment-overzichten

**Files:**
- Create: `src/components/playbooks/tabs/RunningTab.jsx`
- Create: `src/components/playbooks/tabs/CompletedTab.jsx`

- [ ] **Step 1: Maak RunningTab.jsx:**

```jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';

export default function RunningTab() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('playbook_enrollments')
      .select('*, contacts(full_name, first_name, last_name), playbooks(name, version)')
      .in('status', ['active', 'awaiting_review'])
      .order('enrolled_at', { ascending: false })
      .then(({ data }) => { setEnrollments(data || []); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#888780' }}>Loading...</div>;
  if (enrollments.length === 0) return <div style={{ padding:40, textAlign:'center', color:'#888780', fontSize:13 }}>Geen lopende enrollments.</div>;

  return (
    <div style={{ padding:20, maxWidth:900, margin:'0 auto' }}>
      <h2 style={{ fontSize:14, marginBottom:14 }}>Lopende enrollments ({enrollments.length})</h2>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {enrollments.map(e => (
          <div key={e.id} style={{ background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:6, padding:12, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{e.contacts?.full_name || `${e.contacts?.first_name} ${e.contacts?.last_name}`}</div>
              <div style={{ fontSize:10, color:'#888780', marginTop:2 }}>
                {e.playbooks?.name} v{e.playbooks?.version} · status: {e.status}
                {e.next_action_at && ` · next: ${new Date(e.next_action_at).toLocaleDateString('nl-NL')}`}
              </div>
            </div>
            <div style={{ fontSize:11, color:'#888780' }}>{new Date(e.enrolled_at).toLocaleDateString('nl-NL')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Maak CompletedTab.jsx** — identiek aan RunningTab maar filter `.eq('status', 'completed')` en sorteer op `completed_at`:

```jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';

export default function CompletedTab() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('playbook_enrollments')
      .select('*, contacts(full_name, first_name, last_name), playbooks(name, version)')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setEnrollments(data || []); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#888780' }}>Loading...</div>;
  if (enrollments.length === 0) return <div style={{ padding:40, textAlign:'center', color:'#888780', fontSize:13 }}>Geen completed enrollments.</div>;

  return (
    <div style={{ padding:20, maxWidth:900, margin:'0 auto' }}>
      <h2 style={{ fontSize:14, marginBottom:14 }}>Completed enrollments (laatste 100)</h2>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {enrollments.map(e => (
          <div key={e.id} style={{ background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:6, padding:12, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{e.contacts?.full_name || `${e.contacts?.first_name} ${e.contacts?.last_name}`}</div>
              <div style={{ fontSize:10, color:'#888780', marginTop:2 }}>
                {e.playbooks?.name} v{e.playbooks?.version} · completed {new Date(e.completed_at).toLocaleDateString('nl-NL')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/playbooks/tabs/RunningTab.jsx src/components/playbooks/tabs/CompletedTab.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): RunningTab + CompletedTab — enrollment-overzichten

Lopende: alle active/awaiting_review enrollments met contact + playbook +
status + next_action_at. Completed: laatste 100 voltooide enrollments.

Plan 3, Task 13.
EOF
)"
```

---

## Task 14: Wire de tabs in PlaybooksHub

**Files:**
- Modify: `src/components/playbooks/PlaybooksHub.jsx`

- [ ] **Step 1: Import en wire de tabs**

Voeg bovenaan PlaybooksHub.jsx toe:
```jsx
import DraftsTab from './tabs/DraftsTab';
import RunningTab from './tabs/RunningTab';
import CompletedTab from './tabs/CompletedTab';
```

Update de TABS array — verwijder `placeholder: true` van drafts/running/completed:
```jsx
const TABS = [
  { key: 'suggestions', label: 'Suggesties', placeholder: true },  // Plan 4
  { key: 'drafts',      label: 'Drafts',     placeholder: false },
  { key: 'running',     label: 'Lopend',     placeholder: false },
  { key: 'completed',   label: 'Completed',  placeholder: false },
  { key: 'builder',     label: 'Builder',    placeholder: false },
];
```

Update de label-suffix logic — alleen `placeholder` krijgt "(Plan 3/4)":
```jsx
{t.label}{t.placeholder ? ' (Plan 4)' : ''}
```

In de content-render block, voeg de drie tabs toe:
```jsx
<div style={{ flex:1, overflow:'hidden', position:'relative' }}>
  {activeTab === 'builder' && (
    <PlaybookFlowBuilder
      playbookId={editingPlaybookId}
      onClose={() => setEditingPlaybookId(null)}
      onOpenPlaybook={setEditingPlaybookId}
    />
  )}
  {activeTab === 'drafts' && <DraftsTab />}
  {activeTab === 'running' && <RunningTab />}
  {activeTab === 'completed' && <CompletedTab />}
  {activeTab === 'suggestions' && (
    <div style={{ padding:40, textAlign:'center', color:'#888780', fontSize:13 }}>
      Suggesties-tab komt in Plan 4 (signal-system).
    </div>
  )}
</div>
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/playbooks/PlaybooksHub.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): wire DraftsTab + RunningTab + CompletedTab in PlaybooksHub

3 voorheen-placeholder tabs zijn nu functioneel. Alleen 'Suggesties' blijft
placeholder voor Plan 4 (signal-system).

Plan 3, Task 14.
EOF
)"
```

---

## Task 15: End-to-end smoke-test

Operationele test. Door Olivier zelf in browser, NA Vercel-deploy.

- [ ] **Step 1: Voeg `ANTHROPIC_API_KEY` toe in Vercel** (als nog niet gedaan in Task 1)

- [ ] **Step 2: Push naar main** (na ALLE taken commits succesvol)

Doe door Olivier handmatig: `git push origin HEAD:main` of equivalent.

- [ ] **Step 3: Hard refresh productie + scenario:**

1. Open https://crm.eclectik-insights.co → Playbooks tab
2. **Drafts** tab → "Geen drafts wachtend op review" (verwacht: leeg)
3. **Lopend** tab → "Geen lopende enrollments" (verwacht: leeg)
4. **Completed** tab → "Geen completed enrollments" (verwacht: leeg)
5. **Builder** tab → bestaande playbooks lijst → klik op een test-playbook (of maak een nieuwe)

Bouw test-playbook met AI:
- Manual start trigger
- Email-draft (use_ai='ai', ai_prompt: "Schrijf een korte begroeting aan {{first_name}} van {{company}}.")
- End
- Connect alles
- **Klik Test-run** in toolbar → kies een contact → "Run simulation"
- Expected log:
  - `Start simulation voor [Naam]`
  - `[EMAIL draft] Subject: ...\nHi [Naam], ...` (AI-generated, 1-3 zinnen)
  - `Geen volgende node — eind van pad.`

Als log geen AI-output toont maar wel "AI-call failed" → ANTHROPIC_API_KEY niet correct gezet in Vercel.

- [ ] **Step 4: Manual enrollment via Supabase** (om cron te testen zonder echte playbook)

In Supabase SQL Editor:
```sql
-- Pak een test-playbook + contact
SELECT id, name FROM playbooks WHERE status='active' LIMIT 1;
SELECT id, full_name FROM contacts LIMIT 1;

-- Get current playbook version's snapshot (zorgt dat enrollment naar juiste snapshot leest)
SELECT version FROM playbooks WHERE id = '<playbook-id>';

-- Insert test-enrollment
INSERT INTO playbook_enrollments (playbook_id, contact_id, current_node_id, version_at_start, status, next_action_at, enrolled_at)
VALUES (
  '<playbook-id>',
  '<contact-id>',
  (SELECT id FROM playbook_nodes WHERE playbook_id='<playbook-id>' AND node_type LIKE 'trigger_%' LIMIT 1),
  <version-number>,
  'active',
  NOW(),
  NOW()
);
```

- [ ] **Step 5: Trigger cron handmatig**

`https://crm.eclectik-insights.co/api/playbook-execute?force=true` (vereist auth — gebruik Vercel CLI of curl met header).

Of wacht tot 08:00 NL-tijd volgende werkdag.

- [ ] **Step 6: Refresh Drafts-tab in browser**

Expected: nieuwe draft verschijnt voor de test-contact. Klik 'm aan, zie body, klik **Skip step** (om geen echte test-mail te versturen).

- [ ] **Step 7: Klaar**

Als alles draait: Plan 3 is **DONE**.

---

## Plan 3 — Eindstand

Bij voltooiing van alle 15 tasks:

✅ Execution engine draait via cron — graph-traversal in plaats van linear steps
✅ AI-prompt-templates per draft-action node (manual OR ai modus)
✅ Drafts hub-tab voor review/edit/verzend
✅ Per-channel send: email (Graph browser), LinkedIn/WA/IG (Unipile)
✅ Reply-detection voor LinkedIn/WA/IG via Unipile-webhook
✅ Test-run mode in builder met echte AI-preview
✅ Lopend + Completed tabs voor enrollment-overzicht
✅ Anthropic API key beheerd via Vercel env vars

**Volgende plan**: Plan 4 — Signals + suggesties (Unipile LinkedIn-posts-poll, Claude-scoring, suggestion-creatie, topbar-badge, card-pill).

---

## Open issues / risico's

| Risico | Mitigatie |
|---|---|
| **Email-reply-detection ontbreekt** | Wait-until/or met email-event-type valt altijd in timeout. Plan 4 of later voor Graph subscriptions. Workaround: gebruik LinkedIn-reply-detection (werkt wel) of accept dat email-flows pure outbound zijn. |
| **Cron-context: bestaande tasks-schema** | Task 7 inserts in `tasks` tabel met type='playbook_task'. Verifieer dat de tasks-tabel die kolommen heeft (title, type, due_date, contact_id, opportunity_id, owner, status). |
| **Anthropic model-naam** | Plan gebruikt `claude-haiku-4-5`. Verifieer dat dit model beschikbaar is in jullie Anthropic-account. Anders fallback naar `claude-3-5-haiku-latest`. |
| **MS Graph token verloopt** | Browser-side send faalt met 401 als graph_token verlopen is. UX: toon "Heraanmelden bij Microsoft" prompt — bestaande `reconnectMicrosoft` functie uit auth.jsx hergebruiken. |
| **Cron-handler timeout (10s op Vercel Hobby, 60s op Pro)** | Per enrollment max 20 iteraties, per Claude-call ~2-5s. Bij 100 enrollments met AI-drafts kan cron timeout overschrijden. Mitigatie: batch limit (max 20 enrollments per run) + retry-queue voor rest. Implementatie in Task 7 indien nodig. |

## Self-review notes

**Spec coverage** (uit design doc sectie 6 + 7):
- ✅ Graph-traversal cron — Task 5 + 7
- ✅ Drafts hub — Task 8
- ✅ Per-channel send — Task 9
- ✅ AI-prompt-templates — Task 2-4 + 6 + 7
- ✅ Test-run mode — Task 12
- ✅ Reply-detection (LinkedIn/WA/IG) — Task 10
- ✅ Running + Completed tabs — Task 13
- ⏳ Email-reply-detection — V4 (server-side Graph subscriptions)
- ⏳ field_compare branch conditions — V2 (out of scope V1)
- ⏳ "Active enrollments on v2"-badge in builder toolbar — niet vereist, kan later

**Placeholder scan**: geen TBD/TODO in concrete code-blokken. Open issues bovenaan gemarkeerd met mitigaties.

**Type consistency**:
- Merge-fields snake_case overal (`{{first_name}}`, niet `{{FirstName}}`)
- Channels: `email` / `linkedin` / `whatsapp` / `instagram` consistent
- Node-types: `action_*_draft` consistent
- Status-enum: `pending` / `sent` / `skipped` / `expired` voor drafts; `active` / `awaiting_review` / `completed` voor enrollments

**Out-of-scope verified**: geen signal-poll, geen suggesties, geen seed-playbooks, geen Graph webhooks. Allemaal voor Plan 4 of later.
