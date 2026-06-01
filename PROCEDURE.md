# Eclectik BD CRM — Change & Release Procedure

How changes get made, versioned, logged, shipped to GitHub/Vercel, and rolled
back. Read this together with [`CLAUDE.md`](./CLAUDE.md) (project context + house
rules). This file is the operating manual; if you're handing work to Claude in a
Cowork session, the prompt at the bottom points it here.

---

## 0. Golden rules (don't skip)

- **Never push unprompted.** Claude makes and commits changes; **Marco runs the push.**
- **Every change gets a version + a changelog entry** before it ships (see §2).
- **No destructive DB ops without a backup.** Snapshot first, write a revert script (see §4).
- **Never touch `comms.owner`** — it holds the external counterparty name, not a team owner.
- **Verify before moving on:** a clean production build (§3) and, after deploy, a hard refresh in the browser.
- Communicate in Dutch with the team where relevant; Olivier is the owner/admin and signs off on big changes (deleting code, schema migrations).

---

## 1. The working model

This is a small React + Vite + Supabase app that auto-deploys to
`https://crm.eclectik-insights.co` from `origin/main` via Vercel.

1. Claude edits files in the local clone and commits locally on `main`.
2. Claude shows the diff / explains what changed.
3. **Marco** runs `git push` from his Mac (credentials live in the Mac Keychain;
   the sandbox can't push). Vercel auto-deploys in ~1–2 min.
4. Database changes are applied via Supabase (with a backup) or handed over as SQL.

---

## 2. Versioning (semver) — keep four things in sync

We use semantic versioning: **MAJOR.MINOR.PATCH**.

| Bump | When | Example |
|---|---|---|
| **PATCH** (1.4.0 → 1.4.1) | bug fix, docs, small tweak | typo, copy change |
| **MINOR** (1.4.0 → 1.5.0) | new feature, non-breaking | new tab, new field logic |
| **MAJOR** (1.4.0 → 2.0.0) | breaking change | schema rework, removed feature |

For **every** change, update all four to the same version:

1. **`VERSION`** file (the bare number, e.g. `1.5.0`).
2. **`package.json`** → `"version"`.
3. **`src/bd/changelog.js`** → bump `CURRENT_VERSION` **and** add a new entry at
   the top of `CHANGELOG` (newest first).
4. **git tag** `v<version>` on the commit (see §5).

### Changelog entry shape

```js
{
  version: '1.5.0',
  date: '2026-06-02T09:00:00Z',         // real UTC time: `date -u +%Y-%m-%dT%H:%M:%SZ`
  author: 'Marco van Gelder (via Claude / Cowork)',
  type: 'feature',                       // feature | fix | refactor | chore | data | breaking
  title: 'Short headline',
  summary: 'One paragraph in plain language — what and why.',
  changes: [ 'Detailed bullet…', 'Another…' ],
  files: [ 'src/bd/xyz.jsx', 'package.json' ],
  rollback: 'Only for data changes — how to undo (see §4).',  // optional
  gitTag: 'v1.5.0',
}
```

The in-app **Log** tab renders this, so the team sees what changed, when, and how
to roll back. Always write the detail here — this is the audit trail.

---

## 3. Pre-push checklist

- [ ] Production build is clean.
      Because the sandbox can't clear `dist/`, build to a throwaway dir:
      `npx vite build --outDir /tmp/ecl-dist --emptyOutDir`
      (Locally on the Mac, plain `npm run build` is fine.)
- [ ] `VERSION`, `package.json`, and `changelog.js` all show the same version.
- [ ] A changelog entry exists for this change.
- [ ] If a DB change was involved: a snapshot table + revert script exist (§4).
- [ ] Commit messages are descriptive; one logical change per commit.

---

## 4. Database changes (Supabase)

The DB has real client data. Rules:

1. **Snapshot first.** Create a backup table of the columns/rows you'll touch:
   `create table public._<thing>_backup_<yyyymmdd> as select … ;`
2. **Apply** the `UPDATE`/migration.
3. **Verify** with a read-only `SELECT` that the result is what you expected.
4. **Write a revert script** at the repo root: `db_revert_<thing>_<date>.sql`,
   restoring from the snapshot table. Reference it in the changelog `rollback`.
5. **Drop the snapshot** only once Marco confirms the change is good.

Notes:
- Claude must **not** run permanent deletions itself — hand Marco the SQL.
- `comms.owner` is the external party — never normalize it to team names.
- Schema changes (new tables, dropping columns, adding FKs) are **Olivier-sign-off**.
- A DB change is **live immediately** — it does not need a push. The push only
  ships the *code* + the Log entry documenting it.

---

## 5. The push command (what Marco runs)

In Terminal on the Mac:

```
cd ~/Documents/Claude/Projects/"BD application"/eclektik-crm
git add -A
git commit -m "<type>: <short description> (v<version>)"
git tag v<version>
git push origin main --tags
```

Example:

```
git commit -m "feat: stage-driven win probability + backfill (v1.4.0)"
git tag v1.4.0
git push origin main --tags
```

Then: wait ~1–2 min, hard-refresh the live site (`Cmd+Shift+R`), and check the
**Log** tab shows the new version.

### First-time / gotchas
- **Commit email must match a GitHub account** or Vercel blocks the deploy. Set once:
  `git config --global user.email "marco@eclectik.co"` (must be verified on your
  GitHub account) and `git config --global user.name "Marco van Gelder"`.
- **macOS permission**: if `git` says “Operation not permitted” in the
  `Documents` folder, enable Terminal under **System Settings → Privacy &
  Security → Full Disk Access**, then quit (`Cmd+Q`) and reopen Terminal.
- **Stale lock**: if a commit fails on `.git/index.lock`, run `rm -f .git/index.lock` and retry.
- At a password prompt, paste your `ghp_…` token (not your account password); the
  screen stays blank — that's normal.

---

## 6. Rollback

- **Code** — inspect an old version: `git checkout v1.3.0`; return to latest:
  `git checkout main`. To permanently undo on the live site: `git revert <commit>`
  then push.
- **Data** — run the matching `db_revert_<thing>_<date>.sql` in the Supabase SQL
  Editor. `git checkout` does **not** undo a database change.

Every version's exact rollback command is shown in the in-app **Log** tab.

---

## 7. Reusable prompt for a Cowork / Claude session

> You're working on the Eclectik BD CRM (local clone, Cowork). Follow
> `PROCEDURE.md` and `CLAUDE.md`. For the change I describe: make the edits and
> commit locally, but **don't push** — I'll push. Bump the version in `VERSION`,
> `package.json`, and `src/bd/changelog.js` (new entry, newest first) to the same
> number, and tag it `v<version>`. If it touches the database, snapshot the
> affected rows into a backup table first, verify the result, and write a
> `db_revert_*.sql`; never modify `comms.owner` and never delete data without my
> OK. Run a clean build (`npx vite build --outDir /tmp/ecl-dist --emptyOutDir`)
> to verify, then give me the exact `git add/commit/tag/push` commands and tell me
> in detail what you changed.
