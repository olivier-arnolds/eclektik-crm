#!/usr/bin/env python3
"""
Zet de uitnodigingen voor de Glint user session klaar: per ontvanger één rij in
user_session_invites met een eigen token, plus het CSV-bestand voor de mailmerge.

Contract: eclectik-website docs/superpowers/specs/2026-09-25-glint-user-session-design.md
Tabel:    sql/schema_user_session_invites_2026-09-25.sql
Endpoint: api/session-invite.js

WIE KRIJGT EEN UITNODIGING
  De gebruikers van Glint, dus de contacten bij accounts met een lopend
  deliveryproject. 'Lopend' is hier dezelfde regel als in de War room
  (src/bd/lane-warroom.jsx, "still operational"): een rij in glint_delivery met
  een status die niet Completed is. Daarna dezelfde afvalregels als in
  scripts/export-glint-prospects.py: een e-mailadres moet er zijn, en
  do_not_email, former en stage 'inactive' vallen af.

  Bewust GEEN eis van marketing_content_opt_in. Dit is geen nieuwsbrief maar een
  uitnodiging aan mensen die het product gebruiken, over hun eigen traject. Wil je
  dat toch afdwingen, dan is --require-opt-in daarvoor.

HET TOKEN
  secrets.token_urlsafe(24) geeft 32 url-safe tekens uit 192 bits toeval. Het
  contract vraagt er minstens 22. Bewust geen oplopend id en geen hash van het
  e-mailadres: allebei te raden, en met een geraden token antwoord je namens een
  ander.

GEBRUIK
  # 1) Dry-run (standaard). Leest, schrijft niets, toont wie er in de lijst komt.
  python3 scripts/maak-session-invites.py

  # 2) Echt aanmaken, inclusief het mailmerge-bestand:
  python3 scripts/maak-session-invites.py --apply

  Leest SUPABASE_URL en SUPABASE_SERVICE_KEY uit .env.local in de repo-root.

  Zonder --apply komt er GEEN csv uit. Dat is expres: een csv met tokens die niet
  in de database staan, levert een mailing op waarin elke link op /s/invalid
  uitkomt. De tokens in de csv en de rijen in de tabel worden in dezelfde run
  gemaakt of geen van beide.

  Een tweede run slaat e-mailadressen over die al een rij hebben, dus je kunt hem
  herhalen als er accounts bijkomen. De eerder verstuurde links blijven werken.

LET OP
  Het csv-bestand bevat de tokens. Wie zo'n link heeft, kan antwoorden namens die
  persoon. Niet in git, niet in Teams, niet doorsturen: rechtstreeks naar de
  mailmerge en daarna weggooien. Daarom staat het standaard buiten de repo.
"""
import argparse
import csv
import importlib.util
import os
import secrets
import sys
import urllib.parse
from datetime import date

# Zelfde hergebruik als scripts/import-event-contacts-18sept.py: de Supabase-client
# en de env-lader staan in het importscript en worden hier niet overgeschreven.
_spec = importlib.util.spec_from_file_location(
    "outreach_import_base",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "import-outreach-list.py"))
_base = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_base)
Supa, load_env_local, s = _base.Supa, _base.load_env_local, _base.s

BATCH = 100
TOKEN_BYTES = 24            # 32 tekens; het contract vraagt er minstens 22
TOKEN_MIN_LEN = 22
DEFAULT_BASE_URL = "https://www.eclectik.co"

low = lambda v: s(v).lower()


def haal_alles(supa, tabel, kolommen, filter_=""):
    """Alles ophalen in pagina's. PostgREST geeft standaard maximaal 1000 rijen
    terug, dus zonder paginering mis je stilzwijgend de rest."""
    uit, offset = [], 0
    while True:
        pad = (f"/{tabel}?select={urllib.parse.quote(kolommen)}"
               f"&limit=1000&offset={offset}{filter_}")
        blok = supa._req("GET", pad)
        uit.extend(blok)
        if len(blok) < 1000:
            return uit
        offset += 1000


def afvalreden(c, require_opt_in):
    """Waarom valt dit contact af? Leeg betekent: die krijgt een uitnodiging.
    Een 'nee' zonder reden is in een overzicht net zo onbruikbaar als geen
    overzicht."""
    if not s(c.get("email")):
        return "geen e-mailadres"
    if c.get("do_not_email"):
        return "do_not_email"
    if c.get("former"):
        return "former employee"
    if low(c.get("stage")) == "inactive":
        return "inactief"
    if require_opt_in and not c.get("marketing_content_opt_in"):
        return "geen marketing-opt-in"
    return ""


def voornaam(c):
    v = s(c.get("first_name"))
    if v:
        return v
    vol = s(c.get("full_name"))
    return vol.split(" ")[0] if vol else ""


def maak_token(bezet):
    """Een token dat nog niet bestaat. De kans op een botsing is verwaarloosbaar;
    de controle kost niets en voorkomt dat de insert halverwege klapt."""
    for _ in range(50):
        t = secrets.token_urlsafe(TOKEN_BYTES)
        if len(t) >= TOKEN_MIN_LEN and t not in bezet:
            bezet.add(t)
            return t
    sys.exit("kon geen vrij token maken")


