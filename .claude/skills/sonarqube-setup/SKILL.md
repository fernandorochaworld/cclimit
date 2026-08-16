---
name: sonarqube-setup
description: Set up SonarQube (Community Build) in a project from scratch and operate it end-to-end — write the .env variables, drop in the docker-compose stack and the SonarQube MCP server config, then run any SonarQube function (start/stop/reset the server, wait/status/version/token-check, scan, quality-gate, issues, measures, and MCP pull/check/tools). Everything reads its parameters from the project's .env, so no Makefile is needed. Use when the user wants to "set up SonarQube", "add SonarQube to this project", "start/stop the Sonar server", "run a Sonar scan", "check the quality gate / issues / measures", or "check the SonarQube MCP server".
---

# SonarQube setup & operations (no Makefile required)

This skill does two jobs: **(A) one-time setup** of SonarQube in a project, and **(B) running any
SonarQube operation** afterwards. Every operation reads its parameters from the project's `.env` —
never hardcode the URL, token, or project key.

## Configuration comes from `.env` (single source of truth)

| Variable                     | Purpose                                                                                                          | Default                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `SONARQUBE_TOKEN`            | User token (My Account → Security). A **user** token works for scanner **and** MCP; a project token does not.    | — (required for authed ops) |
| `SONARQUBE_PROJECT_KEY`      | Project key used for scan, measures, issues, and the compose project name.                                       | `app`                       |
| `SONARQUBE_URL`              | Server URL used by host-side `curl`.                                                                             | `http://localhost:9000`     |
| `SONARQUBE_SOURCES`          | Comma-separated source dirs to analyse. Scan only owned code — scanning the repo root can OOM the JS/TS bridge.  | `src` (fall back to `.`)    |
| `SONARQUBE_SCANNER_PLATFORM` | Optional `--platform` for the scanner image (e.g. `linux/arm64` on Apple silicon to avoid slow amd64 emulation). | unset                       |

### Load `.env` at the start of every operation

Run this preamble first so the variables and derived values are in scope:

```bash
set -a; [ -f .env ] && . ./.env; set +a
SONAR_URL="${SONARQUBE_URL:-http://localhost:9000}"
PROJECT="${SONARQUBE_PROJECT_KEY:-app}"
SOURCES="${SONARQUBE_SOURCES:-src}"
MCP_IMAGE="sonarsource/sonarqube-mcp:1.22.0.3040"
# URL as seen from INSIDE a container: localhost there is the container itself, so
# rewrite loopback hosts to the host gateway. Skipping this makes the scanner's Java
# HTTP client hang on the IPv6 loopback and die after ~5 min with "request timed out".
CONTAINER_URL="$(printf '%s' "$SONAR_URL" | sed -e 's#//localhost#//host.docker.internal#' -e 's#//127.0.0.1#//host.docker.internal#')"
# Token is the basic-auth username with an empty password.
CURL=(curl -fsS -u "${SONARQUBE_TOKEN}:")
PP() { python3 -m json.tool 2>/dev/null || cat; }
```

Before any **authenticated** operation, guard the token:

```bash
[ -z "$SONARQUBE_TOKEN" ] && { echo "SONARQUBE_TOKEN is not set in .env"; exit 1; }
```

---

## A. Setup (run once per project)

Do these steps in order. Skip any step whose output already exists — **never clobber** an existing
`.env`, compose file, or `.mcp.json`; merge instead and report what you changed.

1. **Write the `.env` variables.** Ensure `.env` (and `.env.example`, with placeholder values)
   contain the five variables above. Append only the missing ones; keep existing values. Use a
   real **user** token for `SONARQUBE_TOKEN`. If `.env` is git-ignored (it should be), never write a
   real token into `.env.example`.

