#!/usr/bin/env python3
"""
Importeert de aanvullende contactenlijst van 18 september in de e-mailcampagne
Amsterdam 2026.

WAAROM EEN APART SCRIPT
  Deze lijst heeft weer een andere kolomindeling (CRM-export met werkgevers-
  historie) en een eigen selectieregel: alleen director- en head-niveau gaat mee,
  omdat de bestaande teksten voor dat publiek geschreven zijn. Managers krijgen
  later een eigen tekst en komen in een tweede ronde.

GEBRUIK
  python3 scripts/import-event-contacts-18sept.py --file "/pad/naar/lijst.csv"
  python3 scripts/import-event-contacts-18sept.py --file "..." --apply
"""
import argparse, csv, importlib.util, os, re, sys, urllib.parse
from datetime import datetime, timezone

_spec = importlib.util.spec_from_file_location(
    "outreach_import_base",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "import-outreach-list.py"))
_base = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_base)
Supa, load_env_local, s, norm_name = _base.Supa, _base.load_env_local, _base.s, _base.norm_name
# naam() vouwt ook dubbele spaties samen; s() haalt de Excel-escapes al weg.
naam, opgeschoond = _base.naam, _base.opgeschoond

CAMPAGNE = "Amsterdam 2026"
# Alleen dit niveau: de bestaande teksten spreken over sturen en meten op
# organisatieniveau, en dat is het gesprek van een director of hoofd HR.
NIVEAUS = {"director", "head"}
# Een postbus is geen persoon. Een uitnodiging voor een besloten middag aan
# careers@ is weggegooid krediet.
ROLACCOUNT = re.compile(r"^(careers?|info|hr|recruit|vacature|sollicit|contact|office|team|jobs?|werkenbij)$", re.I)

low = lambda v: s(v).lower()
def li_slug(u):
    m = re.search(r"linkedin\.com/in/([^/?#]+)", low(u))
    return m.group(1) if m else None
