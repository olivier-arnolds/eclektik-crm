#!/usr/bin/env python3
"""
Bouwt een Surfe-invoerbestand voor de Glint-prospects die nog een e-mailadres
missen of van wie het adres niet gevalideerd is.

WAAROM DIT SCRIPT
  De vorige ronde was handwerk. Dit gaat vaker gebeuren: de collega keurt rollen,
  wij zoeken adressen, en na elke ronde blijft er een rest over. Het bedrijfs-
  domein komt uit het CRM, want Surfe vindt met naam plus domein veel meer dan
  met naam plus bedrijfsnaam.

  Het waarschuwt ook over domeinen die niet bij de bedrijfsnaam lijken te horen.
  In het CRM staat historische rommel (Volvo Cars stond op axus.be), en zo'n
  domein stuurt de hele verrijking voor dat bedrijf de verkeerde kant op zonder
  dat je het merkt.

GEBRUIK
  python3 scripts/maak-surfe-lijst.py [--excel PAD] [--out PAD]
  Leest SUPABASE_URL + SUPABASE_SERVICE_KEY uit .env.local. Schrijft niets terug.
"""
import argparse, csv, json, os, re, sys, unicodedata
import urllib.parse, urllib.request
from datetime import date

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOD, GROEN = 'FFFF0000', 'FF00B050'


def env():
    waarden = {}
    with open(os.path.join(ROOT, '.env.local')) as f:
        for regel in f:
            if '=' in regel and not regel.strip().startswith('#'):
                k, _, v = regel.partition('=')
                waarden[k.strip()] = v.strip().strip('"')
    if not waarden.get('SUPABASE_URL') or not waarden.get('SUPABASE_SERVICE_KEY'):
        sys.exit('SUPABASE_URL of SUPABASE_SERVICE_KEY ontbreekt in .env.local')
    return waarden['SUPABASE_URL'].rstrip('/'), waarden['SUPABASE_SERVICE_KEY']


