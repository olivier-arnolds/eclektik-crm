# Marketing leads pipeline — design spec

**Datum:** 2026-07-08
**Status:** Goedgekeurd door Olivier (richting afgestemd; Marco checkt de
funnel-scheiding)
**Scope:** eclektik-crm — nieuwe intake vanaf de H2 2026 website

## Probleem

De nieuwe website (H2 2026 redesign, project `eclectik-website-h2`) stuurt bij
elke waitlist-aanmelding een webhook naar
`POST {CRM_BASE_URL}/api/website-signal` met header `x-webhook-secret` en
payload:

```json
{
  "source": "website",
  "event": "waitlist_joined",
  "email": "...", "name": "...", "company": "...",
  "role": "...", "sector": "...", "src": "li-test-1"
}
```

Dat endpoint bestaat nog niet. Besluit van Olivier: website-aanmeldingen mogen
**niet** in de sales-funnel (`leads`) belanden. Ze leven in een eigen,
losstaande marketing-leads-administratie totdat iemand ze bewust promoveert
tot sales lead. Toekomstige events (scorecard proof-of-value /
proof-of-change, extra intake-vragen) moeten zonder schemawijziging mee kunnen.

## Ontwerp

### 1. Twee nieuwe tabellen (losstaand — geen FK's naar bestaande tabellen)

**`marketing_leads`** — één rij per persoon:

```sql
create table public.marketing_leads (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  full_name          text,
  company            text,
  role               text,
  sector             text,
  first_src          text,            -- eerste campagnebron (bv. li-test-1)
  status             text not null default 'active'
                     check (status in ('active','converted','archived')),
  converted_lead_id  uuid,            -- soft reference naar leads.id, GEEN FK:
                                      -- tabel blijft bewust losgekoppeld
  consent_at         timestamptz,     -- moment van consent (AVG)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  last_activity_at   timestamptz
);
```

**`marketing_lead_activity`** — één rij per interactie:

```sql
create table public.marketing_lead_activity (
  id                 uuid primary key default gen_random_uuid(),
  marketing_lead_id  uuid not null references public.marketing_leads(id)
                     on delete cascade,
  event              text not null,   -- 'waitlist_joined', straks
                                      -- 'scorecard_pov_completed', enz.
  payload            jsonb,           -- antwoorden/extra vragen, vrij formaat
  src                text,            -- campagnebron van déze interactie
  occurred_at        timestamptz not null default now()
);
create index idx_mla_lead on public.marketing_lead_activity(marketing_lead_id);
```

RLS volgens huis-stijl: uniforme policy "auth users full access on <table>"
op beide tabellen. Migration via Supabase MCP (`apply_migration`), SQL ook
opgeslagen in `sql/`.

Waarom een aparte activity-tabel: de extra vragen verschillen per formulier
(waitlist-vragen ≠ scorecard-antwoorden) en komen op verschillende momenten
binnen. JSONB-payload per event betekent: nieuwe formulieren op de website
vereisen nul databasewijzigingen, en per persoon is de hele historie zichtbaar.

### 2. Intake-endpoint `api/website-signal.js`

- Alleen POST; andere methodes → 405.
- Auth: `x-webhook-secret` header, timing-safe vergeleken met env
  `WEBSITE_WEBHOOK_SECRET`. Mismatch/afwezig → 401. Env niet gezet → 500 + log.
- Validatie (handmatig, zoals de andere endpoints; geen zod in dit repo):
  `email` verplicht + geldig formaat; `event` verplicht; overige velden
  optioneel; onbekende extra velden gaan mee in `payload`.
- Logica:
  1. Zoek `marketing_leads` op e-mail (case-insensitief).
  2. Niet gevonden → insert met de meegegeven velden, `first_src` = `src`,
     `consent_at` = now().
  3. Wel gevonden → vul lege profielvelden aan (nooit bestaande waarden
     overschrijven), update `last_activity_at` en `updated_at`.
  4. Insert altijd een `marketing_lead_activity`-rij met event, payload
     (alle niet-identiteitsvelden), src.
  5. Antwoord `200 {ok:true}` — ook bij duplicaten. Alleen bij DB-fouten 500
     (de website logt dat maar laat de bezoeker nooit stranden).
- Geen koppeling met `contacts`/`leads` in dit endpoint; bewuste keuze.

### 3. UI: derde tab "Leads" in de Marketing-sectie

In `src/bd/marketing-view.jsx` naast Contacts en Campaigns een tab **Leads**
(nieuw component `src/bd/marketing-leads.jsx`):

- Lijst van `marketing_leads` (nieuwste eerst): naam, e-mail, bedrijf, rol,
  sector, bron, status, laatste activiteit.
- Rij uitklappen → activiteitenhistorie (event + datum + payload leesbaar).
- Filter op status (default: active).
- Knop **"Promoveer naar sales lead"** per rij:
  - insert in `leads`: full_name, email, company_name, title=role,
    source='Website — marketing lead', owner = ingelogde gebruiker,
    notes met sector/bron/historie-samenvatting;
  - update marketing lead: status='converted', converted_lead_id;
  - bevestigingsdialoog vooraf (consistent met huis-stijl).
- Knop/actie **archiveren** (status='archived') voor koude leads.

### 4. Configuratie & aansluiting website

1. Genereer secret: `openssl rand -hex 32`.
2. CRM Vercel-project: env `WEBSITE_WEBHOOK_SECRET` (production).
3. Website Vercel-project `eclectik-website-h2`
   (prj_COcKH5HzO7eSqyQl3oA7J9dCHQKg): env `CRM_BASE_URL` =
   `https://crm.eclectik-insights.co` en `CRM_WEBHOOK_SECRET` = zelfde secret;
   redeploy. Websitecode is al klaar — geen wijziging nodig.

### 5. Huisregels dit repo

- Versie bumpen (`VERSION` + `package.json`), changelog-entry in
  `src/bd/changelog.js`, commit taggen `v<versie>`.
- Elke stap apart committen; **niet pushen zonder akkoord**.
- Build-check via `npx vite build --outDir dist_check` (throwaway).
- E2E-verificatie na deploy: testaanmelding op de review-site →
  rij zichtbaar in Marketing → Leads.

## Buiten scope

- De 5 extra waitlist-vragen op de website (komt later; wachten op de
  landingspagina-test van 15 juli). Het datamodel kan ze al aan.
- Scorecard-events (website Spec 2, augustus). Endpoint accepteert ze al
  generiek zodra de website ze stuurt.
- Automatische playbook-koppeling of signals-integratie voor marketing leads.
- Nurture-mails naar marketing leads.

## Verificatie

- `curl` POST met geldig secret → 200, rij in beide tabellen.
- Zelfde e-mail nogmaals → geen duplicaat-lead, wél tweede activity-rij.
- Fout secret → 401; geen DB-schrijfactie.
- UI: lijst toont testlead; promoveren maakt `leads`-rij aan en zet
  status='converted'; archiveren werkt.
- E2E vanaf de review-site met `?src=li-test-e2e`.
