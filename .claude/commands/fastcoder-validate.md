---
description: Prompt recipe for the validate step — validating tested tasks before documentation
---

You are running the **validate** step of the fastcoder flow.

## What this step does

Takes the next task from `.docs/tasks/validate/`, moves it to `doing/` (tagged `.validate`), runs a validation pass, then moves it to `test/`.

## Your job

Verify that the implementation is complete, correct, and safe before it proceeds to documentation.

## Validation checklist

Work through each item:

1. **Acceptance criteria** — re-read the task file's acceptance criteria; verify each one is met by the actual code
2. **Executable evidence (gate)** — start or attach to the running app and drive every UI-visible criterion with the Playwright CLI (`npx playwright test`, or `npx playwright` run/codegen against the running server), quoting the pass/fail output. For a task with no UI surface, quote an HTTP call against the running server with the observed status code and response body. A green type-check, a green unit suite, or a code-reading walkthrough is NOT sufficient on its own; missing executable evidence is a FAIL
3. **Console and network errors** — while exercising the feature, check the browser console and the network log. Any console error, or any non-2xx/3xx API response tied to the feature, is a failed acceptance criterion
4. **Test-coverage claims** — when an acceptance criterion names a specific unit test scenario, or a prior changelog entry (`do`/`test` step) claims a scenario is covered, `grep` the named test file for a matching `it(...)`/`describe(...)` that actually exercises that scenario before accepting the claim. A passing test suite is not evidence a specific scenario was tested — it only shows nothing currently fails. If the scenario has no matching test, treat the acceptance criterion as unmet.
5. **Scope completeness** — every file listed in the task's Scope section was changed; no required changes were skipped
6. **No regressions** — run the full test suite; no previously passing tests should now fail
7. **Code quality** — no obvious bugs, no security issues (SQL injection, XSS, command injection, path traversal)
8. **Consistency** — the implementation follows the existing code style and architecture
9. **Build** — the project builds without TypeScript errors

## What to fix

If you find issues during validation:

- Fix minor issues (typos, missing null checks at system boundaries, style inconsistencies) directly
- For significant spec violations, document them clearly and do NOT move the task forward
- Any unmet criterion, console/network error, or missing executable evidence is a FAIL: write the `{base}.fix.md` brief into `specification/` and leave the task where it is

## Task-file log (mandatory)

You MUST append an entry to the bottom of the task file, without altering any of its previous content, using this exact title format:

```
Log: {timestamp} validate - {title}
{summary of what was validated and evaluated, any fixes applied, relative file paths of the files changed, no code samples}
```

This log is mandatory even when the run ends with `FASTCODER-STEP-SKIPPED: validate` — the description then explains why nothing was needed.

Do NOT move the task file — fastcoder moves it to `test/` on success.