def haal(url, key, tabel, kolommen, filter_=''):
    uit, offset = [], 0
    while True:
        pad = (f'{url}/rest/v1/{tabel}?select={urllib.parse.quote(kolommen)}'
               f'&limit=1000&offset={offset}{filter_}')
        req = urllib.request.Request(pad, headers={
            'apikey': key, 'Authorization': f'Bearer {key}', 'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=120) as r:
            blok = json.loads(r.read().decode())
        uit.extend(blok)
        if len(blok) < 1000:
            return uit
        offset += 1000


def sleutel(s):
    s = unicodedata.normalize('NFKD', (s or '')).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]', '', s.lower())


def domein(website):
    d = re.sub(r'^https?://', '', (website or '').strip().lower())
    return d.split('/')[0].removeprefix('www.') or None


def domein_past(bedrijf, dom):
    """Ruwe controle of het domein bij de naam hoort. Bewust soepel: hij hoeft
    alleen de duidelijke missers te vangen (Volvo Cars op axus.be), niet elke
    afkorting af te keuren."""
    if not dom:
        return False
    kern = sleutel(dom.split('.')[0])
    naam = sleutel(bedrijf)
    if not kern or not naam:
        return False
    if kern in naam or naam in kern:
        return True
    # Beginletters, voor namen als "A.T. Kearney" -> kearney
    woorden = [w for w in re.split(r'[^A-Za-z0-9]+', bedrijf or '') if w]
    return any(sleutel(w) and sleutel(w) in kern for w in woorden if len(w) > 3)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--excel', default=os.path.expanduser(
        '~/Downloads/glint-prospects-totaaloverzicht-2026-09-22 (1).xlsx'))
    p.add_argument('--out', default=os.path.expanduser(
        f'~/Downloads/surfe-glint-ronde2-{date.today():%Y-%m-%d}.csv'))
    args = p.parse_args()
    url, key = env()

    bedrijven = haal(url, key, 'companies', 'id,name,website,type')
    dom_van = {b['name']: domein(b.get('website')) for b in bedrijven}
    contacten = haal(url, key, 'contacts', 'id,full_name,first_name,last_name,title,email,company_id,source')
    naam_van_bedrijf = {b['id']: b['name'] for b in bedrijven}

    rijen, twijfel = [], []

    # 1. De contacten in het CRM zonder e-mailadres die bij deze markt horen.
    #
    # Niet alleen op accounttype selecteren: de vervangers die de collega
    # aandroeg hangen soms aan een account dat als 'Prospect' staat (zoals
    # AllianceBernstein). Die vielen daardoor uit de lijst en kwamen zonder CRM
    # ID terug, waardoor hun adres met de hand teruggezocht moest worden. De
    # herkomst is hier het betere signaal.
    glint_ids = {b['id'] for b in bedrijven if b.get('type') == 'Expected Glint Customers'}
    HERKOMST = {'glint marktanalyse sept2026'}
    for c in contacten:
        bij_markt = (c.get('company_id') in glint_ids
                     or (c.get('source') or '').lower() in HERKOMST)
        if not bij_markt:
            continue
        if (c.get('email') or '').strip():
            continue
        bedrijf = naam_van_bedrijf.get(c['company_id'], '')
        rijen.append({
            'Actie': 'zoeken', 'First Name': c.get('first_name') or '',
            'Last Name': c.get('last_name') or '', 'Full Name': c.get('full_name') or '',
            'Job Title': c.get('title') or '', 'Company Name': bedrijf,
            'Company Domain': dom_van.get(bedrijf) or '', 'Email': '',
            'Herkomst': c.get('source') or 'CRM', 'CRM ID': c['id'],
        })

    # 2. Uit de beoordeelde Excel: alles wat NIET rood is en nog geen geldig
    #    adres heeft. Rood is door de collega afgekeurd op rol, die hoeven niet.
    wb = openpyxl.load_workbook(args.excel)
    ws = wb['Surfe Prioriteit A']
    kop = [c.value for c in ws[1]]
    K = {k: i for i, k in enumerate(kop)}
    bekend = {sleutel(r['Full Name']) for r in rijen}
    for rij in ws.iter_rows(min_row=2):
        kleuren = {c.fill.fgColor.rgb for c in rij if c.fill and c.fill.fgColor}
        if ROOD in kleuren:
            continue
        v = [c.value for c in rij]
        adres = v[K['Adres via Surfe']] or v[K['Adres vooraf']]
        geldig = (v[K['Validatie']] or '').upper() == 'VALID'
        if adres and geldig:
            continue
        naam = v[K['Naam']] or ''
        if sleutel(naam) in bekend:
            continue
        deel = naam.split(' ', 1)
        bedrijf = v[K['Bedrijf']] or ''
        rijen.append({
            'Actie': 'valideren' if adres else 'zoeken',
            'First Name': deel[0], 'Last Name': deel[1] if len(deel) > 1 else '',
            'Full Name': naam, 'Job Title': v[K['Functie']] or '',
            'Company Name': bedrijf, 'Company Domain': dom_van.get(bedrijf) or '',
            'Email': adres or '', 'Herkomst': v[K['Herkomst']] or '', 'CRM ID': '',
        })
        bekend.add(sleutel(naam))

    # Staat er geen domein in het CRM maar kennen we wel een adres van die
    # persoon, dan is het domein daaruit af te leiden. Dat is beter bewijs dan
    # een domein raden op de bedrijfsnaam.
    for r in rijen:
        if not r['Company Domain'] and '@' in (r['Email'] or ''):
            r['Company Domain'] = r['Email'].split('@')[-1].strip().lower()

    for r in rijen:
        if r['Company Domain'] and not domein_past(r['Company Name'], r['Company Domain']):
            twijfel.append((r['Company Name'], r['Company Domain']))
        if not r['Company Domain']:
            twijfel.append((r['Company Name'], '(geen domein in het CRM)'))

    kol = ['Actie', 'First Name', 'Last Name', 'Full Name', 'Job Title',
           'Company Name', 'Company Domain', 'Email', 'Herkomst', 'CRM ID']
    rijen.sort(key=lambda r: (r['Company Name'].lower(), r['Last Name'].lower()))
    with open(args.out, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=kol)
        w.writeheader()
        w.writerows(rijen)

    print(f'Geschreven: {args.out}')
    print(f'  {len(rijen)} rijen, waarvan {sum(1 for r in rijen if r["Actie"] == "valideren")} valideren '
          f'en {sum(1 for r in rijen if r["Actie"] == "zoeken")} zoeken')
    if twijfel:
        print(f'\n  LET OP, {len(set(twijfel))} bedrijven met een twijfelachtig of ontbrekend domein:')
        for b, d in sorted(set(twijfel)):
            print(f'    {b}: {d}')


if __name__ == '__main__':
    main()
