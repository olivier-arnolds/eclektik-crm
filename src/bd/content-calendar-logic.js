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