2. **Drop in the docker-compose stack.** Copy this skill's `assets/compose.sonarqube.yaml` into the
   project (as `compose.sonarqube.yaml`, or merge its `services`/`volumes` into an existing compose
   file). It defines `sonarqube` (Community Build) + `sonarqube_db` (PostgreSQL) under the `dev`
   profile, with named volumes prefixed by the compose project name.

3. **Register the SonarQube MCP server.** Merge this skill's `assets/mcp.sonarqube.json` into the
   project's `.mcp.json` (create it if absent). It runs the MCP server as a throwaway Docker
   container and passes the token + host-gateway URL through. Then pull the image (operation
   `mcp-pull`) and verify it (operation `mcp-check`).

4. **Linux only:** SonarQube's Elasticsearch needs `vm.max_map_count=262144`
   (`sudo sysctl -w vm.max_map_count=262144`). macOS/Docker Desktop needs nothing.

5. **Boot & verify:** run `up`, then `wait`, then `token-check`, then a first `scan`, then
   `quality-gate`. First boot takes 1–2 min. Default login at `$SONARQUBE_URL` is `admin/admin`.

After setup, tell the user this skill itself installs into new projects via `fastcoder init`
(it lives under `.claude/skills/`), so operations B are available anywhere it is initialised.

---

## B. Operations (each = the `.env` preamble + the command below)

Run the preamble first. All commands mirror the legacy `make/sonarqube.mk` targets but need no
Makefile — the values come from `.env`.

### Lifecycle (server + database)

Use the project key as the compose project name so volume names line up across boots:

```bash
DC=(docker compose -p "$PROJECT" --profile dev)
```

| Operation                   | Command                                     |
| --------------------------- | ------------------------------------------- |
| `up` — start server + db    | `"${DC[@]}" up -d sonarqube sonarqube_db`   |
| `down` — stop (keep data)   | `"${DC[@]}" stop sonarqube sonarqube_db`    |
| `restart`                   | `"${DC[@]}" restart sonarqube sonarqube_db` |
| `logs` — follow server logs | `"${DC[@]}" logs -f sonarqube`              |
| `ps` — container status     | `"${DC[@]}" ps sonarqube sonarqube_db`      |

`reset` — **DESTRUCTIVE**: deletes analysis history, users, and tokens. Ask the user to confirm
(`yes`) before running:

```bash
"${DC[@]}" down
docker volume rm "${PROJECT}_sonar_data" "${PROJECT}_sonar_logs" \
  "${PROJECT}_sonar_extensions" "${PROJECT}_sonar_db" 2>/dev/null || true
"${DC[@]}" up -d sonarqube sonarqube_db
echo "Fresh SonarQube started. Log in at $SONAR_URL (admin/admin)."
```

### Liveness / info

| Operation                          | Command                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| `status` (no auth)                 | `curl -fsS "$SONAR_URL/api/system/status" \| PP`              |
| `ping` (auth)                      | `"${CURL[@]}" "$SONAR_URL/api/system/ping" && echo`           |
| `version`                          | `curl -fsS "$SONAR_URL/api/server/version" && echo`           |
| `token-check` (auth)               | `"${CURL[@]}" "$SONAR_URL/api/authentication/validate" \| PP` |
| `projects` (needs **admin** token) | `"${CURL[@]}" "$SONAR_URL/api/projects/search" \| PP`         |

`wait` — poll until the server reports `UP` (every 5s, up to 5 min); chain after `up`:

```bash
for i in $(seq 1 60); do
  s=$(curl -fsS "$SONAR_URL/api/system/status" 2>/dev/null | grep -o '"status":"[A-Z]*"' | cut -d'"' -f4)
  [ "$s" = "UP" ] && { echo "SonarQube is UP"; break; }
  printf '.'; sleep 5
done
```

### Analysis (auth)

`scan` — run the SonarScanner in a container. It dials `$CONTAINER_URL` (not `$SONAR_URL`) because
it runs inside Docker; `--add-host` + `preferIPv4Stack` keep the JVM off the IPv6 loopback:

