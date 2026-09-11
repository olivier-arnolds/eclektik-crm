#!/usr/bin/env python3
"""
Importeert de LinkedIn-outreachlijst (Marco_netwerk_analyse_event_6okt.xlsx) in
outreach_campaign + outreach_contact met channel='linkedin'.

Schema: sql/schema_outreach_linkedin_2026-09-11.sql. Zusterscript van
scripts/import-outreach-list.py (dat doet de e-maillijst).

WAAROM EEN APART SCRIPT EN GEEN VLAG OP HET BESTAANDE
  De twee bestanden lijken alleen op afstand op elkaar. Deze lijst heeft geen
  e-mailadressen, geen bericht 2, geen subject, een andere kolomindeling en een
  eigen kruisregel tegen de lopende e-mailcampagne. Dat allemaal in het bestaande
  script proppen maakt juist dat script gevaarlijk, en dat stuurt echte mail.

OVERLAP MET DE E-MAILCAMPAGNE
  27 van deze profielen staan ook in "Amsterdam 2026". Dat is bewust geen reden
  om over te slaan: dit is een persoonlijk bericht van Marco aan een bestaande
  connectie, en dat staat los van een koude mail. Ze worden wel apart gerapporteerd
  zodat je ziet wie er twee keer benaderd wordt. Wil je ze toch overslaan, gebruik
  dan --skip-email-duplicates.

GEBRUIK
  # 1) Dry-run (standaard, schrijft niets):
  python3 scripts/import-linkedin-outreach.py --file "/pad/naar/Marco_netwerk_analyse_event_6okt.xlsx"

  # 2) Echt importeren:
  python3 scripts/import-linkedin-outreach.py --file "..." --apply

  # 3) Wie al via e-mail benaderd is toch overslaan:
  python3 scripts/import-linkedin-outreach.py --file "..." --apply --skip-email-duplicates

  # 4) Teksten van bestaande rijen verversen (wist campagnevoortgang niet, maar
  #    overschrijft wel de berichttekst):
  python3 scripts/import-linkedin-outreach.py --file "..." --apply --overwrite

SUPABASE_URL en SUPABASE_SERVICE_KEY komen uit .env.local in de repo-root
(gitignored). Zonder --apply gebeurt er niets: je krijgt alleen het rapport.
"""

import argparse
import re
import sys
import urllib.parse
from datetime import datetime, timezone

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl ontbreekt. Installeer met: python3 -m pip install openpyxl")

# Hergebruik van het e-mailscript: dezelfde Supabase-wrapper en env-inlezer, zodat
# er maar een plek is waar de REST-afhandeling en de paginering staan. Dat script
# heeft een koppelteken in de naam, dus het moet via het pad geladen worden.
import importlib.util
import os as _os
_spec = importlib.util.spec_from_file_location(
    "outreach_import_base",
    _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "import-outreach-list.py"),
)
_base = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_base)

Supa = _base.Supa
load_env_local = _base.load_env_local
s = _base.s
norm_name = _base.norm_name
find_col = _base.find_col

BATCH = 100
CAMPAIGN_EMAIL = "Amsterdam 2026"          # de lopende e-mailcampagne, voor de kruisregel
MARCO_UNIPILE = "KYq2oN8JSPiAQSrcIfT5Ew"   # zie CLAUDE.md §5; ook de default van de content-cron

# Tier in dit bestand is A/B/C. Het datamodel kent top/good/medium (uit de
# e-maillijst met kleurprefixen); dezelfde drie niveaus, andere notatie.
TIER_MAP = {"A": "top", "B": "good", "C": "medium"}

# Statussen in de e-mailcampagne die betekenen: deze persoon is al benaderd.
# Alleen voor de rapportage, en voor --skip-email-duplicates.
EMAIL_ALREADY_TOUCHED = {"msg1_sent", "msg2_sent", "replied", "ooo", "referred", "bounced", "opted_out"}


def li_slug(url):
    """linkedin.com/in/<slug> -> slug (kleine letters, zonder query of slash)."""
    u = s(url).lower()
    if not u:
        return None
    m = re.search(r"linkedin\.com/in/([^/?#]+)", u)
    return m.group(1) if m else None


def split_name(full):
    """'Nelleke de Heer' -> ('Nelleke', 'de Heer'). Eerste woord is de voornaam."""
    parts = s(full).split()
    if not parts:
        return None, None
    if len(parts) == 1:
        return parts[0], None
    return parts[0], " ".join(parts[1:])


