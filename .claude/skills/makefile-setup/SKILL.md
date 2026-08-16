---
name: makefile-setup
description: Scaffold and extend a modular Makefile structure in a project — a root Makefile that auto-includes every module makefile under .docs/makefiles/*.mk (via `include $(wildcard .docs/makefiles/*.mk)`), shared color/logging helpers, and a `help` target. Use when the user wants to "set up a Makefile", "add a Makefile to this project", "create the make structure", "add a make module/target", or organize make targets into modular .mk files loaded from the .docs folder.
---

# Makefile structure setup (modular, loaded from `.docs`)

Give a project the same modular Makefile layout fastcoder uses: a small root `Makefile` that
**auto-includes every `*.mk` under `.docs/makefiles/`**, so targets are organized into per-concern
modules (build, test, docker, …) instead of one giant file.

`fastcoder init` already scaffolds the base of this (root `Makefile` + `.docs/makefiles/example.mk`)
without overwriting anything that exists. Use this skill to **create it in a project that wasn't
init'd**, to **repair** a missing piece, or to **add new module makefiles and targets**.

## The layout

```
Makefile                     # root — env load, helpers, `include $(wildcard .docs/makefiles/*.mk)`, help
.docs/makefiles/
  example.mk                 # starter module (safe to delete once you have real ones)
  build.mk  test.mk  …       # your modules — each is auto-included
```

> `.docs` is the default tasks-folder. If the project overrides it (`TASKS_FOLDER` / settings),
> substitute that folder name in both the include path and the `makefiles/` location so they match.

## Root `Makefile` (create only if absent — never clobber an existing one)

Key lines it must contain:

- `-include .env` — load env vars (ignored if `.env` is missing).
- `SHELL := /bin/bash` and `.DEFAULT_GOAL := help`.
- Color vars (`C_RESET/C_BOLD/C_RED/C_GREEN/C_YELLOW/C_CYAN`), disablable with `NO_COLOR=1`.
- Logging helpers used inside recipes: `log_info` (cyan ▶), `log_ok` (green ✓), `log_warn`
  (yellow ⚠), `log_err` (red ✗) — e.g. `@$(call log_info,Building…)`.
- **`include $(wildcard .docs/makefiles/*.mk)`** — the auto-include line (this is the whole point).
- A `help` target as the default goal.

## Adding a module makefile

Create `.docs/makefiles/<concern>.mk`. It is picked up automatically — no edit to the root Makefile.
Pattern:

```make
# .docs/makefiles/build.mk
.PHONY: build
build: ## Compile the project
	@$(call log_info,Building…)
	@<your build command> && $(call log_ok,Built) || { $(call log_err,Build failed); exit 1; }
```

Guidelines for modules:

- One concern per file (`build.mk`, `test.mk`, `docker.mk`, `lint.mk`, …).
- Declare real targets `.PHONY` when they don't produce a file of that name.
- Reuse the root helpers (`log_info`/`log_ok`/…) — they're defined before the include, so every
  module can call them.
- Keep secrets out of the Makefile; read them from `.env` (already loaded via `-include .env`).

## Rules

- **Never overwrite an existing root `Makefile` or module `.mk`** — merge/extend instead, and tell
  the user what you added.
- **Match the project's tasks-folder** for the include path and the `makefiles/` directory (default
  `.docs`).
- Verify after setup: run `make help` and the example target (`make example`) to confirm the
  include chain and helpers work, then report the result.
- Prefer adding a new `.mk` module over growing the root Makefile — the root stays small on purpose.
