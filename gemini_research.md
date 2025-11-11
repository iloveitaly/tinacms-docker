Architecting a Containerized Self-Hosted TinaCMS DeploymentI. Executive Summary: Architecting a Containerized TinaCMS SolutionThis report provides a definitive architectural blueprint for self-hosting the TinaCMS content management application using Docker and Docker Compose.The official TinaCMS documentation for self-hosting primarily emphasizes serverless deployment architectures, such as Vercel Serverless Functions and Netlify Functions.1 This focus, while effective for platforms tightly integrated with Git-based 20 CI/CD, creates a significant architectural gap for developers and organizations wishing to deploy on their own container-based infrastructure.This "Docker gap" is a clearly identified community concern. Developers have expressed a strong desire for an "official supported docker image" or a docker-compose example to facilitate "homelab" 3 or non-serverless deployments.3 Analysis confirms that TinaCMS "does not include a docker container option officially".4The core of this discrepancy lies in two different interpretations of "self-hosting." The official model 1 focuses on self-hosting the backend logic as a Node.js function 1, while the community request is for self-hosting the infrastructure as a persistent, long-running server process.This report bridges that architectural gap. The solution provided herein details how to containerize the TinaCMS backend—which is fundamentally a Node.js application—using a custom Dockerfile. It then presents two complete, "turnkey" docker-compose.yml solutions, coupling the containerized backend with a containerized database (either MongoDB or Redis). This approach synthesizes information from official, non-Docker example repositories 5 to deliver the container-native pattern requested.II. Deconstructing the TinaCMS Self-Hosted Backend for ContainerizationTo effectively containerize TinaCMS, it is essential to first understand its self-hosted architecture. The backend is not a monolithic application but a modular Node.js service.1Understanding the Self-Hosted ArchitectureWhen self-hosted, the TinaCMS backend is responsible for providing a GraphQL API for your content and handling authentication.1 This backend consists of three main, configurable modules 1:Auth Provider: Handles authentication and authorization for CMS operations. A default provider using Auth.js is available, which can be backed by a user collection in your database.1Git Provider: Handles saving content modifications back to your Git repository (e.g., GitHub).1Database Adapter: Handles the indexing of your content and interaction with the database (e.g., MongoDB, Redis/Vercel KV).1A critical concept of this architecture is that the database is described as an "ephemeral cache".1 The single source of truth for your content remains your Markdown and JSON files stored in your Git repository.1 This design dramatically lowers the stakes for self-hosting the database. Unlike a traditional CMS where database loss is catastrophic, in TinaCMS, the loss of the database container (without a persistent volume) would merely result in a performance penalty, as the CMS would simply re-index the content from Git. This makes a container-based solution highly viable and resilient.The "Serverless" Model vs. The "Standalone Server" ModelThe predominant pattern in the TinaCMS documentation is the "serverless" model. The provided code examples, such as // pages/api/tina/[...routes].{ts,js} 1, are designed to be deployed as Next.js API routes, which are serverless functions.However, a crucial and less-emphasized fact is that the Tina backend can be hosted on any platform that supports Express request handlers.8 This is the key to containerization. Official TinaCMS repositories, such as tinacms/tina-standalone-express 6 and tinacms/tina-self-hosted-gc-demo 5, serve as the "Rosetta Stone" for this approach. These examples demonstrate the exact pattern required for a Docker container: a persistent Node.js process that serves the Tina backend as a standalone Express application.III. Architecting the "Turnkey" Docker Compose SolutionThe following section provides the two complete solutions for deploying TinaCMS with Docker Compose, one using MongoDB and the other using Redis. Both solutions first require a canonical Dockerfile to build the Tina backend service.A. The Core Component: A Canonical Dockerfile for the Tina BackendSince no official Docker image for TinaCMS is available on registries like Docker Hub 4, one must be built. This Dockerfile is not generic; it must be placed in the root of your existing TinaCMS project (e.g., your Next.js or Astro site) because it needs to copy your project's specific tina configuration, which contains your content schema.This Dockerfile is based on the one found in the tina-self-hosted-gc-demo 5 and uses the startup command logic from the example repositories.5Table 1: Canonical Dockerfile for TinaCMS BackendDockerfile# --- Stage 1: Build Dependencies ---
# Use a specific Node.js LTS version
FROM node:18-alpine AS deps