def main():
    ap = argparse.ArgumentParser(
        description="Zet de uitnodigingen voor de Glint user session klaar.")
    ap.add_argument("--apply", action="store_true",
                    help="schrijf de rijen naar de database en maak het csv-bestand")
    ap.add_argument("--out", default=os.path.expanduser(
        f"~/Downloads/user-session-mailmerge-{date.today():%Y-%m-%d}.csv"),
        help="pad voor het mailmerge-bestand (bevat de tokens, dus buiten de repo)")
    ap.add_argument("--base-url", default=DEFAULT_BASE_URL,
                    help="site waar de kliklinks heen wijzen")
    ap.add_argument("--include-completed", action="store_true",
                    help="ook accounts met een afgerond project (oud-gebruikers)")
    ap.add_argument("--require-opt-in", action="store_true",
                    help="alleen contacten met marketing_content_opt_in")
    ap.add_argument("--only", default="",
                    help="beperk tot dit e-mailadres, voor een testrij")
    args = ap.parse_args()

    load_env_local()
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        sys.exit("SUPABASE_URL en SUPABASE_SERVICE_KEY ontbreken (.env.local in de repo-root).")
    supa = Supa(url, key)

    # ── 1. Accounts met een lopend Glint-project ────────────────────────────
    delivery = haal_alles(supa, "glint_delivery", "company_id,client_name,project_name,status")
    live_ids, naam_van_project = set(), {}
    for r in delivery:
        if not r.get("company_id"):
            continue                       # handmatige rij zonder accountkoppeling
        if not args.include_completed and s(r.get("status")) == "Completed":
            continue
        live_ids.add(r["company_id"])
        naam_van_project.setdefault(r["company_id"], s(r.get("client_name")))

    if not live_ids:
        sys.exit("geen accounts met een lopend Glint-project gevonden; niets te doen.")

    bedrijven = haal_alles(supa, "companies", "id,name")
    naam_van_bedrijf = {b["id"]: s(b.get("name")) for b in bedrijven}

    # ── 2. Contacten bij die accounts ───────────────────────────────────────
    contacten = haal_alles(supa, "contacts",
                           "id,first_name,last_name,full_name,email,company_id,company_name,"
                           "do_not_email,former,stage,marketing_content_opt_in")
    bestaand = haal_alles(supa, "user_session_invites", "email,token")
    al_uitgenodigd = {low(r.get("email")) for r in bestaand if r.get("email")}
    bezet = {r["token"] for r in bestaand if r.get("token")}

    kandidaten, afgevallen, dubbel, bekend = [], [], 0, 0
    gezien = set()
    for c in contacten:
        if c.get("company_id") not in live_ids:
            continue
        mail = low(c.get("email"))
        if args.only and mail != low(args.only):
            continue
        reden = afvalreden(c, args.require_opt_in)
        if reden:
            afgevallen.append((c, reden))
            continue
        if mail in al_uitgenodigd:
            bekend += 1
            continue                       # tweede run: die heeft zijn link al
        if mail in gezien:
            dubbel += 1
            continue                       # zelfde persoon twee keer in de CRM
        gezien.add(mail)
        kandidaten.append(c)

    kandidaten.sort(key=lambda c: (low(c.get("company_name")) or
                                   low(naam_van_bedrijf.get(c.get("company_id"))),
                                   low(c.get("last_name")), low(c.get("email"))))

    # ── 3. Rijen samenstellen ───────────────────────────────────────────────
    rijen, merge = [], []
    for c in kandidaten:
        token = maak_token(bezet)
        bedrijf = (s(c.get("company_name"))
                   or naam_van_bedrijf.get(c.get("company_id"))
                   or naam_van_project.get(c.get("company_id")) or "")
        rijen.append({
            "token": token,
            "contact_id": c["id"],
            "email": low(c.get("email")),
            "first_name": voornaam(c) or None,
            "company": bedrijf or None,
        })
        q = urllib.parse.urlencode({"t": token})
        merge.append({
            "email": low(c.get("email")),
            "first_name": voornaam(c),
            "company": bedrijf,
            "yes_url": f"{args.base_url}/api/s/click?{q}&a=yes",
            "no_url": f"{args.base_url}/api/s/click?{q}&a=no",
        })

    # ── 4. Rapport ──────────────────────────────────────────────────────────
    print(f"Accounts met een lopend Glint-project : {len(live_ids)}")
    print(f"Nieuwe uitnodigingen                  : {len(rijen)}")
    print(f"Had al een uitnodiging                : {bekend}")
    print(f"Dubbel e-mailadres in de CRM          : {dubbel}")
    print(f"Afgevallen                            : {len(afgevallen)}")
    per_reden = {}
    for _, reden in afgevallen:
        per_reden[reden] = per_reden.get(reden, 0) + 1
    for reden, n in sorted(per_reden.items(), key=lambda x: -x[1]):
        print(f"  - {reden}: {n}")

    if not args.apply:
        print("\nDry-run: er is niets geschreven en er is geen csv gemaakt.")
        print("Eerste tien op de lijst (zonder token, want die bestaan nog niet):")
        for m in merge[:10]:
            print(f"  {m['company'] or '?'} | {m['first_name'] or '?'} | {m['email']}")
        print("\nDraai opnieuw met --apply als deze lijst klopt.")
        return

    if not rijen:
        print("\nNiets nieuws om aan te maken.")
        return

    # ── 5. Schrijven, daarna pas de csv ─────────────────────────────────────
    geschreven = 0
    for i in range(0, len(rijen), BATCH):
        blok = rijen[i:i + BATCH]
        supa.insert("user_session_invites", blok)
        geschreven += len(blok)
        print(f"  geschreven: {geschreven}/{len(rijen)}")

    with open(args.out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["email", "first_name", "company", "yes_url", "no_url"])
        w.writeheader()
        w.writerows(merge)
    os.chmod(args.out, 0o600)

    print(f"\nKlaar. {geschreven} uitnodigingen aangemaakt.")
    print(f"Mailmerge: {args.out}")
    print("Dat bestand bevat de tokens. Naar de mailmerge en daarna weggooien.")
    print("Controleer met: select count(*), count(answer) from user_session_invites;")


if __name__ == "__main__":
    main()
