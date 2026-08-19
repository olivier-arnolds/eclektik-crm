# Content Calendar — e-mail engagement (opens/kliks) — fase 2a

**Datum:** 2026-08-19
**Status:** ontwerp, ter review
**Scope:** fase 2a. Alleen e-mail opens/kliks. LinkedIn-engagement (reacties/comments/impressies) valt buiten deze spec (mogelijke latere fase 2b).

## Doel

De rapportage-popup uit fase 1 uitbreiden met e-mail-engagement per contentstuk:
hoeveel ontvangers de mail hebben geopend en erop geklikt. Maximaal hergebruik
van de bestaande marketing-engagement-infrastructuur (Resend-webhook +
`campaign_sends` + open/klik-tellers).

## Bestaande situatie (geverifieerd)

- Content-mails gaan via `sendBroadcast()` (`api/_lib/send-broadcast.js`), aangeroepen
  vanuit `api/content-calendar-execute.js` (drip-pad regel 103, normaal pad regel 120).
- `sendBroadcast` logt per verzending een `campaigns`-rij met
  `resend_broadcast_id = <broadcast-id>` (regel 188-194) en per ontvanger een
  `campaign_sends`-rij (regel 197-210) — **zonder** `resend_message_id`.
- De Resend-webhook (`api/marketing-webhook.js`) verwerkt al
  `opened/clicked/bounced/complained`, maar matcht **uitsluitend** op
  `campaign_sends.resend_message_id` (regel 81-86). Broadcast-sends hebben dat veld
  niet → hun opens/kliks worden nu genegeerd (`unknown message id`).
- Bevestigd via Resend-docs: `email.opened`/`email.clicked`-payloads bevatten
  `data.broadcast_id`, `data.email_id` en `data.to` (ontvanger-e-mail).
- De koppeling content-item ↔ campagne is nu zwak (string-match
  `content_calendar_items.external_message_id = campaigns.resend_broadcast_id`) en
  breekt bij drip (elke batch = eigen broadcast-id; het item bewaart alleen de laatste).

## Ontwerp

### 1. Harde koppeling: `campaigns.content_item_id`

Nieuwe nullable kolom `campaigns.content_item_id uuid` (FK → `content_calendar_items(id)`,
`on delete set null`) + index. `sendBroadcast` stempelt elke verzending met het
content-item waar hij bij hoort. Zo zijn álle campagnes van een item (ook alle
drip-batches) correct te aggregeren, zonder fragiele string-match.

### 2. Verzendkant stempelt de koppeling

- `sendBroadcast(...)` krijgt een extra parameter `contentItemId = null` en schrijft
  `content_item_id: contentItemId || null` in de `campaigns`-insert.
- `content-calendar-execute.js` geeft `contentItemId: item.id` mee in beide
  `sendBroadcast`-aanroepen (drip-pad + normaal pad). De marketing-composer roept
  `sendBroadcast` zonder deze param aan → blijft `null` (ongewijzigd gedrag).

### 3. Webhook: broadcast-fallback

`api/marketing-webhook.js` uitbreiden. Huidige logica: match `campaign_sends` op
`resend_message_id`. Nieuw: als die match niets oplevert én `event.data.broadcast_id`
+ ontvanger-e-mail aanwezig zijn:

1. Zoek de campagne: `campaigns` waar `resend_broadcast_id = data.broadcast_id`.
2. Zoek de send-rij: `campaign_sends` waar `campaign_id = <camp.id>` én
   `recipient_email = <data.to[0]>`.
3. Pas dezelfde open/klik/bounce-updates toe als nu.
4. Stempel meteen `resend_message_id = data.email_id` op die rij, zodat vervolg-
   events voor dezelfde mail via het snelle directe pad matchen.

Bijvangst (gewenst): hiermee gaan broadcast-opens/kliks überhaupt voor het eerst
geteld worden — óók voor de marketing-broadcasts, niet enkel content-mails.

Ontvanger bepalen: `const recipientEmail = Array.isArray(data.to) ? data.to[0] : data.to;`

### 4. Lezen: RPC `content_item_engagement(p_item_id)`

Postgres-functie die over alle gekoppelde campagnes aggregeert:

