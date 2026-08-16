---
name: fix-lint
description: Auto-fix lint & code-style across the project (run its configured fixers), then manually fix every remaining issue that could not be auto-fixed, and verify the app still builds and passes tests. Use when the user wants to clean up lint/ESLint/prettier/format issues, run the lint fixer, or "fix all lint errors" safely without breaking the app.
---

# Safe lint & code-style fixer

Run the repo's auto-fixers, then hand-fix whatever they leave behind — **without breaking the
application**. The whole point of this skill is that the tree is greener _and still works_ when you
finish: auto-fix is the easy part; the value is in the manual fixes and the verification that guards
them.

## Golden rules

- **Never claim done until verification passes.** A lint-clean tree that fails to build or breaks a
  test is a failure, not a success. Report honestly if something can't be resolved.
- **A lint fix must not change behavior.** Auto-`--fix` and your manual edits should be
  behavior-preserving. The dangerous ones are unused-var / unused-import / no-empty removals — see
  "Manual-fix cautions" before deleting anything.
- **Follow the repo conventions.** Read the project's `CLAUDE.md` / `CONTRIBUTING` / style docs and
  match the stack, test framework, and patterns already in use. Do not import conventions from other
  projects.

## Step 0 — Discover the project's tooling

Before touching anything, work out how this repo lints, builds, and tests:

- **Lint / format tools:** inspect `package.json` scripts and lint config (`.eslintrc*`,
  `eslint.config.*`, `.prettierrc*`, `biome.json`), or the equivalent for the language
  (`ruff`/`flake8`/`black` for Python, `gofmt`/`golangci-lint` for Go, `rubocop`, etc.). Prefer a
  repo-provided script (e.g. `lint`, `lint:fix`, `format`) over calling a tool directly.
- **Build & test commands:** from `package.json` scripts, a `Makefile`, or the stack's standard
  commands. Most repos have no "affected"/scoped task runner — in that case the skill verifies
  with the repo's full build and test scripts. Only if the repo has a monorepo task runner (Nx,
  Turbo, Lerna, Bazel) with an "affected" mode should you scope verification to it instead.
  Record the exact commands you'll use in Steps 1, 2, and 4.

## Step 1 — Establish a safety net

1. Run `git status --short` and `git stash list`. Note the current diff so you can distinguish
   pre-existing changes from your fixes and so the user can review/revert.
2. **Baseline the build/test state BEFORE fixing** so you never get blamed for pre-existing breakage.
   Capture, and remember, the current result of the verification commands from Step 0 (at minimum a
   typecheck/build of the affected code). If something is already broken before you touch it, say so
   and do not try to fix unrelated failures.

## Step 2 — Auto-fix

Run the repo's auto-fixers (whatever Step 0 identified), e.g. a `lint:fix` script, `eslint . --fix`
plus `prettier --write`, `biome check --write`, `ruff --fix`, etc.

> If lint itself crashes (e.g. a plugin throws) rather than reporting rule errors, that is a
> tooling/dependency problem, not a code problem — stop and fix the toolchain (often a bad dependency
> pin) before proceeding. Do not try to "fix" source for a crash. Ignore unrelated infra warnings
> (e.g. a task-runner cloud "not connected" notice).

## Step 3 — Find what's left

Run the repo's lint/style **check** commands (non-fixing) and collect every remaining error grouped by
rule and file. These are the issues auto-fix could not resolve and that you must fix by hand.

## Step 4 — Manual fixes

Fix each remaining issue at its source, matching surrounding code style. Group by rule so identical
fixes are applied consistently. After editing a file, re-run lint scoped to it (or its
project/package) to confirm it is clean before moving on.

### Manual-fix cautions (behavior-preserving)

- **Unused vars / unused imports:** before deleting, confirm the symbol is truly unused
  (grep the symbol across the project). Watch for:
  - variables whose initializer has a **side effect** (a function call that must still run) — keep
    the call, drop only the binding;
  - parameters that are unused only because they're positional — prefix with `_` or use the repo's
    configured pattern instead of deleting (deleting a param changes the signature);
  - things referenced only in templates/markup, stories, or spec/test files.
- **Typing rules (e.g. no-explicit-any):** introduce the correct type; do not silence with a broader
  `any` or a disable comment unless there is genuinely no type and the surrounding code does the same.
- **Framework template/markup rules:** fix in the template file itself, using the framework's idioms
  and the patterns already used elsewhere in the file.
- **Last resort only:** an inline disable comment (e.g. `// eslint-disable-next-line <rule>`) with a
  one-line reason, and only when a real fix would change behavior or duplicate code. Never
  blanket-disable a rule for a whole file or in config to make numbers go down.
- If a fix would require **duplicating logic**, extract a shared function/component instead.
- **Keep tests in sync:** if you change a signature, exported API, or behavior, update the relevant
  spec/test.

## Step 5 — Verify the app still works (required)

Do not skip. The tree must be lint-clean **and** functional. Run, using the commands from Step 0:

1. **Lint & style are clean** — re-run the check commands from Step 3.
2. **It still compiles** (catches bad unused-var/import removals & type breakage) — build the code
   affected by your changes. If the repo has an "affected"/scoped task runner, prefer that to stay
   fast; otherwise the default is the repo's **full build script** (e.g. `npm run build`).
3. **Tests pass** — run the project's test command for the affected code (scoped/affected when
   supported; otherwise the repo's **full test script**, e.g. `npm test`). Use the repo's actual
   test framework — never introduce a different one.

If any verification fails **because of your change**, fix it or revert that specific edit — do not
leave the app in a worse state than the baseline from Step 1. Distinguish clearly between failures
you introduced and pre-existing ones you baselined.

## Step 6 — Finish

- Summarize: auto-fixed vs. hand-fixed counts, which rules/files were touched, any issues you
  deliberately left (with reason, e.g. pre-existing or requires product decision), and the final
  verification results (lint clean ✔, build ✔, tests ✔).
- If the project keeps a changelog (e.g. a root `CHANGELOG.md`), add a brief timestamped entry per its
  convention describing what was fixed (title line, brief bullets, no code samples).
- Do **not** commit or push unless the user asks.
