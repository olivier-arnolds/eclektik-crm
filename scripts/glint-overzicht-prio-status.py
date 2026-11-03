#!/usr/bin/env python3
"""
Zet twee kolommen bij op het blad 'Bedrijven' van het Glint-totaaloverzicht:

  Prio    - A, B of C, overgenomen van het blad 'Marktanalyse collega'.
  Status  - 'actief in campagne' of 'inactief', op basis van de echte stand in
            de outreach-campagne 'Glint Prioriteit A'.

WAAROM NIET IN HET ORIGINEEL SCHRIJVEN
  Het bronbestand in Downloads blijft ongemoeid; er komt een nieuw bestand naast
  met -met-prio-en-status in de naam. Een exportbestand overschrijven is geen
  ramp, maar je kunt er niet meer op terugvallen als de koppeling misgaat, en
  die koppeling is hier het enige dat fout kan gaan.

HOE DE KOPPELING WERKT
  Bedrijfsnamen zijn in beide bladen met de hand getypt, dus exact vergelijken
  levert gaten op. We vergelijken op een genormaliseerde naam: kleine letters,
  leestekens eruit, en rechtsvormen (Inc, Ltd, BV, GmbH, Group, ...) eraf. Voor
  de campagnestatus doen we er een tweede sleutel bij, het domein, want daar
  staat het adresdomein van de contactpersoon bij en dat is harder dan een naam.

WAT 'ACTIEF IN CAMPAGNE' BETEKENT
  Het bedrijf heeft minstens een contactpersoon in de campagne die niet is
  afgemeld of gebounced. Een bedrijf waarvan iedereen zich heeft afgemeld staat
  dus op 'inactief', want daar gaat niets meer naartoe. Dat is het verschil dat
  je in zo'n kolom wilt zien.

GEBRUIK
  python3 scripts/glint-overzicht-prio-status.py \
      --file "~/Downloads/glint-prospects-totaaloverzicht-2026-09-22 (1).xlsx"
"""
import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CAMPAGNE = 'dca490bd-9d5f-4868-a571-7f1c3663aa0f'  # Glint Prioriteit A
DOOD = {'opted_out', 'bounced'}

LEGAAL = re.compile(r'\b(inc|ltd|plc|bv|nv|ag|sa|gmbh|corporation|corp|group|holding|holdings|'
                    r'limited|co|llc|company|llp|sas|srl|spa|ab|as|oy|pte|pty)\b', re.I)


def env():
    w = {}
    pad = os.path.join(ROOT, '.env.local')
    if os.path.exists(pad):
        for r in open(pad):
            if '=' in r and not r.strip().startswith('#'):
                k, _, v = r.partition('=')
                w[k.strip()] = v.strip().strip('"')
    if not w.get('SUPABASE_URL'):
        sys.exit('SUPABASE_URL ontbreekt in .env.local')
    return w['SUPABASE_URL'].rstrip('/'), w['SUPABASE_SERVICE_KEY']


def haal(url, key, tabel, kolommen, filter=''):
    uit, off = [], 0
    while True:
        req = urllib.request.Request(
            f'{url}/rest/v1/{tabel}?select={urllib.parse.quote(kolommen)}{filter}'
            f'&limit=1000&offset={off}',
            headers={'apikey': key, 'Authorization': f'Bearer {key}'})
        with urllib.request.urlopen(req, timeout=120) as r:
            blok = json.loads(r.read().decode())
        uit += blok
        if len(blok) < 1000:
            return uit
        off += 1000


def norm(naam):
    """Bedrijfsnaam tot iets dat je kunt vergelijken."""
    w = str(naam or '').lower()
    w = re.sub(r'\(.*?\)', ' ', w)              # '(McKesson)' telt niet mee
    w = re.sub(r'[^a-z0-9 ]+', ' ', w)
    w = LEGAAL.sub(' ', w)
    w = re.sub(r'\s+', ' ', w).strip()
    return w or None


