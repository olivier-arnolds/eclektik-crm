// Rules-engine: gegeven een gescoorde signal, beslis of er een suggestion gemaakt moet worden.
// Geen DB-access — pure functies. DB-write gebeurt in api/signals-poll.js.

export const RELEVANCE_THRESHOLD = 0.6;

// Bepaal of dit signal een suggestion moet worden.
export function shouldCreateSuggestion(signal) {
  if (!signal.relevance_score) return false;
  return signal.relevance_score >= RELEVANCE_THRESHOLD;
}

// Bepaal welke playbook getriggerd moet worden door dit signal.
// Voor V1: hard-coded mapping. Latere uitbreidingen: matching op trigger_config.
export function findPlaybookForSignal(signal, activePlaybooks) {
  const triggerType = signal.source === 'linkedin_user_post'
    ? 'trigger_linkedin_user_post'
    : signal.source === 'linkedin_company_post'
    ? 'trigger_linkedin_company_post'
    : null;
  if (!triggerType) return null;

  // Find first active playbook with this trigger_type
  return activePlaybooks.find(pb => pb.trigger_type === triggerType) || null;
}

// Build source_context payload voor suggestion (merge-field source).
export function buildSourceContext(signal) {
  return {
    signal_id: signal.id,
    signal_content: signal.content,
    signal_topics: signal.topics || signal.topic_tags || [],
    signal_score: signal.relevance_score,
    signal_reason: signal.scoring_reason,
    post_url: signal.post_url,
    posted_at: signal.posted_at,
  };
}
