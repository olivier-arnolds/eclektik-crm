#!/usr/bin/env python3
"""
Importeert de Glint Prioriteit B-lijst (xlsx) als een nieuwe outreachcampagne,
met dezelfde instellingen als Glint Prioriteit A.

WAAROM EEN EIGEN SCRIPT EN NIET import-outreach-list.py
  Dat script leest de oude masterlijst: kolommen 'Outreach-prio', kleurprefixen
  en berichten waarin het onderwerp als 'Subject: ...' boven de body staat. Deze
  lijst heeft onderwerp en bericht al in aparte kolommen en kent een variant per
  contact (draait Glint / draaide Glint / platform-neutraal). Dat in het oude
  script proppen zou beide lijsten fragiel maken.

WAT HET BEWUST NIET DOET
  * Het tweede tabblad 'Vertrokken (niet sturen)' wordt NIET geimporteerd. Dat
    zijn mensen van wie we weten dat ze er niet meer werken.
  * msg2 blijft leeg. Bericht 2 schrijven we pas als bericht 1 gelopen heeft,
    net als bij Prioriteit A. De verzender slaat stap 2 over zonder body.
  * De campagne wordt op 'paused' aangemaakt. Niets vertrekt tot iemand hem in
    de CRM aanzet. Dat is de enige rem tussen een import en 195 echte mails.

STATUS 'paused' PER CONTACT KRIJGT WIE
  * in de CRM op do_not_email staat;
  * bij een bedrijf hoort dat Customer, Partner of Relation is (eerst afstemmen);
  * al in een ANDERE lopende outreachcampagne zit (geen dubbele benadering).

GEBRUIK
  python3 scripts/import-outreach-prio-b.py --file "<pad>.xlsx"            # dry-run
  python3 scripts/import-outreach-prio-b.py --file "<pad>.xlsx" --apply    # echt
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl ontbreekt. Installeer met: python3 -m pip install openpyxl")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATCH = 100
BRON = "Glint marktanalyse Prioriteit B"

# Bedrijfstypes die duiden op een lopende relatie: koude mail gaat daar niet
# automatisch heen.
PAUSE_COMPANY_TYPES = {"Customer", "Partner", "Relation"}

# De variant bepaalt de verzendvolgorde. Wie Glint vandaag draait is het meest
# kansrijk, wie het ooit draaide daarna, platform-neutraal als laatste.
# priority_tier is precies waar de verzender op sorteert (TIER_RANK in
# api/_lib/outreach-send-lib.js), outreach_prio is de tiebreak daarbinnen.
VARIANT = {
    "A": ("glint_actief", "top"),
    "B": ("glint_voormalig", "good"),
    "C": ("platform_neutraal", "medium"),
}

# Excel schrijft regeleindes als XML-escapes weg; die komen anders letterlijk in
# de mail terecht. Zie import-outreach-list.py voor het hele verhaal.
EXCEL_ESCAPES = [("_x000A_", "\n"), ("_x000D_", ""), ("_x0009_", " ")]
OVERIGE_ESCAPE = re.compile(r"_x[0-9A-Fa-f]{4}_")
opgeschoond = {"cellen": 0}


def s(v):
    """Cel naar getrimde string zonder Excel-rommel. Vouwt witruimte NIET samen:
    de berichtteksten bestaan uit alinea's met lege regels ertussen."""
    if v is None:
        return ""
    ruw = str(v)
    schoon = ruw
    for zoek, verv in EXCEL_ESCAPES:
        schoon = schoon.replace(zoek, verv)
    schoon = OVERIGE_ESCAPE.sub("", schoon)
    schoon = schoon.replace("\r\n", "\n").replace("\r", "\n").strip()
    if schoon != ruw.strip():
        opgeschoond["cellen"] += 1
    return schoon


def naam(v):
    return re.sub(r"\s+", " ", s(v)).strip()


def split_naam(volledig):
    """'Allison Pinkham' -> ('Allison', 'Pinkham'). Meer dan twee delen: alles na
    het eerste woord is achternaam, want tussenvoegsels horen daarbij."""
    delen = naam(volledig).split(" ")
    if not delen or not delen[0]:
        return None, None
    if len(delen) == 1:
        return delen[0], None
    return delen[0], " ".join(delen[1:])