# Set the working directory
WORKDIR /app

# Copy package.json and yarn.lock (or package-lock.json)
COPY package.json yarn.lock./

# Install production dependencies
# This layer is cached and only re-runs if package files change
RUN yarn install --frozen-lockfile

# --- Stage 2: Build the Application ---
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies from the previous stage
COPY --from=deps /app/node_modules./node_modules
# Copy the rest of the application code
COPY..

# Build the TinaCMS backend and your frontend
# This generates the necessary client and schema
RUN yarn build

# --- Stage 3: Production Image ---
# Use a slim image for the final container
FROM node:18-alpine

WORKDIR /app

# Copy production assets from the builder stage
COPY --from=builder /app/node_modules./node_modules
COPY --from=builder /app/package.json./package.json
COPY --from=builder /app/.tina./.tina
# Copy your built application (e.g., Next.js build)
COPY --from=builder /app/.next./.next
COPY --from=builder /app/public./public

# Command to run the production server.
# This assumes a 'dev:prod' script exists in your package.json,
# similar to the tina-self-hosted-gc-demo.
# This script typically runs the standalone Tina backend.
# An example 'dev:prod' script might be:
# "dev:prod": "TINA_PUBLIC_IS_LOCAL=false yarn dev"
# Or, if using the express example:
# "express-dev": "ts-node-dev --respawn --transpile-only app.ts" 
# Adjust CMD to match your project's 'start' or 'serve' script.
CMD ["yarn", "run", "dev:prod"]
B. Solution Path 1: Docker Compose with MongoDBThis solution is ideal for a robust deployment. MongoDB is officially supported by a TinaCMS database adapter 12 and is used in the tina-self-hosted-gc-demo.5YAML# docker-compose.mongo.yml
version: '3.8'

services:
  tina-backend:
    build:.
    # The 'build:.' context refers to the directory containing
    # your project's Dockerfile (from Table 1)
    container_name: tina-backend
    ports:
      - "4001:4001" # Expose the Tina GraphQL API
    environment:
      # --- Database Connection ---
      # IMPORTANT: Use the Docker service name 'mongo'
      - MONGO_URI=mongodb://mongo:2017/tinacms
      
      # --- Git Provider Config ---
      - GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_PERSONAL_ACCESS_TOKEN}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
      - GITHUB_BRANCH=${GITHUB_BRANCH}
      
      # --- Auth Config ---
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      # Add other env vars required by your tina/config.ts
      
    volumes:
      # In development, you can mount your code for hot-reloading
      # -.:/app
      # Be sure to add node_modules to a.dockerignore file
      - /app/node_modules
    depends_on:
      - mongo
    networks:
      - tina-net

  mongo:
    image: mongo:latest
    container_name: tina-mongo-db
    ports:
      - "27017:27017" # Exposed only for external debugging
    volumes:
      - mongo-data:/data/db # Persist database index
    networks:
      - tina-net

networks:
  tina-net:

volumes:
  mongo-data:
    # Use 'local' driver to persist data on the host
C. Solution Path 2: Docker Compose with RedisThis solution is lightweight and aligns perfectly with the "ephemeral cache" model.1 Redis (via Vercel KV) is a first-class adapter in the official init workflow.7 The tinacms/upstash-redis-level repository also includes a docker-compose.yml for Redis testing, validating this pattern.14YAML# docker-compose.redis.yml
version: '3.8'

services:
  tina-backend:
    build:.
    container_name: tina-backend
    ports:
      - "4001:4001" # Expose the Tina GraphQL API
    environment:
      # --- Database Connection ---
      # IMPORTANT: Use the Docker service name 'redis'
      - REDIS_URI=redis://redis:6379
      
      # --- Git Provider Config ---
      - GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_PERSONAL_ACCESS_TOKEN}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
      - GITHUB_BRANCH=${GITHUB_BRANCH}
      
      # --- Auth Config ---
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      # Add other env vars required by your tina/config.ts
      
    volumes:
      # -.:/app
      - /app/node_modules
    depends_on:
      - redis
    networks:
      - tina-net

  redis:
    image: redis:7-alpine
    container_name: tina-redis-db
    ports:
      - "6379:6379" # Exposed only for external debugging
    volumes:
      - redis-data:/data # Persist database index
    networks:
      - tina-net