```sql
create or replace function content_item_engagement(p_item_id uuid)
returns table(recipients int, opened int, clicked int)
language sql stable as $$
  select
    count(*)::int,
    count(*) filter (where cs.open_count > 0)::int,
    count(*) filter (where cs.click_count > 0)::int
  from campaigns c
  join campaign_sends cs on cs.campaign_id = c.id
  where c.content_item_id = p_item_id;
$$;
```

`opened`/`clicked` = unieke ontvangers met minstens één open/klik. `recipients` =
aantal send-rijen over alle gekoppelde campagnes.

### 5. Weergave in de rapportage-popup

In `ContentReportModal` een nieuw blok **"Engagement"**, alleen voor `type === 'email'`
en alleen als de mail verstuurd is (`rep.send` aanwezig). Op openen van de popup
roept de modal `supabase.rpc('content_item_engagement', { p_item_id: item.id })` aan.
Toon bijvoorbeeld:

- "Geopend: 18/42 (43%)"
- "Geklikt: 5/42 (12%)"

Laadstatus terwijl de RPC loopt; nette fallback als er (nog) geen data is
("Nog geen opens/kliks geregistreerd."). Geen AI, geen extra endpoint.

### 6. Backfill (eenmalig)

Bestaande content-items koppelen aan hun campagne via het opgeslagen broadcast-id:

```sql
create table _dq_backup_campaigns_<YYYYMMDD> as select * from campaigns; -- protocol
update campaigns c
set content_item_id = ci.id
from content_calendar_items ci
where ci.type = 'email'
  and ci.external_message_id is not null
  and c.resend_broadcast_id = ci.external_message_id
  and c.content_item_id is null;
```

Werkt voor het normale broadcast-pad; drip-items krijgen alleen hun laatste batch
gekoppeld (het item bewaart maar één broadcast-id). Dat is een geaccepteerde
beperking van de backfill; nieuwe verzendingen zijn wél volledig gekoppeld via §2.

## DB-protocol (CLAUDE.md §2)

- Kolom + index + RPC zijn additief/non-destructief.
- De backfill-UPDATE volgt het protocol: eerst `_dq_backup_campaigns_<datum>`,
  counts verifiëren voor/na, SQL bewaren in `sql/`.
- Alle DDL/SQL wordt bewaard in `sql/` en toegepast via de Supabase MCP
  (`apply_migration` / `execute_sql`) of door de gebruiker in de SQL Editor.

## Bestanden die geraakt worden

- `sql/schema_campaigns_content_item_<datum>.sql` — kolom + index + RPC (nieuw).
- `sql/data_backfill_campaigns_content_item_<datum>.sql` — backup + backfill (nieuw).
- `api/_lib/send-broadcast.js` — `contentItemId`-param + insert-veld.
- `api/content-calendar-execute.js` — `contentItemId: item.id` in beide aanroepen.
- `api/marketing-webhook.js` — broadcast-fallback in de event-matching.
- `src/bd/content-calendar-view.jsx` — Engagement-blok in `ContentReportModal` + RPC-call.
- Versie-discipline: `VERSION`, `package.json`, `src/bd/changelog.js`.

## Wat expliciet NIET in fase 2a zit

- Geen LinkedIn-engagement (reacties/comments/impressies), geen poll-cron.
- Geen per-open/klik-tijdlijn in de content-popup (alleen aggregaat opened/clicked);
  de per-ontvanger-details bestaan al aan de marketing-kant.
- Geen wijziging aan de verzendweg zelf (broadcast blijft broadcast).

## Testen & verificatie

- Pure/DB-logica: de RPC is met een paar rijen handmatig te verifiëren (SQL).
- Unit-tests: de webhook-fallback is lastig te unit-testen zonder harnas; wél een
  kleine pure helper voor "bepaal recipientEmail + of dit een broadcast-fallback is"
  kan getest worden indien zinvol. Anders handmatig via een Resend-testevent.
- Build-check via de wegwerp-outDir.
- Handmatig na deploy: stuur/gebruik een verstuurd content-e-mailitem, open de mail,
  en controleer dat de rapportage-popup na een open/klik de cijfers toont. Controleer
  ook dat de marketing-composer (zonder contentItemId) ongewijzigd blijft werken.
