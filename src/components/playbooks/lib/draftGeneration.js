// Draft generation: merge-field substitutie + AI-prompt resolution.
//
// substituteMergeFields() werkt op zowel manual-bodies als AI-prompts.
// Anthropic API call wordt vanuit cron (api/playbook-execute.js) of test-run
// endpoint (api/anthropic-generate.js) gedaan — niet vanuit deze browser-lib.

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
  return substituteMergeFields(config.ai_prompt || '', ctx);
}

export function getManualBody(config, ctx) {
  return substituteMergeFields(config.body || '', ctx);
}

export function getEmailSubject(config, ctx) {
  return substituteMergeFields(config.subject || '', ctx);
}
