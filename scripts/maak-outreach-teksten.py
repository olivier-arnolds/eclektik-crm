#!/usr/bin/env python3
"""
Schrijft per Prioriteit A-contact een outside-in e-mailtekst.

UITGANGSPUNT
  Vijf personas, afgeleid uit de functietitels die er werkelijk staan en niet uit
  een bedacht rijtje. Elk bericht begint bij wat die rol dagelijks meemaakt, niet
  bij wat wij verkopen. De dienst komt pas ter sprake als antwoord op dat
  probleem.

  De inhoud komt van eclectik.co/glint en eclectik.co/glint-support: Customer
  Success (de cyclus die loopt), People Science (de bevinding die iets betekent)
  en Infectious Change. Plus de brug naar AI-transformatie: hoe diep AI in het
  werk zit, niet hoe vaak de tool geopend wordt.

  De teksten volgen de regels uit CLAUDE.md section 2b: geen em-dashes, geen
  markdown-koppen, geen opsommingen, geen filler-opening, en aan het eind een
  open vraag OF een call-to-action, niet allebei.

GEBRUIK
  python3 scripts/maak-outreach-teksten.py [--excel PAD] [--out PAD]
"""
import argparse, os, re
from datetime import date

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

# Landingspagina met UTM-tags, zodat de Analytics-tab kan zien welk bericht het
# bezoek bracht. De bron- en mediumwaarden volgen src/lib/utm.js: 'outreach' en
# 'email' zijn de termen die Google kent, dus die belanden in het kanaal E-mail
# in plaats van in Niet toegewezen. utm_content draagt de persona, zodat je na
# afloop ziet welke invalshoek werkte.
LANDING = ('https://www.eclectik.co/glint'
           '?utm_source=outreach&utm_medium=email&utm_campaign=glint-prio-a&utm_content={persona}')

PERSONA = [
    ('analytics', re.compile(r'analytics|people data|people, data|insights|data science', re.I)),
    ('listening', re.compile(r'listening|employee experience|people experience|engagement|culture', re.I)),
    ('systemen',  re.compile(r'hris|hr tech|people systems|people digital|digital transformation|'
                             r'hr operations|people services|people enablement', re.I)),
    ('chro',      re.compile(r'chief (people|human resources)|chro|\bevp\b|\bsvp\b|'
                             r'executive vice president|chief people', re.I)),
]

TEKST = {
 'analytics': ('The three point move nobody can explain', """Hi {vn},

Most people analytics teams can already tell a real shift from noise. The harder part is being the only person in the room saying so, when leadership has arrived with a story it likes.

We do that reading alongside teams running Viva Glint. Construct mapping, so you know which early movements actually predict the outcomes on the board pack and which ones never will. Correlation described as correlation, and the findings we are not confident about said out loud.

The same question is now arriving about AI. Most reporting still shows licence activity, which tells you how often a tool was opened rather than how deeply it sits in the work. Only the second one survives a CFO asking what it returned.

We did not sell you the licence and we do not resell it, so when your data does not support the conclusion someone wants, that is the read you get. How we work through a cycle is set out at {link}.

Where did your last cycle stall?

Marco"""),

 'listening': ('The weeks after the results go quiet', """Hi {vn},

Your challenge was never finding out what needs attention. Glint tells you that. It is getting leaders to act in the weeks before the findings go quiet and the next cycle comes round.

Plans get announced, dashboards get shared, and the organisation waits. Behaviour does not travel that way. It spreads person to person, through the managers people already watch.

We design that spread using your own listening data. Which few move the many, which habits actually have to shift, and what makes a new behaviour visible enough to repeat. Applied behavioural science on your findings, rather than a change programme bolted on beside them.

At Warburtons that approach held three years without a single declining question, out of twenty-nine asked annually. The case is at {link}.

Would thirty minutes before your next cycle opens be useful?

Marco"""),

 'systemen': ('Activation happens twice a year', """Hi {vn},

Platform activation happens once or twice a year, which is exactly why nobody has it in their fingers. And the whole organisation sees the result.

Wrong population selected. Demographics that do not reconcile next cycle. Broken links, language mismatches, reminder flows firing at the wrong people. None of it is difficult. It is just easy to miss when the launch date is fixed and the setup is a once-a-year job.

We run one structured validation pass before you press send, on the licence you already own, and stay through to the action review instead of handing over at the point it matters. Hours rather than headcount, scaled around your survey window. The detail is at {link}.

Tell us where you are in your next cycle and we will say honestly whether we can help before it launches or whether it is better to start with the one after.

Marco"""),

 'chro': ('What the licence actually returns', """Hi {vn},

A listening cycle is two busy months. The licence is twelve, and most of what decides whether it was worth buying happens in the other ten.

We work alongside teams already running Viva Glint. A Customer Success lead who keeps the cycle sound, and an organisational psychologist who reads what the data is really saying. Driver scores set against what you already track, so retention, absence or safety rather than sentiment on its own.

The same question is now arriving about AI. Most reporting shows licence activity, which says how often a tool was opened rather than how deeply it sits in the work. Only the second one answers what your board is actually asking.

We do not sell the platform and we do not resell the licence, which is why we will tell you when something is premature. What the two roles cover is at {link}.

Would a thirty minute read of where your programme stands be worth having?

Marco"""),

 'hr_algemeen': ('The dashboard that arrives without instructions', """Hi {vn},

Results land, managers receive a dashboard, and most of them are left to it. Knowing what is yours to fix and what is not is the part nobody hands over.

We work alongside HR teams running Viva Glint, on the licence they already own. In practice that means manager briefings people actually open, action plans that have owners and dates, and follow-through still visible when the next survey opens.

You do not need a failing programme to bring us in. Plenty of teams run a good cycle and are simply a person short for the next one, because someone left or the survey landed in a bad month. There is more at {link}.

Where did your last cycle stall?

Marco"""),
}


