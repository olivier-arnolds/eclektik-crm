// ─────────────────────────────────────────────────────────────────────────
// Changelog — single source of truth for the in-app "Log" tab.
//
// HOW THIS WORKS
//   • Every meaningful change to the app gets ONE entry here, newest first.
//   • Each entry maps 1:1 to a git tag (`gitTag`), which is how you roll back.
//   • The Log tab (src/bd/log-view.jsx) renders this array.
//
// HOW TO ADD AN ENTRY (do this with each change before committing)
//   1. Bump `version` using semver: patch = fix, minor = feature, major = big.
//   2. Set `date` to the real ISO timestamp (UTC) — run `date -u +%Y-%m-%dT%H:%M:%SZ`.
//   3. Fill `title`, `summary`, the `changes[]` detail, and `files[]` touched.
//   4. Keep `gitTag` = `v<version>`; create that tag on the commit (see README/Log).
//   5. Also bump "version" in package.json and the VERSION file to match.
//
// HOW TO ROLL BACK (shown in the Log tab too)
//   • Inspect a version:     git checkout v1.1.0
//   • Undo a version safely:  git revert <commit-of-that-version>
//   • Return to latest:       git checkout main
// ─────────────────────────────────────────────────────────────────────────

export const CURRENT_VERSION = '1.2.0';

export const CHANGELOG = [
  {
    version: '1.2.0',
    date: '2026-06-01T16:56:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'New layout: persistent Account 360 on the right, single view-switcher on the left',
    summary:
      'Reworked the app shell into a consistent two-pane model. The Account 360 ' +
      '"database" pane now stays on the right in every view, and the left pane ' +
      'switches between Funnel, Meetings, Tasks, Comms, Marketing, Playbooks and Admin. ' +
      'Also removed the "BabyDee 1.0" badge from the top-left. No Supabase data touched.',
    changes: [
      'Removed the "BabyDee 1.0" badge next to the Eclectik BD wordmark (top-left).',
      'Top nav is now a single flat view-switcher: Funnel · Meetings · Tasks · Comms · Marketing · Playbooks · Admin (+ Log). Replaced the old Workspace/Funnel split that toggled the left lane.',
      'Account 360 is now rendered as a persistent right-hand pane across ALL views (previously Marketing, Playbooks and Admin took the full width and hid it).',
      'Each view now occupies the left pane: Funnel (pipeline), Meetings (calendar/agenda), Tasks, Comms (email/Teams/LinkedIn), Marketing, Playbooks, Admin, Log.',
      'Collapsed the duplicated per-view render blocks in BDApp.jsx into one unified shell (single Topbar / Statusbar / modal set).',
      'Repurposed the lane "expand" toggle: expanding the left pane now hides the 360 for full-width focus (Funnel, Meetings, Tasks).',
      'Added migration for the old persisted "workspace" view so existing users land on Meetings (or Funnel) instead of a blank screen.',
    ],
    files: [
      'src/bd/BDApp.jsx',
      'src/bd/topbar.jsx',
      'VERSION',
      'package.json',
      'src/bd/changelog.js',
    ],
    gitTag: 'v1.2.0',
  },
  {
    version: '1.1.0',
    date: '2026-06-01T16:43:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'In-app Log / version-history tab + project metadata cleanup',
    summary:
      'Added a Log tab so the team can see, in the app, exactly what changed and when — ' +
      'with date-time stamps, per-version detail, and git-based rollback instructions. ' +
      'Also corrected stale project metadata. No Supabase data was touched.',
    changes: [
      'New "Log" tab in the top navigation (between Marketing and Admin).',
      'Added src/bd/changelog.js as the single source of truth for version history.',
      'Added src/bd/log-view.jsx — renders the changelog as a timeline (newest first) with version badge, UTC + local date-time stamp, author, detailed change list, files touched, and the exact rollback command per version.',
      'Added a "history" icon to the shared icon set (src/bd/atoms.jsx).',
      'Wired the Log view into BDApp.jsx (view === "log") and the Topbar nav button.',
      'package.json: removed "type": "commonjs" (this is an ESM Vite app) and the stray "main": "index.js"; bumped version 1.0.0 → 1.1.0 to match this entry.',
      'Added a VERSION file (1.1.0) so the deployed build can report its version.',
    ],
    files: [
      'VERSION (new)',
      'src/bd/changelog.js (new)',
      'src/bd/log-view.jsx (new)',
      'src/bd/atoms.jsx',
      'src/bd/topbar.jsx',
      'src/bd/BDApp.jsx',
      'package.json',
    ],
    gitTag: 'v1.1.0',
  },
];
