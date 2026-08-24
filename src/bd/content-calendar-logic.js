// Pure statuslogica voor de Content Calendar — apart van de UI zodat het toetsbaar
// is (content-calendar-logic.test.js). Status is een afgeleide van twee feiten:
// goedgekeurd? × heeft datum?
//   niet goedgekeurd        -> 'draft'
//   goedgekeurd, geen datum -> 'approved'
//   goedgekeurd, wel datum  -> 'scheduled'   (cron-doelwit)
//   verstuurd               -> 'published'   (read-only, buiten deze functies)
// Slepen verandert alleen de datum; goedkeuring (approved-vlag) blijft gelijk.

export const isApproved = (status) =>
  status === 'approved' || status === 'scheduled' || status === 'published';

export const deriveStatus = (approved, hasDate) =>
  (!approved ? 'draft' : (hasDate ? 'scheduled' : 'approved'));

// Nieuwe status na een sleep-actie (datum zetten of wissen), goedkeuring behouden.
// published blijft published (mag niet gesleept worden, maar defensief afgevangen).
export const statusAfterMove = (currentStatus, hasDate) =>
  (currentStatus === 'published' ? 'published' : deriveStatus(isApproved(currentStatus), hasDate));

// Dubbel-beveiliging: sluit contacten uit die deze uiting al ontvingen. Pure
// functie zodat ze los te testen is; de DB-kant (welke contacten al bereikt zijn)
// komt via de RPC content_family_reached en wordt hier als `reached` doorgegeven.
//   recipients : [{ id, email, ... }]
//   reached    : [{ contact_id, email }]  (uit content_family_reached)
// Matcht op contact_id EN op genormaliseerde e-mail (liever te veel uitsluiten
// dan dezelfde uiting 2x sturen). Geeft { kept, skipped } terug.
export function excludeAlreadyReached(recipients, reached) {
  const list = Array.isArray(recipients) ? recipients : [];
  const emailSet = new Set(
    (reached || []).map(r => String(r?.email || '').trim().toLowerCase()).filter(Boolean)
  );
  const idSet = new Set(
    (reached || []).map(r => r?.contact_id).filter(Boolean)
  );
  const kept = list.filter(r =>
    !idSet.has(r?.id) && !emailSet.has(String(r?.email || '').trim().toLowerCase())
  );
  return { kept, skipped: list.length - kept.length };
}

// Afgeleide rapportage voor één contentstuk. Pure functie: `now` komt binnen als
// parameter zodat de "verstreken tijd"-waarschuwing deterministisch testbaar is.
// Bevat bewust GEEN afzender-string (die vergt UI-account-mapping) — de modal
// bouwt de afzenderregel zelf.
export function itemReport(item, { now = new Date() } = {}) {
  const STAGES = ['draft', 'approved', 'scheduled', 'published'];
  const stage = STAGES.includes(item.status) ? item.status : 'draft';
  const stageIndex = STAGES.indexOf(stage);

  const hasDate = !!item.scheduled_at;
  const hasEmailAudience =
    !!item.target_tag ||
    (Array.isArray(item.target_contact_ids) && item.target_contact_ids.length > 0);

  const warnings = [];
  if (stage === 'approved' && !hasDate) {
    warnings.push({ level: 'warn', message: 'Goedgekeurd maar geen datum; de cron plant dit nog niet in.' });
  }
  if (stage === 'scheduled' && hasDate && new Date(item.scheduled_at).getTime() < now.getTime()) {
    warnings.push({ level: 'warn', message: 'Geplande tijd is verstreken maar nog niet gepubliceerd; check de Vercel-logs.' });
  }
  if (item.type === 'email' && (stage === 'approved' || stage === 'scheduled') && !hasEmailAudience) {
    warnings.push({ level: 'block', message: 'Geen doelgroep; de cron kan niet versturen.' });
  }
  if (item.type === 'linkedin_dm' && (stage === 'approved' || stage === 'scheduled') && !item.recipient_contact_id) {
    warnings.push({ level: 'block', message: 'Geen ontvanger gekozen.' });
  }

  const dripSent = Array.isArray(item.sent_emails) ? item.sent_emails.length : 0;
  const showSend = stage === 'scheduled' || stage === 'published' || dripSent > 0;
  const send = showSend
    ? {
        channel: item.channel,
        type: item.type,
        recipientCount: item.published_recipient_count ?? null,
        dripSent,
        externalId: item.external_message_id || null,
      }
    : null;

  return {
    stage,
    stageIndex,
    timeline: {
      created_at: item.created_at || null,
      scheduled_at: item.scheduled_at || null,
      published_at: item.published_at || null,
    },
    warnings,
    send,
  };
}
