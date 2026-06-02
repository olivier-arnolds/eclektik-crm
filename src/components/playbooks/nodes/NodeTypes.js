// Catalog van alle node-types voor Playbooks v2 builder.
// Per type: display info + config schema + welke uitgaande edges zijn toegestaan.

export const NODE_CATEGORIES = {
  TRIGGER: { label: 'Triggers',  color: '#6366f1', bg: '#c7d2fe' },
  ACTION:  { label: 'Actions',   color: '#14b8a6', bg: '#ccfbf1' },
  LOGIC:   { label: 'Logic',     color: '#ec4899', bg: '#fbcfe8' },
  WAIT:    { label: 'Wait',      color: '#f59e0b', bg: '#fde68a' },
};

// fields: array van { key, label, type, required, options? }
// type: 'text' | 'textarea' | 'number' | 'select' | 'days'

export const NODE_TYPES = {
  // ===== Triggers =====
  trigger_stage_change: {
    category: 'TRIGGER',
    icon: '⚡',
    label: 'Stage change',
    description: 'Start wanneer een deal/lead naar een stage gaat',
    maxOutgoing: 1,
    maxIncoming: 0,
    fields: [
      { key: 'to_stage', label: 'Naar stage', type: 'select', required: true,
        options: ['qualify','develop','proposal','close','onboarding','active','sleeping'] },
    ],
  },
  trigger_manual: {
    category: 'TRIGGER',
    icon: '▶',
    label: 'Manual start',
    description: 'Alleen handmatig te starten',
    maxOutgoing: 1,
    maxIncoming: 0,
    fields: [],
  },
  trigger_linkedin_user_post: {
    category: 'TRIGGER',
    icon: 'in',
    label: 'LinkedIn user post',
    description: 'Start bij nieuwe LinkedIn-post van contact',
    maxOutgoing: 1,
    maxIncoming: 0,
    fields: [
      { key: 'min_relevance', label: 'Min. relevance score', type: 'number', required: false },
    ],
  },
  trigger_linkedin_company_post: {
    category: 'TRIGGER',
    icon: '🏢',
    label: 'LinkedIn company post',
    description: 'Start bij nieuwe LinkedIn-post van company',
    maxOutgoing: 1,
    maxIncoming: 0,
    fields: [
      { key: 'min_relevance', label: 'Min. relevance score', type: 'number', required: false },
    ],
  },

  // ===== Actions =====
  action_email_draft: {
    category: 'ACTION',
    icon: '✉️',
    label: 'Email-draft',
    description: 'Genereer email voor review',
    maxOutgoing: 1,
    maxIncoming: 1,
    fields: [
      { key: 'use_ai', label: 'Generatie-modus', type: 'select', required: true,
        options: ['manual', 'ai'] },
      { key: 'subject', label: 'Onderwerp', type: 'text', required: true },
      { key: 'body', label: 'Body (manual-modus)', type: 'textarea', required: false },
      { key: 'ai_prompt', label: 'AI prompt template (ai-modus)', type: 'textarea', required: false },
    ],
  },
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
  action_whatsapp_draft: {
    category: 'ACTION',
    icon: '📱',
    label: 'WhatsApp-draft',
    description: 'Genereer WhatsApp-bericht voor review',
    maxOutgoing: 1,
    maxIncoming: 1,
    fields: [
      { key: 'use_ai', label: 'Generatie-modus', type: 'select', required: true,
        options: ['manual', 'ai'] },
      { key: 'body', label: 'Body (manual-modus)', type: 'textarea', required: false },
      { key: 'ai_prompt', label: 'AI prompt template (ai-modus)', type: 'textarea', required: false },
    ],
  },
  action_instagram_draft: {
    category: 'ACTION',
    icon: '📷',
    label: 'Instagram-draft',
    description: 'Genereer Instagram-bericht voor review',
    maxOutgoing: 1,
    maxIncoming: 1,
    fields: [
      { key: 'use_ai', label: 'Generatie-modus', type: 'select', required: true,
        options: ['manual', 'ai'] },
      { key: 'body', label: 'Body (manual-modus)', type: 'textarea', required: false },
      { key: 'ai_prompt', label: 'AI prompt template (ai-modus)', type: 'textarea', required: false },
    ],
  },
  action_internal_task: {
    category: 'ACTION',
    icon: '✓',
    label: 'Internal task',
    description: 'Maak intern task aan voor owner',
    maxOutgoing: 1,
    maxIncoming: 1,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'days_due', label: 'Dagen tot due', type: 'number', required: false },
    ],
  },
  action_stage_update: {
    category: 'ACTION',
    icon: '↦',
    label: 'Stage update',
    description: 'Update stage van gerelateerde deal',
    maxOutgoing: 1,
    maxIncoming: 1,
    fields: [
      { key: 'new_stage', label: 'Nieuwe stage', type: 'select', required: true,
        options: ['qualify','develop','proposal','close','onboarding','active','sleeping'] },
    ],
  },

  // ===== Logic =====
  logic_wait: {
    category: 'WAIT',
    icon: '⏱',
    label: 'Wait',
    description: 'Vaste pauze van N dagen',
    maxOutgoing: 1,
    maxIncoming: 1,
    fields: [
      { key: 'days', label: 'Aantal dagen', type: 'number', required: true },
    ],
  },
  logic_wait_until_or: {
    category: 'WAIT',
    icon: '⏳',
    label: 'Wait-until / -or',
    description: 'Max N dagen of tot event',
    maxOutgoing: 2,
    maxIncoming: 1,
    fields: [
      { key: 'max_days', label: 'Max dagen', type: 'number', required: true },
      { key: 'event_type', label: 'Event-type', type: 'select', required: true,
        options: ['reply_received','email_opened','linkedin_reply','any_inbound'] },
    ],
  },
  logic_branch: {
    category: 'LOGIC',
    icon: '◆',
    label: 'Branch (if/else)',
    description: 'Splits paden op basis van conditie',
    maxOutgoing: null,
    maxIncoming: 1,
    fields: [
      { key: 'condition_type', label: 'Conditie-type', type: 'select', required: true,
        options: ['field_compare','event_check','time_check'] },
      { key: 'condition_field', label: 'Veld (bv. deal.value)', type: 'text', required: false },
      { key: 'condition_operator', label: 'Operator', type: 'select', required: false,
        options: ['eq','neq','gt','lt','gte','lte','contains'] },
      { key: 'condition_value', label: 'Waarde', type: 'text', required: false },
    ],
  },
  logic_end: {
    category: 'LOGIC',
    icon: '⊗',
    label: 'End',
    description: 'Eindigt huidig pad',
    maxOutgoing: 0,
    maxIncoming: null,
    fields: [],
  },
};

// Hulper voor palette: gegroepeerd per categorie
export function getNodesByCategory() {
  const grouped = {};
  for (const [type, def] of Object.entries(NODE_TYPES)) {
    const cat = def.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ type, ...def });
  }
  return grouped;
}
