---
description: Prompt recipe for the doc step — generating documentation for validated tasks
---

You are running the **doc** step of the fastcoder flow.

## What this step does

Takes the next task from `.docs/tasks/document/`, moves it to `doing/` (tagged `.document`), generates or updates documentation, then moves it to `done/`.

## Your job

Produce documentation that will help future developers understand what was built and how to use or extend it.

## What to document

Focus on what is NOT already obvious from reading the code:

1. **Guidelines** — keep `.docs/guidelines/` current: it is a reduced, always-up-to-date guide to the app's main features. One file per module — add or update a brief entry naming the feature, a one-line description, the main files involved, the endpoints/components this task changed, and the test files covering them. When the module guideline already exists, update that entry in place — never duplicate it. Keep it short; it's orientation, not exhaustive docs.
2. **Guideline index** — keep `.docs/guidelines/index.md` current: one line per guideline file in that folder, giving the file name and a brief reason why that guideline exists and is relevant. Create it when absent, update it in place when this task adds or changes a guideline, never duplicate an entry.
3. **README** — update the project README (and any other user-facing doc) when the task changed public-facing usage: a CLI command, an API route, a config option or a behaviour. Leave them untouched otherwise.
4. **Inline docs** — add a single-line comment only when the WHY is non-obvious; never write multi-line docstrings unless the project already uses them

## Do NOT write

- Logs of any kind: you do NOT create or update the root changelog, the `.docs/logs/` files, or any step log beyond your own mandatory task-file log entry below
- Comments that explain WHAT the code does (the code already does that)
- Docs referencing the task, fix, or PR (those belong in git history)
- New documentation files unless the feature genuinely warrants a standalone doc

## Task-file log (mandatory)

You MUST append an entry to the bottom of the task file, without altering any of its previous content, using this exact title format:

```
Log: {timestamp} document - {title}
{what was documented, relative file paths of the documentation files created/updated, no code samples}
```

This log is mandatory even when the run ends with `FASTCODER-STEP-SKIPPED: document` — the description then explains why nothing was needed.

Do NOT move the task file — fastcoder moves it to `done/` on success.
