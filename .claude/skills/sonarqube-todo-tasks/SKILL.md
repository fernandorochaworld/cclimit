---
name: sonarqube-todo-tasks
description: Generate up to 4 SonarQube fix-task files in the project's todo queue from its current open issues. Use when the user wants to turn SonarQube issues into actionable task tickets, batch/triage Sonar issues into TODO files, or "create sonar tasks/tickets". Fast, read-only against SonarQube — writes only task markdown files.
---

# SonarQube → TODO task generator

Turn the open SonarQube issues of this project into **up to 4** ready-to-work task files
in the project's todo queue. Be fast and cheap: make the fewest MCP calls possible, never dump
raw scanner output, and never re-read large files.

## Step 0 — check the SonarQube server is reachable (ALWAYS do this first)

Before resolving anything else or gathering any data, confirm the server answers. A stopped
Docker daemon or a stopped container must never look like "a clean scan with no issues".

1. Resolve the server URL: `SONAR_HOST_URL` / `SONARQUBE_URL` from the project's `.env` or the
   environment, else `sonar.host.url` in `sonar-project.properties`, else `http://localhost:9000`.
2. Probe the status endpoint (short timeout, no retries):

       curl -s -m 5 "{SONAR_HOST_URL}/api/system/status"

   The server is reachable only if this returns JSON with `"status":"UP"`.
3. If the probe fails or the status is not `UP`, diagnose in one extra cheap call — run
   `docker ps` to distinguish the two common causes:
   - `docker ps` fails with "Cannot connect to the Docker daemon" → **the Docker daemon is not
     running**, so the SonarQube container never started.
   - `docker ps` works but no SonarQube container is listed / it is not healthy → **the container
     is stopped or still starting** (SonarQube can report `STARTING` for a minute or two).
   - Docker and the container are up but the probe still fails → **wrong host/port or the server
     is unhealthy**.

**If the server is not reachable, STOP here.** Do not query issues, do not create any task file,
and do not report "no issues found". Instead report the failure explicitly:

```
SonarQube unreachable — no issues were gathered (this is NOT a clean scan).
- URL probed: {SONAR_HOST_URL}/api/system/status
- Probe result: {error or status returned}
- Cause: {Docker daemon not running | SonarQube container stopped/starting | server unhealthy or wrong URL}
- To fix: {start Docker Desktop / `docker compose up -d` for the SonarQube stack / correct SONAR_HOST_URL}
```

Use the same wording when this skill is driven by the periodic task, so the periodic log records
"server down", never "no issues". If the fix is a one-liner the user clearly wants (e.g. the
containers exist but are stopped), you may start them, wait for `"status":"UP"`, and continue —
otherwise stop and report.

## Resolve the project's parameters first (do not hardcode)

Discover these from the repo before gathering data:

- **Project key:** read `sonar.projectKey` from `sonar-project.properties` (or `pom.xml` /
  `build.gradle` / `sonar-project.json`). If none is present, resolve per the SonarQube MCP
  project-key lookup order.
- **Branch:** default to the project's main analysis branch (the current git branch, or the repo's
  default branch such as `main` / `master` / `develop`) unless the user names another. Omit
  `pullRequest`.
- **Output folder:** the fastcoder todo queue — `<tasks-folder>/tasks/todo/`, where `<tasks-folder>`
  is `.docs` by default (or the value of `TASKS_FOLDER`). Fall back to `.docs/tasks/todo/`.
- **Assignee (optional):** from `git config user.name` and `git config user.email`. Omit the line
  if unavailable.
- **Re-scan command:** the project's SonarQube scan command — a `Makefile` target (e.g.
  `make sonar-scan`), an npm script, `sonar-scanner`, or the CI scan. Omit the footer's command if
  the repo has none.
- **File naming:** `{YYYY-MM-DD}_{HH:MM:SS}_{kebab-title}.md`. Capture ONE timestamp at the start of
  the run with `date +"%Y-%m-%d_%H:%M:%S"` and reuse it for all files created in this run (titles
  differ, so names stay unique and grouped).

## Hard rules

- **Only OPEN / unresolved issues.** Exclude anything already resolved / accepted / false-positive
  / fixed (do not re-surface issues the user already signed off).
- **No issue appears in more than one task file.** Maintain a running set `assigned` of issue keys.
  Before adding an issue to a later file, skip it if its key is already in `assigned`.
- **Create only the files you can fill.** If there aren't enough issues for a file, skip that file.
  Never create an empty task file.
- Speed over completeness of prose — the later files can be terse lists.

## Severity model

Use the SonarQube impact severity taxonomy: `BLOCKER`, `HIGH`, `MEDIUM`, `LOW`, `INFO`.
"High/blocker" = `BLOCKER` + `HIGH`.

## Data gathering (keep it to ~2 MCP calls)

Use `search_sonar_issues_in_projects` with `projects: ["{projectKey}"]`, the resolved `branch`, and
`resolved: false` (only open issues).

1. **Call 1 — severity slice for Task 1:** filter `impactSeverities: ["BLOCKER","HIGH"]`, page size 30,
   ordered most-severe first. These become Task 1 candidates.
