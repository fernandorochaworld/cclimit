# Root Makefile
#
# Sub-makefiles live in ./make and are grouped by concern:
#   make/build.mk   compile, type-check, watch and clean the dist/ output
#   make/run.mk     run the ailimits CLI locally
#   make/lint.mk    report and auto-fix ESLint problems
#   make/npm.mk     dependencies, versioning and publishing
#   make/claude.mk  Claude Code helpers
#
# Every file matching make/*.mk is included automatically — adding a module
# needs no edit here. See .docs/guidelines/make-targets.md for the conventions.
#
# Run `make` or `make help` to list every available target.

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Include every sub-makefile found in ./make
include $(wildcard make/*.mk)

.PHONY: help

help: ## Show this help message
	@echo ""
	@echo "ailimits — available make targets"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5); next } \
		/^[a-zA-Z0-9_-]+:.*?## / { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 }' \
		$(MAKEFILE_LIST)
	@echo ""
