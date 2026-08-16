##@ Lint

.PHONY: lint lint-fix

lint: ## Report ESLint problems across the project
	npm run lint

lint-fix: ## Report ESLint problems and auto-fix what is fixable
	npm run lint:fix
