---
description: Prompt recipe for the periodic step — health-check tasks that run on a recurring schedule
---

You are running the **periodic** step of the fastcoder flow.

## What this step does

Picks a task from `.docs/tasks/periodic/` that has not run in the last 24 hours, executes the health check it describes, and logs the result. The file stays in `periodic/` — it is never moved to `done/`.

## Key rules

1. **Files never leave `periodic/`** — do not move, rename, or delete periodic task files
2. **24-hour gate** — only run a periodic task if 24+ hours have passed since its last execution. Check `.docs/logs/periodic-tasks-log.md` for the last run timestamp of that file
3. **No duplicates** — each periodic file has a unique slug; do not create files with duplicate names
4. **Check, don't build** — periodic tasks are for health checks and audits, not for building features

## What periodic tasks typically check

- Open PRs that have been idle too long
- Dependency vulnerabilities (`npm audit`, `pip check`, etc.)
- Test coverage trends
- Lingering tasks in `failures/` that need manual attention
- Disk usage or resource consumption
- External API health (if the project integrates with one)

## AI-backlog format inside periodic files

Each periodic file should contain:

```
# {Health check title}

## What to check
{Specific description of what to verify}

## Pass criteria
{What "healthy" looks like}

## On failure
{What action to suggest or take}
```

## After running

The periodic task file is **read-only**: do NOT modify, append to, move, rename or delete it.

Write the run log to `.docs/logs/periodic-tasks-log.md` instead (create the file and its folder when
absent). Entries are newest first, in the CHANGELOG.md format — prepend at the top, below the header
line, separated from the previous entry by a blank line:

```
{YYYY-MM-DD HH:MM:SS} - {periodic task filename}
{Brief description: what was checked, what was found, any action taken}
```

## Selecting which periodic task to run

If multiple periodic tasks are eligible (>24h since last run), run the one whose last-run timestamp is oldest (least recently run).
