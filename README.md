# Chat App Backend

## Requirements

| Package        | Version |
| -------------- | ------- |
| Node.js        | 22.19.0 |
| Yarn           | 1.22.22 |
| npm            | 11.6.0  |
| Docker         | 20.10+  |
| Docker Compose | 2.0+    |

## Development

### Option 1: Run with Docker (Recommended)

```bash
# Clone the repository
git clone <your-repo>
cd chat-app-backend

# Ensure .env.dev file exists with your configuration
# The file should already be in the repository with development values

# Build and start services
make build
make up

# Or use docker-compose directly
docker-compose up -d

# View logs
make logs
# or
docker-compose logs -f app
```

### Option 2: Run without Docker

```bash
# Install dependencies
yarn install

# Start development server
yarn dev
```

Server runs on `http://localhost:8000`

### Using Docker Only

```bash
# Build the image
docker build -t chat-app-backend .

# Run the container
docker run -d \
  -p 8000:8000 \
  --env-file .env.dev \
  --name chat-app-backend \
  chat-app-backend
```

## Docker Commands

### Using Makefile (Simplified)

```bash
make build         # Build Docker images
make up            # Start services in detached mode
make down          # Stop services
make restart       # Restart services
make logs          # View app logs
make app-shell     # Enter app container shell
make clean         # Clean up (remove volumes)
make install       # Install dependencies in container
make help          # Show all commands
```

### Using Docker Compose Directly

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View specific service logs
docker-compose logs -f app

# Execute commands in container
docker-compose exec app sh

# Check service status
docker-compose ps
```

## API Testing

### Health Check

```bash
curl http://localhost:8000/api/v1/health
```

### Mock OAuth Testing

**Google OAuth:**

```bash
curl -X GET "http://localhost:8000/api/v1/auth/callback/google" \
  -H "X-API-Key: chatapp_dev_2025_secure_key_abc123xyz789"
```

**Facebook OAuth:**

```bash
curl -X GET "http://localhost:8000/api/v1/auth/callback/facebook" \
  -H "X-API-Key: chatapp_dev_2025_secure_key_abc123xyz789"
```

### Email/Password Testing

**Register User:**

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: chatapp_dev_2025_secure_key_abc123xyz789" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Login:**

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: chatapp_dev_2025_secure_key_abc123xyz789" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Development Workflow

### With Docker (Hot Reload)

```bash
# Start development environment
make up

# Make code changes - they will auto-reload due to volume mounting
# View logs in real-time
make logs

# Stop when done
make down
```

### Without Docker

```bash
yarn install
yarn dev
```

## Troubleshooting

### Common Issues

1. **Port already in use**

   ```bash
   # Check what's using port 8000
   lsof -i :8000
   # Or change port in docker-compose.yml
   ```

2. **Docker container not starting**

   ```bash
   # Check container status
   docker-compose ps

   # View detailed logs
   docker-compose logs app
   ```

3. **Environment variables not loading**
   - Ensure `.env.dev` file exists in project root
   - Check that all required variables are set in `.env.dev`

4. **Docker build cache issues**
   ```bash
   # Rebuild without cache
   docker-compose build --no-cache
   ```

### Hot Reload Issues

If code changes aren't reflecting:

```bash
# Check if volumes are mounted correctly
docker-compose exec app ls -la /usr/src/app

# Restart the container
docker-compose restart app
```

### Cleaning Up

```bash
# Remove all containers, networks, and volumes
make clean

# Remove all Docker images
docker system prune -a

# Remove specific volumes
docker volume ls
docker volume rm <volume-name>
```

## Scripts

| Command         | Description                        |
| --------------- | ---------------------------------- |
| `yarn dev`      | Development server with hot reload |
| `yarn build`    | Production build                   |
| `yarn start`    | Production server                  |
| `yarn lint`     | Run ESLint                         |
| `yarn lint:fix` | Fix linting issues                 |

## Logs

Logs saved in `logs/` directory:

- `combined-YYYY-MM-DD.log` - All logs
- `error-YYYY-MM-DD.log` - Error logs only
- `http-YYYY-MM-DD.log` - HTTP requests

## License

MIT License
