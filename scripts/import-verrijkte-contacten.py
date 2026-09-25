#!/usr/bin/env python3
"""
Importeert een door Surfe verrijkt contactbestand in het CRM.

Dit is de terugweg van scripts/maak-surfe-lijst.py: dat bestand gaat eruit, dit
leest het weer in. Bedoeld voor de rondes waarin we per bedrijf namen en
adressen verzamelen (de Glint-markt), niet voor een eenmalige lijst.

WAT HET DOET, EN WAAROM PRECIES ZO
  * Bedrijven worden op DOMEIN gekoppeld, niet op naam. Surfe levert juridische
    namen ('Fidelity Information Services, LLC') waar de analyse en het CRM een
    korte naam gebruiken ('FIS'). Op naam matchen liet eerder 14 bedrijven ten
    onrechte als onbekend zien.
  * Bestaat het bedrijf niet, dan wordt het aangemaakt met het domein erbij. Een
    leeg websiteveld stuurt de volgende verrijkingsronde de verkeerde kant op.
  * Contacten die al bestaan (zelfde adres, of zelfde naam bij hetzelfde bedrijf)
    worden overgeslagen, niet bijgewerkt. Een import hoort niets te overschrijven
    wat iemand met de hand heeft gezet.
  * --skip-adres houdt een adres tegen zonder de persoon over te slaan. Nodig
    voor gevallen als een bestuursfunctie-adres dat bij het verkeerde bedrijf hoort.

GEBRUIK
  python3 scripts/import-verrijkte-contacten.py --file <csv> [--bron "..."]     # dry-run
  python3 scripts/import-verrijkte-contacten.py --file <csv> --apply
"""
import argparse, csv, json, os, re, sys, unicodedata
import urllib.error, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def env():
    w = {}
    for pad in (os.path.join(ROOT, '.env.local'),
                '/Users/olivierarnolds/Desktop/eclektik-crm/.env.local'):
        if os.path.exists(pad):
            for r in open(pad):
                if '=' in r and not r.strip().startswith('#'):
                    k, _, v = r.partition('=')
                    w[k.strip()] = v.strip().strip('"')
            break
    if not w.get('SUPABASE_URL') or not w.get('SUPABASE_SERVICE_KEY'):
        sys.exit('SUPABASE_URL of SUPABASE_SERVICE_KEY ontbreekt in .env.local')
    return w['SUPABASE_URL'].rstrip('/'), w['SUPABASE_SERVICE_KEY']


