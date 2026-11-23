#!/usr/bin/env python3
"""Excel-lijst van de aanmeldingen voor een event.

    python3 scripts/export-event-aanmeldingen.py --event zurich-2026
    python3 scripts/export-event-aanmeldingen.py --event amsterdam-2026 --out ~/Desktop/lijst.xlsx

WAAR DE GEGEVENS VANDAAN KOMEN
    De website POST elke inschrijving naar api/website-signal.js, die een rij
    marketing_lead_activity schrijft met event 'event_registered' en de slug in
    de payload. Dit script leest die rijen plus de bijbehorende marketing_leads,
    en plakt er de stand uit event_confirm_invites naast (komt / kan niet /
    bevestigd, en wanneer de bevestiging verstuurd is).

    De slug is de sleutel, niet de datum. Zurich staat nog altijd onder
    zurich-2026 terwijl het event op 28 januari 2027 valt: de pagina verhuisde
    naar /events/zurich-2027, maar de slug waarmee website en CRM elkaar vinden
    verschuift niet mee.

TWEE TABBLADEN, EN WAAROM
    Een deelnemerslijst waar een testrij of een dubbele aanmelding in staat,
    wordt in de zaal geteld alsof het mensen zijn. Daarom gaat alles wat niet
    meetelt naar een tweede tabblad in plaats van eruit: dan kun je zelf zien
    waarom iets er niet bij staat, in plaats van je af te vragen of het
    kwijtgeraakt is.

    Op het tweede tabblad komen:
      - testaanmeldingen (herkend aan 'test' in naam of organisatie)
      - een tweede aanmelding met hetzelfde e-mailadres (de nieuwste wint)
      - aanmeldingen voor een datum die het event niet meer heeft

    Iemand die zich twee keer aanmeldde met VERSCHILLENDE adressen blijft wel in
    de lijst staan, met een notitie in de kolom 'Let op'. Dat kan namelijk ook
    een naamgenoot zijn, en iemand uit een deelnemerslijst halen op grond van een
    vermoeden is erger dan een dubbele regel die je zelf ziet staan.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime

try:
    import openpyxl
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter
except ImportError:
    sys.exit("openpyxl ontbreekt. Installeer met: pip3 install openpyxl")


def load_env_local():
    """Vult ontbrekende env-vars uit .env.local in de repo-root.

    Zo hoeft de service-key niet in je shell-history. .env.local is gitignored.
    """
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
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


def s(v):
    return "" if v is None else str(v).strip()


def haal(url, key, pad):
    req = urllib.request.Request(
        url.rstrip("/") + "/rest/v1" + pad,
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode() or "[]")
    except urllib.error.HTTPError as e:
        sys.exit(f"Supabase GET {pad} faalde ({e.code}): {e.read().decode()[:500]}")


STATUS_NL = {"yes": "komt", "no": "kan niet", "confirmed": "bevestigd"}

KOPPEN = [
    "Nr", "Aangemeld op", "Naam", "E-mail", "Organisatie", "Functie", "Land",
    "Telefoon", "Uitgenodigd door", "Status", "Bevestiging verstuurd",
    "Deelt met organisatoren", "Marketing opt-in", "Aangemeld voor", "Let op",
]


def rij_uit(nr, a, lead, invite, let_op):
    p = a.get("payload") or {}
    sent = s(invite.get("confirmation_sent_at")) if invite else ""
    return [
        nr,
        s(a.get("occurred_at"))[:16].replace("T", " "),
        s(p.get("name")) or s(lead.get("full_name")),
        s(lead.get("email")),
        s(p.get("company")) or s(lead.get("company")),
        s(p.get("role")) or s(lead.get("role")),
        s(p.get("country")),
        s(lead.get("phone")),
        s(p.get("invitedBy")),
        STATUS_NL.get(s(invite.get("answer")) if invite else "", "nog geen antwoord"),
        sent[:16].replace("T", " "),
        "ja" if p.get("consentShare") else "nee",
        "ja" if p.get("consentMarketing") else "nee",
        s(p.get("eventDate")),
        let_op,
    ]


def schrijf_blad(ws, rijen):
    kop = Font(bold=True, color="FFFFFF")
    vul = PatternFill("solid", fgColor="1F3864")
    ws.append(KOPPEN)
    for cel in ws[1]:
        cel.font, cel.fill = kop, vul
        cel.alignment = Alignment(vertical="center")
    for r in rijen:
        ws.append(r)
    breedtes = [5, 17, 24, 34, 30, 38, 14, 16, 16, 18, 17, 12, 14, 14, 44]
    for i, b in enumerate(breedtes, start=1):
        ws.column_dimensions[get_column_letter(i)].width = b
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(KOPPEN))}{max(ws.max_row, 1)}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--event", required=True, help="event_slug, bv. zurich-2026")
    ap.add_argument("--out", default=None, help="pad voor het xlsx-bestand")
    ap.add_argument("--datum", default=None,
                    help="de datum die het event nu heeft (JJJJ-MM-DD). Aanmeldingen "
                         "voor een andere datum gaan naar het tweede tabblad. Standaard "
                         "de datum die het vaakst voorkomt.")
    args = ap.parse_args()

    load_env_local()
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        sys.exit("SUPABASE_URL en SUPABASE_SERVICE_KEY ontbreken (zet ze in .env.local).")

    slug = args.event
    acts = haal(url, key, (
        "/marketing_lead_activity"
        "?select=occurred_at,payload,marketing_lead_id"
        "&event=eq.event_registered"
        f"&payload->>eventSlug=eq.{urllib.parse.quote(slug)}"
        "&order=occurred_at.asc&limit=2000"))
    if not acts:
        sys.exit(f"Geen aanmeldingen gevonden voor event '{slug}'.")

    ids = sorted({a["marketing_lead_id"] for a in acts if a.get("marketing_lead_id")})
    leads = {}
    for i in range(0, len(ids), 100):
        groep = ",".join(f'"{x}"' for x in ids[i:i + 100])
        for l in haal(url, key, f"/marketing_leads?select=id,email,full_name,company,role,phone&id=in.({groep})"):
            leads[l["id"]] = l

    invites = {}
    for inv in haal(url, key, (
            "/event_confirm_invites?select=email,answer,confirmation_sent_at"
            f"&event_slug=eq.{urllib.parse.quote(slug)}&limit=2000")):
        invites[s(inv.get("email")).lower()] = inv

    # De datum die het event nu heeft: meegegeven, anders de meest voorkomende.
    if args.datum:
        huidige_datum = args.datum
    else:
        tel = defaultdict(int)
        for a in acts:
            tel[s((a.get("payload") or {}).get("eventDate"))] += 1
        huidige_datum = max(tel, key=lambda d: tel[d]) if tel else ""

    # Laatste aanmelding per e-mailadres: wie zich opnieuw aanmeldt heeft zijn
    # gegevens meestal bijgewerkt, dus de nieuwste rij is de juiste.
    laatste_per_mail = {}
    for a in acts:
        lead = leads.get(a.get("marketing_lead_id"), {})
        mail = s(lead.get("email")).lower()
        if mail:
            laatste_per_mail[mail] = a.get("occurred_at")

    # Dezelfde naam op twee adressen: blijft staan, met een notitie.
    mails_per_naam = defaultdict(set)
    for a in acts:
        lead = leads.get(a.get("marketing_lead_id"), {})
        naam = (s((a.get("payload") or {}).get("name")) or s(lead.get("full_name"))).lower()
        mail = s(lead.get("email")).lower()
        if naam and mail:
            mails_per_naam[naam].add(mail)

    meetellend, apart = [], []
    for a in acts:
        lead = leads.get(a.get("marketing_lead_id"), {})
        p = a.get("payload") or {}
        mail = s(lead.get("email")).lower()
        naam = (s(p.get("name")) or s(lead.get("full_name"))).lower()
        invite = invites.get(mail, {})

        tekst = (naam + " " + s(p.get("company")).lower() + " " + s(lead.get("company")).lower())
        if "test" in tekst or "delete me" in tekst:
            apart.append((a, lead, invite, "testaanmelding"))
            continue
        if laatste_per_mail.get(mail) and a.get("occurred_at") != laatste_per_mail[mail]:
            apart.append((a, lead, invite, "zelfde e-mailadres meldde zich later opnieuw aan"))
            continue
        if huidige_datum and s(p.get("eventDate")) and s(p.get("eventDate")) != huidige_datum:
            apart.append((a, lead, invite,
                          f"aangemeld voor {s(p.get('eventDate'))}, het event staat op {huidige_datum}"))
            continue

        anders = sorted(m for m in mails_per_naam.get(naam, set()) if m != mail)
        meetellend.append((a, lead, invite,
                           f"ook aangemeld als {', '.join(anders)}" if anders else ""))

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Aanmeldingen"
    schrijf_blad(ws, [rij_uit(i, *x) for i, x in enumerate(meetellend, start=1)])
    if apart:
        schrijf_blad(wb.create_sheet("Telt niet mee"),
                     [rij_uit(i, *x) for i, x in enumerate(apart, start=1)])

    out = args.out or os.path.expanduser(f"~/Downloads/aanmeldingen-{slug}-{date.today():%Y-%m-%d}.xlsx")
    wb.save(os.path.expanduser(out))
    print(f"{len(meetellend)} aanmeldingen, {len(apart)} apart gezet")
    print(f"Event staat op {huidige_datum or 'onbekende datum'}")
    print(out)


if __name__ == "__main__":
    main()
