# Fastcoder Tasks & Flow — Quick Reference

Summary only — the authoritative source is `.docs/guidelines/fastcoder-flow.md`; read it
for full prose, edge cases and the exact scheduling algorithm. This file exists so an LLM
can get oriented without loading the full guideline.

## Stage folders (`TASK_STAGES`, `src/infrastructure/fastcoder-reader.ts`)

In pipeline order:

`ai-backlog` → `backlog` → `specification` → `doing` → `blocked` → `todo` → `validate` →
`test` → `document` → `done` → `failures` → `garbage` → `periodic`

- `doing` is the single active-processing folder for every step; the filename carries a
  `.{step}` tag while it sits there.
- `blocked` parks a task (keeping its `.{step}` tag) while it waits on `{base}.fix(-N).md`
  briefs to resolve.
- `failures` holds tasks Claude could not complete even after a retry.
- `garbage` holds discarded ideas — terminal, never processed.
- `periodic` items never move to `done` — they stay and run on a recurring schedule.

See `.docs/guidelines/fastcoder-flow.md` § "Stage Folders" for the full per-folder table
and the diagram of transitions.

## Doing-folder step tags (`DOING_TAGS`, same source file)

`do`, `test`, `validate`, `document`, `specification`

One of these is appended before `.md` while a file is in `doing/` (e.g.
`foo.step-1.md` → `foo.step-1.test.md`), naming which step currently owns the file.
Stripped again when the step finishes. `tagStage`/`untagStage`/`doingTagOf` in
`fastcoder-reader.ts` implement this.

## Task filename conventions

| Kind | Pattern | Folder |
| --- | --- | --- |
| Specification brief | `{timestamp}_{slug}.md` | `specification/` |
| Step plan | `{timestamp}_{slug}.step-{N}.md` | `todo/`, `doing/`, `validate/`, `test/`, `document/` |
| Fix brief | `{base}.fix.md`, `{base}.fix-{n}.md` | `specification/` (written by `validate` on failure) |
| Model override tag | insert `.{model}` anywhere in the dot-suffix (not the first segment), e.g. `{timestamp}_{slug}.opus.step-1.md` | any stage; `{model}` ∈ `sonnet`, `opus`, `haiku`, `fable` |
| AI-backlog suggestion | `{priority}-{date}-{slug}.md` | `ai-backlog/` |
| Periodic task | `{slug}({count}X{unit}).md` — `{unit}` ∈ `hour`, `day`, `week`, `month`, `year`; suffix optional | `periodic/` |

Full naming rules, including how a `.{model}` tag survives specification and how fix
briefs are numbered, are in `.docs/guidelines/fastcoder-flow.md` § "Task File Naming
Conventions".

## Step priority chain

Each flow run executes the **first step that has work**, in this fixed order:

1. `unblock` — re-queue a resolved `blocked/` task, or sweep an orphaned `doing/` file
2. `continue` — retry a task stuck in `doing/` after a first failure
3. `specification` — turn a raw brief into `todo/*.step-N.md` (or another entry stage) plans
4. `do` — implement the next `todo/*.step-N.md`
5. `validate` — verify the implementation; on failure writes a fix brief and parks in `blocked/`
6. `test` — write/run tests
7. `document` (`doc`) — generate docs
8. `periodic` — run one due health-check task

Project selection across ties uses "priority scheduling with round-robin tie-breaking" —
see `.docs/guidelines/fastcoder-flow.md` § "Priority Order" and § "Scheduling" for the
full algorithm and per-project/step toggle rules.

## Entry stages

`specification` no longer always writes into `todo/` — each generated step file picks one
entry stage from `ENTRY_STAGES` (`src/domain/task-entry-stage.ts`): `todo` (default),
`validate`, `test`, or `document`, depending on what the brief actually asks for. A plan
still flows through every later step regardless of where it enters. Details:
`.docs/guidelines/fastcoder-flow.md` § "Specification entry stage".

## Where to look for more

- Full flow reference: `.docs/guidelines/fastcoder-flow.md`
- Exact Claude prompt per step: `.docs/guidelines/fastcoder-step-prompts.md`
- Settings (per-project/step toggles, parallel limits): `.docs/guidelines/settings.md`