def domein(waarde):
    """Website of e-maildomein tot een kale hostnaam zonder www."""
    w = str(waarde or '').strip().lower()
    if not w or w in ('none', '-'):
        return None
    w = re.sub(r'^https?://', '', w)
    w = re.sub(r'^www\.', '', w)
    return w.split('/')[0].strip() or None


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--file', required=True)
    a = p.parse_args()

    bron = os.path.expanduser(a.file)
    if not os.path.exists(bron):
        sys.exit(f'bestand niet gevonden: {bron}')

    url, key = env()
    rijen = haal(url, key, 'outreach_contact', 'company,email_domain,status,is_reserve',
                 f'&campaign_id=eq.{CAMPAGNE}')
    print(f'campagne: {len(rijen)} contactpersonen')

    # Een bedrijf is actief zodra er EEN contactpersoon is die nog meedoet.
    actief_naam, actief_dom, bekend_naam, bekend_dom = set(), set(), set(), set()
    for r in rijen:
        n, d = norm(r.get('company')), domein(r.get('email_domain'))
        if n:
            bekend_naam.add(n)
        if d:
            bekend_dom.add(d)
        if r.get('status') not in DOOD:
            if n:
                actief_naam.add(n)
            if d:
                actief_dom.add(d)

    wb = openpyxl.load_workbook(bron)
    ma, bed = wb['Marktanalyse collega'], wb['Bedrijven']

    kop_ma = [c.value for c in ma[1]]
    i_comp, i_prio = kop_ma.index('Company'), kop_ma.index('Priority')
    prio_per_naam = {}
    for rij in ma.iter_rows(min_row=2, values_only=True):
        n, pr = norm(rij[i_comp]), str(rij[i_prio] or '').strip()
        if n and pr and n not in prio_per_naam:
            prio_per_naam[n] = pr
    print(f'marktanalyse: {len(prio_per_naam)} bedrijven met een prioriteit')

    kop_bed = [c.value for c in bed[1]]
    i_naam = kop_bed.index('Bedrijf')
    i_web = kop_bed.index('Website') if 'Website' in kop_bed else None

    # De twee nieuwe kolommen achteraan, met dezelfde opmaak als de koprij.
    k_prio, k_status = len(kop_bed) + 1, len(kop_bed) + 2
    voorbeeld = bed.cell(row=1, column=1)
    for kol, titel in ((k_prio, 'Prio'), (k_status, 'Status')):
        c = bed.cell(row=1, column=kol, value=titel)
        c.font = voorbeeld.font.copy()
        c.fill = voorbeeld.fill.copy()
        c.alignment = voorbeeld.alignment.copy()
    bed.column_dimensions[openpyxl.utils.get_column_letter(k_prio)].width = 8
    bed.column_dimensions[openpyxl.utils.get_column_letter(k_status)].width = 20

    tel = {'A': 0, 'B': 0, 'C': 0, 'geen': 0, 'actief': 0, 'inactief': 0}
    zonder_prio = []
    for r in range(2, bed.max_row + 1):
        naam = bed.cell(row=r, column=i_naam + 1).value
        if naam is None:
            continue
        n = norm(naam)
        d = domein(bed.cell(row=r, column=i_web + 1).value) if i_web is not None else None

        pr = prio_per_naam.get(n)
        bed.cell(row=r, column=k_prio, value=pr)
        tel[pr if pr in tel else 'geen'] += 1
        if not pr:
            zonder_prio.append(str(naam))

        act = (n in actief_naam) or (d is not None and d in actief_dom)
        bed.cell(row=r, column=k_status,
                 value='actief in campagne' if act else 'inactief')
        tel['actief' if act else 'inactief'] += 1

    doel = re.sub(r'\.xlsx$', '', bron) + '-met-prio-en-status.xlsx'
    wb.save(doel)
    wb.close()

    print(f"prio: A={tel['A']}  B={tel['B']}  C={tel['C']}  zonder={tel['geen']}")
    print(f"status: actief={tel['actief']}  inactief={tel['inactief']}")
    if zonder_prio:
        print(f'  eerste zonder prio: {", ".join(zonder_prio[:8])}')
    print(f'geschreven: {doel}')


if __name__ == '__main__':
    main()