def email_domain(email):
    return email.split("@", 1)[1].lower() if "@" in email else None


def norm_name(v):
    return " ".join(s(v).lower().split())


def domain_from_website(website):
    w = s(website).lower()
    if not w:
        return None
    if "//" not in w:
        w = "//" + w
    host = (urllib.parse.urlparse(w).netloc or "").split("@")[-1].split(":")[0]
    return host[4:] if host.startswith("www.") else (host or None)


def variant_sleutels(cel):
    """'B: draaide Glint' -> ('glint_voormalig', 'good')."""
    letter = s(cel)[:1].upper()
    return VARIANT.get(letter, (None, None))


def load_env_local():
    """Vult ontbrekende env-vars uit .env.local (gitignored). Bestaande winnen."""
    path = os.path.join(ROOT, ".env.local")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


class Supa:
    def __init__(self, url, key):
        self.base = url.rstrip("/") + "/rest/v1"
        self.key = key

    def _req(self, method, path, body=None, extra_headers=None):
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        headers.update(extra_headers or {})
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                raw = r.read().decode() or "[]"
                return json.loads(raw) if raw.strip().startswith(("[", "{")) else []
        except urllib.error.HTTPError as e:
            sys.exit(f"Supabase {method} {path} faalde ({e.code}): {e.read().decode()[:500]}")

    def select_all(self, table, columns, extra=""):
        """Paginerend ophalen: PostgREST geeft stilletjes maximaal 1000 rijen."""
        out, offset = [], 0
        while True:
            q = f"/{table}?select={urllib.parse.quote(columns)}{extra}&limit=1000&offset={offset}"
            page = self._req("GET", q)
            out.extend(page)
            if len(page) < 1000:
                return out
            offset += 1000

    def insert(self, table, rows):
        return self._req("POST", f"/{table}", rows, {"Prefer": "return=representation"})


def lees_tabblad(ws):
    it = ws.iter_rows(values_only=True)
    headers = [s(h) for h in next(it)]
    rijen = [dict(zip(headers, r)) for r in it if any(c not in (None, "") for c in r)]
    return headers, rijen


