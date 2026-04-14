import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const UNIPILE_DSN = process.env.UNIPILE_BASE_URL || process.env.UNIPILE_DSN;
const UNIPILE_TOKEN = process.env.UNIPILE_API_KEY || process.env.UNIPILE_TOKEN;

// Replace template variables in text
function replaceVariables(text, contact) {
  if (!text) return text;
  return text
    .replace(/\{\{FirstName\}\}/g, contact.first_name || '')
    .replace(/\{\{LastName\}\}/g, contact.last_name || '')
    .replace(/\{\{FullName\}\}/g, contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim())
    .replace(/\{\{CompanyName\}\}/g, contact.company_name || '')
    .replace(/\{\{Title\}\}/g, contact.title || '');
}

// Make a Unipile API request
async function unipileRequest(method, path, body) {
  if (!UNIPILE_DSN || !UNIPILE_TOKEN) {
    return { error: 'Unipile not configured' };
  }
  const url = `https://${UNIPILE_DSN}/api/v1${path}`;
  const headers = {
    'X-API-KEY': UNIPILE_TOKEN,
    'accept': 'application/json',
  };
  const options = { method, headers };
  if (body) {
    headers['content-type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  try {
    const resp = await fetch(url, options);
    const data = await resp.json();
    if (!resp.ok) return { error: data?.message || `Unipile error ${resp.status}` };
    return { success: true, data };
  } catch (err) {
    return { error: err.message };
  }
}

// Get the Unipile account ID (first LinkedIn account)
async function getUnipileAccountId() {
  const result = await unipileRequest('GET', '/accounts');
  if (result.success && result.data?.items?.length > 0) {
    const linkedinAccount = result.data.items.find(a => a.type === 'LINKEDIN') || result.data.items[0];
    return linkedinAccount.id;
  }
  return null;
}

// Resolve a LinkedIn URL to a provider ID
async function resolveLinkedInUser(linkedinUrl, accountId) {
  if (!linkedinUrl) return null;
  const match = linkedinUrl.match(/linkedin\.com\/in\/([^\/\?]+)/);
  const identifier = match ? match[1] : linkedinUrl;
  const result = await unipileRequest('GET', `/users/${encodeURIComponent(identifier)}?account_id=${accountId}`);
  if (result.success && result.data) {
    return result.data.provider_id || result.data.id;
  }
  return null;
}

export default async function handler(req, res) {
  console.log('[playbook-execute] Starting execution run...');
  const results = { processed: 0, executed: 0, errors: [], skipped: 0 };

  try {
    // Get all active enrollments due for next step
    const now = new Date().toISOString();
    const { data: enrollments, error: enrollError } = await supabase
      .from('playbook_enrollments')
      .select(`
        *,
        playbooks!inner(id, name, status, settings),
        contacts(*)
      `)
      .eq('status', 'active')
      .lte('next_step_at', now);

    if (enrollError) {
      console.error('[playbook-execute] Error fetching enrollments:', enrollError);
      return res.status(500).json({ error: enrollError.message });
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('[playbook-execute] No enrollments due for execution.');
      return res.status(200).json({ message: 'No enrollments due', ...results });
    }

    console.log(`[playbook-execute] Found ${enrollments.length} enrollment(s) to process.`);

    // Get Unipile account ID for LinkedIn steps
    let unipileAccountId = null;

    for (const enrollment of enrollments) {
      results.processed++;

      // Skip if playbook is not active
      if (enrollment.playbooks.status !== 'active') {
        results.skipped++;
        continue;
      }

      // Check weekdays-only setting
      const settings = enrollment.playbooks.settings || {};
      if (settings.weekdays_only !== false) {
        const day = new Date().getDay();
        if (day === 0 || day === 6) {
          results.skipped++;
          continue;
        }
      }

      const contact = enrollment.contacts;
      if (!contact) {
        results.errors.push({ enrollment_id: enrollment.id, error: 'Contact not found' });
        continue;
      }

      // Get the current step
      const { data: step, error: stepError } = await supabase
        .from('playbook_steps')
        .select('*')
        .eq('playbook_id', enrollment.playbook_id)
        .eq('step_number', enrollment.current_step)
        .single();

      if (stepError || !step) {
        // No more steps - mark as completed
        await supabase.from('playbook_enrollments')
          .update({ status: 'completed', completed_at: now })
          .eq('id', enrollment.id);
        continue;
      }

      let execStatus = 'sent';
      let execResult = {};

      try {
        switch (step.step_type) {
          case 'linkedin_connect': {
            // Send LinkedIn connection invite via Unipile
            if (!unipileAccountId) unipileAccountId = await getUnipileAccountId();
            if (!unipileAccountId) {
              execStatus = 'failed';
              execResult = { error: 'No Unipile account available' };
              break;
            }
            const providerId = await resolveLinkedInUser(contact.linkedin, unipileAccountId);
            if (!providerId) {
              execStatus = 'failed';
              execResult = { error: 'Could not resolve LinkedIn user' };
              break;
            }
            const message = replaceVariables(step.body, contact);
            const inviteResult = await unipileRequest('POST', '/users/invite', {
              provider_id: providerId,
              account_id: unipileAccountId,
              message: message || '',
            });
            if (inviteResult.error) {
              execStatus = 'failed';
              execResult = { error: inviteResult.error };
            } else {
              execResult = { unipile: inviteResult.data };
            }
            break;
          }

          case 'linkedin_message': {
            // Send LinkedIn message via Unipile (start chat)
            if (!unipileAccountId) unipileAccountId = await getUnipileAccountId();
            if (!unipileAccountId) {
              execStatus = 'failed';
              execResult = { error: 'No Unipile account available' };
              break;
            }
            const providerId = await resolveLinkedInUser(contact.linkedin, unipileAccountId);
            if (!providerId) {
              execStatus = 'failed';
              execResult = { error: 'Could not resolve LinkedIn user' };
              break;
            }
            const text = replaceVariables(step.body, contact);
            const chatResult = await unipileRequest('POST', '/chats', {
              account_id: unipileAccountId,
              attendees_ids: providerId,
              text,
            });
            if (chatResult.error) {
              execStatus = 'failed';
              execResult = { error: chatResult.error };
            } else {
              execResult = { unipile: chatResult.data };
            }
            break;
          }

          case 'email': {
            // Email: create a pending task for manual sending
            const subject = replaceVariables(step.subject, contact);
            const body = replaceVariables(step.body, contact);
            await supabase.from('tasks').insert({
              title: `Send email: ${subject}`,
              description: `To: ${contact.full_name || contact.first_name} (${contact.email || 'no email'})\n\nSubject: ${subject}\n\n${body}`,
              status: 'pending',
              type: 'playbook_email',
              contact_id: contact.id,
              created_at: now,
            });
            execStatus = 'pending';
            execResult = { task: 'Email task created for manual sending' };
            break;
          }

          case 'call':
          case 'task': {
            // Create a task
            const description = replaceVariables(step.body, contact);
            await supabase.from('tasks').insert({
              title: step.step_type === 'call'
                ? `Call ${contact.full_name || contact.first_name}`
                : replaceVariables(step.subject || step.body || 'Playbook task', contact),
              description: description || '',
              status: 'pending',
              type: step.step_type === 'call' ? 'playbook_call' : 'playbook_task',
              contact_id: contact.id,
              created_at: now,
            });
            execStatus = 'sent';
            execResult = { task: `${step.step_type} task created` };
            break;
          }

          case 'wait': {
            // Wait step: just advance the next_step_at
            execStatus = 'sent';
            execResult = { wait: `${step.delay_days} days` };
            break;
          }

          default:
            execStatus = 'skipped';
            execResult = { error: `Unknown step type: ${step.step_type}` };
        }
      } catch (execError) {
        execStatus = 'failed';
        execResult = { error: execError.message };
      }

      // Log the execution
      await supabase.from('playbook_executions').insert({
        enrollment_id: enrollment.id,
        step_id: step.id,
        step_number: step.step_number,
        status: execStatus,
        executed_at: now,
        result: execResult,
      });

      // Get the next step to determine delay
      const { data: nextStep } = await supabase
        .from('playbook_steps')
        .select('*')
        .eq('playbook_id', enrollment.playbook_id)
        .eq('step_number', enrollment.current_step + 1)
        .single();

      if (nextStep) {
        // Advance to next step
        const nextAt = new Date();
        nextAt.setDate(nextAt.getDate() + (nextStep.delay_days || 0));
        await supabase.from('playbook_enrollments')
          .update({ current_step: enrollment.current_step + 1, next_step_at: nextAt.toISOString() })
          .eq('id', enrollment.id);
      } else {
        // Last step completed
        await supabase.from('playbook_enrollments')
          .update({ status: 'completed', completed_at: now })
          .eq('id', enrollment.id);
      }

      if (execStatus !== 'failed' && execStatus !== 'skipped') {
        results.executed++;
      } else if (execStatus === 'failed') {
        results.errors.push({ enrollment_id: enrollment.id, step: step.step_number, error: execResult.error });
      }
    }

    console.log(`[playbook-execute] Done. Processed: ${results.processed}, Executed: ${results.executed}, Errors: ${results.errors.length}`);
    return res.status(200).json({ message: 'Execution complete', ...results });

  } catch (error) {
    console.error('[playbook-execute] Fatal error:', error);
    return res.status(500).json({ error: error.message });
  }
}
