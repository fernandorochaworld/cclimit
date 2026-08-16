---
description: Complete fastcoder flow overview — step order, folder transitions, priority rules, cron, periodic tasks
---

You are operating inside the fastcoder automated pipeline. Read this overview before acting on any flow-related task.

## Folder transition order

`doing` is the single active-processing folder for every step (`do`, `test`, `validate`, `document`, `continue`). While a file sits in `doing/` its name carries a `.{step}` tag (e.g. `foo.step-1.md` being tested becomes `foo.step-1.test.md`). The tag is stripped when the step finishes and the file moves to the next queue folder. `todo` is the only queue folder that keeps the `to` prefix — every other queue folder dropped it. Do not create or reference `totest`, `tovalidate`, `todocument`, `testing`, `validating`, or `documenting` — those are old names.

```
ai-backlog → backlog → specification → todo → doing (.do) → validate → doing (.validate) → test → doing (.test) → document → doing (.document) → done
```

Special folders: `failures` (tasks Claude could not complete), `periodic` (health-check tasks that never move to done).

## Step priority order

Each cron run executes the first step that has work:

| Priority | Step          | Source folder                    | Success →                                                                       |
| -------- | ------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| 1        | continue      | `doing/` (failed tasks)          | next queue folder for the step it retried, or `failures/`                       |
| 2        | specification | `specification/*.md` (raw brief) | writes `todo/*.step-N.md` plans and archives the brief to `done/*.specified.md` |
| 3        | do            | `todo/`                          | `validate/`                                                                     |
| 4        | validate      | `validate/`                      | `test/`                                                                         |
| 5        | test          | `test/`                          | `document/`                                                                     |
| 6        | doc           | `document/`                      | `done/`                                                                         |
| 7        | periodic      | `periodic/`                      | stays in `periodic/`                                                            |

## Task file naming

- Specification briefs: `{timestamp}_{slug}.md` in `specification/` (raw, un-specified)
- Step plans: `{timestamp}_{slug}.step-{N}.md` in `todo/` (produced by the specification step)
- Archived brief: `{timestamp}_{slug}.specified.md` in `done/`
- Periodic: `{slug}.md` (simple, no timestamp)

## Cron behavior

- The cron checks Claude Code usage limits first; if in a blackout it skips the run entirely
- Exactly one step runs per cron tick — the highest-priority step with work
- Each step processes one task per run (except `continue`, which may batch exceptions)

## Per-project step toggles

Each step can be disabled individually. All steps are enabled by default. Disabled steps are silently skipped. Toggles are persisted in `app_state` under keys like `flow-step:do`.

## Failure handling

- First failure: task stays in `doing/`, exception recorded → `continue` step will retry
- Second failure (retry fails): task moves to `failures/` — requires manual intervention

## Periodic tasks (special rules)

- Files in `periodic/` are never moved out
- Frequency-based gate: each file encodes how often it should run via a `(countXunit)` tag (e.g. `(3Xday)`); it's due once the elapsed time since its last run reaches `periodDuration(unit) / count`. Untagged files are always eligible
- No duplicates allowed — each periodic file must have a unique slug
- Describe what to CHECK, not what to BUILD

## Key source files

- `src/application/fastcoder-flow-service.ts` — orchestrates all steps
- `src/application/settings-service.ts` — flow step toggles, `FlowStep` type
- `src/infrastructure/fastcoder-reader.ts` — `TASK_STAGES`, folder helpers
- `.docs/guidelines/fastcoder-flow.md` — human-readable full reference
