# Variables
DOCKER_COMPOSE = docker-compose
APP_SERVICE = app

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

# Enter app container shell
app-shell:
	$(DOCKER_COMPOSE) exec $(APP_SERVICE) sh

# Clean up (remove volumes)
clean:
	$(DOCKER_COMPOSE) down -v

# Install dependencies inside container (if needed)
install:
	$(DOCKER_COMPOSE) exec $(APP_SERVICE) yarn install

# Help command
help:
	@echo "Available commands:"
	@echo "  make build      - Build Docker images"
	@echo "  make up         - Start services in detached mode"
	@echo "  make down       - Stop services"
	@echo "  make restart    - Restart services"
	@echo "  make logs       - View app logs"
	@echo "  make app-shell  - Enter app container shell"
	@echo "  make clean      - Clean up (remove volumes)"
	@echo "  make install    - Install dependencies in container"
	@echo "  make help       - Show this help message"

.PHONY: all build up down restart logs app-shell clean install help