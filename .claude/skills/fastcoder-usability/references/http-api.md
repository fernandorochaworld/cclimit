# Fastcoder HTTP API Inventory

Every route mounted under `/api` by `apiRouter()` in `src/web/api/index.ts` and its child
routers. Verified against source on 2026-08-07. Start the server with `fastcoder serve`
or `fastcoder webui:start`/`webui:install`; base URL `http://localhost:<port>/api`.

Path params are named exactly as in the source (`:id` = project id, `:stage` = task
stage, `:name` = task filename).

## `/api/projects` — `projectsRouter()` (src/web/api/projects.ts)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/projects` | List registered projects, decorated with `initialised` + `stages` |
| POST | `/api/projects` | Register a project (`name`, `path` in body) |
| GET | `/api/projects/:id` | Get one project |
| PUT | `/api/projects/:id` | Update a project's `name`/`path` |
| PATCH | `/api/projects/:id/favorite` | Set `isFavorite` (boolean) |
| PATCH | `/api/projects/:id/paused` | Set `isPaused` (boolean) — a paused project runs nothing |
| PATCH | `/api/projects/:id/priority` | Set `isPriority` (boolean) — body `{ "isPriority": true }`, responds with the decorated project |
| DELETE | `/api/projects/:id` | Remove a project |
| POST | `/api/projects/:id/init` | Initialise `<tasks-folder>/tasks/*` structure for a project |
| POST | `/api/projects/:id/update` | Refresh the project's bundled fastcoder assets (commands, skills) and add missing stage folders/templates — responds with `{ stages, commands, skills, templates, guidelines, migratedSkills }` |

`PATCH /api/projects/:id/priority` takes `{ "isPriority": boolean }` and responds `200` with the
decorated project; a non-boolean body yields `400` (`"isPriority" must be a boolean.`) and an
unknown id `404`.

## `/api/projects/:id/tasks` — `tasksRouter()` (src/web/api/tasks.ts)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/projects/:id/tasks` | List every task file grouped by stage |
| GET | `/api/projects/:id/tasks/:stage/:name` | Read one task's content |
| POST | `/api/projects/:id/tasks/:stage` | Create a task in a stage (`name`, `content` in body) |
| PUT | `/api/projects/:id/tasks/:stage/:name` | Update a task's content |
| POST | `/api/projects/:id/tasks/:stage/:name/move` | Move a task to another stage (`to` in body) |
| DELETE | `/api/projects/:id/tasks/:stage/:name` | Delete a task |

## `/api` root — `actionsRouter()` (src/web/api/actions.ts)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/projects/:id/check` | Run a check pass on one project |
| POST | `/api/projects/:id/continue` | Resume every pending exception for one project |
| POST | `/api/projects/:id/run` | Run an arbitrary shell command inside a project, capturing output (`command` in body) |
| GET | `/api/flow/next-tasks` | Live preview: next file each flow step would process, across all projects |
| POST | `/api/flow` | Run the full fastcoder flow globally (all projects) |
| POST | `/api/projects/:id/flow` | Run the full fastcoder flow scoped to one project |
| POST | `/api/projects/:id/tasks/specification/:name/specify` | Specify one brief in the specification stage |
| POST | `/api/projects/:id/tasks/:stage/:name/execute` | Execute one specific task immediately (dispatches by stage/step) |
| POST | `/api/projects/:id/validate` | Validate the next task in the validate queue |
| POST | `/api/projects/:id/doc` | Document the next task in the document queue |
| POST | `/api/projects/:id/stop` | Stop every Claude process currently running for a project |
| POST | `/api/projects/:id/tasks/:stage/:name/stop` | Stop the Claude process of one specific task |
| GET | `/api/concurrency` | Point-in-time active-run counts vs. configured parallel limits |
| GET | `/api/projects/:id/running` | Which tasks of a project currently have a Claude process running |

## `/api` root — `maintenanceRouter()` (src/web/api/system.ts)

| Method | Path | Purpose |
| --- | --- | --- |
| DELETE | `/api/projects/:id/records` | Clear all logs, executions and reports for a project |

## `/api/executions` — `executionsRouter()` (src/web/api/records.ts)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/executions` | List executions (query: `projectId`, `status`, `action`, `since`, `limit`) |
| GET | `/api/executions/count` | Total count matching the filter, ignoring `limit` |
| GET | `/api/executions/:id` | Get one execution by id |

## `/api/exceptions` — `exceptionsRouter()` (src/web/api/records.ts)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/exceptions` | List exceptions (query: `projectId`, `status`, `limit`) |
| GET | `/api/exceptions/:id` | Get one exception by id |
| PATCH | `/api/exceptions/:id` | Change an exception's `status` (+ optional `reason`) |

## `/api/logs` — `logsRouter()` (src/web/api/records.ts)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/logs` | List action logs (query: `projectId`, `action`, `level`, `executionId`, `since`, `limit`) |

## `/api/reports` — `reportsRouter()` (src/web/api/records.ts)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/reports` | List reports (query: `projectId`, `limit`); recent across all projects if `projectId` omitted |

## `/api/cron` — `cronRouter()` (src/web/api/system.ts)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/cron` | Scheduled-job status, interval and default command |
| POST | `/api/cron/install` | Install the scheduled job (`intervalMinutes` in body) |
| POST | `/api/cron/uninstall` | Remove the scheduled job |

## `/api/settings` — `settingsRouter()` (src/web/api/system.ts)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/settings` | Read all global settings + Claude Code usage limits (best-effort refresh) |
| PUT | `/api/settings` | Update settings (`ringSound`, `gitFeatures`, `tasksFolder`, `claudeModel`, `flowSteps`, `executeTaskToEnd`, `parallelLimits`) |
| POST | `/api/settings/tasks-folder/init` | Re-initialise the tasks-folder structure across every registered project |
| POST | `/api/settings/tasks-folder/update` | Refresh the bundled fastcoder assets across every registered project — responds `{ tasksFolder, results }`, one `{ id, name, ok, added, updated, unchanged }` per project |
| DELETE | `/api/settings/claude-code-limits` | Clear stored Claude Code usage limits |
| POST | `/api/settings/claude-code-limits/refresh` | Trigger a fresh fetch of Claude Code usage limits |

## `/api/meta` — `metaRouter()` (src/web/api/system.ts)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/meta` | Static domain metadata for UI dropdowns: task stages, execution/exception statuses, log levels, timezone, tasks-folder name |

## `/api/search` — `searchRouter()` (src/web/api/search.ts)

One route per entity type, all sharing the `q` query param.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/search/projects` | Search projects by `q` |
| GET | `/api/search/tasks` | Search tasks by `q` |
| GET | `/api/search/executions` | Search executions by `q` |
| GET | `/api/search/exceptions` | Search exceptions by `q` |
| GET | `/api/search/logs` | Search logs by `q` |

## Notes for LLM callers

- All routes return JSON; errors go through `errorMiddleware` as `{ error: string }` with
  a matching HTTP status.
- `POST /api/flow`, `POST /api/projects/:id/flow`, and the `:name/execute`/`specify`
  routes drive Claude Code and can take minutes — the HTTP request stays open until the
  run finishes.
- `execute` on a task in stage `doing` resumes it using the step named by its `.{step}`
  filename tag (see `references/tasks-and-flow.md`), not always `do`.
