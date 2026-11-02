// De bevestigingsmails per event. Platte tekst, want Olivier stuurt ze vanaf
// zijn eigen adres en ze moeten lezen als een mail van een mens.
//
// WAAROM PER EVENT EN NIET EEN SJABLOON MET VARIABELEN
//   De twee mails verschillen in meer dan datum en plaats: de ene noemt een
//   parkeergarage en een receptie, de andere twee zaalnamen, een link naar de
//   programmapagina en een apéro. Een sjabloon met tien variabelen zou die
//   verschillen moeten platslaan, en dan wordt elke mail de slechtste versie
//   van allebei.
//
// DE ONDERTEKENING STAAT IN DE TEKST
//   Geen merkhandtekening eronder: de tekst eindigt al met Olivier Arnolds en
//   Eclectik. Het navy blok eronder zou dat herhalen en van een persoonlijke
//   mail een mailing maken.

export const EVENT_MAILS = {
  'amsterdam-2026': {
    subject: 'Your seat is confirmed, 17 November in Amsterdam',
    body: `Hi {{first_name}},

Your seat is confirmed. Good to have you with us on 17 November.

Event: AI Transformation: Measure It. Steer It. Prove It.
Date: Tuesday 17 November 2026
Time: 12:15 to 16:30 CET, walk-in and lunch from 12:15
Location: Zoom office, Parnassus Tower, Locatellikade 1, 1076 AZ Amsterdam

The building has a parking garage on two levels and a coffee bar on the ground floor. Check in at the reception when you arrive.

We will send the final programme a week before the event. If something changes on your side, let us know, so we can offer the seat to someone else.

See you in Amsterdam,

Olivier Arnolds
Eclectik`,
  },
  'zurich-2026': {
    subject: 'Your seat is confirmed, 1 December in Zurich',
    body: `Hi {{first_name}},

Your seat is confirmed. Good to have you with us on 1 December.

Event: Roundtable: AI and agents reshaping the workplace
Date: Tuesday 1 December 2026
Time: 14:30 to 17:00 CET, arrival and networking from 14:00, apéro afterwards
Location: Microsoft office, The Circle 02, 8058 Zürich
Rooms: Eiger and Dufourspitze

The full programme and the speakers are on the event page:
https://www.eclectik.co/events/zurich-2026

We keep the group small, so if something changes on your side, let us know
and we can offer the seat to someone else.

See you in Zürich,

Olivier Arnolds
Eclectik`,
  },
};

/**
 * De bevestigingsmail voor een event, met de voornaam ingevuld.
 *
 * Een onbekend event geeft null en GEEN standaardtekst. Een verkeerde
 * bevestiging is erger dan geen: dan stuurt iemand een gast naar de verkeerde
 * stad. De aanroeper hoort hier een fout van te maken.
 *
 * @param {string} slug      event_slug, bv. 'amsterdam-2026'
 * @param {string} voornaam  leeg is toegestaan: dan valt de aanhef terug op
 *                           'Hi there', want 'Hi ,' verraadt een sjabloon.
 */
export function confirmationMail(slug, voornaam) {
  const mail = EVENT_MAILS[String(slug || '').trim()];
  if (!mail) return null;
  const naam = String(voornaam || '').trim();
  return {
    subject: mail.subject,
    body: mail.body.replace('{{first_name}}', naam || 'there'),
  };
}

/** De events waarvoor een bevestigingsmail bestaat. */
export function eventsMetMail() {
  return Object.keys(EVENT_MAILS);
}
