# Fastcoder CLI Command Inventory

Every command registered on the commander `program` under `src/cli/*.ts` (one row per
`.command(...)` call). Verified against source on 2026-08-07.

Global invocation: `fastcoder <command> [args] [options]`.

## Commands

| Command | Args | Options | Purpose | Interactive |
| --- | --- | --- | --- | --- |
| `about` | — | — | Show an overview of Fastcoder and the fastcoder flow | No |
| `check [identifier]` | optional project identifier (id/name/path) | — | Run a check pass over a project, or all projects if omitted | No |
| `config` | — | — | View and change global Fastcoder settings | **Yes** — inquirer menu loop |
| `continue [identifier]` | optional project identifier | — | Resume interrupted Claude runs recorded as pending exceptions (one project, or all) | No |
| `cron:install` | — | `-i, --interval <minutes>`; `-c, --command <cmd>` | Install the scheduled `fastcoder flow` job via the OS scheduler | No |
| `cron:uninstall` | — | — | Remove the Fastcoder scheduled job | No |
| `cron:status` | — | — | Show the current Fastcoder scheduled job, if any | No |
| `doc <identifier>` | required project identifier | — | Document the next task in the document queue for a project | No |
| `exceptions` | — | `-p, --project <identifier>`; `-s, --status <status>`; `-l, --limit <n>` (default 50) | List recorded task exceptions | No |
| `executions [id]` | optional execution id | `-p, --project <identifier>`; `-s, --status <status>`; `-a, --action <name>`; `-l, --limit <n>` (default 50) | List Claude Code executions, or show one in detail by id | No |
| `flow [identifier]` | optional project identifier | — | Run one task through the fastcoder flow (tries every step in priority order and executes the first with work); scoped to a project or spans all | No |
| `init <identifier>` | required project identifier | — | Create `<tasks-folder>/tasks/{stages}` structure for a project (folder defaults to `.docs`, overridable via `TASKS_FOLDER`) | No |
| `list` (alias `ls`) | — | — | List registered projects | No |
| `logs` | — | `-p, --project <identifier>`; `-a, --action <name>`; `--level <level>`; `-e, --execution <id>`; `-l, --limit <n>` (default 50) | List recorded action logs | No |
| `menu` | — | — | Interactive root menu to pick a Fastcoder action | **Yes** — inquirer menu loop |
| `project` | — | — | Interactive menu to operate on a registered project (edit / check / reports / run / remove…) | **Yes** — inquirer menu loop |
| `register` | — | `-n, --name <name>`; `-p, --path <path>` | Register a project to be managed by Fastcoder | Conditional — prompts interactively only if `--name`/`--path` are omitted; fully scriptable when both are passed |
| `remove <identifier>` (alias `rm`) | required project identifier | — | Remove a registered project (by id, name or path) | No |
| `reports` | — | `-p, --project <identifier>`; `-l, --limit <n>` (default 20) | Show recent reports | No |
| `run <identifier> <command...>` | required project identifier; required shell command (variadic) | `--capture` (capture output/store with report instead of streaming) | Run a shell command in the registered project folder | No |
| `serve` | — | `-p, --port <port>` | Start the Fastcoder web interface (React SPA + JSON API); blocks in foreground | No (but long-running/blocking) |
| `update <identifier>` | required project identifier | `--dry-run` | Refresh the bundled fastcoder assets (`.claude/commands/fastcoder-*.md`, `.claude/skills/<name>/`) and add any missing stage folder or starter template; never deletes, never overwrites project-owned files | No |
| `validate <identifier>` | required project identifier | — | Validate the next task in the validate queue for a project | No |
| `webui:install` | — | `-p, --port <port>` | Install the global Fastcoder web-ui daemon (launchd / systemd --user / Task Scheduler) | No |
| `webui:uninstall` | — | — | Remove the global Fastcoder web-ui daemon | No |
| `webui:status` | — | — | Show the current Fastcoder web-ui daemon, if any | No |
| `webui:start` | — | `-p, --port <port>` | Start the Fastcoder web-ui in foreground on the configured port (used by the OS supervisor; not usually run directly) | No (but long-running/blocking) |

## Notes for LLM callers

- Commands marked **Yes** open an inquirer prompt loop and read from stdin/keyboard —
  never invoke them from a non-interactive agent session; use the equivalent JSON API
  route instead (see `references/http-api.md`).
- `serve` and `webui:start` never return while running in the foreground; only invoke
  them backgrounded, or prefer `webui:install` to run the web UI as a managed daemon.
- `<identifier>` arguments accept a project id, name, or filesystem path — resolved via
  `projectsService.resolveProject`.
