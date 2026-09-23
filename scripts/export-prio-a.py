#!/usr/bin/env python3
"""
Excel-overzicht van alle Prioriteit A-bedrijven uit de Glint-marktanalyse, met
de contacten die we er inmiddels van kennen.

De rolkwalificatie (A/B/C) volgt het oordeel dat de collega in september maakte:
niet senioriteit maar ONDERWERP bepaalt of iemand de juiste persoon is. Van de
functies die hij wegstreepte had 25% een senior titel, tegen 59% van wat hij
liet staan; 'people' en 'analytics' kwamen nul keer voor bij de afgekeurden.

GEBRUIK
  python3 scripts/export-prio-a.py [--excel PAD] [--out PAD]
"""
import argparse, json, os, re, sys, unicodedata
import urllib.parse, urllib.request
from datetime import date

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Onderwerp boven senioriteit. Zie de kop van dit bestand.
RAAK = re.compile(r'people analytics|employee listening|colleague listening|employee experience|'
                  r'people experience|people data|hr analytics|people insights|workforce analytics|'
                  r'people systems|people technology|hris|hr technology|organisation effectiveness|'
                  r'organizational effectiveness|engagement|people transformation|people strategy|'
                  # Leestekens mogen er tussen staan: LSEG schrijft 'Head of People, Data &
                  # Analytics'. Een patroon dat 'people data' aaneengesloten verwacht mist die,
                  # en dan belandt juist de doelrol in de categorie algemeen HR.
                  r'people[\s,&-]+(data|analytics|insights)', re.I)
# Ook de hoogste HR-baan zonder het woord 'chief': Oracle schrijft die als
# 'Executive Vice President Human Resources'. Dat is dezelfde rol als een CHRO en
# hoort niet als algemeen HR weggezet te worden. Een gewone 'VP HR' bij een
# concern is dat juist niet, vandaar de eis van EVP of SVP.
TOP = re.compile(r'chief (people|human resources) officer|\bCHRO\b|chief people|'
                 r'chief innovation & people|'
                 r'\b(evp|svp|executive vice president|senior vice president)\b[^,]{0,18}'
                 r'\b(human resources|people)\b', re.I)
AFVAL = re.compile(r'talent acquisition|recruit|early careers|early talent|leadership development|'
                   r'\blearning\b|total rewards|compensation|benefit|mobility|payroll|diversity|'
                   r'inclusion|labor relations', re.I)

LEGAAL = re.compile(r'\b(inc|ltd|plc|bv|nv|ag|sa|gmbh|corporation|corp|group|holding|holdings|'
                    r'limited|co|llc|company)\b', re.I)


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
    if not w.get('SUPABASE_URL'):
        sys.exit('SUPABASE_URL ontbreekt in .env.local')
    return w['SUPABASE_URL'].rstrip('/'), w['SUPABASE_SERVICE_KEY']


def haal(url, key, tabel, kolommen):
    uit, off = [], 0
    while True:
        req = urllib.request.Request(
            f'{url}/rest/v1/{tabel}?select={urllib.parse.quote(kolommen)}&limit=1000&offset={off}',
            headers={'apikey': key, 'Authorization': f'Bearer {key}'})
        with urllib.request.urlopen(req, timeout=120) as r:
            blok = json.loads(r.read().decode())
        uit += blok
        if len(blok) < 1000:
            return uit
        off += 1000


def dom(s):
    s = re.sub(r'^https?://', '', (s or '').strip().lower()).split('/')[0]
    return s.removeprefix('www.')


def kaal(s):
    s = re.sub(r'\s*\(.*?\)', '', s or '')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]', '', LEGAAL.sub('', s).lower())


def rol(titel):
    t = titel or ''
    if RAAK.search(t):  return 'A onderwerp klopt'
    if TOP.search(t):   return 'B CPO/CHRO'
    if AFVAL.search(t): return 'D andere discipline'
    return 'C algemeen HR'


