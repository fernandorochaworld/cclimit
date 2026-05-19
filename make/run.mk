##@ Run

.PHONY: run run-json start

run: build ## Compile and run the ailimits CLI
	node dist/cli.js

run-json: build ## Compile and run the CLI with JSON output
	node dist/cli.js --json

start: ## Run the already-built CLI without recompiling
	npm start