2. **Call 2 — file ranking + remainder pool:** request facets on the file/component dimension if the
   tool supports it (to get per-file issue counts in one shot); otherwise page through open issues
   (cap the pull, e.g. ≤ 300) and count issues per `component`/file client-side. From this derive:
   - the **top 10 files by open-issue count** (for Tasks 2 & 3), and
   - the **remainder pool** (for Task 4).

   If facet counts don't include the individual issue details you need for a top-10 file, do a small
   follow-up `search_sonar_issues_in_projects` scoped to those specific files
   (`componentKeys`/`files` filter). Prefer this over pulling everything.

Keep responses compact: request only the fields you render (key, rule, impact severity, component/file,
line, message, type). Do not read full source files to build these tickets.

## Assignment algorithm (guarantees no overlap)

Process in this exact order, adding every emitted key to `assigned`:

1. **Task 1 — Blockers & High (max 30 issues).**
   Take up to 30 issues from Call 1 (BLOCKER first, then HIGH). Add their keys to `assigned`.

2. **Tasks 2 & 3 — the 10 files with the most issues, split across two files.**
   - Determine the top 10 files by total open-issue count (from Call 2).
   - For each of those files, its issues to list = all its open issues **whose key is not already in
     `assigned`** (a blocker already placed in Task 1 is not repeated; note in the file header that
     some issues in that file are covered in Task 1).
   - **Balance the two files by workload, not by file count:** greedily assign whole files to the two
     tasks so the total (post-dedup) issue counts are as even as possible. Sort files by remaining
     issue count descending, then repeatedly add the next file to whichever task currently has fewer
     issues. Keep each file wholly in one task (don't split a single file across Task 2 and Task 3).
   - Add every emitted key to `assigned`. If fewer than the needed files/issues exist, create only the
     file(s) you can fill (e.g., only Task 2 if 5 or fewer files have issues).

3. **Task 4 — up to 50 other issues (max 50).**
   From the remainder pool, take up to 50 open issues whose key is not in `assigned`. Add their keys to
   `assigned`. Skip this file entirely if the pool is empty.

## File format

Match the existing repo task style if there are prior `*sonarqube*` task files to reference. Each file
starts with a header block, then the issues.

Header block (adapt Scope per file; drop the Assignee line if it could not be resolved):

```
# SonarQube — {Task Title}

- **Created:** {YYYY-MM-DD HH:MM:SS}
- **Assignee:** {git user.name} ({git user.email})
- **Status:** To Do
- **Source:** SonarQube project `{projectKey}` ({branch} branch)
- **Scope:** {e.g. "Up to 30 BLOCKER/HIGH issues" | "Issues in files: a, b, c" | "50 additional issues"}

> Line numbers are from SonarQube's last scan; the working tree may have drifted — treat them as
> best-match locations. Only OPEN issues are listed. Do not re-open issues already accepted/FP in Sonar.

---
```

Per-issue entry — **Task 1 and Tasks 2 & 3 (detailed):**

```
### {n} — {short rule/message summary}
- **Key:** `{issueKey}`
- **Rule:** `{ruleKey}` — {type}, **{impactSeverity}**
- **File:** `{path}` (line {line})
- **Message:** {message}

**What to do:** {1–3 sentence fix guidance. For the rule specifics you may call `show_rule {ruleKey}`
once and reuse it for all issues sharing that rule — do NOT call it per issue.}
```

Group Tasks 2 & 3 by file with a `## {file path} ({count} issues)` subheading before its issues.

Per-issue entry — **Task 4 (terse list, keep it cheap):**

```
- [ ] `{impactSeverity}` `{ruleKey}` — {path}:{line} — {message} (key: `{issueKey}`)
```

### Required footer (every task file)

End **every** generated task file with the block below so whoever works the file re-scans the project
once all listed issues are fixed. Substitute the project's actual re-scan command; if the repo has no
scan command, replace the command line with a note to run the project's usual SonarQube scan.

```
---

## When all issues above are fixed
After fixing every issue listed in this task file, run the project's SonarQube re-scan command to
update the issues in SonarQube:

    {re-scan command, e.g. make sonar-scan}
```

## Suggested file titles (kebab for the filename) ("p{number}_" is to keep them in a priority order)

- Task 1 → `p1_sonarqube-blocker-high-fixes`
- Task 2 → `p2_sonarqube-top-files-issues-part-1`
- Task 3 → `p3_sonarqube-top-files-issues-part-2`
- Task 4 → `p4_sonarqube-additional-issues`

## Finish

- If Step 0 failed, the only output is the "SonarQube unreachable" report above — no task files,
  and never a "no issues found" conclusion.
- Report which files were created (full paths) and the issue count in each, plus the total distinct
  issues written. Confirm no key appears twice.
- Confirm every file ends with the required re-scan footer.
- If the project keeps a changelog (e.g. a root `CHANGELOG.md`), append a one-line-titled entry per
  its convention describing what was generated (timestamped title; no code samples).
