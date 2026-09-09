// Pure beslislogica voor Resend-webhook-events op outreach-mails.
// Apart bestand zodat vitest het zonder Supabase kan testen.
//
// Waarom dit bestaat: Resend handelt een bounce zelf af, dus er komt geen
// foutmelding in Marco's inbox die de scan kan oppikken. Zonder deze koppeling
// weet de app niet dat een adres onbereikbaar is en blijft er een opvolgmail
// gepland staan naar een adres dat niet bestaat. Dat is exact wat er op 9 sept
// gebeurde: 5 harde bounces die de app niet zag.

// Resend geeft bij een bounce een type mee (permanent of transient). Bij twijfel
// behandelen we het als permanent. Fout de andere kant op is erger: doorgaan met
// mailen naar een dood adres beschadigt de reputatie van het verzenddomein,
// terwijl een onterecht gestopte prospect zichtbaar op 'bounced' staat en met de
// hand terug te zetten is.
export function isPermanentBounce(event) {
  const t = String(event?.data?.bounce?.type || event?.data?.bounce_type || '').toLowerCase();
  if (!t) return true;                       // onbekend: veilige kant
  if (/transient|soft|deferred|temporary/.test(t)) return false;
  return true;
}

export function bounceReason(event) {
  return String(
    event?.data?.bounce?.message || event?.data?.reason || event?.data?.bounce?.subType || ''
  ).slice(0, 400);
}

/**
 * Bepaalt wat een event betekent voor de outreach-tabellen.
 *
 * @param {string} type  Resend-event ('email.bounced', ...)
 * @param {object} event volledige webhook-payload
 * @param {object} msg   de bestaande outreach_message-rij (voor de tellers)
 * @returns {{ handled: boolean, message: object, contact: object, stopFollowup: boolean }}
 *          message/contact zijn de velden om bij te werken; leeg object = niets.
 */
export function outreachUpdatesForEvent(type, event, msg, nowIso) {
  const now = nowIso || new Date().toISOString();
  const message = {};
  const contact = {};
  let stopFollowup = false;

  switch (type) {
    case 'email.sent':
      // Al vastgelegd op het moment van versturen; niets toe te voegen.
      return { handled: true, message, contact, stopFollowup };

    case 'email.delivered':
      message.delivered_at = now;
      break;

    case 'email.opened':
      message.open_count = (msg?.open_count || 0) + 1;
      if (!msg?.first_opened_at) message.first_opened_at = now;
      break;

    case 'email.clicked':
      message.click_count = (msg?.click_count || 0) + 1;
      if (!msg?.first_clicked_at) message.first_clicked_at = now;
      break;

    case 'email.bounced': {
      const reason = bounceReason(event);
      message.bounced_at = now;
      message.bounce_reason = reason || null;
      if (isPermanentBounce(event)) {
        // De kern: geen opvolgmail meer naar een adres dat niet bestaat.
        contact.status = 'bounced';
        contact.next_action_at = null;
        contact.paused_reason = `hard bounce: ${reason || 'adres onbereikbaar'}`.slice(0, 300);
        stopFollowup = true;
      }
      // Bij een transient bounce alleen vastleggen: het adres kan morgen werken.
      break;
    }

    case 'email.complained': {
      message.complained_at = now;
      // Een spamklacht is definitiever dan een afmelding: hier nooit meer heen.
      contact.status = 'opted_out';
      contact.opted_out_at = now;
      contact.next_action_at = null;
      contact.paused_reason = 'spamklacht via Resend';
      stopFollowup = true;
      break;
    }

    default:
      return { handled: false, message, contact, stopFollowup };
  }

  return { handled: true, message, contact, stopFollowup };
}
