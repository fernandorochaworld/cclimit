---
description: Prompt recipe for the specification step — turning specification/ briefs into a PRD and step-by-step todo/*.step-N.md plans
---

You are running the **specification** step of the fastcoder flow.

## What this step does

Finds the next raw brief in `.docs/tasks/specification/` that has not yet been specified, turns it into a PRD-structured plan, writes one or more `todo/*.step-N.md` files, and archives the brief to `done/*.specified.md`.

## Input

A raw brief — any `*.md` in `specification/` that is not already an intermediate output (`*.step-N.md`, `*.specified.md`). It may be rough, incomplete, or high-level.

## Output

For a brief whose base name is `{base}`:

- One or more `{base}.step-N.md` files (N starting at 1) written into `todo/`. Even a single-step brief must produce `{base}.step-1.md`.
- The source brief moved to `done/{base}.specified.md`.

Each step file must contain, in this exact order:

1. **Title**
2. **Context / Problem** — why, referencing existing modules by `@path`, plus an **Impact** list (inside this section, not a new numbered one): every surface the change affects as an `@path` with one line saying how it is affected
3. **Scope** — an explicit `@`-path list of the files/modules to change
4. **Requirements** — numbered, testable functional requirements
5. **Acceptance criteria** — executable checks (a command to run, an HTTP call with expected status/body, or a UI assertion)
6. **Out of scope / Non-goals**
7. **Notes** — edge cases and explicit dependencies on other steps

## Rules

- Do NOT implement any code — only produce the PRD todo files
- Before writing the steps, search the codebase for every affected surface — HTTP routes, services, web-ui pages/components/cards, CLI commands, flow steps and existing guidelines — and list them under **Impact**
- Every `@path` in the Impact list must be covered by a Requirement/Acceptance criterion of some generated step, or explicitly excluded in that step's `Out of scope / Non-goals` — none may be left unmentioned
- Even a brief touching a single file needs an Impact list (one entry)
- Acceptance criteria must be executable checks, not narrative goals
- Only split into multiple sequential `.step-N.md` files when the brief spans too many areas; each step must be independently implementable and self-contained
- Reuse existing app patterns to avoid redundancy and errors
- Keep files short — no long prose or code samples
- Acceptance criteria must be testable — avoid vague words like "should work"
- Dependencies between steps must be explicit in the Notes section

## Naming

- Todo plans: `{base}.step-1.md`, `{base}.step-2.md`, etc. in `todo/`
- Archived brief: `{base}.specified.md` in `done/`

A `.{model}` tag on the brief (`{base}` includes it) travels to the produced step files, so the same model handles the downstream `do`/`test`/`validate`/`doc` steps.

## Task-file log (mandatory)

You MUST append an entry to the bottom of the brief file, without altering any of its previous content, using this exact title format:

```
Log: {timestamp} specification - {title}
{what was specified and which step files were produced, relative file paths of the files changed, no code samples}
```

This log is mandatory even when the run ends with `FASTCODER-STEP-SKIPPED: specification` — the description then explains why nothing was needed.

## After specification

The step files sit in `todo/`, ready for the `do` step to implement. The brief lives in `done/` as `{base}.specified.md`. Do not implement any of the steps yourself.
