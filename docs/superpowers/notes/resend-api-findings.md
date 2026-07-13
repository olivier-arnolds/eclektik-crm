# Resend API-bevindingen (Fase 0 — 2026-07-13)

Getest tegen het echte Resend-account (full-access key). Belangrijkste conclusie:
**dit account gebruikt audience-gebaseerde broadcasts (`audience_id`), geen segments.**
Dat vereenvoudigt het ontwerp: we hebben geen segments nodig.

## Bevestigde endpoints

- **Audience aanmaken:** `POST /audiences` body `{"name": "..."}` → `{ object, id, name }`.
- **Audiences lijst:** `GET /audiences` → `data[]` met `{ id, name, created_at }`.
- **Contact toevoegen:** `POST /audiences/{audience_id}/contacts`
  body `{"email","first_name","last_name","unsubscribed"}` → `{ object:"contact", id }`.
  (Contacten zijn audience-scoped; contact-id is per audience.)
- **Contacten lijst:** `GET /audiences/{audience_id}/contacts` → `data[]` met
  `{ id, email, first_name, last_name, created_at, unsubscribed }`.
- **Broadcast aanmaken:** `POST /broadcasts`
  body `{"audience_id","from","subject","name","html"}` → `{ object:"broadcast", id }`
  (zonder `send` = draft). **Target-veld = `audience_id`** (niet `segment_id`).
- **Broadcast versturen:** `POST /broadcasts/{id}/send` body `{}` → verstuurt naar de
  hele audience. (Waarschijnlijk werkt ook `send:true` bij create.)

## Bestaande audiences in het account

- `Eclectik Newsletter` — id `18c77bad-54e6-4187-9eb1-a5766b492a91` (5 mei 2026).
- `General` — id `4966eca7-d915-4a7d-978b-7893c5258ae4`.
- `Eclektik CRM (test fase0)` — id `988fbc85-f6a4-44c7-a22a-4f5fdaf4e3f7` (testrommel, mag weg).

## Merge-tag (personalisatie voornaam)

Getest met `{{{FIRST_NAME}}}` in de HTML van een verstuurde test-broadcast.
**PENDING:** visuele bevestiging in Olivier's inbox of dit "Hoi Olivier" rendert.

## Webhook (afmelden)

Geen apart unsubscribe-event; afmelden komt als `contact.updated` met
`unsubscribed=true`. Het contact-object bevat `email` + `unsubscribed`.
Hergebruik de bestaande `api/marketing-webhook.js` + `RESEND_WEBHOOK_SECRET`
(Svix), en voeg `contact.updated` toe. Exact event-payload bevestigen bij het
wiren van de webhook.

## Gevolg voor spec/plan

- **Segments vervallen.** Verzendmodel: per campagne een audience vullen met exact
  de CRM-selectie en broadcasten naar `audience_id`.
- Optie: per campagne een nieuwe audience (genoemd naar de campagne), of één
  herbruikbare audience die we per verzending legen en opnieuw vullen. Voorkeur:
  per-campagne audience (eenvoudig, traceerbaar, geen delete-logica).
- Taak 4 (webhook): uitbreiden van `marketing-webhook.js` i.p.v. nieuw endpoint;
  geen nieuwe secret nodig.
