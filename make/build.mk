##@ Build

.PHONY: build dev watch typecheck clean rebuild

build: ## Compile TypeScript to dist/
	npm run build

dev: ## Compile then run the CLI once
	npm run dev

watch: ## Recompile on every file change
	npx tsc --watch

typecheck: ## Type-check the project without emitting files
	npx tsc --noEmit

clean: ## Remove the dist/ build output
	rm -rf dist

rebuild: clean build ## Remove dist/ and compile from scratch