def persona(titel):
    for naam, patroon in PERSONA:
        if patroon.search(titel or ''):
            return naam
    return 'hr_algemeen'


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--excel', default=os.path.expanduser(
        f'~/Downloads/prioriteit-a-bedrijven-en-contacten-{date.today():%Y-%m-%d}.xlsx'))
    p.add_argument('--out', default=os.path.expanduser(
        f'~/Downloads/outreach-teksten-prio-a-{date.today():%Y-%m-%d}.xlsx'))
    args = p.parse_args()

    wb = openpyxl.load_workbook(args.excel, data_only=True)
    ws = wb['Contactpersonen']
    kop = [c.value for c in ws[1]]
    K = {k: i for i, k in enumerate(kop)}

    rijen = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not any(r):
            continue
        naam = r[K['Naam']] or ''
        vn = naam.split()[0] if naam.split() else naam
        # Namen die in kapitalen of initialen staan niet klakkeloos overnemen:
        # "Hi ADRIENE" leest als een mailmerge die niemand heeft nagekeken.
        vn = vn if (len(vn) > 1 and not vn.isupper()) else vn.title()
        pz = persona(r[K['Functie']])
        onderwerp, body = TEKST[pz]
        rijen.append([pz, naam, r[K['Functie']], r[K['Bedrijf']], r[K['E-mail']],
                      onderwerp, body.format(vn=vn, link=LANDING.format(persona=pz))])

    uit = openpyxl.Workbook()
    ws2 = uit.active
    ws2.title = 'Berichten'
    kolommen = ['Persona', 'Naam', 'Functie', 'Bedrijf', 'E-mail', 'Onderwerp', 'Bericht']
    vul = PatternFill('solid', fgColor='1F3864')
    for i, n in enumerate(kolommen, 1):
        c = ws2.cell(row=1, column=i, value=n)
        c.font = Font(bold=True, color='FFFFFF'); c.fill = vul
    ws2.freeze_panes = 'A2'
    ws2.auto_filter.ref = f'A1:{get_column_letter(len(kolommen))}1'
    for r in sorted(rijen, key=lambda x: (x[0], x[3].lower())):
        ws2.append(r)
    for i, b in enumerate([12, 26, 40, 26, 34, 40, 100], 1):
        ws2.column_dimensions[get_column_letter(i)].width = b
    for rij in ws2.iter_rows(min_row=2, min_col=7, max_col=7):
        rij[0].alignment = Alignment(wrap_text=True, vertical='top')

    uit.save(args.out)

    from collections import Counter
    print(f'Geschreven: {args.out}')
    for p_, n in sorted(Counter(r[0] for r in rijen).items()):
        print(f'  {p_}: {n}')
    # Controle op de harde regels uit CLAUDE.md 2b.
    fout = [r[1] for r in rijen if '—' in r[6] or re.search(r'^\s*[-*•#]', r[6], re.M)]
    print(f'  regelcontrole (em-dash, bullets, koppen): {"FOUT bij " + ", ".join(fout) if fout else "schoon"}')
    zonder = [r[1] for r in rijen if 'eclectik.co/glint' not in r[6]]
    print(f'  link naar de landingspagina: '
          f'{"ONTBREEKT bij " + ", ".join(zonder) if zonder else "in alle berichten"}')


if __name__ == '__main__':
    main()
