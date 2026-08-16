---
name: fastcoder-usability
description: Use every Fastcoder feature from an LLM session — register/list/remove projects, init the tasks structure, author and move task files, run the fastcoder flow (do/continue/validate/test/doc/specification/periodic), install or inspect the cron job, read and change settings and flow-step toggles, inspect executions/exceptions/logs/reports, and start or drive the web UI and its JSON API. Use when the user asks to manage Fastcoder projects, queues or task files, run/continue/validate/document a task, schedule fastcoder, change fastcoder settings, or check what a fastcoder run did.
---

# Fastcoder usability

Drive Fastcoder from an agent session — both inside a fastcoder-run step and from Claude Code in any
registered project. Detail lives in the references; this file only routes and guards.

- [`references/cli.md`](references/cli.md) — every CLI command, its args, options and whether it is interactive
- [`references/http-api.md`](references/http-api.md) — every `/api` route
- [`references/tasks-and-flow.md`](references/tasks-and-flow.md) — stage folders, filename conventions, step priority

## Pick the surface

1. **Default to the `fastcoder` CLI.** It needs no server and is scriptable.
2. **Use the HTTP API only** when the web server is already running (`fastcoder serve`, or a
   `webui:install` daemon — check `fastcoder webui:status`) or when the user explicitly asks for the
   API/web UI. Base URL `http://localhost:<port>/api`.
3. **Never run an interactive command.** `config`, `menu` and `project` open inquirer prompt loops and
   will hang a non-interactive session — see the "Interactive" column in `references/cli.md`. Use the
   API equivalent or a fully-flagged command instead (e.g. `register --name <n> --path <p>` rather than
   bare `register`).
4. `serve` and `webui:start` block forever — background them or prefer `webui:install`.
5. Long flow calls (`flow`, `POST /api/flow`, `execute`) drive Claude Code and can take minutes.

## Routing table

| Intent | Entry point |
| --- | --- |
| Register a project | `fastcoder register --name <name> --path <path>` (both flags = non-interactive) or `POST /api/projects` |
| List projects | `fastcoder list` (alias `ls`) or `GET /api/projects` |
| Inspect one project | `GET /api/projects/:id` |
| Rename / move a project | `PUT /api/projects/:id` |
| Favorite a project | `PATCH /api/projects/:id/favorite` |
| Remove a project | `fastcoder remove <identifier>` (alias `rm`) or `DELETE /api/projects/:id` — **confirm first** |
| Create the tasks folders | `fastcoder init <identifier>` or `POST /api/projects/:id/init` |
| Refresh/update the fastcoder structure, commands or skills | `fastcoder update <identifier> [--dry-run]` (see `references/cli.md`) or `POST /api/projects/:id/update` (see `references/http-api.md`) |
| List task files by stage | `GET /api/projects/:id/tasks` |
| Read a task file | `GET /api/projects/:id/tasks/:stage/:name` (or read the file directly) |
| Create a task file | `POST /api/projects/:id/tasks/:stage` — or write the `.md` straight into the stage folder |
| Edit a task file | `PUT /api/projects/:id/tasks/:stage/:name` |
| Move a task between stages | `POST /api/projects/:id/tasks/:stage/:name/move` (body `to`) |
| Delete a task file | `DELETE /api/projects/:id/tasks/:stage/:name` — **confirm first** |
| Run the flow (one project) | `fastcoder flow [identifier]` or `POST /api/projects/:id/flow` |
| Run the flow (everything) | `fastcoder flow` or `POST /api/flow` |
| Preview what the flow would pick | `GET /api/flow/next-tasks` |
| Run one specific task now | `POST /api/projects/:id/tasks/:stage/:name/execute` |
| Specify one brief | `POST /api/projects/:id/tasks/specification/:name/specify` |
| Continue interrupted runs | `fastcoder continue [identifier]` or `POST /api/projects/:id/continue` |
| Validate the next task | `fastcoder validate <identifier>` or `POST /api/projects/:id/validate` |
| Document the next task | `fastcoder doc <identifier>` or `POST /api/projects/:id/doc` |
| Check a project | `fastcoder check [identifier]` or `POST /api/projects/:id/check` |
| Run a shell command in a project | `fastcoder run <identifier> <command...>` (`--capture`) or `POST /api/projects/:id/run` |
| Stop running Claude processes | `POST /api/projects/:id/stop`, or one task via `POST /api/projects/:id/tasks/:stage/:name/stop` |
| Which tasks are running | `GET /api/projects/:id/running`, capacity via `GET /api/concurrency` |
| Install the schedule | `fastcoder cron:install -i <minutes>` or `POST /api/cron/install` |
| Schedule status | `fastcoder cron:status` or `GET /api/cron` |
| Remove the schedule | `fastcoder cron:uninstall` or `POST /api/cron/uninstall` — **confirm first** |
| Read settings | `GET /api/settings` (the CLI `config` command is interactive — do not use) |
| Change settings / flow-step toggles | `PUT /api/settings` (`flowSteps`, `claudeModel`, `tasksFolder`, `gitFeatures`, `ringSound`, `executeTaskToEnd`, `parallelLimits`) |
| Re-init tasks folder everywhere | `POST /api/settings/tasks-folder/init` |
| Update bundled assets everywhere | `POST /api/settings/tasks-folder/update` |
| Claude Code usage limits | `POST /api/settings/claude-code-limits/refresh`, clear with `DELETE /api/settings/claude-code-limits` |
| List executions | `fastcoder executions [id] -p <project> -s <status> -a <action> -l <n>` or `GET /api/executions`, `GET /api/executions/:id`, `GET /api/executions/count` |
| List exceptions | `fastcoder exceptions -p <project> -s <status>` or `GET /api/exceptions`, `GET /api/exceptions/:id`; change status with `PATCH /api/exceptions/:id` |
| Read logs | `fastcoder logs -p <project> -a <action> --level <level> -e <id>` or `GET /api/logs` |
| Read reports | `fastcoder reports -p <project> -l <n>` or `GET /api/reports` |
| Clear a project's records | `DELETE /api/projects/:id/records` — **confirm first, destructive** |
| Search anything | `GET /api/search/projects`, `GET /api/search/tasks`, `GET /api/search/executions`, `GET /api/search/exceptions`, `GET /api/search/logs` (query `q`) |
| Stage/status vocabularies for filters | `GET /api/meta` |
| Start the web UI now | `fastcoder serve -p <port>` (blocking — background it) |
| Run the web UI as a daemon | `fastcoder webui:install -p <port>`, `fastcoder webui:status`, `fastcoder webui:uninstall` |
| Explain Fastcoder to the user | `fastcoder about` |

