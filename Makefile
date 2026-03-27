IMG_NAME = "ghcr.io/libertech-fr/sesame-deamon"
BASE_NAME = "sesame"
APP_NAME = "sesame-daemon"
PLATFORM = "linux/amd64"
PKG_TARGETS = "linux,macos,win"
SESAME_OPENLDAP_PORT?=389
SESAME_LDAPORGANISATION?=Sesame
SESAME_LDAPDOMAIN?=sesame.local
SESAME_LDAPPASSWORD?=sesame
include .env

.DEFAULT_GOAL := help
.PHONY: help build dev install exec pkg dbs openldap stop stop-all
help:
	@printf "\033[33mUsage:\033[0m\n  make [target] [arg=\"val\"...]\n\n\033[33mTargets:\033[0m\n"
	@grep -E '^[-a-zA-Z0-9_\.\/]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[32m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build the container
	@docker build --platform $(PLATFORM) -t $(IMG_NAME) --no-cache .

dev: ## Start development environment
	@docker run --rm -it \
		-e NODE_ENV=development \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		--add-host host.docker.internal:host-gateway \
		--network dev \
		--platform $(PLATFORM) \
		--name $(APP_NAME) \
		-v $(CURDIR):/data \
		$(IMG_NAME) yarn start:dev

install: ## Install dependencies
	@docker run -it --rm \
		-e NODE_ENV=development \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		-v $(CURDIR):/data \
		$(IMG_NAME) yarn install

exec: ## Run a shell in the container
	@docker run -it --rm \
		-e NODE_ENV=development \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		-v $(CURDIR):/data \
		$(IMG_NAME) bash

pkg: ## Package the application
	@rm sesame-daemon-* || true
	@docker run -it --rm \
		-e NODE_ENV=development \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		-v $(CURDIR):/data \
		$(IMG_NAME) yarn build
	@docker run -it --rm \
		-e NODE_ENV=development \
		-e NODE_TLS_REJECT_UNAUTHORIZED=0 \
		--add-host host.docker.internal:host-gateway \
		--platform $(PLATFORM) \
		--network dev \
		-v $(CURDIR):/data \
		$(IMG_NAME) pkg dist/main.js -o sesame-daemon-macos --targets $(PKG_TARGETS) --config package.json

dbs: ## Start databases
	@docker volume create $(BASE_NAME)-mongodb
	@docker run -d --rm \
		--name $(BASE_NAME)-mongodb \
		-v $(BASE_NAME)-mongodb:/data/db \
		-p 27017:27017 \
		-e MONGODB_REPLICA_SET_MODE=primary \
		-e MONGODB_REPLICA_SET_NAME=rs0 \
		-e ALLOW_EMPTY_PASSWORD=yes \
		--platform $(PLATFORM) \
		--network dev \
		--health-interval=5s \
		--health-timeout=3s \
		--health-start-period=5s \
		--health-retries=3 \
		--health-cmd="mongosh --eval \"db.stats().ok\" || exit 1" \
		mongo:7.0 --replSet rs0 --wiredTigerCacheSizeGB 1.5 || true
	@docker volume create $(BASE_NAME)-redis
	@docker run -d --rm \
		--name $(BASE_NAME)-redis \
		-v $(BASE_NAME)-redis:/data \
		--platform $(PLATFORM) \
		--network dev \
		-p 6379:6379 \
		--health-interval=5s \
		--health-timeout=3s \
		--health-start-period=5s \
		--health-retries=3 \
		--health-cmd="redis-cli ping || exit 1" \
		redis redis-server --appendonly yes || true
	@docker exec -it $(BASE_NAME)-mongodb mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: '127.0.0.1:27017'}]})" || true

openldap: ## Start openldap database for development
	@docker run --rm -it --name $(BASE_NAME)-openldap \
		-e LDAP_ORGANISATION=$(SESAME_LDAPORGANISATION) \
		-e LDAP_DOMAIN=$(SESAME_LDAPDOMAIN) \
		-e LDAP_ADMIN_PASSWORD=$(SESAME_LDAPPASSWORD) \
		-v $(CURDIR)/openldap/sogxmail.schema:/container/service/slapd/assets/config/bootstrap/schema/custom/sogxmail.schema \
		-v $(CURDIR)/openldap/openldap.local.ldif:/container/service/slapd/assets/config/bootstrap/ldif/50-bootstrap.ldif \
		--network dev \
		-p $(SESAME_OPENLDAP_PORT):389 \
		osixia/openldap:1.5.0 --copy-service || true

stop: ## Stop the container
	@docker stop $(APP_NAME) || true

stop-all: ## Stop all containers
	@docker stop $(APP_NAME) || true
	@docker stop $(BASE_NAME)-mongodb || true
	@docker stop $(BASE_NAME)-redis || true
	@docker stop $(BASE_NAME)-openldap || true
