// ESLint, bewust klein gehouden.
//
// WAAROM DIT BESTAAT
//   Op 25 september ging de outreach-tab stuk met "Something went wrong". Een
//   variabele werd vijftig regels voor haar eigen declaratie gebruikt, in de
//   dependency-array van een useMemo. De build slaagde en de tests slaagden,
//   want het is geen syntaxfout maar een ReferenceError bij het renderen. Pas
//   toen iemand de tab opende bleek het.
//
//   no-use-before-define vangt precies dat, in ongeveer een seconde.
//
// WAT HIER BEWUST NIET IN ZIT
//   Geen stijlregels, geen no-unused-vars, geen opmaak. Alleen regels die
//   fouten vangen die daadwerkelijk crashen. Een linter die over komma's
//   klaagt wordt genegeerd, en dan vangt hij ook de echte dingen niet meer.
//
//   exhaustive-deps staat op waarschuwing en niet op fout: die vraagt om
//   oordeel, en een ontbrekende dependency is soms bewust.
//
// Ontwerp en gemeten aantallen: docs/superpowers/specs/2026-09-26-eslint-voorstel.md

import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// Dezelfde set voor beide omgevingen; alleen de hooks-regels zijn frontend-only.
const basisRegels = {
  'no-use-before-define': ['error', { functions: false, classes: false, variables: true }],
  'no-undef': 'error',
  'no-dupe-keys': 'error',
  'no-unreachable': 'error',
  'no-const-assign': 'error',
};

export default [
  { ignores: ['dist/**', 'dist_*/**', 'dist_check/**', 'node_modules/**'] },

  // Frontend: draait in de browser.
  {
    files: ['src/**/*.js', 'src/**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': hooks },
    rules: {
      ...basisRegels,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Serverless endpoints en scripts: draaien op node.
  {
    files: ['api/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: basisRegels,
  },

  // Tests kennen de vitest-globals niet via bovenstaande sets.
  {
    files: ['**/*.test.js', '**/*.test.jsx'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
