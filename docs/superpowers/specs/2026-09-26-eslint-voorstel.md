# Voorstel: ESLint in dit project

Geschreven 26 september 2026, na de crash van de outreach-tab.

## Aanleiding

Op 25 september ging de outreach-tab stuk met "Something went wrong". De oorzaak
was een variabele die vijftig regels voor haar eigen declaratie gebruikt werd, in
de dependency-array van een `useMemo`:

```js
const herinneringenKlaar = useMemo(
  () => (isLinkedIn ? rows.filter(heeftHerinnering).length : 0),
  [rows, isLinkedIn],          // <- isLinkedIn bestaat hier nog niet
);
// ...vijftig regels verder...
const isLinkedIn = campaign.channel === 'linkedin';
```

`npm run build` slaagde. De tests slaagden. Het is geen syntaxfout maar een
`ReferenceError` op het moment van renderen, en daar kijkt geen van beide naar.
De fout kwam pas aan het licht toen Olivier de tab opende.

**Getoetst: ESLint vangt hem wel.** De regel `no-use-before-define` op de kapotte
versie van het bestand geeft precies twee meldingen, op regel 757 en 758. Dat is
de bug, voor de deploy, in ongeveer een seconde.

## Wat het kost om aan te zetten

Gemeten op de echte codebase (237 bestanden, 53.610 regels) met een configuratie
die browser- en node-globals kent:

```
79 fouten, 38 waarschuwingen
```

Zonder die globals waren het er 875, maar dat is meetfout: dan gelden `window`,
`console`, `fetch` en `process` als onbekende namen. Met de juiste configuratie
valt dat weg.

Uitgesplitst:

| Regel | Aantal | Aard |
|---|---|---|
| `no-use-before-define` | 76 fouten | Verspreid over 10 bestanden, geconcentreerd in vijf |
| `react-hooks/rules-of-hooks` | 1 fout | Een echte bug, zie hieronder |
| overige (`no-dupe-keys`, `no-unreachable`, `no-const-assign`) | 2 fouten | |
| `react-hooks/exhaustive-deps` | 37 waarschuwingen | Ontbrekende dependencies |

De 76 zitten in tien bestanden, waarvan vijf samen 59 voor hun rekening nemen:
`marketing-contacts.jsx` (16), `suggest-task-modal.jsx` (13),
`task-detail-modal.jsx` (12), `search-results-panel.jsx` (10),
`marketing-composer.jsx` (8).

Dat is een middag werk, geen week. Het beeld van "honderden meldingen" dat ik
eerder schetste klopte niet.

## Wat het meteen al vond

Eén echte bug, in `src/components/forms/AddCompanyModal.jsx`:

```js
const [form, setForm] = useState({ ... });
const [saving, setSaving] = useState(false);

if (!open) return null;

const [enriching, setEnriching] = useState(false);   // <- na de early return
```

Bij een gesloten venster draaien er twee hooks, bij een open venster drie. React
gooit dan "Rendered more hooks than during the previous render". Het is dezelfde
familie als de crash van gisteren: een fout die build noch test ziet, en die pas
opvalt als iemand op de knop drukt.

Bereikbaar: `AccountsList.jsx` gebruikt de modal, en `main.jsx` rendert het oude
dashboard nog steeds achter een schakelaar.

## Voorgestelde configuratie

ESLint 9 met flat config. Twee blokken, want `src/` draait in de browser en
`api/` op node.

```js
// eslint.config.js
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'dist_*/**', 'node_modules/**'] },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023, sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': hooks },
    rules: {
      'no-use-before-define': ['error', { functions: false, classes: false, variables: true }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
    },
  },
  {
    files: ['api/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023, sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: { /* dezelfde, zonder de hooks-regels */ },
  },
];
```

**Bewust klein gehouden.** Geen stijlregels, geen `no-unused-vars`, geen
opmaakdiscussies. Alleen regels die fouten vangen die daadwerkelijk crashen.
`exhaustive-deps` staat op waarschuwing en niet op fout, want die vraagt om
oordeel en soms is een ontbrekende dependency bewust.

Twee devDependencies: `eslint` en `eslint-plugin-react-hooks`, plus `globals`.

## Voorgestelde volgorde

1. **Configuratie plaatsen en `npm run lint` toevoegen.** Nog niets repareren.
   Je ziet dan de 79 en 38 staan, en niemand wordt geblokkeerd.
2. **De ene hooks-bug repareren.** Dat is een echte fout, los van de rest.
3. **De 76 in vijf bestanden opruimen**, een bestand per commit, zodat elke stap
   apart te beoordelen en terug te draaien is.
4. **Pas daarna eventueel afdwingen.** Bijvoorbeeld een `pretest`-script zodat
   `npm test` ook lint, of een stap in de Vercel-build. Zolang stap 3 niet af is
   zou dat alleen maar in de weg zitten.

De 37 waarschuwingen laat ik expliciet liggen. Die zijn waardevol om naar te
kijken, maar niet in dezelfde beweging.

## Wat het niet oplost

De crash van gisteren zat in code die ik die middag zelf had geschreven, en
ESLint had hem gevangen. Maar de andere fouten van deze week zou hij hebben
gemist: de paginering zonder tiebreaker, de te lage `max_tokens`, de kolom die
bij e-mail iets anders betekende. Dat zijn redeneerfouten, geen taalfouten.

Een linter is een vangnet voor een specifieke klasse, niet voor denkfouten.
