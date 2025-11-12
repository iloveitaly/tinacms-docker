# TinaCMS Docker Management Justfile
# Use 'just --list' to see all available recipes

# Default recipe - shows help
default:
    @just --list

# Build the TinaCMS Docker image
build:
    @echo "Building TinaCMS Docker image..."
    cd starter-template && docker-compose build

# Build with no cache (fresh build)
build-clean:
    @echo "Building TinaCMS Docker image (no cache)..."
    cd starter-template && docker-compose build --no-cache

# Start all services in detached mode
up:
    @echo "Starting TinaCMS services..."
    cd starter-template && docker-compose up -d

# Start all services with logs visible
up-logs:
    @echo "Starting TinaCMS services with logs..."
    cd starter-template && docker-compose up

# Stop all services
down:
    @echo "Stopping TinaCMS services..."
    cd starter-template && docker-compose down

# Stop all services and remove volumes (WARNING: deletes database data)
down-volumes:
    @echo "Stopping TinaCMS services and removing volumes..."
    @echo "WARNING: This will delete all database data!"
    cd starter-template && docker-compose down -v

# Restart all services
restart:
    @echo "Restarting TinaCMS services..."
    cd starter-template && docker-compose restart

# View logs for all services
logs:
    cd starter-template && docker-compose logs -f

# View logs for TinaCMS app only
logs-app:
    cd starter-template && docker-compose logs -f tinacms

# View logs for MongoDB only
logs-db:
    cd starter-template && docker-compose logs -f mongodb

# Show status of all services
status:
    cd starter-template && docker-compose ps

# Check health of services
health:
    @echo "Checking TinaCMS service health..."
    cd starter-template && docker-compose ps
    @echo ""
    @echo "Testing TinaCMS endpoint..."
    @curl -f http://localhost:3000 >/dev/null 2>&1 && echo "✓ TinaCMS is responding" || echo "✗ TinaCMS is not responding"

# Execute shell in TinaCMS container
shell:
    cd starter-template && docker-compose exec tinacms sh

# Execute shell in MongoDB container
shell-db:
    cd starter-template && docker-compose exec mongodb mongosh

# Build and start services
run: build up

# Full rebuild and restart (clean slate)
rebuild: down-volumes build-clean up-logs

# Pull latest base images
pull:
    cd starter-template && docker-compose pull

# Show resource usage
stats:
    docker stats --no-stream

# Clean up Docker resources (containers, images, volumes)
clean:
    @echo "Cleaning up Docker resources..."
    docker-compose -f starter-template/docker-compose.yml down -v
    docker system prune -f

# Deep clean (removes all unused Docker resources)
clean-all:
    @echo "Deep cleaning Docker resources..."
    docker-compose -f starter-template/docker-compose.yml down -v
    docker system prune -af --volumes

# Backup MongoDB data
backup:
    @echo "Creating MongoDB backup..."
    @mkdir -p backups
    docker-compose -f starter-template/docker-compose.yml exec -T mongodb mongodump --archive=/data/db/backup.archive
    docker cp tinacms-mongodb:/data/db/backup.archive ./backups/mongodb-backup-$(date +%Y%m%d-%H%M%S).archive
    @echo "Backup completed in backups/ directory"

# Restore MongoDB data from latest backup
restore:
    @echo "Restoring MongoDB from latest backup..."
    @latest=$(ls -t backups/mongodb-backup-*.archive 2>/dev/null | head -n1); \
    if [ -z "$latest" ]; then \
        echo "No backup found in backups/ directory"; \
        exit 1; \
    fi; \
    echo "Restoring from: $latest"; \
    docker cp "$latest" tinacms-mongodb:/data/db/restore.archive && \
    docker-compose -f starter-template/docker-compose.yml exec -T mongodb mongorestore --archive=/data/db/restore.archive

# Validate environment variables
check-env:
    @echo "Checking required environment variables..."
    @cd starter-template && \
    if [ ! -f .env ]; then \
        echo "✗ .env file not found in starter-template/"; \
        exit 1; \
    fi; \
    echo "✓ .env file exists"; \
    grep -q "GITHUB_PERSONAL_ACCESS_TOKEN=" .env && echo "✓ GITHUB_PERSONAL_ACCESS_TOKEN set" || echo "✗ GITHUB_PERSONAL_ACCESS_TOKEN missing"; \
    grep -q "GITHUB_OWNER=" .env && echo "✓ GITHUB_OWNER set" || echo "✗ GITHUB_OWNER missing"; \
    grep -q "GITHUB_REPO=" .env && echo "✓ GITHUB_REPO set" || echo "✗ GITHUB_REPO missing"; \
    grep -q "NEXTAUTH_SECRET=" .env && echo "✓ NEXTAUTH_SECRET set" || echo "✗ NEXTAUTH_SECRET missing"

# Generate a new NEXTAUTH_SECRET
gen-secret:
    @echo "Generating new NEXTAUTH_SECRET:"
    @openssl rand -hex 32

# Create initial .env file from template
init-env:
    @echo "Creating .env file in starter-template/..."
    @if [ -f starter-template/.env ]; then \
        echo "✗ .env file already exists. Remove it first or edit manually."; \
        exit 1; \
    fi; \
    cat > starter-template/.env << 'EOF'\n\
    # GitHub Configuration\n\
    GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here\n\
    GITHUB_OWNER=your-username\n\
    GITHUB_REPO=your-repo\n\
    GITHUB_BRANCH=main\n\
    \n\
    # NextAuth Configuration\n\
    NEXTAUTH_SECRET=$(openssl rand -hex 32)\n\
    NEXTAUTH_URL=http://localhost:3000\n\
    EOF
    @echo "✓ Created starter-template/.env - please edit with your values"

# Show Docker image sizes
images:
    @echo "TinaCMS Docker images:"
    @docker images | grep -E "tinacms|mongo|REPOSITORY" || echo "No images found"

# Monitor logs in real-time with pretty formatting
monitor:
    cd starter-template && docker-compose logs -f --tail=100

# Run docker-compose commands directly (e.g., 'just compose ps')
compose *ARGS:
    cd starter-template && docker-compose {{ARGS}}

# Quick development setup (build, start, and show logs)
dev: check-env build up logs

# Production deployment (build and start in background)
prod: check-env build-clean up
    @echo "✓ TinaCMS started in production mode"
    @echo "Access at: http://localhost:3000"
    @echo "Run 'just logs' to view logs"
    @echo "Run 'just status' to check status"
