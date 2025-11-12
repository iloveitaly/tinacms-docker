# TinaCMS Docker Management

# Build the Docker image
build:
    cd starter-template && docker-compose build

# Start services
up:
    cd starter-template && docker-compose up -d

# Stop services
down:
    cd starter-template && docker-compose down

# Restart services
restart:
    cd starter-template && docker-compose restart

# View logs
logs:
    cd starter-template && docker-compose logs -f

# Shell into TinaCMS container
shell:
    cd starter-template && docker-compose exec tinacms sh

# Clean up (removes volumes)
clean:
    cd starter-template && docker-compose down -v

# Run any docker-compose command
compose *ARGS:
    cd starter-template && docker-compose {{ARGS}}