def kop(ws, kolommen, rijen):
    vul = PatternFill('solid', fgColor='1F3864')
    for i, naam in enumerate(kolommen, 1):
        c = ws.cell(row=1, column=i, value=naam)
        c.font = Font(bold=True, color='FFFFFF'); c.fill = vul
        c.alignment = Alignment(vertical='center')
    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = f'A1:{get_column_letter(len(kolommen))}1'
    for i, naam in enumerate(kolommen, 1):
        langste = max([len(str(naam))] + [len(str(r[i-1] or '')) for r in rijen[:300]])
        ws.column_dimensions[get_column_letter(i)].width = min(max(langste + 2, 10), 48)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--excel', default=os.path.expanduser(
        '~/Downloads/glint-prospects-totaaloverzicht-2026-09-22 (1).xlsx'))
    p.add_argument('--domeinen', default=os.path.expanduser(
        '~/Claude/Projects/Sales Pipeline/prio-a-zonder-contacten-2026-09-23-met-website.csv'),
        help='CSV met kolommen Bedrijf en Website; nodig omdat de analyse korte namen '
             'gebruikt ("FIS") waar het CRM de juridische naam heeft.')
    p.add_argument('--out', default=os.path.expanduser(
        f'~/Downloads/prioriteit-a-bedrijven-en-contacten-{date.today():%Y-%m-%d}.xlsx'))
    args = p.parse_args()
    url, key = env()

    bedrijven = haal(url, key, 'companies', 'id,name,account_no,website,country,type')
    contacten = haal(url, key, 'contacts',
                     'id,full_name,title,email,linkedin_url,company_id,stage,former,'
                     'do_not_email,source,email_status')

    op_dom, op_naam = {}, {}
    for b in bedrijven:
        d = dom(b.get('website'))
        if d:
            op_dom.setdefault(d, b); op_dom.setdefault(d.split('.')[0], b)
        op_naam.setdefault(kaal(b['name']), b)
    per_bedrijf = {}
    for c in contacten:
        per_bedrijf.setdefault(c.get('company_id'), []).append(c)

    # De analyse gebruikt korte namen, het CRM juridische. Zonder een brug
    # daartussen vindt deze export voor FIS of Oracle geen enkel contact terwijl
    # ze er wel zijn, en dat leest als een gat dat er niet is.
    import csv as _csv
    domein_van = {}
    if os.path.exists(args.domeinen):
        for x in _csv.DictReader(open(args.domeinen)):
            if x.get('Website'):
                domein_van[x['Bedrijf']] = dom(x['Website'])

    awb = openpyxl.load_workbook(args.excel, data_only=True)
    aws = awb['Marktanalyse collega']
    kopjes = [c.value for c in aws[1]]
    K = {k: i for i, k in enumerate(kopjes)}

    rij_b, rij_c = [], []
    for r in aws.iter_rows(min_row=2, values_only=True):
        if not any(r) or str(r[K['Priority']] or '').strip().upper() != 'A':
            continue
        naam = r[K['Company']]
        d = domein_van.get(naam, '')
        b = (op_dom.get(d) or op_dom.get(d.split('.')[0] if d else '')
             or op_naam.get(kaal(naam)))
        cs = [c for c in per_bedrijf.get(b['id'], []) if b] if b else []
        levend = [c for c in cs if (c.get('stage') or '').lower() != 'inactive' and not c.get('former')]
        rollen = {rol(c.get('title')) for c in levend}
        rij_b.append([
            naam, b['account_no'] if b else '', b['name'] if b else '(geen account)',
            dom(b.get('website')) if b else '', r[K['Country/market']] or '',
            r[K['Sector']] or '', r[K['Evidence level']] or '',
            len(levend), sum(1 for c in levend if (c.get('email') or '').strip()),
            sum(1 for c in levend if rol(c.get('title')).startswith('A')),
            'ja' if rollen & {'A onderwerp klopt', 'B CPO/CHRO'} else 'nee',
            r[K['Target roles']] or '',
        ])
        for c in sorted(levend, key=lambda x: (rol(x.get('title')), x.get('full_name') or '')):
            rij_c.append([
                rol(c.get('title')), c.get('full_name'), c.get('title'),
                naam, b['account_no'] if b else '', c.get('email') or '',
                'ja' if c.get('do_not_email') else '', c.get('linkedin_url') or '',
                c.get('source') or '',
            ])

    wb = openpyxl.Workbook()
    ws = wb.active; ws.title = 'Bedrijven'
    kol_b = ['Bedrijf', 'Account', 'In CRM als', 'Domein', 'Land', 'Sector', 'Bewijsniveau',
             'Contacten', 'Met adres', 'Waarvan raak', 'Iemand passend?', 'Doelrollen volgens analyse']
    kop(ws, kol_b, rij_b)
    for r in sorted(rij_b, key=lambda x: (x[10] == 'ja', x[0].lower())): ws.append(r)

    ws = wb.create_sheet('Contactpersonen')
    kol_c = ['Rol', 'Naam', 'Functie', 'Bedrijf', 'Account', 'E-mail', 'Niet mailen',
             'LinkedIn', 'Herkomst']
    kop(ws, kol_c, rij_c)
    for r in sorted(rij_c, key=lambda x: (x[3].lower(), x[0])): ws.append(r)

    ws = wb.create_sheet('Overzicht', 0)
    ws.column_dimensions['A'].width = 56; ws.column_dimensions['B'].width = 12
    ws['A1'] = 'Prioriteit A: bedrijven en contacten'; ws['A1'].font = Font(bold=True, size=14)
    ws['A2'] = f'Gemaakt op {date.today():%d-%m-%Y}'; ws['A2'].font = Font(italic=True, color='666666')
    regels = [
        ('Prioriteit A-bedrijven in de analyse', len(rij_b)),
        ('Waarvan met een account in het CRM', sum(1 for r in rij_b if r[1])),
        ('Waarvan met minstens een contact', sum(1 for r in rij_b if r[7])),
        ('Waarvan met iemand in een passende rol', sum(1 for r in rij_b if r[10] == 'ja')),
        ('', None),
        ('Contactpersonen in totaal', len(rij_c)),
        ('Waarvan met e-mailadres', sum(1 for r in rij_c if r[5])),
        ('', None),
        ('A  onderwerp klopt (people analytics, listening, experience)', sum(1 for r in rij_c if r[0].startswith('A'))),
        ('B  CPO of CHRO', sum(1 for r in rij_c if r[0].startswith('B'))),
        ('C  algemeen HR', sum(1 for r in rij_c if r[0].startswith('C'))),
        ('D  andere discipline (recruitment, rewards, L&D)', sum(1 for r in rij_c if r[0].startswith('D'))),
    ]
    for i, (label, waarde) in enumerate(regels, start=4):
        if not label: continue
        ws.cell(row=i, column=1, value=label)
        if waarde is not None: ws.cell(row=i, column=2, value=waarde)

    wb.save(args.out)
    print(f'Geschreven: {args.out}')
    print(f'  {len(rij_b)} bedrijven, {len(rij_c)} contactpersonen')
    ontbreekt = [r[0] for r in rij_b if r[10] != 'ja']
    if ontbreekt:
        print(f'  {len(ontbreekt)} bedrijven zonder iemand in een passende rol:')
        for n in ontbreekt: print(f'     {n}')


if __name__ == '__main__':
    main()
