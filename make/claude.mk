##@ Claude Code

.PHONY: clauded claudec

clauded: ## Start an interactive Claude Code session
	claude --dangerously-skip-permissions --verbose

claudec: ## Run a task file with Claude Code (usage: make claudec FILE=docs/task.md)
	claude -p "Execute the task as defined in @$(FILE)" --dangerously-skip-permissions --verbose