def main():
    ap = argparse.ArgumentParser(description="Importeer de LinkedIn-outreachlijst in Supabase.")
    ap.add_argument("--file", required=True, help="pad naar de xlsx")
    ap.add_argument("--campaign-name", default="Amsterdam 2026 LinkedIn")
    ap.add_argument("--sender", default="marco@eclectik.co",
                    help="afzender als persoon; het DM-account staat in --linkedin-account")
    ap.add_argument("--linkedin-account", default=MARCO_UNIPILE, help="Unipile-account-id")
    ap.add_argument("--hard-stop", default="2026-10-05T00:00:00Z",
                    help="na deze datum geen berichten meer (event is 6 oktober)")
    ap.add_argument("--daily-cap", type=int, default=20,
                    help="LET OP: veel lager dan bij e-mail. LinkedIn beperkt accounts "
                         "die in korte tijd veel DM's sturen.")
    ap.add_argument("--apply", action="store_true", help="schrijf naar de database")
    ap.add_argument("--overwrite", action="store_true", help="werk ook BESTAANDE rijen bij")
    ap.add_argument("--skip-email-duplicates", action="store_true",
                    help="zet wie al via e-mail benaderd is op paused in DEZE campagne, "
                         "zodat die persoon geen DM krijgt")
    args = ap.parse_args()

    load_env_local()
    url = _os.environ.get("SUPABASE_URL") or _os.environ.get("VITE_SUPABASE_URL")
    key = _os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        sys.exit("SUPABASE_URL en SUPABASE_SERVICE_KEY ontbreken (zet ze in .env.local).")
    supa = Supa(url, key)

    # 1. Lijst lezen
    wb = openpyxl.load_workbook(args.file, read_only=True, data_only=True)
    ws = wb["Shortlist"] if "Shortlist" in wb.sheetnames else wb[wb.sheetnames[0]]
    it = ws.iter_rows(values_only=True)
    headers = [s(h) for h in next(it)]
    rows = [r for r in it if any(c not in (None, "") for c in r)]
    wb.close()

    C = {
        "tier": find_col(headers, "Tier"),
        "name": find_col(headers, "Naam"),
        "title": find_col(headers, "Functie"),
        "company": find_col(headers, "Bedrijf"),
        "employees": find_col(headers, "Medewerkers"),
        "frontline": find_col(headers, "Frontline"),
        "action": find_col(headers, "Actie"),
        "why": find_col(headers, "Waarom deze tier"),
        "linkedin": find_col(headers, "LinkedIn profiel"),
        "city": find_col(headers, "Stad"),
        "message": find_col(headers, "LinkedIn bericht"),
        "connected": find_col(headers, "Verbonden"),
        "in_list": find_col(headers, "Al in onze lijst?"),
    }
    missing = [k for k in ("tier", "name", "linkedin", "message") if C[k] is None]
    if missing:
        sys.exit(f"Kolommen niet gevonden: {missing}\nHeaders in het bestand: {headers}")

    g = lambda r, k: s(r[C[k]]) if (C[k] is not None and C[k] < len(r)) else ""

    # 2. CRM en de lopende e-mailcampagne inlezen
    print("CRM inlezen ...")
    contacts = supa.select_all("contacts", "id,linkedin_url,company_id")
    companies = supa.select_all("companies", "id,name,type")
    c_by_li = {}
    for c in contacts:
        slug = li_slug(c.get("linkedin_url"))
        if slug:
            c_by_li.setdefault(slug, c)
    co_by_id = {c["id"]: c for c in companies}
    co_by_name = {}
    for co in companies:
        n = norm_name(co.get("name"))
        if n:
            co_by_name.setdefault(n, co)

    camp_rows = supa._req("GET", "/outreach_campaign?select=id,name&name=eq."
                                 + urllib.parse.quote(CAMPAIGN_EMAIL) + "&limit=1")
    email_by_li = {}
    if camp_rows:
        email_camp_id = camp_rows[0]["id"]
        for oc in supa.select_all(
            "outreach_contact",
            "id,linkedin_url,status,is_reserve,campaign_id,first_name,last_name,company",
        ):
            if oc.get("campaign_id") != email_camp_id:
                continue
            slug = li_slug(oc.get("linkedin_url"))
            if slug:
                email_by_li.setdefault(slug, oc)
        print(f"  {len(contacts)} contacts, {len(companies)} companies, "
              f"{len(email_by_li)} profielen in de e-mailcampagne")
    else:
        print(f"  let op: campagne '{CAMPAIGN_EMAIL}' niet gevonden, kruisregel staat uit")

    # 3. Rijen omzetten. Sorteervolgorde van de verzendselectie is tier, dan
    #    outreach_prio; die vullen we hier zodat A voor B voor C gaat en binnen
    #    een tier de volgorde uit het bestand behouden blijft.
    now_iso = datetime.now(timezone.utc).isoformat()
    parsed, seen = [], set()
    for idx, r in enumerate(rows):
        slug = li_slug(g(r, "linkedin"))
        if not slug:
            print(f"  overgeslagen (geen profiel-URL): {g(r, 'name')!r}")
            continue
        if slug in seen:
            print(f"  overgeslagen (dubbel profiel in het bestand): {g(r, 'name')!r}")
            continue
        seen.add(slug)
        parsed.append((idx, slug, r))

    tier_order = {"A": 0, "B": 1, "C": 2}
    parsed.sort(key=lambda p: (tier_order.get(g(p[2], "tier").upper(), 9), p[0]))

    out = []
    stats = {"queued": 0, "paused": 0, "match_contact": 0, "match_company": 0}
    pause_reasons = {}
    already_mailed, still_queued_in_email = [], []

    for prio, (_, slug, r) in enumerate(parsed, start=1):
        first, last = split_name(g(r, "name"))
        tier_letter = g(r, "tier").upper()
        body = g(r, "message")
        company_name = g(r, "company")

        contact = c_by_li.get(slug)
        company = None
        if contact and contact.get("company_id"):
            company = co_by_id.get(contact["company_id"])
        if company is None:
            company = co_by_name.get(norm_name(company_name))
        if contact:
            stats["match_contact"] += 1
        if company:
            stats["match_company"] += 1

        dup = email_by_li.get(slug)
        status, reason = "queued", None
        if not body:
            status, reason = "paused", "geen berichttekst in het bestand"
        elif dup and dup.get("status") in EMAIL_ALREADY_TOUCHED:
            already_mailed.append((g(r, "name"), company_name, dup["status"]))
            if args.skip_email_duplicates:
                status = "paused"
                reason = f"al benaderd via e-mail ({CAMPAIGN_EMAIL}, status {dup['status']})"
        elif dup and dup.get("status") == "queued" and not dup.get("is_reserve"):
            # Staat nog in de e-mailwachtrij. Krijgt dus straks een mail EN een DM;
            # alleen melden, want dat is een bewuste keuze.
            still_queued_in_email.append((g(r, "name"), company_name, dup["id"], dup.get("status")))

        stats[status] += 1
        if reason:
            pause_reasons[reason] = pause_reasons.get(reason, 0) + 1

        out.append({
            "channel": "linkedin",
            "first_name": first,
            "last_name": last,
            "title": g(r, "title") or None,
            "email": None,                       # LinkedIn-prospect, adres onbekend
            "email_domain": None,
            "company": company_name or None,
            "location": g(r, "city") or None,
            "employee_count": g(r, "employees") or None,
            "linkedin_url": f"https://www.linkedin.com/in/{slug}",
            "priority_label": f"Tier {tier_letter}" if tier_letter else None,
            "priority_tier": TIER_MAP.get(tier_letter),
            "outreach_prio": prio,
            "is_reserve": False,
            "hook_note": g(r, "why") or None,
            "frontline_note": g(r, "frontline") or None,
            "source": "Marco netwerkanalyse (LinkedIn)",
            "msg1_subject": None,                # een DM heeft geen onderwerp
            "msg1_body": body or None,
            "msg2_subject": None,
            "msg2_body": None,                   # geen opvolgbericht via LinkedIn
            "status": status,
            "paused_reason": reason,
            "next_action_at": now_iso if status == "queued" else None,
            "contact_id": contact["id"] if contact else None,
            "company_id": company["id"] if company else None,
        })

    # 4. Rapport
    mode = "DRY-RUN, er wordt niets geschreven" if not args.apply else "APPLY"
    print(f"\n{'=' * 62}\nRAPPORT ({mode})\n{'=' * 62}")
    print(f"  rijen in bestand      : {len(rows)}")
    print(f"  te importeren         : {len(out)}")
    print(f"  status queued/paused  : {stats['queued']} / {stats['paused']}")
    tiers = {}
    for o in out:
        tiers[o["priority_tier"] or "?"] = tiers.get(o["priority_tier"] or "?", 0) + 1
    print(f"  tiers                 : {tiers}")
    print(f"  gematcht op CRM-contact: {stats['match_contact']}   op bedrijf: {stats['match_company']}")
    print(f"  dagcap                : {args.daily_cap} per dag "
          f"({-(-stats['queued'] // max(1, args.daily_cap))} dagen voor de hele lijst)")
    if pause_reasons:
        print("\n  redenen voor paused:")
        for k, v in sorted(pause_reasons.items(), key=lambda x: -x[1]):
            print(f"    {v:5d}  {k}")
    if already_mailed:
        verb = "krijgen GEEN DM (--skip-email-duplicates)" if args.skip_email_duplicates \
            else "krijgen OOK een DM"
        print(f"\n  {len(already_mailed)} kregen al een mail en {verb}:")
        for nm, comp, st in already_mailed:
            print(f"    - {nm} ({comp}) [{st}]")
    if still_queued_in_email:
        print(f"\n  {len(still_queued_in_email)} staan nog in de e-mailwachtrij en krijgen "
              f"straks dus een mail EN een DM:")
        for nm, comp, _id, st in still_queued_in_email:
            print(f"    - {nm} ({comp}) [{st}]")

    if not args.apply:
        print("\nDry-run klaar. Voeg --apply toe om echt te importeren.")
        return

    # 5. Campagne find-or-create
    existing = supa._req("GET", "/outreach_campaign?select=id,name,channel&name=eq."
                                + urllib.parse.quote(args.campaign_name) + "&limit=1")
    if existing:
        campaign_id = existing[0]["id"]
        print(f"\nBestaande campagne hergebruikt: {args.campaign_name} ({campaign_id})")
    else:
        created = supa.insert("outreach_campaign", [{
            "name": args.campaign_name,
            "channel": "linkedin",
            "linkedin_account_id": args.linkedin_account,
            "sender_mailbox": args.sender,
            "daily_cap": args.daily_cap,
            "hard_stop_at": args.hard_stop,
            "status": "draft",                   # killswitch: pas versturen na 'active'
        }])
        campaign_id = created[0]["id"]
        print(f"\nCampagne aangemaakt: {args.campaign_name} ({campaign_id}), "
              f"status draft, dagcap {args.daily_cap}")

    # 6. Wegschrijven. GEEN PostgREST-upsert: het conflictdoel is een partiele index
    #    op een expressie (lower(linkedin_url) where channel='linkedin') en daar kan
    #    ON CONFLICT niet naar verwijzen. Dus zelf bepalen wat nieuw is. De index
    #    blijft het vangnet: een dubbele insert wordt hoe dan ook geweigerd.
    for o in out:
        o["campaign_id"] = campaign_id

    bestaand = {}
    for row in supa.select_all("outreach_contact", "id,linkedin_url,campaign_id,status"):
        if row.get("campaign_id") != campaign_id:
            continue
        slug = li_slug(row.get("linkedin_url"))
        if slug:
            bestaand[slug] = row

    nieuw = [o for o in out if li_slug(o["linkedin_url"]) not in bestaand]
    al_aanwezig = len(out) - len(nieuw)
    print(f"\n  {len(nieuw)} nieuw, {al_aanwezig} stonden er al")

    written = 0
    for i in range(0, len(nieuw), BATCH):
        chunk = nieuw[i:i + BATCH]
        res = supa.insert("outreach_contact", chunk)
        written += len(res)
        print(f"  batch {i // BATCH + 1}: {len(res)} van {len(chunk)} weggeschreven")

    # Alleen met --overwrite raken we bestaande rijen aan, en dan nog uitsluitend de
    # teksten en de sortering. Status en voortgang blijven met rust: die overschrijven
    # zou een al verstuurd bericht weer op 'klaar om te sturen' zetten.
    bijgewerkt = 0
    if args.overwrite and al_aanwezig:
        for o in out:
            row = bestaand.get(li_slug(o["linkedin_url"]))
            if not row:
                continue
            supa._req("PATCH", f"/outreach_contact?id=eq.{row['id']}", {
                "msg1_body": o["msg1_body"],
                "priority_tier": o["priority_tier"],
                "priority_label": o["priority_label"],
                "outreach_prio": o["outreach_prio"],
                "title": o["title"],
                "company": o["company"],
                "hook_note": o["hook_note"],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            bijgewerkt += 1
        print(f"  {bijgewerkt} bestaande rijen bijgewerkt (alleen tekst en volgorde)")

    print(f"\n{written} rijen toegevoegd"
          f"{f', {bijgewerkt} bijgewerkt' if bijgewerkt else ''}.")

    print("\nControleer met: select channel, status, count(*) from outreach_contact "
          "group by 1,2 order by 1,2;")


if __name__ == "__main__":
    main()
