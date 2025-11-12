build:
    cd starter-template && docker-compose build

up:
    cd starter-template && docker-compose up -d

down:
    cd starter-template && docker-compose down

restart:
    cd starter-template && docker-compose restart

logs:
    cd starter-template && docker-compose logs -f

shell:
    cd starter-template && docker-compose exec tinacms sh

# removes volumes
clean:
    cd starter-template && docker-compose down -v

# passthrough for any docker-compose command
compose *ARGS:
    cd starter-template && docker-compose {{ARGS}}
