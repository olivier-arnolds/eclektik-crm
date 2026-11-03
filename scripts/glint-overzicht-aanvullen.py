#!/usr/bin/env python3
"""
Vult het blad 'Bedrijven' van het Glint-totaaloverzicht aan met de bedrijven die
wel in de campagne 'Glint Prioriteit A' zitten maar niet op dat blad staan.

WAAROM DIT NODIG IS
  Het blad bevat alleen bedrijven van het type 'Expected Glint Customers', de
  prospectlijst van augustus. De campagne raakt 118 bedrijven, waarvan er maar
  34 op dat blad staan. De rest komt uit de Sumble-aanvulling van 27 september
  en stond dus nooit in dit overzicht. Zonder die rijen lijkt de campagne veel
  kleiner dan hij is.

WAT ER BIJKOMT
  Per ontbrekend bedrijf een rij met wat we hebben. Staat het bedrijf in de CRM
  (de campagnerij draagt dan een company_id), dan komen land, stad, branche,
  omvang, website, stage en eigenaar daarvandaan. Zo niet, dan blijft het bij de
  naam en het e-maildomein uit de campagne zelf.

  De kolom 'Herkomst' is nieuw en staat op ELKE rij, ook de bestaande. Zonder
  die kolom zou je de aangevulde rijen niet kunnen onderscheiden van de
  oorspronkelijke prospectlijst, en dat verschil is echt: 'Contactpersonen'
  telt bij de oude rijen alle contacten in de CRM en bij de nieuwe alleen de
  mensen die in de campagne zitten.

GEBRUIK
  python3 scripts/glint-overzicht-aanvullen.py \
      --file "~/Downloads/glint-prospects-totaaloverzicht-2026-09-22 (1)-met-prio-en-status.xlsx"
"""
import argparse
import importlib.util
import os
import re
import sys
from collections import defaultdict

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# De normalisatie, de env-lezer en de REST-helper staan al in het script dat de
# kolommen Prio en Status zette. Een tweede kopie zou uit elkaar gaan lopen, en
# juist de normalisatie moet hier exact hetzelfde zijn: anders vult dit script
# een bedrijf aan dat het andere script al had herkend.
_spec = importlib.util.spec_from_file_location(
    'prio_status', os.path.join(ROOT, 'scripts', 'glint-overzicht-prio-status.py'))
_g = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_g)
env, haal, norm, domein, CAMPAGNE, DOOD = _g.env, _g.haal, _g.norm, _g.domein, _g.CAMPAGNE, _g.DOOD

NIET_BENADERD = {'queued'}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--file', required=True)
    a = p.parse_args()

    bron = os.path.expanduser(a.file)
    if not os.path.exists(bron):
        sys.exit(f'bestand niet gevonden: {bron}')

    url, key = env()
    camp = haal(url, key, 'outreach_contact',
                'company,company_id,email,email_domain,status,is_reserve',
                f'&campaign_id=eq.{CAMPAGNE}')
    print(f'campagne: {len(camp)} contactpersonen')

    per_naam = defaultdict(list)
    for r in camp:
        n = norm(r.get('company'))
        if n:
            per_naam[n].append(r)

    bedrijf_ids = {r['company_id'] for r in camp if r.get('company_id')}
    bedrijven = {}
    if bedrijf_ids:
        ids = ','.join(sorted(bedrijf_ids))
        bedrijven = {b['id']: b for b in haal(
            url, key, 'companies',
            'id,name,account_no,industry,sub_industry,country,city,employee_count,'
            'website,stage,owner',
            f'&id=in.({ids})')}
    print(f'bedrijven uit de CRM: {len(bedrijven)}')

    wb = openpyxl.load_workbook(bron)
    bed = wb['Bedrijven']
    kop = [c.value for c in bed[1]]
    kol = {n: i + 1 for i, n in enumerate(kop)}

    # Herkomst erbij, op alle bestaande rijen ingevuld met de prospectlijst.
    k_herkomst = kol.get('Herkomst')
    if not k_herkomst:
        k_herkomst = len(kop) + 1
        c = bed.cell(row=1, column=k_herkomst, value='Herkomst')
        model = bed.cell(row=1, column=1)
        c.font, c.fill, c.alignment = model.font.copy(), model.fill.copy(), model.alignment.copy()
        bed.column_dimensions[openpyxl.utils.get_column_letter(k_herkomst)].width = 24
    for r in range(2, bed.max_row + 1):
        if bed.cell(row=r, column=kol['Bedrijf']).value is not None:
            bed.cell(row=r, column=k_herkomst, value='Glint-prospectlijst aug 2026')

    aanwezig = {norm(bed.cell(row=r, column=kol['Bedrijf']).value)
                for r in range(2, bed.max_row + 1)
                if bed.cell(row=r, column=kol['Bedrijf']).value is not None}

    # Prio uit de marktanalyse, zodat de nieuwe rijen dezelfde kolom vullen.
    ma = wb['Marktanalyse collega']
    kop_ma = [c.value for c in ma[1]]
    i_comp, i_prio = kop_ma.index('Company'), kop_ma.index('Priority')
    prio_per_naam = {}
    for rij in ma.iter_rows(min_row=2, values_only=True):
        n, pr = norm(rij[i_comp]), str(rij[i_prio] or '').strip()
        if n and pr and n not in prio_per_naam:
            prio_per_naam[n] = pr

    nieuw, zonder_crm = 0, 0
    for n in sorted(per_naam):
        if n in aanwezig:
            continue
        rijen = per_naam[n]
        b = next((bedrijven[r['company_id']] for r in rijen
                  if r.get('company_id') and r['company_id'] in bedrijven), None)
        if not b:
            zonder_crm += 1
        naam = b['name'] if b else rijen[0].get('company')
        website = (b.get('website') if b else None) or domein(rijen[0].get('email_domain'))
        met_mail = sum(1 for r in rijen if (r.get('email') or '').strip())
        al = sum(1 for r in rijen if r.get('status') not in NIET_BENADERD)
        leeft = any(r.get('status') not in DOOD for r in rijen)

        rij = [None] * len(kop)
        def zet(naam_kolom, waarde):
            if naam_kolom in kol:
                rij[kol[naam_kolom] - 1] = waarde
        zet('Account', b.get('account_no') if b else None)
        zet('Bedrijf', naam)
        zet('Land', b.get('country') if b else None)
        zet('Stad', b.get('city') if b else None)
        zet('Branche', (b.get('industry') or b.get('sub_industry')) if b else None)
        zet('Medewerkers', b.get('employee_count') if b else None)
        zet('Website', website)
        zet('Contactpersonen', len(rijen))
        zet('Met e-mail', met_mail)
        zet('Benaderbaar', None)
        zet('Al benaderd', al)
        zet('Stage', b.get('stage') if b else None)
        zet('Eigenaar', b.get('owner') if b else None)
        zet('Prio', prio_per_naam.get(n))
        zet('Status', 'actief in campagne' if leeft else 'inactief')
        rij += [None] * (k_herkomst - len(rij))
        rij[k_herkomst - 1] = 'Campagne Prioriteit A'
        bed.append(rij)
        nieuw += 1

    doel = re.sub(r'\.xlsx$', '', bron)
    doel = re.sub(r'-met-prio-en-status$', '', doel) + '-met-prio-en-status-versie2.xlsx'
    wb.save(doel)
    wb.close()

    print(f'rijen toegevoegd: {nieuw} (waarvan {zonder_crm} niet in de CRM)')
    print(f'geschreven: {doel}')


if __name__ == '__main__':
    main()
