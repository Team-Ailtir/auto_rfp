GIT_REPO := $(shell basename -s .git $(shell git config --get remote.origin.url))
GIT_SHA := $(shell git rev-parse --short HEAD)
PROJECT_NAME := rfp

.DEFAULT_GOAL := help

# Show help for all targets
.PHONY: help
help: ## Show help for all targets
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: docker-build
docker-build: ## Build Docker container
	DOCKER_BUILDKIT=1 docker build . -t $(GIT_REPO)
	docker tag $(GIT_REPO):latest $(GIT_REPO):$(GIT_SHA)

# AWS_REPO is evaluated lazily only when needed for docker operations
define get_aws_repo
$(shell aws ecr describe-repositories | jq -r ".repositories[] | select(.repositoryName | contains(\"${PROJECT_NAME}-\")) | .repositoryUri")
endef

.PHONY: docker-push
docker-push: ## Push Docker container
	$(eval AWS_REPO := $(call get_aws_repo))
	docker tag $(GIT_REPO):latest $(AWS_REPO):$(GIT_SHA)
	docker push $(AWS_REPO):$(GIT_SHA)
	docker tag $(GIT_REPO):latest $(AWS_REPO):latest
	docker push $(AWS_REPO):latest

.PHONY: docker-start
docker-start: ## Run Docker container
	test -n "$$(docker ps --quiet --filter name=^auto_rfp$$)" || docker run \
		--detach \
		--env-file .env.local \
		--network host \
		--rm \
		$(GIT_REPO):latest

.PHONY: docker-stop
docker-stop: ## Stop Docker container
	test -z "$$(docker ps --quiet --filter name=^auto_rfp$$)" || docker stop auto_rfp

.PHONY: install
install: ## Install dependencies
	pnpm install

.PHONY: 
run-dev: ## Run dev server
	pnpm dev