```bash
PLATFORM=(); [ -n "$SONARQUBE_SCANNER_PLATFORM" ] && PLATFORM=(--platform "$SONARQUBE_SCANNER_PLATFORM")
docker container run --rm "${PLATFORM[@]}" --add-host=host.docker.internal:host-gateway \
  -e SONAR_HOST_URL="$CONTAINER_URL" \
  -e SONAR_SCANNER_JAVA_OPTS="-Djava.net.preferIPv4Stack=true" \
  -v ".:/usr/src" sonarsource/sonar-scanner-cli \
  -Dsonar.projectKey="$PROJECT" -Dsonar.sources="$SOURCES" \
  -Dsonar.host.url="$CONTAINER_URL" -Dsonar.token="$SONARQUBE_TOKEN"
```

`scan-quiet` — same command, but redirect its very verbose output to a log so it doesn't flood
context; print one result line and, on failure, the log tail:

```bash
LOG="/tmp/sonar-scan-$PROJECT.log"
if <the scan command above> > "$LOG" 2>&1; then echo "Scan OK. Log: $LOG";
else echo "Scan FAILED. Last lines of $LOG:"; tail -n 15 "$LOG"; exit 1; fi
```

| Operation                | Command                                                                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quality-gate`           | `"${CURL[@]}" "$SONAR_URL/api/qualitygates/project_status?projectKey=$PROJECT" \| PP`                                                                                                          |
| `issues` (open, ≤50)     | `"${CURL[@]}" "$SONAR_URL/api/issues/search?componentKeys=$PROJECT&resolved=false&ps=50" \| PP`                                                                                                |
| `measures` (key metrics) | `"${CURL[@]}" "$SONAR_URL/api/measures/component?component=$PROJECT&metricKeys=alert_status,bugs,vulnerabilities,security_hotspots,code_smells,coverage,duplicated_lines_density,ncloc" \| PP` |

### MCP server

`mcp-pull`:

```bash
docker pull "$MCP_IMAGE"
```

`mcp-check` / `mcp-tools` — JSON-RPC handshake over stdio; proves the MCP server starts **and** can
reach SonarQube with the current token. The `sleep` keeps stdin open long enough for `tools/list`:

```bash
LOG="/tmp/sonar-mcp-$PROJECT.log"
REQ='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"skill","version":"1"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n'
{ printf "$REQ"; sleep 8; } | docker run --init --rm -i --add-host=host.docker.internal:host-gateway \
  -e SONARQUBE_TOKEN="$SONARQUBE_TOKEN" -e SONARQUBE_URL="$CONTAINER_URL" "$MCP_IMAGE" > "$LOG" 2>&1
# mcp-check: succeed if the tools/list reply (id 2) came back
grep -q '"id":2' "$LOG" && echo "MCP OK" || { echo "MCP FAILED:"; tail -n 15 "$LOG"; exit 1; }
# mcp-tools: list the exposed tool names
grep -o '"name":"[^"]*"' "$LOG" | cut -d'"' -f4 | grep -v '^sonarqube-mcp-server$' | sort -u
```

If the image is missing locally, `mcp-check`/`mcp-tools` silently trigger a multi-minute pull — run
`mcp-pull` first (fail fast with a hint if `docker image inspect "$MCP_IMAGE"` is empty).

---

## Rules

- **Read parameters from `.env` every time** — never hardcode URL/token/key. If `.env` is missing,
  run setup step 1 first.
- **Guard the token** before any authenticated operation; give a clear "set SONARQUBE_TOKEN in .env"
  message rather than a raw 401.
- **Never print the token.** When echoing commands for the user, mask it.
- **Prefer `scan-quiet`** when running non-interactively (e.g. inside another agent) so the verbose
  scanner log stays out of context.
- **`reset` requires explicit user confirmation** — it destroys all SonarQube data.
- **Don't clobber during setup** — merge into existing `.env` / compose / `.mcp.json`.
