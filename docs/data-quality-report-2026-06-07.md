# Eclectik CRM — Data Quality Report

**Date:** 2026-06-07 · **Database:** Eclectik-CRM Supabase (`jdzaypckluncdwsoxurs`) · **Author:** Claude (Cowork), on Marco's request
**Method:** SQL audit across all 41 public tables — referential integrity, duplicates, completeness, value consistency/normalization, and hygiene. Every figure below was measured directly against the live database on the date above.

---

## Executive summary

The database is in **good structural shape**: zero orphaned references across every relationship checked (contacts→companies, deals→companies, tasks→everything, account_links, comms, activity, synced_events, document_links). The issues that exist are *content* issues: a handful of duplicate companies/contacts, missing countries, and a few inconsistent enum values. Nothing is broken; several things are untidy.

| Area | Status | Count |
|---|---|---|
| Referential integrity (14 checks) | ✅ clean | 0 orphans |
| Duplicate companies | 🔴 fix | 2 pairs (INTWO/Intwo, KPMG/KMPG) |
| Duplicate contacts (same email) | 🔴 fix | 12 emails → ~12 redundant rows |
| Companies without country | 🟡 fill | 39 (incl. 11 Microsoft entities with country in the name) |
| Won deals without actual_close_date | 🟡 decide | 5 (the known Q1/Q2 question) |
| Inconsistent enums (type, status, sub_status) | 🟢 cosmetic | ~25 rows |
| Leftover backup tables (2026-06-01) | 🟢 housekeeping | 4 tables, ~1,283 rows |

---

## 1 · Referential integrity — all clean ✅

Checked and found **zero** orphans in: `contacts.company_id`, `opportunities.company_id`, `leads.company_id`, `companies.parent_id`, `tasks.{contact_id, opportunity_id, lead_id, company_id, with_contact_id}`, `account_links.{account_id, contact_id}` (also no duplicate account+contact+type rows), `comms.{company_id, contact_id}`, `activity.{company_id, contact_id}`, `synced_events.company_id`, `document_links.deal_id`. No action needed.

## 2 · Duplicates

### 2.1 Companies — 2 duplicate pairs 🔴

| Keep | Delete | Why |
|---|---|---|
| **Intwo** (`434be577…`, stage New, created 04-09) | **INTWO** (`03389d98…`, stage Inactive, created 04-18) | Same partner twice. NB: 2 contacts reference the INTWO spelling in `company_name` text. |
| **KPMG** (`e60cad17…`) | **KMPG** (`9f44f60a…`) | "KMPG" is a typo. Both Partner/Active, both created 04-18, both empty otherwise. |

Before deleting, any child rows (contacts, deals, links, comms, activity, document_links) must be repointed to the surviving id — see runbook §A.

### 2.2 Contacts — 12 duplicate emails 🔴

Nine are exact same-person duplicates where one row carries the history and the other is empty or nearly so: **Denise van Angeren** (IMC), **Harry Boers**, **Michel Heijman**, **William Vroegindewey** (Macaw), **Henk Ritmeester** (Clairiti), **Junjie Wei** (TiCCODA), **Kinga Debreczeni** (Microsoft CH), **Klaudia Denert** (Capgemini), **Martin Gerritsen** (Intwo). Merge rule in runbook §B (keep the row with the most references, repoint the rest).

Three need a human eye:

- **heidi@eclectik.co** — "Heidi Muhle" (13 account_links, 2 tasks) vs a junk row literally named "Heidi@eclectik.co" (1 link). Keep Heidi Muhle, repoint the 1 link, delete junk row.
- **brittany.mcbreen@breitling.com** — "Brittany McBreen" (linked to Breitling) vs "MCBREEN Brittany" (no company). Keep the properly-cased linked one.
- **oarnolds@me.com** — Olivier Arnolds twice: one row with **19 account_links and no company**, one linked to **Masasu Advies**. ⚠️ Same person, two hats (Eclectik team vs Masasu). **Marco to decide:** merge into one (recommended: keep the 19-link row, set its company to Eclectik, fold the Masasu row in) or deliberately keep both.

### 2.3 Leads — near-duplicates 🟢

No exact duplicates. **Bence Orban** appears twice for "Zurich" plus related "Zurich Farmers Insurance" / "Zurich Insurance" rows — all Disqualified, so harmless; ignore or delete at leisure.

## 3 · Completeness

