# Eclectik doelgroep-analyse

_Gegenereerd: 2026-06-16 · Bron: CRM Supabase (`companies` + `contacts`), alleen actieve records (stage ≠ Inactive, geen former contacten)._

---

## TL;DR — de kern in 6 punten

1. **HR is de doelgroep.** Verreweg de grootste koperspersona is **HR / People / Talent / L&D** met 127 contacten aan de koperskant (Customers + Prospects). Dat is ~5× zoveel als de eerstvolgende categorie. Tel je CHRO/Chief People erbij, dan is ~70% van alle herkenbare koper-functies HR-gerelateerd.
2. **Geen vaste verticale — wel traction-pockets.** Eclectik verkoopt horizontaal (People Science werkt in elke sector). Bij prospects is **Financial Services & Insurance** de grootste vertical (~25 accounts), bij bestaande klanten zie je clusters in **Life Sciences/Healthcare**, **Manufacturing/Industrial** en **Consumer/Retail**.
3. **Markt = US + EMEA-kern.** De Verenigde Staten is het grootste enkele land (41 koper-accounts), gevolgd door Zwitserland (19), UK (15), Nederland (9) en Duitsland (6). Klanten (bewezen fit) zitten vooral in **US, UK en DACH**.
4. **Partners ≠ kopers.** De 47 Partner-accounts (vooral IT/Microsoft-ecosysteem) vormen de co-sell/channel-laag. Hun contacten zijn overwegend **Sales/Account Executives** (Microsoft co-sell) — niet de eindkopers. Die zijn in de persona-analyse apart gehouden.
5. **Datagat: bedrijfsgrootte ontbreekt volledig.** De `size`-kolom is voor 100% van de accounts leeg. "Aantal werknemers" kan dus **niet** uit de huidige database worden afgeleid — zie aanbevelingen.
6. **Bereikbaarheid is sterk.** E-mail-dekking is ~100% bij prospects en customers; LinkedIn-dekking 75-84%. De lijst is direct activeerbaar voor outreach.

---

## 1. Scope & databron

- **186 actieve accounts** en **668 actieve contacten** (exclusief inactive accounts/contacten en former employees).
- Cijfers komen uit directe aggregatie-queries op de productie-database (juni 2026).
- **Caveats vooraf (eerlijk over de datakwaliteit):**
  - `companies.size` (werknemersaantal) is **leeg voor alle accounts** → bedrijfsgrootte ontbreekt.
  - `industry` ontbreekt bij ~7 accounts (vooral partners); `country` bij ~35 (vooral partners).
  - **190 van de 668 contacten (28%) hebben geen functietitel.** De persona-analyse is gebaseerd op de 478 contacten mét titel.
  - Titels zijn vrije tekst en zijn door mij in clusters gebucket; ~23 vallen in "Overig" en enkele in functie-ambigue bakken ("Manager", "Director" zonder functie). Persona-aantallen zijn dus indicatief, niet exact.

---

## 2. Account-mix

| Account-type | Aantal | Aandeel |
|---|---|---|
| Prospect | 103 | 55% |
| Partner | 47 | 25% |
| Customer | 35 | 19% |
| Relation | 1 | <1% |
| Company (intern) | 1 | <1% |
| **Totaal** | **186** | **100%** |

> De funnel is breed bovenaan (103 prospects) met een bewezen klantenbasis van 35. De partnerlaag (47) is relatief groot — kenmerkend voor een co-sell-motion met Microsoft.

---

## 3. Industrieën

Industriegegevens zijn fijnmazig (vrije tekst, ~90 unieke waarden). Hieronder geclusterd naar sector, gesplitst tussen **kopers** (Prospect + Customer) en de **partnerlaag**.

### 3a. Prospects — waar de pijplijn zit (103 accounts)

| Sector (geclusterd) | ~Aantal prospects |
|---|---|
| **Financial Services & Insurance** (banking, asset mgmt, insurance, lending, payments) | ~25 |
| **Consumer / Retail / Food & Beverage** | ~15 |
| **Technology / IT / Software** | ~12 |
| **Energy & Resources** (clean energy, oil & gas, mining) | ~11 |
| **Healthcare & Life Sciences** (hospitals, medical, wellness) | ~9 |
| **Manufacturing & Industrial** (incl. chemicals, engineering) | ~8 |
| **Consulting / Professional Services** | ~5 |
| **Travel / Hospitality** | ~4 |
| **Marketing / Media** | ~4 |
| Overig + onbekend | ~10 |

> **Financial Services & Insurance is de duidelijkste prospect-vertical** (~1 op de 4). Daarna volgt een brede spreiding — bevestigt het horizontale karakter.

### 3b. Customers — bewezen fit (35 accounts)