def main():
    ap = argparse.ArgumentParser(description="Importeer Glint Prioriteit B in Supabase.")
    ap.add_argument("--file", required=True, help="pad naar de xlsx")
    ap.add_argument("--campaign-name", default="Glint Prioriteit B")
    ap.add_argument("--kopie-van", default="Glint Prioriteit A",
                    help="campagne waarvan de instellingen worden overgenomen")
    ap.add_argument("--apply", action="store_true", help="schrijf naar de database")
    args = ap.parse_args()

    load_env_local()
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        sys.exit("SUPABASE_URL en SUPABASE_SERVICE_KEY ontbreken (zet ze in .env.local).")
    supa = Supa(url, key)

    # 1. Lijst lezen
    wb = openpyxl.load_workbook(args.file, read_only=True, data_only=True)
    _, rijen = lees_tabblad(wb[wb.sheetnames[0]])
    vertrokken = []
    if len(wb.sheetnames) > 1:
        _, vertrokken = lees_tabblad(wb[wb.sheetnames[1]])
    wb.close()

    nodig = ["Variant", "Bedrijf", "Naam", "Functie", "E-mail", "Onderwerp", "Bericht"]
    ontbreekt = [k for k in nodig if rijen and k not in rijen[0]]
    if ontbreekt:
        sys.exit(f"Kolommen ontbreken in het bestand: {ontbreekt}")

    # 2. Bronmateriaal uit de CRM
    print("CRM inlezen ...")
    campagnes = supa.select_all("outreach_campaign", "*")
    bron = next((c for c in campagnes if c["name"] == args.kopie_van), None)
    if not bron:
        sys.exit(f"Campagne '{args.kopie_van}' niet gevonden; kan de instellingen niet kopieren.")
    bestaand = next((c for c in campagnes if c["name"] == args.campaign_name), None)

    contacts = supa.select_all("contacts", "id,email,company_id,do_not_email")
    companies = supa.select_all("companies", "id,name,website,type")
    # Alleen adressen uit campagnes die nog kunnen verzenden tellen als dubbel.
    levend = {c["id"] for c in campagnes if c["status"] != "archived"}
    reeds = supa.select_all("outreach_contact", "email,campaign_id,status")
    reeds_mail = {}
    for r in reeds:
        if r.get("email") and r.get("campaign_id") in levend:
            reeds_mail.setdefault(r["email"].strip().lower(), []).append(r["campaign_id"])
    camp_naam = {c["id"]: c["name"] for c in campagnes}

    c_by_email = {c["email"].strip().lower(): c for c in contacts if c.get("email")}
    co_by_id = {c["id"]: c for c in companies}
    co_by_domain, co_by_name = {}, {}
    for co in companies:
        d = domain_from_website(co.get("website"))
        if d:
            co_by_domain.setdefault(d, co)
        n = norm_name(co.get("name"))
        if n:
            co_by_name.setdefault(n, co)
    print(f"  {len(contacts)} contacts, {len(companies)} companies, "
          f"{len(reeds_mail)} adressen in lopende campagnes")

    # 3. Rijen omzetten
    now_iso = datetime.now(timezone.utc).isoformat()
    vertrokken_mails = {s(v.get("E-mail")).lower() for v in vertrokken}
    out, seen = [], set()
    stats = {"queued": 0, "paused": 0, "match_contact": 0, "match_company": 0,
             "overgeslagen": 0}
    redenen, relatie_hits, dubbel_hits = {}, [], []

    for r in rijen:
        email = s(r.get("E-mail")).lower()
        if not email or "@" not in email:
            stats["overgeslagen"] += 1
            continue
        if email in seen or email in vertrokken_mails:
            stats["overgeslagen"] += 1
            continue
        seen.add(email)

        dom = email_domain(email)
        voornaam, achternaam = split_naam(r.get("Naam"))
        label, tier = variant_sleutels(r.get("Variant"))
        nr = s(r.get("Nr"))

        contact = c_by_email.get(email)
        company = None
        if contact and contact.get("company_id"):
            company = co_by_id.get(contact["company_id"])
        if company is None and dom:
            company = co_by_domain.get(dom)
        if company is None:
            company = co_by_name.get(norm_name(r.get("Bedrijf")))
        if contact:
            stats["match_contact"] += 1
        if company:
            stats["match_company"] += 1

        # Zwaarste reden eerst: die wordt vastgelegd in paused_reason.
        status, reden = "queued", None
        if contact and contact.get("do_not_email"):
            status, reden = "paused", "do_not_email in CRM"
        elif company and s(company.get("type")) in PAUSE_COMPANY_TYPES:
            status = "paused"
            reden = f"bestaande relatie ({company['type']}): eerst afstemmen"
            relatie_hits.append((s(r.get("Bedrijf")) or company.get("name"),
                                 company["type"], email))
        elif email in reeds_mail:
            namen = ", ".join(sorted({camp_naam.get(c, "?") for c in reeds_mail[email]}))
            status, reden = "paused", f"zit al in: {namen}"
            dubbel_hits.append((email, namen))

        stats[status] += 1
        if reden:
            redenen[reden] = redenen.get(reden, 0) + 1

        out.append({
            "first_name": voornaam,
            "last_name": achternaam,
            "title": naam(r.get("Functie")) or None,
            "email": email,
            "email_domain": dom,
            "company": naam(r.get("Bedrijf")) or None,
            "email_validation": s(r.get("Validatie")) or None,
            "priority_label": label,
            "priority_tier": tier,
            "outreach_prio": int(nr) if nr.isdigit() else None,
            "is_reserve": False,
            "hook_note": s(r.get("Let op")) or None,
            "source": BRON,
            "msg1_subject": s(r.get("Onderwerp")) or None,
            "msg1_body": s(r.get("Bericht")) or None,
            "msg2_subject": None,
            "msg2_body": None,
            "status": status,
            "paused_reason": reden,
            "next_action_at": now_iso if status == "queued" else None,
            "contact_id": contact["id"] if contact else None,
            "company_id": company["id"] if company else None,
            "channel": "email",
        })

    zonder_tekst = [o for o in out if not (o["msg1_subject"] and o["msg1_body"])]

    # 4. Rapport
    kop = "DRY-RUN, er wordt niets geschreven" if not args.apply else "APPLY"
    print(f"\n{'=' * 62}\nRAPPORT ({kop})\n{'=' * 62}")
    print(f"  rijen in tabblad 1       : {len(rijen)}")
    print(f"  tabblad 'vertrokken'     : {len(vertrokken)} (niet geimporteerd)")
    if opgeschoond["cellen"]:
        print(f"  Excel-rommel opgeruimd   : {opgeschoond['cellen']} cellen")
    print(f"  overgeslagen             : {stats['overgeslagen']}")
    print(f"  te importeren            : {len(out)}")
    print(f"  queued / paused          : {stats['queued']} / {stats['paused']}")
    print(f"  gematcht op CRM-contact  : {stats['match_contact']}   op bedrijf: {stats['match_company']}")
    tiers = {}
    for o in out:
        tiers[o["priority_tier"] or "?"] = tiers.get(o["priority_tier"] or "?", 0) + 1
    print(f"  varianten (tier)         : {tiers}")
    if zonder_tekst:
        print(f"  !! {len(zonder_tekst)} rijen zonder onderwerp of bericht")
    if redenen:
        print("\n  redenen voor paused:")
        for k, v in sorted(redenen.items(), key=lambda x: -x[1]):
            print(f"    {v:5d}  {k}")
    for titel, hits in (("bestaande relatie", relatie_hits), ("dubbel", dubbel_hits)):
        if hits:
            print(f"\n  !! {len(hits)} x {titel}:")
            for h in hits[:40]:
                print("    - " + "  ".join(str(x) for x in h))
            if len(hits) > 40:
                print(f"    ... en {len(hits) - 40} meer")

    print(f"\n  campagne-instellingen overgenomen van '{bron['name']}':")
    for k in ("sender_mailbox", "daily_cap", "followup_delay_days_min",
              "followup_delay_days_max", "max_per_company_per_week", "send_windows",
              "hard_stop_at", "auto_send", "opt_out_footer", "sender_signature", "doel"):
        print(f"    {k:28s} {bron.get(k)}")
    print("    status                       paused  (bewust: zet hem zelf aan in de CRM)")

    if not args.apply:
        print("\nDry-run klaar. Voeg --apply toe om echt te importeren.")
        return
    if zonder_tekst:
        sys.exit("\nGestopt: er zijn rijen zonder tekst. Eerst het bestand repareren.")
    if bestaand:
        sys.exit(f"\nGestopt: campagne '{args.campaign_name}' bestaat al "
                 f"({bestaand['id']}). Verwijder of hernoem die eerst.")

    # 5. Schrijven
    nieuw = {k: bron[k] for k in (
        "sender_mailbox", "daily_cap", "followup_delay_days_min", "followup_delay_days_max",
        "max_per_company_per_week", "send_windows", "hard_stop_at", "channel",
        "linkedin_account_id", "weekly_cap", "auto_send", "linkedin_followup",
        "opt_out_footer", "sender_signature", "doel")}
    nieuw["name"] = args.campaign_name
    nieuw["status"] = "paused"
    camp = supa.insert("outreach_campaign", [nieuw])[0]
    print(f"\nCampagne aangemaakt: {camp['id']}  ({camp['name']}, status {camp['status']})")

    for i in range(0, len(out), BATCH):
        deel = [dict(o, campaign_id=camp["id"]) for o in out[i:i + BATCH]]
        supa.insert("outreach_contact", deel)
        print(f"  {min(i + BATCH, len(out))}/{len(out)} contacten geschreven")
    print("\nKlaar. De campagne staat op 'paused': er vertrekt niets tot je hem aanzet.")


if __name__ == "__main__":
    main()