- **39 companies have no country.** Quick wins inside that list: 11 Microsoft entities carry the country in their *name* (Microsoft UK, USA, FRANCE, GERMANY, ITALY, NORWAY, DENMARK, BELGIUM, SWITZERLAND, UAE, APAC*), plus obvious ones: Boskalis (Netherlands), Capgemini (France), Randstad Holding (Netherlands), University of Zurich (Switzerland), KPMG (Netherlands?), National Trust (United Kingdom), Rand Merchant Bank / FNB (South Africa), North Mississippi Medical Center (United States), Sulava (Finland), Work Vivo (Ireland). *Remainder needs Marco or enrichment.* (*APAC isn't a country — suggest leaving null or introducing a region value.)
- **1 US company without state:** Gatewayfoundation (also probably "Gateway Foundation" properly spaced — single-word name looks like an import artifact).
- **Contacts:** 39 without email, 6 without company link, 2 whose *name* is an email address (the Heidi junk row + jeremy.wikler@microsoft.com). The jeremy row should get a proper name.
- **Deals:** 2 opportunities without account — "PANPAK | Agentic ROI" and "PRIMARK | Agentic AI case" (both Lost, company_name says "P2P | …"). Link to accounts or accept as closed history. 22 leads without account — **all Disqualified**, fine to leave.
- **Contacts.country** is essentially unused: 688 of 697 null, plus one "Nederland" (Dutch spelling). Either ignore the field or normalize the 9 filled values (runbook §C).

## 4 · Consistency / normalization

- ✅ **companies.country was fully normalized on 2026-06-06** (all US variants → "United States", ISO codes → full names; see `sql/data_normalize_country_2026-06-06.sql`). Still clean today.
- **companies.type** has two one-off values: "Relation" (FRIENDS) and "Company" (Eclectik itself). The app expects Customer/Prospect/Partner. Eclectik as "Company" is arguably correct (it's us); FRIENDS → probably Partner or Prospect. **Marco to decide.**
- **opportunities.status on open deals is inconsistent:** 12 open deals have status NULL, 2 have "Open". Pick one convention (recommend NULL→'Open' or all NULL); the app currently treats both as "not won/lost", so this is cosmetic but will bite future queries.
- **sub_status drift:** Won deals split 9× sub_status='close' vs 11× '' (and Lost: 60× 'close' vs 2× ''). Harmless to the app (won/lost is driven by `status`), but worth flattening: set sub_status='close' on all Won/Lost rows.
- **5 Won deals without actual_close_date** — the known open question: BioMarin, Breitling CSM 2026, Douglas, Trane, Syngenta (all stage=active, close_dates Feb/Mar 2026 = estimates). These drive the Q1-vs-Q2 reporting placement and the ❊ markers. **Waiting on Marco:** set actual_close_date = real signing dates (or = today → Q2).
- **1 actual_close_date in the future:** BMC Software "CS & PS Services 2026" → 2026-06-30. An *actual* close date shouldn't be in the future; either it's planned (use close_date instead) or mis-keyed.
- **1 Won deal with €0 revenue:** LHH "Copilot Value Analysis part 1" (won 2025-09-19). If it was genuinely free, fine; otherwise fill the value — it currently contributes €0 to won-revenue reporting.
- **3 contacts with stale denormalized company_name** (text differs from the linked account): A1 Telekom Austria Group ↔ Telekom Austria AG, Medartis AG ↔ Medartis, Capital Group Companies Inc ↔ Capital Group. The `company_id` link is correct; only the text snapshot drifted.

## 5 · Hygiene

- **4 backup tables from the 2026-06-01 DQ pass** still present: `_owner_backup_20260601` (1,103), `_probability_backup_20260601` (174), `_dq_backup_opps_20260601` (2), `_dq_backup_companies_20260601` (4). If that cleanup is confirmed good a week on, drop them.
- **5 permanently empty tables:** `emails`, `follow_ups`, `calendar_events`, `playbook_executions`, `playbook_drafts`. Not harmful — drop only if the features are abandoned.

---

## Cleanup runbook — instruction to Claude

> **Claude: do not execute any of this without Marco's explicit go-ahead in chat. Execute phase by phase, verifying counts after each step. Take the backup first, always.**

**Phase 0 — backup (always first)**
```sql
create table _dq_backup_contacts_YYYYMMDD as select * from contacts;
create table _dq_backup_companies_YYYYMMDD as select * from companies;
create table _dq_backup_opps_YYYYMMDD as select * from opportunities;
```

**Phase A — merge duplicate companies** (INTWO→Intwo `434be577-4b20-461f-b3b3-e029b192b0e6`, KMPG→KPMG `e60cad17-99c6-4623-88ec-9c467e3f73be`). For each pair (loser→keeper): repoint every child table, then delete the loser:
```sql
update contacts set company_id = :keeper where company_id = :loser;
update opportunities set company_id = :keeper where company_id = :loser;
update leads set company_id = :keeper where company_id = :loser;
update tasks set company_id = :keeper where company_id = :loser;
update comms set company_id = :keeper where company_id = :loser;
update activity set company_id = :keeper where company_id = :loser;
update synced_events set company_id = :keeper where company_id = :loser;
update account_links set account_id = :keeper where account_id = :loser
  and not exists (select 1 from account_links k where k.account_id=:keeper and k.contact_id=account_links.contact_id and k.link_type=account_links.link_type);
delete from account_links where account_id = :loser; -- only leftovers that would duplicate
update document_links set account_id = :keeper where account_id = :loser;
update chat_account_links set company_id = :keeper where company_id = :loser;
update companies set parent_id = :keeper where parent_id = :loser;
delete from companies where id = :loser;
```
Also fix the dup-spelling text snapshots: `update contacts set company_name='Intwo' where company_name='INTWO';`

**Phase B — merge duplicate contacts.** For the 9 clear pairs: keeper = row with the most references (account_links, tags, tasks, comms, activity; listed in §2.2 audit — re-query at execution time, ids are in this report's source conversation). Per pair:
```sql
update account_links set contact_id=:keeper where contact_id=:loser
  and not exists (select 1 from account_links k where k.account_id=account_links.account_id and k.contact_id=:keeper and k.link_type=account_links.link_type);
delete from account_links where contact_id=:loser;
update contact_tags set contact_id=:keeper where contact_id=:loser
  and not exists (select 1 from contact_tags k where k.contact_id=:keeper and k.tag_id=contact_tags.tag_id);
delete from contact_tags where contact_id=:loser;
update tasks set contact_id=:keeper where contact_id=:loser;
update tasks set with_contact_id=:keeper where with_contact_id=:loser;
update comms set contact_id=:keeper where contact_id=:loser;
update activity set contact_id=:keeper where contact_id=:loser;
update opportunities set contact_id=:keeper where contact_id=:loser;
update leads set converted_contact_id=:keeper where converted_contact_id=:loser;
update signal_subjects set contact_id=:keeper where contact_id=:loser; -- check column exists first
delete from contacts where id=:loser;
```
Heidi: keeper = Heidi Muhle `a62ef90a…`, loser = `04005d9a…`. Brittany: keeper = `db227e03…` (linked), loser = `92c38508…`. **Olivier: ASK MARCO FIRST** (two-hats case).

**Phase C — normalization touch-ups**
```sql
update contacts set country='Netherlands' where country='Nederland';
update contacts set full_name='Jeremy Wikler', first_name='Jeremy', last_name='Wikler' where id='8bda89c7-a538-4659-a0ca-b081edef43fd';
update opportunities set sub_status='close' where status in ('Won','Lost') and coalesce(sub_status,'')<>'close';
update opportunities set status='Open' where status is null and stage='opportunity'; -- after Marco confirms convention
update contacts c set company_name=p.name from companies p where p.id=c.company_id and c.company_name is distinct from p.name; -- refresh denormalized snapshots
```

**Phase D — fill missing countries** (the confident subset; rest needs Marco):
```sql
update companies set country='United Kingdom' where name in ('Microsoft UK','National Trust') and country is null;
update companies set country='United States'  where name in ('Microsoft USA','North Mississippi Medical Center') and country is null;
update companies set country='France'         where name in ('Microsoft FRANCE','Capgemini') and country is null;
update companies set country='Germany'        where name='Microsoft GERMANY' and country is null;
update companies set country='Italy'          where name='Microsoft ITALY' and country is null;
update companies set country='Norway'         where name='Microsoft NORWAY' and country is null;
update companies set country='Denmark'        where name='Microsoft DENMARK' and country is null;
update companies set country='Belgium'        where name='Microsoft BELGIUM' and country is null;
update companies set country='Switzerland'    where name in ('Microsoft SWITZERLAND','University of Zurich (UZH)') and country is null;
update companies set country='United Arab Emirates' where name='Microsoft UAE' and country is null;
update companies set country='Netherlands'    where name in ('Boskalis','Randstad Holding') and country is null;
update companies set country='South Africa'   where name in ('Rand Merchant Bank','FNB') and country is null;
update companies set country='Finland'        where name='Sulava' and country is null;
update companies set country='Ireland'        where name='Work Vivo' and country is null;
-- Microsoft APAC: leave null (region, not a country). Remaining ~14: ask Marco / enrich.
```
Also: `update companies set state=:state where name='Gatewayfoundation';` (Marco to supply state; consider renaming to "Gateway Foundation").

**Phase E — pending Marco decisions** (do nothing until answered)
1. The 5 Won deals' actual_close_date (BioMarin, Breitling, Douglas, Trane, Syngenta) — real dates or today?
2. Olivier Arnolds: merge or keep two-hats?
3. FRIENDS type "Relation" → Partner/Prospect? Eclectik type "Company" → keep?
4. BMC future actual_close_date 2026-06-30 — planned (move to close_date) or done?
5. LHH €0 won deal — genuinely free?
6. Drop the 2026-06-01 backup tables?

**Phase F — verify.** Re-run the audit battery (counts query from this report's source); all 🔴 rows should read 0. Drop the Phase-0 backup tables after a week of clean operation.

---

*All figures measured live on 2026-06-07. Row counts: companies 188, contacts 697, opportunities 123, leads 52, tasks 65, comms 529, account_links 270, activity 3,987, synced_events 1,779.*