## Authoring task files

Write the file into the **stage folder that matches the work** (`specification/` for a raw brief,
`todo/` for a ready step plan; `validate/`, `test/` and `document/` are also valid entry stages), under
`<tasks-folder>/tasks/<stage>/`.

- Step plan: `{timestamp}_{slug}.step-{N}.md` — one file per step, N in execution order.
- Brief: `{timestamp}_{slug}.md` in `specification/`; fastcoder generates the step files from it.
- Model override: insert `.{model}` into the dot-suffix (never the first segment), e.g.
  `{timestamp}_{slug}.opus.step-1.md`; `{model}` ∈ `sonnet`, `opus`, `haiku`, `fable`.
- Periodic task: `{slug}({count}X{unit}).md` in `periodic/`, `{unit}` ∈ `hour`, `day`, `week`, `month`,
  `year` (suffix optional). Periodic tasks never reach `done`.
- Never add a `.{step}` doing-tag by hand — fastcoder applies and strips it.

Full rules and the stage list: [`references/tasks-and-flow.md`](references/tasks-and-flow.md).

## Safety rules

- **Never edit a file inside `doing/`** — a run owns it, and your write will be overwritten or will
  corrupt the step.
- **Never hand-move a task between stage folders while a run owns it.** Check
  `GET /api/projects/:id/running` (or that no flow is executing) first; let the flow do the transition.
- **Confirm with the user before destructive actions**: `remove`, deleting task files, clearing records
  (`DELETE /api/projects/:id/records`) and `cron:uninstall`.
- **Prefer read-only commands when only inspecting**: `list`, `executions`, `exceptions`, `logs`,
  `reports`, `cron:status`, `webui:status`, `about`, and any `GET` route. Reach for `flow`, `continue`,
  `validate` or `doc` only when the user actually wants work executed.
- Don't start a second flow while one is running — check `GET /api/concurrency` first.

## Verify the result

After **any** state-changing command, confirm with the matching read-only command instead of assuming
success:

| Did | Verify with |
| --- | --- |
| `register` / `remove` / `init` | `fastcoder list` or `GET /api/projects` |
| `flow` / `continue` / `validate` / `doc` / `execute` | `fastcoder executions` (then `fastcoder logs` / `fastcoder exceptions` if it failed) |
| Created / moved / deleted a task file | `GET /api/projects/:id/tasks` |
| `cron:install` / `cron:uninstall` | `fastcoder cron:status` or `GET /api/cron` |
| `PUT /api/settings` | `GET /api/settings` |
| `webui:install` / `webui:uninstall` | `fastcoder webui:status` |

Report what the verification actually showed — never claim a run succeeded without an execution record.

## Notes

- `fastcoder init` skips any skill whose destination folder already exists, so a project inited before
  this skill shipped keeps a stale copy. Run `fastcoder update <identifier>` to refresh it in place —
  no need to delete `.claude/skills/fastcoder-usability/` first.
- `<identifier>` accepts a project id, name, or filesystem path.
