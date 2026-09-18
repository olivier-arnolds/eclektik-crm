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

    nu = datetime.now(timezone.utc).isoformat()
    mee, afval = [], {}
    def weg(reden): afval[reden] = afval.get(reden, 0) + 1

    for r in rows:
        email, voor, achter = low(r["Email"]), s(r["First Name"]), s(r["Last Name"])
        niveaus = {x.strip().lower() for x in s(r["Seniorities"]).split(",") if x.strip()}
        if not niveaus & NIVEAUS: weg("niet op director- of head-niveau"); continue
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
            "title": s(r["Job Title"]) or None,
            "email": email, "email_domain": domein(email),
            "company": s(r["Company Name"]) or None,
            "website": s(r["Company Website"]) or None,
            "location": s(r["City"]) or None,
            "linkedin_url": s(r["LinkedIn URL"]) or None,
            "priority_tier": "good",
            "priority_label": "Aanvulling 18 sept (director/head)",
            "outreach_prio": None, "is_reserve": False,
            "source": "event_contacts_18sept2026.csv",
            "msg1_subject": tpl["msg1_subject"], "msg1_body": persoonlijk("msg1_body", voor),
            "msg2_subject": tpl["msg2_subject"], "msg2_body": persoonlijk("msg2_body", voor),
            "status": "queued", "next_action_at": nu,
        })

    print(f"\nrijen in bestand : {len(rows)}")
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