networks:
  tina-net:

volumes:
  redis-data:
    # Use 'local' driver to persist data on the host
D. Configuration Cross-ReferenceThe choice between MongoDB and Redis is isolated to the database service and the Tina application's configuration. The modularity of the docker-compose.yml file mirrors the modularity of the Tina backend itself.Table 2: Service & Configuration Reference (Mongo vs. Redis)Componentdocker-compose.yml ServiceKey Environment Variabletina/database.ts Adapter Configuration CodeApplicationtina-backendMONGO_URI or REDIS_URISee code snippets in Section IV, Step 5.Database (Mongo)mongoMONGO_URIimport { MongodbLevel } from 'mongodb-level' 12Database (Redis)redisREDIS_URIimport { Redis } from '@upstash/redis'import { RedisLevel } from 'upstash-redis-level' 13IV. Step-by-Step Implementation TutorialFollow these steps to deploy your TinaCMS project from a local directory to a running Docker Compose stack.Project Scaffolding:Begin by creating a project directory:mkdir tina-docker-project && cd tina-docker-projectInitialize Tina:If you have not already, initialize your project with TinaCMS. This creates the essential tina folder that contains your backend configuration.npx @tinacms/cli@latest init 7Create the Dockerfile:Create a new file named Dockerfile in your project root:touch DockerfileCopy the entire annotated Dockerfile from Table 1 into this file.Create the docker-compose.yml:Create a new file named docker-compose.yml:touch docker-compose.ymlCopy one of the two solutions (MongoDB 5 or Redis 13) from Section III into this file.Critical Step: Configure the Tina Application:The Docker container will fail if the Tina application is not configured to connect to the database. You must edit tina/database.ts to read the environment variables from the docker-compose.yml file.For MongoDB:Your tina/database.ts should look like this 12:TypeScriptimport { createDatabase, createLocalDatabase } from '@tinacms/datalayer'
import { GitHubProvider } from 'tinacms-gitprovider-github'
import { MongodbLevel } from 'mongodb-level'

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true'
const branch = process.env.GITHUB_BRANCH |

| 'main'export default isLocal
 ? createLocalDatabase()
  : createDatabase({
      gitProvider: new GitHubProvider({
        branch,
        owner: process.env.GITHUB_OWNER as string,
        repo: process.env.GITHUB_REPO as string,
        token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN as string,
      }),
      databaseAdapter: new MongodbLevel<string, Record<string, any>>({
        collectionName: `tinacms-${branch}`,
        dbName: 'tinacms',
        mongoUri: process.env.MONGO_URI as string, // Read from Docker Compose
      }),
    })
```

**For Redis:**
Your `tina/database.ts` should look like this :
```typescript
import { createDatabase, createLocalDatabase } from '@tinacms/datalayer'
import { GitHubProvider } from 'tinacms-gitprovider-github'
import { Redis } from '@upstash/redis'
import { RedisLevel } from 'upstash-redis-level'

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true'
const branch = process.env.GITHUB_BRANCH |
| 'main'// Configure the Redis client
const redisClient = new Redis({
  url: process.env.REDIS_URI as string, // Read from Docker Compose
  token: '', // No token needed for local Redis
})

export default isLocal
 ? createLocalDatabase()
  : createDatabase({
      gitProvider: new GitHubProvider({
        branch,
        owner: process.env.GITHUB_OWNER as string,
        repo: process.env.GITHUB_REPO as string,
        token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN as string,
      }),
      databaseAdapter: new RedisLevel({
        redis: redisClient,
        namespace: branch, // Use branch for namespace
      }),
    })