def naamsleutel(a, b): return re.sub(r"[^a-z0-9]", "", low(a) + low(b))
def domein(e): return low(e).split("@")[1] if "@" in low(e) else None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--all-levels", action="store_true",
                    help="geen niveaufilter. Voor een lijst die vooraf al op functietitel "
                         "geselecteerd is; de Seniorities-labels van de verrijkingstool zijn "
                         "onbetrouwbaar (een CHRO komt er soms uit als Manager of leeg).")
    ap.add_argument("--managers", action="store_true",
                    help="importeer juist de managers, met een eigen tekst en zonder opvolgbericht")
    args = ap.parse_args()

    load_env_local()
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key: sys.exit("SUPABASE_URL / SUPABASE_SERVICE_KEY ontbreken (.env.local).")
    supa = Supa(url, key)

    rows = list(csv.DictReader(open(args.file, encoding="utf-8-sig")))

    camp = supa._req("GET", f"/outreach_campaign?select=id&name=eq.{urllib.parse.quote(CAMPAGNE)}&limit=1")
    if not camp: sys.exit(f"campagne '{CAMPAGNE}' niet gevonden")
    campaign_id = camp[0]["id"]

    bestaand = supa.select_all("outreach_contact", "email,linkedin_url,first_name,last_name,status,campaign_id")
    op_email = {low(r["email"]) for r in bestaand if r.get("email")}
    op_li = {li_slug(r["linkedin_url"]) for r in bestaand if r.get("linkedin_url")}
    op_naam = {naamsleutel(r.get("first_name"), r.get("last_name")) for r in bestaand}
    contacts = supa.select_all("contacts", "email,do_not_email")
    dne = {low(c["email"]) for c in contacts if c.get("email") and c.get("do_not_email")}

    # Tekst overnemen van de generieke variant die al in de campagne staat, zodat
    # deze groep exact dezelfde uitnodiging krijgt als de rest.
    # De filterwaarde moet ge-urlencodeerd, anders struikelt http.client over de
    # spaties in de zoekterm.
    like = urllib.parse.quote("like.Hi%AI is spreading fast%", safe="")
    sjabloon = supa._req("GET",
        f"/outreach_contact?select=msg1_subject,msg1_body,msg2_subject,msg2_body"
        f"&campaign_id=eq.{campaign_id}&msg1_body={like}&limit=1")
    if not sjabloon: sys.exit("generieke sjabloontekst niet gevonden in de campagne")
    tpl = sjabloon[0]
    def persoonlijk(veld, voornaam):
        tekst = tpl[veld] or ""
        return re.sub(r"^Hi [^,\n]+,", f"Hi {voornaam}," if voornaam else "Hi there,", tekst)

    MANAGER_SUBJECT = "AI lands on your team before it reaches the boardroom."
    MANAGER_BODY = """AI decisions are usually made a few floors up. You are the one who sees what they do to the work: a changed schedule, another screen to check, a process that suddenly assumes something it did not before.

That view is missing in most boardrooms, and it is what we are putting on the table on 6 October. Where AI lands as help and where as extra pressure, per employee group. What you can measure without waiting for the annual survey. And how to tell a working pilot from an expensive one. You fill in a one-page worksheet for your own team and take it home.

An intimate afternoon with peers, opened by Prof. Marc van Veldhoven (Tilburg University). Zoom office, Zuidas, 12:15 to 16:30, invite-only.

Programme and registration: https://www.eclectik.co/events/amsterdam-2026

Marco"""

    nu = datetime.now(timezone.utc).isoformat()
    mee, afval = [], {}
    def weg(reden): afval[reden] = afval.get(reden, 0) + 1

    for r in rows:
        email, voor, achter = low(r["Email"]), naam(r["First Name"]), naam(r["Last Name"])
        niveaus = {x.strip().lower() for x in s(r["Seniorities"]).split(",") if x.strip()}
        is_senior = bool(niveaus & NIVEAUS)
        if not args.all_levels:
            if args.managers and is_senior: weg("al meegenomen als director of head"); continue
            if not args.managers and not is_senior: weg("niet op director- of head-niveau"); continue
        if not email or "@" not in email: weg("geen e-mailadres"); continue
        if low(r["Email Validation Status"]) != "valid": weg("niet gevalideerd"); continue
        if ROLACCOUNT.match(voor) or ROLACCOUNT.match(achter): weg("rolaccount, geen persoon"); continue
        if email in dne: weg("do-not-email in het CRM"); continue
        if email in op_email: weg("adres staat al in de campagne"); continue
        slug = li_slug(r["LinkedIn URL"])
        if slug and slug in op_li: weg("profiel staat al in de campagne"); continue
        if naamsleutel(voor, achter) in op_naam: weg("zelfde naam staat al in de campagne"); continue

        op_email.add(email)
        mee.append({
            "campaign_id": campaign_id, "channel": "email",
            "first_name": voor or None, "last_name": achter or None,
            "title": naam(r["Job Title"]) or None,
            "email": email, "email_domain": domein(email),
            "company": naam(r["Company Name"]) or None,
            "website": s(r["Company Website"]) or None,
            "location": s(r["City"]) or None,
            "linkedin_url": s(r["LinkedIn URL"]) or None,
            "priority_tier": "medium" if args.managers else "good",
            "priority_label": ("Aanvulling 18 sept (manager)" if args.managers
                               else "Aanvulling 18 sept (director/head)"),
            "outreach_prio": None, "is_reserve": False,
            "source": "event_contacts_18sept2026.csv",
            "msg1_subject": MANAGER_SUBJECT if args.managers else tpl["msg1_subject"],
            "msg1_body": (f"Hi {voor or 'there'},\n\n{MANAGER_BODY}" if args.managers
                          else persoonlijk("msg1_body", voor)),
            # Managers krijgen bewust GEEN opvolgbericht. De selectie slaat stap 2
            # dan vanzelf over, dus er kan ook niet per ongeluk een tweede mail uit.
            "msg2_subject": None if args.managers else tpl["msg2_subject"],
            "msg2_body": None if args.managers else persoonlijk("msg2_body", voor),
            "status": "queued", "next_action_at": nu,
        })

    print(f"\nrijen in bestand : {len(rows)}")
    if opgeschoond["cellen"]:
        print(f"  Excel-rommel opgeruimd: {opgeschoond['cellen']} cellen (_x000D_ e.d.)")
    for k, v in sorted(afval.items(), key=lambda x: -x[1]): print(f"  {v:5d}  {k}")
    print(f"  {len(mee):5d}  TOEVOEGEN")
    if not args.apply:
        print("\nDry-run. Voeg --apply toe om te importeren."); return

    for i in range(0, len(mee), 100):
        res = supa.insert("outreach_contact", mee[i:i + 100])
        print(f"  batch {i // 100 + 1}: {len(res)} weggeschreven")
    print(f"\nKlaar. {len(mee)} toegevoegd aan {CAMPAGNE}.")

if __name__ == "__main__":
    main()
