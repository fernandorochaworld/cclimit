---
name: ai-backlog-evaluation
description: Evaluate and triage the AI backlog — score each raw idea file in the project's ai-backlog folder on value, relevance, effort, risk and alignment, then discard it, promote it into a flow stage, split it, or park it for human approval. Use when the user wants to triage/evaluate/clean up the ai-backlog, turn backlog ideas into tasks, or run the periodic backlog evaluation.
---

# AI-backlog evaluation

Triage raw idea files into decisions. Each run reads a **bounded batch** of backlog files, scores
them against a fixed rubric, writes the reasoning into the file, and then moves, renames or leaves
it according to the decision.

## Where the backlog lives

The real path is **`<tasks-folder>/tasks/ai-backlog/`**, where `<tasks-folder>` is the project's
configured fastcoder tasks folder (`.docs` in this repository, so `.docs/tasks/ai-backlog/`).

> The "Findings" section of `CLAUDE.md` still points at `/.fast-coder/ai-backlog/`. That path is
> stale — always resolve the folder as `<tasks-folder>/tasks/ai-backlog/`. If a project genuinely
> has files under a `.fast-coder/ai-backlog/` folder, treat it as a separate legacy folder and do
> not touch it.

Backlog filenames follow `{priority}-{date}-{slug}.md` (older entries use `{date}-{slug}.md`).

## Hard boundaries

- **Never touch application source code or tests.** No edits under `src/`, `test/`, `web-ui/`, or
  any build/config file. This skill only creates, moves, renames and appends to markdown files
  **inside `<tasks-folder>/tasks/`**.
- **Never promote an idea that is insignificant, already implemented, or would damage the app.**
  A cosmetic nitpick, a duplicate, or a change that would break existing behaviour is a `discard`
  (or a `human-approval` if it is genuinely valuable but drastic) — never a `promote`.
- **Never commit or push.** Leave the moved/renamed files in the working tree.
- **Never edit the periodic task file** that invoked this skill.

## Batch limits

- **At most 5 backlog files are evaluated per run.** This bound is deliberate (cost control), not
  an accident. When more files are eligible, evaluate the 5 oldest-by-filename and **say so
  explicitly** in the run summary: report how many eligible files remain untouched, e.g.
  `evaluated 5 of 41 eligible files; 36 remain for the next run`. Never silently truncate.
- **Files named `*.human-approval.md` are skipped by every run.** They are already parked and are
  waiting on a human, so they are excluded from the eligible set and never counted in the 5.

## The five metrics

Score every evaluated file on all five, each **1–5** (5 is always "best for acting on it"):

| Metric          | 1                                                                                 | 5                                                |
| --------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Value**       | No user- or developer-visible benefit                                             | Fixes a real defect or unlocks significant value |
| **Relevance**   | Stale — the code it describes no longer exists or the idea is already implemented | Applies exactly to the current code              |
| **Effort/Cost** | Weeks of work, many modules, unclear approach                                     | Under an hour, one file, obvious approach        |
| **Risk**        | Breaking change, wide blast radius, data loss                                     | Additive and isolated, trivially revertible      |
| **Alignment**   | Fights SOLID / KISS / hexagonal architecture (see `CLAUDE.md`)                    | Reinforces the project's patterns                |

Verify **Relevance** against the actual code before scoring it — read the files the idea names. An
idea that is already implemented scores Relevance 1 and is discarded.

## The four decisions

Exactly one decision per file. Evaluate the rules **in order** and take the first that matches.

### 1. `discard` — Value ≤ 2, **or** Relevance ≤ 2, **or** Alignment = 1

The idea is already implemented, irrelevant/stale, insignificant, or harmful to the app.

**Action:** append the `Log:` entry (below), then **move** the file to
`<tasks-folder>/tasks/garbage/` keeping its filename. The log entry travels with the file, so the
reasoning is readable in `garbage/`.

### 2. `human-approval` — Value ≥ 4 **and** (Effort/Cost ≤ 2 **or** Risk ≤ 2)

High value, but a drastic change: expensive, or with a large blast radius / breaking change.
A human decides whether it happens.

**Action:** append the `Log:` entry, then **rename in place** (stays in `ai-backlog/`) to
`{base}.human-approval.md`, where `{base}` is the filename without its `.md` extension. Every later
run skips it.

### 3. `split` — the idea covers several distinct areas that belong in different stages or steps

**Action:** append the `Log:` entry, **leave the source file in place** in `ai-backlog/`, and create
one or more new task files in the appropriate stage folder(s), each named per that stage's
convention. The source file's log entry must name every file created.

### 4. `promote` — everything else (Value ≥ 3, Relevance ≥ 3, Alignment ≥ 2)

**Action:** append the `Log:` entry, then **move** the file into the **single most relevant** flow
stage folder, renamed to that stage's convention:

| Destination stage | When                                                           | Filename                       |
| ----------------- | -------------------------------------------------------------- | ------------------------------ |
| `specification`   | Needs a plan before anyone can implement it (the usual choice) | `{timestamp}_{slug}.md`        |
| `todo`            | Already a concrete, implementable step                         | `{timestamp}_{slug}.step-1.md` |
| `validate`        | Asks to validate existing behaviour                            | `{timestamp}_{slug}.step-1.md` |
| `test`            | Asks only for tests over existing code                         | `{timestamp}_{slug}.step-1.md` |
| `document`        | Asks only for documentation / guideline updates                | `{timestamp}_{slug}.step-1.md` |

`{timestamp}` is `YYYY-MM-DD_HH-MM-SS` at the moment of the move; `{slug}` is the backlog file's
existing kebab-case slug. Pick exactly one stage — if the idea truly needs several, that is a
`split`.

## The `Log:` entry (mandatory, written before the move)

Append this to the **bottom** of the evaluated file **before** moving or renaming it, without
altering any previous content:

```
Log: {YYYY-MM-DD HH:MM:SS} ai-backlog-evaluation - {decision}
Scores: Value {n}/5, Relevance {n}/5, Effort/Cost {n}/5, Risk {n}/5, Alignment {n}/5
Reason: {one or two sentences on why this decision}
Alternative considered: {the runner-up decision and why it was rejected, or "none"}
Action: {the exact move/rename/creation performed, with relative paths}
```

For a `discard`, the entry is written into the file **that lands in `garbage/`** — write it first,
then move.

## Edge cases

- **Already `*.human-approval.md`** — skipped entirely; not counted in the batch of 5, not logged
  into, not moved.
- **Duplicate idea** — if another backlog file already tracks the same idea, `discard` the **newer**
  one and name the file it duplicates in the `Reason:` line.
- **Destination filename collision** — append `-2` (then `-3`, …) to the slug before the extension
  and note the collision in the `Action:` line.
- **Unreadable or empty file** — leave it completely untouched (no log entry, no move) and record it
  in the run summary as skipped-unreadable.
- **Ambiguous decision** — when two decisions score equally, prefer the less destructive one:
  `human-approval` over `discard`, `specification` over `todo`.

## Run summary

Finish with a short report: how many files were evaluated, how many were eligible in total and how
many remain, one line per file (`{filename} → {decision}`), and any skipped-unreadable files. Do not
commit.
