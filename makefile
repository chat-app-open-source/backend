# Variables
DOCKER_COMPOSE = docker-compose
APP_SERVICE = app
REDIS_SERVICE = redis

# Default target
all: build up

# Build Docker images
build:
	$(DOCKER_COMPOSE) build

# Start services
up:
	$(DOCKER_COMPOSE) up -d

# Stop services
down:
	$(DOCKER_COMPOSE) down

# Restart services
restart: down up

# View logs
logs:
	$(DOCKER_COMPOSE) logs -f $(APP_SERVICE)

# View Redis logs
redis-logs:
	$(DOCKER_COMPOSE) logs -f $(REDIS_SERVICE)

# Enter app container shell
app-shell:
	$(DOCKER_COMPOSE) exec $(APP_SERVICE) sh

# Enter Redis container shell
redis-shell:
	$(DOCKER_COMPOSE) exec $(REDIS_SERVICE) redis-cli -a chatapp_redis_2025

# Clean up (remove volumes)
clean:
	$(DOCKER_COMPOSE) down -v

# Install dependencies inside container (if needed)
install:
	$(DOCKER_COMPOSE) exec $(APP_SERVICE) yarn install

# Test Redis connection
test-redis:
	$(DOCKER_COMPOSE) exec $(REDIS_SERVICE) redis-cli -a chatapp_redis_2025 ping

# Redis info
redis-info:
	$(DOCKER_COMPOSE) exec $(REDIS_SERVICE) redis-cli -a chatapp_redis_2025 info

# Help command
help:
	@echo "Available commands:"
	@echo "  make build        - Build Docker images"
	@echo "  make up           - Start services in detached mode"
	@echo "  make down         - Stop services"
	@echo "  make restart      - Restart services"
	@echo "  make logs         - View app logs"
	@echo "  make redis-logs   - View Redis logs"
	@echo "  make app-shell    - Enter app container shell"
	@echo "  make redis-shell  - Enter Redis CLI"
	@echo "  make clean        - Clean up (remove volumes)"
	@echo "  make install      - Install dependencies in container"
	@echo "  make test-redis   - Test Redis connection"
	@echo "  make redis-info   - Show Redis info"
	@echo "  make help         - Show this help message"

.PHONY: all build up down restart logs redis-logs app-shell redis-shell clean install test-redis redis-info help