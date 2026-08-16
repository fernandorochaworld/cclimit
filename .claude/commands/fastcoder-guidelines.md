---
description: How to read and update the guidelines in .docs/guidelines/ — naming rules, module structure, what to include
---

You are helping maintain or consult the fastcoder project guidelines located in `.docs/guidelines/`.

## Purpose of guidelines

Guidelines are reference documents that capture how things work, what conventions to follow, and why certain decisions were made. They are not task files — they do not describe work to be done.

## Naming rules

- Use lowercase kebab-case: `fastcoder-flow.md`, `claude-code-cli-usage.md`
- Name after the topic, not the audience
- One topic per file — do not combine unrelated concerns

## Module structure (what each guideline should include)

A good guideline file contains:

1. **Purpose** — one sentence explaining what this guideline covers
2. **Rules / conventions** — the actual guidance, as a list or table
3. **Examples** — concrete examples where rules might be ambiguous
4. **Why** — brief rationale for non-obvious rules (optional but valuable)

## What to include

Include:

- Conventions that are project-specific and not obvious from the code
- Decisions that would otherwise be re-litigated repeatedly
- Format rules (naming, structure, folder layout)
- Workflow rules (what triggers what, what the expected output is)

Do NOT include:

- Code patterns derivable by reading the source
- One-off task context (that belongs in the task file)
- Step-by-step instructions for how to run tools (that belongs in the README or CLAUDE.md)

## Updating a guideline

When a convention changes:

1. Edit the relevant `.docs/guidelines/*.md` file directly
2. Be precise — update only the rule that changed; do not rewrite the whole file
3. If the change is structural (new flow step, renamed stage), update `fastcoder-flow.md` too

## Key files

- `.docs/guidelines/fastcoder-flow.md` — canonical reference for the full pipeline: stages, priority order, naming, cron, periodic rules
- `.docs/guidelines/claude-code-cli-usage.md` — Claude Code CLI flags, models, usage limits
