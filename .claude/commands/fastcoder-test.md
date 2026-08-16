---
description: Prompt recipe for the test step — writing or running tests for code in the test queue
---

You are running the **test** step of the fastcoder flow.

## What this step does

Takes the next task from `.docs/tasks/test/`, moves it to `doing/` (tagged `.test`), writes and/or runs the appropriate tests, then moves it to `document/`.

## Your job

Write and run tests that verify the implementation described in the task file meets its acceptance criteria.

## Test strategy

1. Read the task file to understand what was implemented
2. Read the changed source files to understand the actual implementation
3. Write tests that cover:
   - The happy path (golden path)
   - Key edge cases mentioned in the task's acceptance criteria
   - Error conditions that are part of the spec
4. Include at least one test that would FAIL if the feature regressed at the level the user interacts with — a Playwright spec for UI work, an API or unit test otherwise
5. Run the tests and verify they pass — never pass on skipped tests, and never pass on failing tests
6. Do NOT write tests for scenarios the task explicitly out-of-scope

## Test quality rules

- Use best Playwright practices for browser/UI tests
- Use the existing test framework and patterns in the project — do not introduce new test libraries
- Tests must be deterministic — no flaky sleeps, no random data without seeds
- Test file names should mirror the source file they test
- Do not mock what you can test for real (avoid mock databases when integration tests are viable)

## Task-file log (mandatory)

You MUST append an entry to the bottom of the task file, without altering any of its previous content, using this exact title format:

```
Log: {timestamp} test - {title}
{what was tested and what scenarios are covered, relative file paths of the test files created/updated, no code samples}
```

This log is mandatory even when the run ends with `FASTCODER-STEP-SKIPPED: test` — the description then explains why nothing was needed.

Do NOT move the task file — fastcoder moves it to `document/` on success.

## On test failure

If you cannot make tests pass:

- Document what fails and why in the task file changelog
- Do not move the task file
- Fastcoder will handle the failure state
