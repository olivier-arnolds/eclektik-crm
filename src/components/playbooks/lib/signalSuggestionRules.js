// Rules-engine: gegeven een gescoorde signal, beslis of er een suggestion gemaakt moet worden.
// Geen DB-access — pure functies. DB-write gebeurt in api/signals-poll.js.

export const RELEVANCE_THRESHOLD = 0.6;

// Bepaal of dit signal een suggestion moet worden.
export function shouldCreateSuggestion(signal) {
  if (!signal.relevance_score) return false;
  return signal.relevance_score >= RELEVANCE_THRESHOLD;
}

// Bepaal welke playbook getriggerd moet worden door dit signal.
// Convention:
//   - playbooks.trigger_type = unprefixed ('linkedin_user_post', 'stage_change', 'manual')
//   - playbook_nodes.node_type = prefixed ('trigger_linkedin_user_post', 'logic_wait')
// Match direct op signal.source -> playbook.trigger_type.
export function findPlaybookForSignal(signal, activePlaybooks) {
  if (!signal.source) return null;
  return activePlaybooks.find(pb => pb.trigger_type === signal.source) || null;
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