def roep(url, key, pad, methode='GET', body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url + pad, data=data, method=methode, headers={
        'apikey': key, 'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json', 'Prefer': 'return=representation'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            tekst = r.read().decode()
            return json.loads(tekst) if tekst else []
    except urllib.error.HTTPError as e:
        sys.exit(f'{methode} {pad} faalde: {e.code} {e.read().decode()[:400]}')


def haal(url, key, tabel, kolommen):
    uit, off = [], 0
    while True:
        blok = roep(url, key, f'/rest/v1/{tabel}?select={urllib.parse.quote(kolommen)}&limit=1000&offset={off}')
        uit += blok
        if len(blok) < 1000:
            return uit
        off += 1000


def dom(s):
    s = re.sub(r'^https?://', '', (s or '').strip().lower()).split('/')[0]
    return s.removeprefix('www.')


LEGAAL = re.compile(r'\b(inc|ltd|plc|bv|nv|ag|sa|gmbh|corporation|corp|group|holding|'
                    r'holdings|limited|co|llc|company)\b', re.I)


def kale_naam(s):
    """Bedrijfsnaam zonder rechtsvorm en leestekens, om 'NCC Group' en
    'NCC Group PLC' als hetzelfde te herkennen."""
    s = re.sub(r'\s*\(.*?\)', '', s or '')
    return re.sub(r'[^a-z0-9]', '', LEGAAL.sub('', s).lower())


def sleutel(s):
    s = unicodedata.normalize('NFKD', (s or '')).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]', '', s.lower())


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--file', required=True)
    p.add_argument('--bron', default='Glint zoekronde sept2026')
    p.add_argument('--apply', action='store_true')
    p.add_argument('--skip-adres', default='', help='Namen (komma-gescheiden) die wel aangemaakt worden maar zonder adres.')
    args = p.parse_args()
    url, key = env()
    geen_adres = {sleutel(n) for n in args.skip_adres.split(',') if n.strip()}

    bedrijven = haal(url, key, 'companies', 'id,name,website')
    contacten = haal(url, key, 'contacts', 'id,full_name,email,company_id')
    op_dom, op_naam = {}, {}
    for b in bedrijven:
        if dom(b.get('website')):
            op_dom.setdefault(dom(b['website']), b)
            # Ook op de domeinwortel, want een account kan op een oud of
            # regionaal domein staan: ABB stond op global.abb en NCC Group op
            # nccgroup.trust. Zonder deze tweede sleutel maakt de import een
            # tweede account aan voor een bedrijf dat er al is, en dat merk je
            # pas als de contacten over twee kaarten verdeeld blijken.
            op_dom.setdefault(dom(b['website']).split('.')[0], b)
        op_naam.setdefault(kale_naam(b['name']), b)
    op_mail = {(c.get('email') or '').lower() for c in contacten if c.get('email')}
    op_naam_bedrijf = {(sleutel(c.get('full_name')), c.get('company_id')) for c in contacten}

    rijen = list(csv.DictReader(open(args.file)))
    gezien, plan, over = set(), [], []
    nieuwe_bedrijven = {}

    for x in rijen:
        naam = f"{x['First Name']} {x['Last Name']}".strip()
        d = dom(x.get('Company Website'))
        k = (sleutel(naam), d)
        if k in gezien:
            over.append((naam, 'dubbel in het bestand')); continue
        gezien.add(k)

        adres = (x.get('Email') or '').strip().lower()
        if sleutel(naam) in geen_adres:
            over.append((naam, 'adres bewust weggelaten')); adres = ''
        if adres and adres in op_mail:
            over.append((naam, 'adres staat al in het CRM')); continue

        b = op_dom.get(d) or op_dom.get(d.split('.')[0]) or op_naam.get(kale_naam(x['Company Name']))
        if not b and d:
            nieuwe_bedrijven.setdefault(d, x['Company Name'])
        if b and (sleutel(naam), b['id']) in op_naam_bedrijf:
            over.append((naam, 'staat al bij dit bedrijf')); continue

        plan.append({'naam': naam, 'vn': x['First Name'], 'an': x['Last Name'],
                     'titel': x.get('Job Title'), 'adres': adres, 'domein': d,
                     'bedrijf': x['Company Name'], 'li': x.get('LinkedIn URL'),
                     'land': x.get('Country'), 'stad': x.get('City')})

    print(f"{len(rijen)} rijen gelezen")
    print(f"  aan te maken contacten : {len(plan)} (waarvan {sum(1 for r in plan if r['adres'])} met adres)")
    print(f"  aan te maken bedrijven : {len(nieuwe_bedrijven)}")
    print(f"  overgeslagen           : {len(over)}")
    for n, reden in over:
        print(f'     {n}: {reden}')
    if not args.apply:
        print('\nDry-run. Voeg --apply toe om het echt te doen.')
        return

    for d, naam in nieuwe_bedrijven.items():
        b = roep(url, key, '/rest/v1/companies', 'POST', {
            'name': naam, 'website': f'https://www.{d}', 'type': 'Expected Glint Customers',
            'notes': f'Aangemaakt door {os.path.basename(__file__)} op basis van de Glint-marktanalyse.'})
        op_dom[d] = b[0]
        print(f"  bedrijf aangemaakt: {naam} ({b[0].get('account_no')})")

    nieuw = []
    for r in plan:
        b = op_dom.get(r['domein'])
        nieuw.append({
            'full_name': r['naam'], 'first_name': r['vn'], 'last_name': r['an'],
            'title': r['titel'] or None, 'company_id': b['id'] if b else None,
            'company_name': b['name'] if b else r['bedrijf'],
            'email': r['adres'] or None,
            'email_status': 'found_surfe' if r['adres'] else None,
            'linkedin_url': r['li'] or None, 'country': r['land'] or None,
            'source': args.bron, 'stage': 'New',
        })
    for i in range(0, len(nieuw), 100):
        roep(url, key, '/rest/v1/contacts', 'POST', nieuw[i:i + 100])
    print(f"\n{len(nieuw)} contacten aangemaakt.")


if __name__ == '__main__':
    main()
