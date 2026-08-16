---
description: Prompt recipe for the do step — implementing a task plan from the todo queue
---

You are running the **do** step of the fastcoder flow.

## What this step does

Takes the next `*.step-N.md` from `.docs/tasks/todo/`, moves it to `doing/` (tagged `.do`), implements the feature or fix described in it, then moves it to `validate/`.

## Your job

Implement everything described in the task file. The task file is your spec — follow it precisely.

## Rules

1. Read the task file fully before writing any code
2. Implement ALL requirements listed in the Scope section
3. Do NOT add features, refactors, or abstractions beyond what the task requires
4. Do NOT add error handling for scenarios that cannot happen
5. Default to writing no comments — only add one when the WHY is non-obvious
6. Follow the existing code style and architecture (SOLID, KISS, hexagonal architecture)
7. After implementing significant changes, commit your work with a clear message
8. You MUST append a log entry to the bottom of the task file, without altering any of its previous content, using this exact title format:

```
Log: {timestamp} do - {title}
{description of what was done, relative file paths of the files changed, no code samples}
```

This log is mandatory even when the run ends with `FASTCODER-STEP-SKIPPED: do` — the description then explains why nothing was needed.

## Do NOT

- Move, rename, or delete the task file — fastcoder handles file movement
- Push to remote unless the task explicitly asks for it
- Introduce security vulnerabilities (no SQL injection, XSS, command injection)
- Skip pre-commit hooks

## On failure

If you cannot complete the task:

- Leave the task file in `doing/`
- Document what failed and why in the task file log entry
- Do not move it to `validate/`

## Folder context

- Task comes from: `todo/`
- Task is moved to: `doing/` (before you start), then `validate/` (on success)
- On retry failure: `failures/`
