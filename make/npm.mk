##@ npm package

.PHONY: install deps-update deps-outdated pack publish-check \
        version-patch version-minor version-major publish

install: ## Install dependencies from package-lock.json (clean install)
	npm ci

deps-update: ## Update dependencies to the latest allowed versions
	npm update

deps-outdated: ## List dependencies with newer versions available
	npm outdated || true

pack: build ## Build a publishable tarball and inspect its file list
	npm pack --dry-run

publish-check: build ## Rehearse a publish without uploading anything
	npm publish --dry-run

version-patch: ## Bump the patch version and create a git tag
	npm version patch

version-minor: ## Bump the minor version and create a git tag
	npm version minor

version-major: ## Bump the major version and create a git tag
	npm version major

publish: build ## Build and publish the package to npm
	npm publish
