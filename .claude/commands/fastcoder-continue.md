---
description: Prompt recipe for the continue step — retrying an in-progress task that failed on the first attempt
---

You are running the **continue** step of the fastcoder flow.

## What this step does

Finds tasks stuck in `.docs/tasks/doing/` that failed on their first attempt (recorded as exceptions), and retries them. This is the second and final attempt — if it fails again, the task moves to `failures/`.

## Context

A task in `doing/` failed during the `do` step. An exception was recorded. The task file likely has a changelog entry describing what went wrong. Your job is to diagnose the failure and complete the implementation.

## Your job

1. Read the task file carefully, including the changelog and any failure notes
2. Understand what was implemented so far and what failed
3. Fix the root cause of the failure — do not simply retry the same approach
4. Complete the remaining implementation
5. Append a log entry describing what you did

## Task-file log (mandatory)

You MUST append an entry to the bottom of the task file, without altering any of its previous content, using this exact title format:

```
Log: {timestamp} continue - {title}
{description of what was fixed and completed, relative file paths of the files changed, no code samples}
```

This log is mandatory even when the run ends with `FASTCODER-STEP-SKIPPED: continue` — the description then explains why nothing was needed.

## Rules

- This is a RETRY — be more careful than the first attempt
- Read existing code before writing new code — partial implementation may already exist
- Do not re-implement what already works
- If the failure was an environment issue (missing dependency, wrong path), fix the environment first
- Do NOT move the task file — fastcoder strips the file's `.{step}` tag and moves it to the next queue folder for whichever step it was retrying (`validate/` after `do`, `test/` after `validate`, `document/` after `test`, `done/` after `document`) on success, or `failures/` on second failure

## On success

Leave the file in `doing/`. Fastcoder will detect success and move it to the next queue folder for the step it was retrying.

## On failure

Document the failure in the task file changelog. Fastcoder will move it to `failures/`.
