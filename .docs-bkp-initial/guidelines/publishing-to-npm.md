# Publishing `claude-code-usage-limit` to npm

How to publish this project so it works **both** as an importable dependency
(`import { getUsage } from 'claude-code-usage-limit'`) and as an installable
CLI (`npx claude-code-usage-limit` / `ailimits`).

The project is already wired for dual mode — this guide is the release
checklist.

---

## How dual mode works

`package.json` has two independent entry mechanisms pointing at two files:

| Mechanism | Field | Points to | Used when |
|-----------|-------|-----------|-----------|
| Library | `main` / `types` / `exports` | `dist/index.js` | `import`/`require` the package |
| CLI | `bin` | `dist/cli.js` | `npx` or a global install |

The rules that keep this safe:

- `dist/index.js` is **side-effect-free** — importing it runs nothing.
- `dist/cli.js` keeps the shebang, arg parsing and `process.exit`; it is only
  ever *run*, never *imported* by consumers.
- `sideEffects` lists only `./dist/cli.js`, so bundlers can tree-shake the
  library safely.
- `files: ["dist"]` ships only compiled output — source, `.docs/` and
  `CLAUDE.md` stay out of the tarball.

Do not merge the two entry points or point `main` at `cli.js`.

---

## One-time setup

1. Create an npm account at <https://www.npmjs.com/signup> (if you have none).
2. Confirm the package name is free:
   ```sh
   npm view claude-code-usage-limit
   ```
   "404 Not Found" means it is available. If taken, rename in `package.json`
   or publish under a scope (e.g. `@fernandorochaworld/claude-code-usage-limit`).
3. Recommended `package.json` metadata before the first publish:
   ```jsonc
   "author": "Fernando Rocha <fernandorochaworld@gmail.com>",
   "repository": { "type": "git", "url": "git+https://github.com/fernandorochaworld/cclimit.git" },
   "homepage": "https://github.com/fernandorochaworld/cclimit#readme",
   "bugs": { "url": "https://github.com/fernandorochaworld/cclimit/issues" },
   "keywords": ["claude", "claude-code", "usage", "cli", "anthropic"]
   ```
4. Add a `LICENSE` file — `package.json` declares `MIT` but no file ships yet.

---

## Pre-publish checklist

Run through this every release:

- [ ] `npm run build` succeeds and `dist/` contains `index.js`, `index.d.ts`
      and `cli.js`.
- [ ] CLI works: `node dist/cli.js --json`.
- [ ] Library import is side-effect-free: 
      `node -e "import('./dist/index.js').then(m=>console.log(Object.keys(m)))"`
      prints the exports and **no other output**.
- [ ] `npm pack --dry-run` — inspect the file list; it must contain only
      `dist/`, `package.json`, `README.md` (and `LICENSE` once added).
- [ ] `version` in `package.json` is bumped (see Versioning below).
- [ ] `CHANGELOG.md` has an entry for the release.

> The `prepare` script runs `tsc` automatically before `npm publish` and on
> git installs, so `dist/` is always built fresh. You do not need to build
> manually before publishing — but do it anyway to run the checklist above.

---

## Versioning (semver)

Use `npm version` so the git tag and `package.json` stay in sync:

```sh
npm version patch   # bug fix        → 2.0.0 → 2.0.1
npm version minor   # new feature    → 2.0.0 → 2.1.0
npm version major   # breaking change→ 2.0.0 → 3.0.0
```

A breaking change includes anything that alters the **public API** in
`src/index.ts` or the CLI flags/output.

---

## Publishing

```sh
npm login                       # once per machine
npm publish                     # unscoped public package
# npm publish --access public   # required the first time for a scoped name
```

`npm publish` runs `prepare` (build) → packs the `files` whitelist → uploads.

Verify afterwards:

```sh
npm view claude-code-usage-limit version
npx claude-code-usage-limit@latest --json     # CLI works from the registry
```

In a scratch project, confirm the dependency mode:

```sh
npm install claude-code-usage-limit
node --input-type=module -e "import { getUsage } from 'claude-code-usage-limit'; console.log(typeof getUsage)"
```

---

## Safety / good practice notes

- **No secrets in the tarball.** `files: ["dist"]` is a whitelist — keep it
  that way; never publish `.credentials.json` or `.docs/`.
- **Zero runtime dependencies.** Keep it that way; CLI-only helpers (arg
  parsers, colour libs) must not become `dependencies` that library consumers
  inherit. Use `devDependencies` or hand-rolled code.
- This package reads local Claude Code OAuth credentials, so it is only
  useful on a developer machine — document that, and never let it be a
  transitive dependency of a deployed server.
- Use `npm publish --dry-run` if you want a full rehearsal with no upload.
- To retract a mistake within 72h: `npm unpublish claude-code-usage-limit@<version>`.
  After 72h, publish a patch instead — unpublishing is restricted.

---

## Quick reference

```sh
npm view claude-code-usage-limit      # is the name free?
npm pack --dry-run                    # what will ship?
npm version patch|minor|major         # bump + tag
npm publish                           # release
npx claude-code-usage-limit@latest    # smoke-test the CLI
```