```
Create the .env Configuration File:The docker-compose.yml file reads its variables from a .env file. Create this file in your project root:touch.envPopulate this file with your project's secrets, based on the variables required by the example demos.5Table 3: Comprehensive Environment Variable Guide (.env)Variable NamePurposeHow to GetGITHUB_PERSONAL_ACCESS_TOKENA GitHub PAT with repo scope to allow Tina to read/write to your content repository.7Generate at github.com/settings/tokens.GITHUB_OWNERThe GitHub organization or user that owns the repository.e.g., my-github-orgGITHUB_REPOThe name of the content repository.e.g., my-websiteGITHUB_BRANCHThe branch to read/write content from.5e.g., main or developNEXTAUTH_SECRETA random string used by Auth.js to encrypt sessions.5Generate using openssl rand -base64 32MONGO_URI or REDIS_URI(This is NOT needed in the .env file). This is set inside the docker-compose.yml file to use Docker's internal networking.mongodb://mongo:2017/tinacmsBuild and Launch:From your terminal, run the following command:docker-compose up -d --build--build: Forces Docker to build your tina-backend image using the Dockerfile from Table 1.-d: Runs the containers in detached (background) mode.Validation and First-Time Login:You can monitor the logs of your backend service:docker-compose logs -f tina-backendOnce the service is running:Test the GraphQL API by visiting http://localhost:4001/graphql in your browser.19Access the Tina admin interface by navigating to the /admin route on your frontend application (e.g., http://localhost:3000/admin).15V. Conclusions and Operational RecommendationsSuccessfully containerizing TinaCMS is more than creating a docker-compose.yml; it involves architectural decisions for production readiness.1. Managing Data PersistenceThe "ephemeral cache" concept 1 means that if your database volume is lost, your content is safe in Git. However, the re-indexing process can be slow and resource-intensive. The provided Compose files use Docker named volumes (mongo-data, redis-data). It is strongly recommended to use this approach. These volumes ensure that your database's index is persisted across container restarts (docker-compose down and up), making subsequent startups nearly instantaneous.2. Security Hardening: The Reverse Proxy ImperativeThe provided docker-compose.yml files are suitable for development. For a production environment, they must be hardened:Internal Networking: Remove the ports definitions from the mongo or redis services. These databases should not be exposed to the host or the public internet. The tina-backend service will communicate with them securely over the internal Docker network (tina-net).SSL/TLS Termination: The tina-backend service itself, which exposes the GraphQL API, must be placed behind a reverse proxy (such as Nginx, Traefik, or Caddy). This proxy will handle SSL/TLS termination, which is non-negotiable for securing authentication tokens and the NEXTAUTH_SECRET 5 in transit.3. The Frontend/Backend "Co-location" ParadoxUsers often wish to containerize the TinaCMS backend separately from their frontend (e.g., an Astro site).3 This creates an architectural paradox: the Tina configuration (the tina folder) lives inside the frontend project 17, but the runtime (the Docker container) is a separate server.The solution is as follows:The Dockerfile (Table 1) must be placed in the root of your frontend (e.g., Astro) project.The Dockerfile will COPY the entire project into the image, including the tina configuration.The CMD of the Dockerfile will only run the Tina backend server (e.g., yarn run dev:prod 5 or npm run express-dev 6). It does not run the frontend.Your frontend application (running in a separate container or on a different host) is then configured in its tina/config.ts to point its GraphQL client to the URL of the standalone tina-backend container (e.g., http://tina-backend.local:4001/graphql).This "split" architecture correctly separates the concerns, achieving the desired goal of a standalone, containerized CMS backend.4. Multi-Branch and CI/CD WorkflowsThe entire configuration is highly dependent on the GITHUB_BRANCH environment variable 5, which is used for both the Git provider and as a database namespace.12 In a CI/CD pipeline, it is recommended to dynamically build and tag your Docker image based on the branch (e.g., my-tina-app:main, my-tina-app:develop). The GITHUB_BRANCH variable should then be passed to the docker-compose up command, ensuring that the correct database namespace is used for the corresponding environment, perfectly aligning the container-based workflow with Tina's Git-first content model.20