De klantenbasis is zeer divers (overwegend 1 account per sector). Losse clusters:

| Sector-cluster | ~Aantal customers |
|---|---|
| **Life Sciences / Healthcare** (bioinformatics, biotech, clinical trials, diagnostics) | ~6 |
| **Manufacturing / Industrial** (incl. civil eng., maritime) | ~6 |
| **Consumer / Retail / Brand** | ~5 |
| Overig (finance, government, media, HR-tech, semiconductor, …) | ~18 (verspreid) |

> Geen enkele sector domineert de klantenbasis — Eclectik levert breed. De lichte concentratie in Life Sciences en Manufacturing is het dichtst bij een "herhaalbare" vertical.

### 3c. Partners — het ecosysteem (47 accounts)

Sterk **IT/Technology-gedomineerd**: Information Technology (14), IT Services/Management (5), Enterprise Software (3), Intelligent Systems (2) + consultancies (Consulting 4, Accounting 3). Dit is de **Microsoft co-sell / implementatie-laag**, geen eindmarkt.

---

## 4. Geografie

### Koper-markt (Prospects + Customers)

| Land | Prospects | Customers | Totaal kopers |
|---|---|---|---|
| 🇺🇸 Verenigde Staten | 29 | 12 | **41** |
| 🇨🇭 Zwitserland | 15 | 4 | **19** |
| 🇬🇧 Verenigd Koninkrijk | 8 | 7 | **15** |
| 🇳🇱 Nederland | 9 | 0 | **9** |
| 🇩🇪 Duitsland | 2 | 4 | **6** |
| 🇫🇷 Frankrijk | 3 | 0 | 3 |
| 🇳🇴 Noorwegen | 3 | 0 | 3 |
| 🇿🇦 Zuid-Afrika | 3 | 0 | 3 |
| 🇦🇪 VAE | 3 | 0 | 3 |
| 🇮🇪 Ierland | 1 | 2 | 3 |
| Overig (DK, BE, AT, CA, IT, JP, …) | ~15 | ~5 | ~20 |
| Onbekend | 14 | 1 | 15 |

**Lezing:**
- **US is het grootste enkele land**, zowel in prospects als customers — significante trans-Atlantische focus.
- **EMEA-kern**: Zwitserland + UK + Nederland + Duitsland. Nederland is opvallend **prospect/partner-zwaar maar (nog) zonder klanten** — thuismarkt voor partnerschappen, conversie naar klant is een kans.
- **Klanten** concentreren in **US (12), UK (7), DACH (8)** — dat is je bewezen geografie.

---

## 5. Bedrijfsgrootte — DATAGAT ⚠️

De `companies.size`-kolom is **leeg voor alle 186 accounts**. Er is op dit moment **geen werknemersaantal-data** in het CRM, dus de doelgroep kan niet op bedrijfsgrootte geprofileerd worden.

**Aanbeveling:** verrijk `size` via de bestaande LinkedIn/Unipile-integratie (company-enrich haalt al bedrijfsdata op) of een eenmalige bulk-enrichment. Pas daarna is een grootte-segmentatie (SMB / mid-market / enterprise) mogelijk — relevant omdat de buying-center-structuur (één HR-koper vs. inkoopcommissie) sterk met grootte samenhangt.

---

## 6. Buying persona's

Gebaseerd op 478 getitelde contacten, gebucket naar functie. **Belangrijk onderscheid:** koperspersona's (bij Customers + Prospects) vs. de partner-relatie-persona's (Microsoft co-sell). Die twee zijn fundamenteel anders.

### 6a. Koperskant — Customers + Prospects (de echte buying center)

| Persona | Customers | Prospects | Totaal | Aandeel* |
|---|---|---|---|---|
| **HR / People / Talent / L&D** | 63 | 64 | **127** | ~48% |
| Manager / Lead / Specialist (functie n.v.t.) | 6 | 18 | 24 | ~9% |
| **IT / Tech / Engineering** | 11 | 12 | 23 | ~9% |
| Consulting / Strategy / Advisory | 2 | 9 | 11 | ~4% |
| Head / VP (functie onbekend) | 4 | 4 | 8 | ~3% |
| **CHRO / Chief People** | 5 | 2 | 7 | ~3% |
| **CEO / GM / Founder** | 5 | 2 | 7 | ~3% |
| Marketing / Comms | 6 | 1 | 7 | ~3% |
| Operations / Delivery / PM | 2 | 4 | 6 | ~2% |
| CTO / CIO / Chief Digital | 1 | 3 | 4 | ~2% |
| Director (functie onbekend) | 2 | 2 | 4 | ~2% |
| Sales / Commercial | 1 | 1 | 2 | ~1% |
| Overig / ongecategoriseerd | 9 | 14 | 23 | ~9% |

