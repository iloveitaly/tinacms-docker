# TinaCMS Docker Deployment Plan

## Executive Summary

This document outlines a comprehensive strategy for deploying TinaCMS as Docker containers. TinaCMS was designed primarily for serverless platforms (Vercel/Netlify), and official Docker support is not provided. This plan addresses the architectural challenges and proposes practical solutions for containerized deployment.

## Current State Analysis

### TinaCMS Architecture Overview

TinaCMS consists of three main components that work together:

1. **Frontend Application** (Next.js or other framework)
   - Provides the editing interface
   - Renders content for end users
   - Integrates TinaCMS editor components

2. **Backend API (TinaNodeBackend)**
   - GraphQL endpoint for content operations
   - Handles authentication/authorization
   - Coordinates between database and Git
   - Runs as a Node.js Express handler

3. **Three Required Adapters:**
   - **Database Adapter**: MongoDB, PostgreSQL, or Redis (Vercel KV)
   - **Git Provider**: GitHub, GitLab, or custom
   - **Auth Provider**: Auth.js (NextAuth), Clerk, or custom

### Current Deployment Paradigm

- **Designed for**: Vercel, Netlify, serverless environments
- **Data Flow**: Git (source of truth) → Database (ephemeral cache) → GraphQL API → Frontend
- **Challenges for Docker**:
  - No official Docker images or documentation
  - Tight coupling with serverless platforms (Vercel KV, Netlify Functions)
  - Configuration assumes environment variables from cloud platforms
  - Community demand exists but unmet (GitHub Issue #115)

## Proposed Docker Architecture

### Option 1: Monolithic Single Container (Simplest)

**Description**: Bundle the entire application into one container.

```
┌─────────────────────────────────────┐
│   TinaCMS Container                 │
│                                     │
│   ┌──────────────────────────┐    │
│   │  Next.js Application     │    │
│   │  + TinaCMS Frontend      │    │
│   └──────────────────────────┘    │
│                                     │
│   ┌──────────────────────────┐    │
│   │  TinaCMS Backend API     │    │
│   │  (GraphQL)               │    │
│   └──────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
         ↓                    ↓
   ┌──────────┐         ┌──────────┐
   │ MongoDB  │         │  GitHub  │
   │ External │         │ External │
   └──────────┘         └──────────┘
```

**Pros:**
- Simpler deployment (single container)
- Easier to manage and debug
- Lower overhead
- Good for small to medium sites

**Cons:**
- Less scalable
- Can't scale frontend and backend independently
- Harder to update individual components
- Database still needs to be external or added to compose

**Use Case**: Small sites, development environments, simple deployments

---

### Option 2: Multi-Container with Docker Compose (Recommended)

**Description**: Separate concerns into multiple containers orchestrated by Docker Compose.

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │  Frontend        │      │  Backend API     │       │
│  │  Container       │◄────►│  Container       │       │
│  │                  │      │                  │       │
│  │  Next.js         │      │  GraphQL         │       │
│  │  TinaCMS UI      │      │  TinaNodeBackend │       │
│  │  Port: 3000      │      │  Port: 4001      │       │
│  └──────────────────┘      └──────────────────┘       │
│                                      ▲                  │
│                                      │                  │
│                     ┌────────────────┴────────┐         │
│                     │                         │         │
│              ┌──────▼──────┐          ┌──────▼──────┐  │
│              │  Database   │          │   Redis     │  │
│              │  Container  │          │  (Cache)    │  │
│              │             │          │             │  │
│              │  MongoDB or │          │  Optional   │  │
│              │  PostgreSQL │          │             │  │
│              │  Port: 27017│          │  Port: 6379 │  │
│              └─────────────┘          └─────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │
                    ┌──────▼──────┐
                    │   GitHub    │
                    │  (External) │
                    └─────────────┘
```

**Containers:**

1. **Frontend Container** (`tinacms-frontend`)
   - Next.js application
   - TinaCMS editing interface
   - Public-facing website
   - Connects to backend API

2. **Backend API Container** (`tinacms-backend`)
   - TinaNodeBackend with GraphQL
   - Authentication middleware
   - Git provider integration
   - Database adapter

3. **Database Container** (`tinacms-db`)
   - MongoDB or PostgreSQL
   - Persistent volume for data
   - Acts as ephemeral cache for content

4. **Redis Container** (`tinacms-redis`) - Optional
   - Session management
   - Additional caching layer
   - Rate limiting

**Pros:**
- Scalable (can scale each service independently)
- Modular (easy to update/replace components)
- Better security isolation
- Production-ready architecture
- Can use different base images optimized for each service

**Cons:**
- More complex setup
- More containers to manage
- Slightly higher resource usage
- Requires container orchestration knowledge

**Use Case**: Production deployments, larger sites, teams requiring scalability

---

### Option 3: Hybrid Approach (Frontend + Backend in One, DB Separate)

**Description**: Combine frontend and backend, but keep database separate.

```
┌─────────────────────────────────────┐
│   TinaCMS App Container             │
│                                     │
│   ┌──────────────────────────┐    │
│   │  Next.js + Backend       │    │
│   │  Port: 3000              │    │
│   └──────────────────────────┘    │
└─────────────────────────────────────┘
              ▲          ▲
              │          │
      ┌───────┘          └────────┐
      │                           │
┌─────▼──────┐            ┌───────▼────┐
│  MongoDB   │            │   GitHub   │
│  Container │            │  External  │
└────────────┘            └────────────┘
```

**Pros:**
- Simpler than full multi-container
- Database can be backed up/managed separately
- Good balance of simplicity and modularity

**Cons:**
- Can't scale frontend/backend independently
- Still requires Docker Compose

**Use Case**: Medium-sized deployments, development/staging environments

## Technical Implementation Details

### Required Components and Dependencies

#### 1. Base Dependencies (package.json)
```json
{
  "dependencies": {
    "tinacms": "latest",
    "@tinacms/datalayer": "latest",
    "next": "14.x",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@tinacms/cli": "latest"
  }
}
```

#### 2. Database Adapter Options

**Option A: MongoDB**
```bash
npm install mongodb @tinacms/datalayer
```
- Most flexible
- Good for complex content
- Well-documented
- Easy to backup

**Option B: PostgreSQL**
```bash
npm install @tinacms/datalayer
```
- Relational database benefits
- Good for structured content
- Enterprise-ready

**Option C: Redis (Upstash/Vercel KV)**
```bash
npm install @upstash/redis
```
- Fastest performance
- Simple key-value storage
- Good for smaller sites

#### 3. Git Provider Configuration

**GitHub Integration** (Recommended):
```bash
npm install @tinacms/datalayer
```

Requirements:
- GitHub Personal Access Token with `repo` scope
- Read/write access to contents
- Webhook support (optional, for real-time updates)

#### 4. Authentication Provider

**Auth.js (NextAuth.js)** (Recommended):
```bash
npm install next-auth
```
- Built-in support
- Multiple providers (GitHub, Google, credentials)
- Session management

### Environment Variables

Required environment variables for Docker deployment:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_TINA_CLIENT_ID=your-client-id
TINA_PUBLIC_IS_LOCAL=false

# GitHub Integration
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
GITHUB_BRANCH=main

# Database (MongoDB Example)
MONGODB_URI=mongodb://tinacms-db:27017/tinacms
DATABASE_URL=mongodb://tinacms-db:27017/tinacms

# Authentication
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://localhost:3000

# Backend API
TINA_CONTENT_API_URL=http://tinacms-backend:4001
```

### Docker Configuration Files

#### Dockerfile (Monolithic Approach)

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat git
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate TinaCMS client
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/tina/__generated__ ./tina/__generated__

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### docker-compose.yml (Multi-Container Approach)

```yaml
version: '3.8'

services:
  # Frontend + Backend (Monolithic in this example)
  tinacms-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tinacms-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://tinacms-db:27017/tinacms
      - GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_PERSONAL_ACCESS_TOKEN}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
      - GITHUB_BRANCH=${GITHUB_BRANCH}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - tinacms-db
    restart: unless-stopped
    networks:
      - tinacms-network

  # MongoDB Database
  tinacms-db:
    image: mongo:7
    container_name: tinacms-db
    ports:
      - "27017:27017"
    volumes:
      - tinacms-db-data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=tinacms
    restart: unless-stopped
    networks:
      - tinacms-network

  # Redis (Optional - for caching)
  tinacms-redis:
    image: redis:7-alpine
    container_name: tinacms-redis
    ports:
      - "6379:6379"
    volumes:
      - tinacms-redis-data:/data
    restart: unless-stopped
    networks:
      - tinacms-network

volumes:
  tinacms-db-data:
  tinacms-redis-data:

networks:
  tinacms-network:
    driver: bridge
```

### TinaCMS Configuration Files

#### tina/database.ts (Database Configuration)

```typescript
import { createDatabase, createLocalDatabase } from "@tinacms/datalayer";
import { MongodbLevel } from "mongodb-level";

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === "true";

export default isLocal
  ? // Local development: use filesystem
    createLocalDatabase()
  : // Production: use MongoDB
    createDatabase({
      level: new MongodbLevel({
        collectionName: "tinacms",
        dbName: "tinacms",
        mongoUri: process.env.MONGODB_URI!,
      }),
      gitProvider: {
        type: "github",
        owner: process.env.GITHUB_OWNER!,
        repo: process.env.GITHUB_REPO!,
        token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
        branch: process.env.GITHUB_BRANCH || "main",
      },
    });
```

#### pages/api/tina/[...routes].ts (Backend API)

```typescript
import { TinaNodeBackend, LocalBackendAuthProvider } from "@tinacms/datalayer";
import databaseClient from "../../../tina/__generated__/databaseClient";

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === "true";

const handler = TinaNodeBackend({
  authentication: LocalBackendAuthProvider(),
  databaseClient,
});

export default (req, res) => {
  return handler(req, res);
};
```

## Deployment Strategy

### Phase 1: Development Setup (Local Testing)

1. **Create TinaCMS Project**
   ```bash
   npx create-tina-app@latest my-tina-app
   cd my-tina-app
   ```

2. **Add Database Configuration**
   - Create `tina/database.ts`
   - Configure MongoDB adapter
   - Set up environment variables

3. **Test Locally**
   ```bash
   npm run dev
   ```

### Phase 2: Docker Development

1. **Create Dockerfile**
   - Use multi-stage build
   - Install git (required for TinaCMS)
   - Build Next.js with standalone output
   - Copy necessary files

2. **Create docker-compose.yml**
   - Define services (app, database, cache)
   - Set up networks
   - Configure volumes for persistence

3. **Create .dockerignore**
   ```
   node_modules
   .next
   .git
   .env.local
   ```

4. **Test Docker Build**
   ```bash
   docker-compose build
   docker-compose up
   ```

### Phase 3: Production Configuration

1. **Environment Variables**
   - Create `.env.production`
   - Set all required variables
   - Use secrets management for sensitive data

2. **Security Hardening**
   - Use non-root user in container
   - Enable HTTPS with reverse proxy (Nginx/Traefik)
   - Set up firewall rules
   - Configure CORS properly

3. **Backup Strategy**
   - Database backups (MongoDB dump)
   - Git repository backups (already backed up by Git provider)
   - Volume snapshots

4. **Monitoring**
   - Container health checks
   - Log aggregation
   - Performance monitoring

### Phase 4: Deployment

1. **Choose Deployment Platform**
   - Self-hosted server (VPS, bare metal)
   - Cloud platforms (AWS ECS, Google Cloud Run, Azure Container Instances)
   - Kubernetes cluster

2. **Deploy Containers**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Configure Reverse Proxy**
   - Nginx or Traefik for SSL termination
   - Domain configuration
   - Load balancing (if multiple instances)

4. **Verify Deployment**
   - Test frontend access
   - Test CMS login
   - Test content editing and saving
   - Verify Git commits

## Challenges and Solutions

### Challenge 1: Serverless-First Design

**Problem**: TinaCMS is optimized for Vercel/Netlify serverless functions.

**Solution**:
- Run TinaNodeBackend in a standard Node.js Express server
- Use Next.js standalone mode for containerization
- Adapt serverless environment variables to Docker

### Challenge 2: Database Adapter Compatibility

**Problem**: Official docs focus on Vercel KV (Redis), which is a managed service.

**Solution**:
- Use self-hosted MongoDB or PostgreSQL
- Implement custom database adapter if needed
- Redis can be containerized for caching layer

### Challenge 3: Git Provider Authentication

**Problem**: Requires GitHub Personal Access Token with proper scopes.

**Solution**:
- Use secrets management (Docker secrets, Kubernetes secrets)
- Rotate tokens regularly
- Consider GitHub App authentication for better security

### Challenge 4: File Persistence

**Problem**: Docker containers are ephemeral; data can be lost.

**Solution**:
- Use Docker volumes for database persistence
- Git is the source of truth (content persists in repository)
- Regular backups of volumes

### Challenge 5: Build-Time vs Runtime Configuration

**Problem**: Next.js separates NEXT_PUBLIC (build-time) from server (runtime) vars.

**Solution**:
- Use environment variables correctly
- Rebuild containers when public vars change
- Use runtime configuration for sensitive data

## Recommended Approach

Based on the analysis, I recommend:

### For Most Users: **Option 2 (Multi-Container with Docker Compose)**

**Reasoning:**
1. **Scalability**: Can scale components independently
2. **Maintainability**: Easy to update individual services
3. **Production-Ready**: Follows Docker best practices
4. **Flexibility**: Can swap database or add services easily
5. **Industry Standard**: Familiar to DevOps teams

**Implementation Steps:**

1. Start with a TinaCMS starter (Next.js)
2. Configure MongoDB database adapter
3. Set up GitHub integration
4. Create Dockerfile with multi-stage build
5. Create docker-compose.yml with all services
6. Test locally with Docker
7. Deploy to production environment
8. Set up CI/CD pipeline for automated deployments

### For Simple Use Cases: **Option 1 (Monolithic Container)**

Best for:
- Development/staging environments
- Small personal sites
- Quick prototypes
- Learning/testing TinaCMS

## Next Steps

1. **Choose Architecture**: Select between monolithic or multi-container
2. **Set Up Base Project**: Start with TinaCMS starter or existing project
3. **Configure Database**: Choose and configure database adapter
4. **Create Docker Files**: Write Dockerfile and docker-compose.yml
5. **Test Locally**: Validate full stack works in Docker
6. **Deploy**: Choose deployment platform and deploy containers
7. **Monitor**: Set up monitoring and logging
8. **Iterate**: Optimize based on performance metrics

## Additional Resources

- TinaCMS Self-Hosted Docs: https://tina.io/docs/self-hosted/overview
- TinaCMS Manual Setup: https://tina.io/docs/self-hosted/manual-setup
- Community Docker Repo: https://github.com/TechNiick/tinaCMS-self-hosted-docker
- Docker Compose Documentation: https://docs.docker.com/compose/
- Next.js Docker Deployment: https://nextjs.org/docs/deployment#docker-image

## Conclusion

While TinaCMS lacks official Docker support, it is entirely feasible to deploy it in containers with proper configuration. The key is understanding that:

1. **Git is the source of truth** - Database is just a cache
2. **Three adapters required** - Database, Git, Auth
3. **Backend needs persistence** - Use volumes for database
4. **Multi-container is recommended** - Better for production
5. **Environment variables are critical** - Proper configuration is essential

With this plan, you can successfully deploy TinaCMS as Docker containers to any platform that supports Docker or Kubernetes.