\* aandeel van de ~263 getitelde koper-contacten.

**Conclusie koperskant:**
- **HR / People / Talent / L&D is dé buying center** — 127 contacten, plus 7 CHRO/Chief People. Samen ~51% van alle herkenbare koper-functies. Dit is volledig in lijn met Eclectik's People Science / employee-insights propositie.
- **IT / Tech (23)** is de logische **technische mede-beslisser** (data-integratie, analytics-platform, security/privacy-review bij een People-data-traject).
- **CEO / GM / Founder (7)** is de **economische koper bij kleinere organisaties**, waar HR en directie samenvallen.
- **Marketing / Comms (7)** en **Consulting / Strategy (11)** zijn beïnvloeders (employer brand / interne communicatie / transformatie-agenda).
- De bakken "Manager/Lead", "Head/VP", "Director" en "Overig" (~59 samen) zijn functie-ambigu door generieke titels; een deel hiervan is vermoedelijk óók HR.

### 6b. Partnerkant — de co-sell-motion (Microsoft-ecosysteem)

| Persona | Aantal partner-contacten |
|---|---|
| Sales / Commercial / Account (Microsoft AE's, client directors) | 42 |
| Overig | 29 |
| Manager / Lead / Specialist | 26 |
| IT / Tech / Engineering | 18 |
| Consulting / Strategy | 18 |
| CEO / GM / Founder | 17 |
| Marketing / Comms | 12 |
| Director (functie onbekend) | 12 |
| HR / People | 11 |
| Head / VP | 8 |
| Partner / interne rolcodes (CXPM etc.) | 8 |

> De partnerlaag draait om **Sales/Account-management + leiderschap** — typisch voor co-selling met Microsoft-accountteams. Dit zijn de mensen via wie je naar eindklanten beweegt, niet de kopers zelf.

---

## 7. Ideaal Klantprofiel (ICP) — synthese

Op basis van bovenstaande, het profiel dat de data laat zien:

| Dimensie | Profiel |
|---|---|
| **Sector** | Sector-agnostisch (People Science is horizontaal). Sterkste signalen: Financial Services & Insurance (pijplijn), Life Sciences/Healthcare + Manufacturing + Consumer/Retail (bewezen klanten). |
| **Geografie** | US (#1), gevolgd door UK + DACH (CH/DE) + Benelux. Nederland sterk in pijplijn/partners, conversie naar klant nog open. |
| **Bedrijfsgrootte** | _Onbekend — datagat._ Aan te vullen via enrichment. |
| **Primaire koper** | HR / People / Talent / L&D-leiderschap (CHRO, HR Director, People & Culture, L&D, Organizational Development). |
| **Technische mede-beslisser** | IT / Data / Digital (integratie + privacy/security van People-data). |
| **Economische koper (kleinere orgs)** | CEO / GM / Founder. |
| **Beïnvloeders** | Interne communicatie / employer brand (Marketing/Comms), strategy/transformation consultants. |
| **Route-to-market** | Direct naar HR + co-sell via Microsoft partner-accountteams (Sales/AE-laag). |

---

## 8. Aanbevelingen / next steps

1. **Vul bedrijfsgrootte aan** (`companies.size`) via LinkedIn/Unipile-enrichment of een eenmalige bulk-run. Zonder dit kun je niet segmenteren op SMB/mid-market/enterprise — terwijl dat de buying-center-aanpak bepaalt.
2. **Verhoog titel-dekking.** 28% van de contacten heeft geen functietitel; de Enrich-via-LinkedIn-flow (recent verbeterd met owner-cascade) kan dit gericht ophalen voor prospects/customers, waardoor de persona-analyse scherper wordt.
3. **Scherp de boodschap op HR aan.** De koperskant is overweldigend HR/People — content, playbooks en outreach zouden primair die persona moeten aanspreken, met IT/data als secundaire stakeholder in de boodschap.
4. **Nederland: prospect→customer-conversie.** 9 NL-prospects + 9 NL-partners maar 0 NL-customers. Thuismarkt met onbenut conversiepotentieel — waard om als focus-segment te nemen.
5. **Overweeg een lichte verticalisatie** rond Financial Services & Insurance (grootste prospect-vertical) en/of Life Sciences (klant-cluster) voor herhaalbare casuïstiek, zonder de horizontale propositie los te laten.

---

_Methodische noot: alle aantallen komen uit aggregatie-queries op de live database op de generatiedatum. Sector- en persona-clustering is een interpretatie van vrije-tekstvelden (`industry`, `title`) en daarmee indicatief. Bij een herhaling van deze analyse na data-enrichment kunnen de cijfers verschuiven._
