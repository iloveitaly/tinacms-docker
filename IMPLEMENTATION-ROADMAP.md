# TinaCMS Docker Implementation Roadmap

## Overview

This roadmap provides a step-by-step guide to implementing TinaCMS as Docker containers, from initial setup through production deployment.

## Phase 1: Planning and Prerequisites (Week 1)

### Goals
- Understand TinaCMS architecture
- Choose deployment approach
- Gather required credentials
- Set up development environment

### Tasks

#### Task 1.1: Review Documentation
- [ ] Read [DOCKER-DEPLOYMENT-PLAN.md](./DOCKER-DEPLOYMENT-PLAN.md)
- [ ] Read [QUICK-START-GUIDE.md](./QUICK-START-GUIDE.md)
- [ ] Review [RESEARCH-FINDINGS.md](./RESEARCH-FINDINGS.md)
- [ ] Understand TinaCMS basics at https://tina.io/docs

**Time Estimate**: 2-4 hours

#### Task 1.2: Make Architecture Decision
Use the decision matrix to choose:

| Decision Point | Options | Your Choice |
|----------------|---------|-------------|
| Architecture | Monolithic / Multi-Container / Hybrid | _________ |
| Database | MongoDB / PostgreSQL / Redis | _________ |
| Git Provider | GitHub / GitLab / Custom | _________ |
| Auth Provider | Auth.js / Clerk / Custom | _________ |
| Deployment Platform | VPS / AWS / GCP / K8s | _________ |

**Recommendation for First-Time**:
- Architecture: Monolithic (simpler to start)
- Database: MongoDB (best supported)
- Git: GitHub (easiest)
- Auth: Auth.js (default)
- Platform: VPS or local (simplest)

**Time Estimate**: 1 hour

#### Task 1.3: Gather Prerequisites

**Development Tools**:
```bash
# Verify installations
docker --version          # Need: 20.10+
docker-compose --version  # Need: 2.0+
node --version           # Need: 18+
npm --version            # Need: 9+
git --version            # Need: Any recent
```

**Accounts and Credentials**:
- [ ] GitHub account created
- [ ] GitHub repository for content created
  - Name: ________________
  - URL: ________________
- [ ] GitHub Personal Access Token generated
  - Go to: https://github.com/settings/tokens
  - Click: "Generate new token (classic)"
  - Select scope: `repo` (full control)
  - Copy and save: `ghp_____________________________`
- [ ] Domain name (if deploying to production)
  - Domain: ________________

**Time Estimate**: 30 minutes

#### Task 1.4: Set Up Development Environment
```bash
# Create project directory
mkdir tinacms-docker-project
cd tinacms-docker-project

# Initialize git
git init

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules
.next
.env
.env.local
.env.production
.DS_Store
*.log
EOF
```

**Time Estimate**: 15 minutes

---

## Phase 2: Local Development Setup (Week 1-2)

### Goals
- Create TinaCMS application
- Configure for Docker
- Test locally

### Tasks

#### Task 2.1: Create TinaCMS Application

**Option A: New Project** (Recommended for testing)
```bash
npx create-tina-app@latest my-tina-app --template basic
cd my-tina-app
```

**Option B: Add to Existing Next.js Project**
```bash
npm install tinacms
npx @tinacms/cli init
```

**Time Estimate**: 15 minutes

#### Task 2.2: Configure Database

Create `tina/database.ts`:

```typescript
import { createDatabase, createLocalDatabase } from "@tinacms/datalayer";
import { MongodbLevel } from "mongodb-level";

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === "true";

export default isLocal
  ? createLocalDatabase()
  : createDatabase({
      level: new MongodbLevel<any, any>({
        collectionName: "tinacms",
        dbName: "tinacms",
        mongoUri: process.env.MONGODB_URI || "",
      }),
      gitProvider: {
        type: "github",
        owner: process.env.GITHUB_OWNER || "",
        repo: process.env.GITHUB_REPO || "",
        token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN || "",
        branch: process.env.GITHUB_BRANCH || "main",
      },
    });
```

Install dependencies:
```bash
npm install mongodb-level
```

**Time Estimate**: 30 minutes

#### Task 2.3: Configure Backend API

Create `pages/api/tina/[...routes].ts`:

```typescript
import { TinaNodeBackend, LocalBackendAuthProvider } from "@tinacms/datalayer";
import databaseClient from "../../../tina/database";

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === "true";

const handler = TinaNodeBackend({
  authentication: LocalBackendAuthProvider(),
  databaseClient,
});

export default (req: any, res: any) => {
  return handler(req, res);
};
```

**Time Estimate**: 15 minutes

#### Task 2.4: Update Next.js Configuration

Edit `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  // Your existing config
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
```

**Time Estimate**: 5 minutes

#### Task 2.5: Test Locally (Non-Docker First)

Create `.env.local`:
```bash
TINA_PUBLIC_IS_LOCAL=true
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
GITHUB_BRANCH=main
```

Run development server:
```bash
npm run dev
```

Visit http://localhost:3000 and verify:
- [ ] Site loads
- [ ] Can access /admin
- [ ] Can edit content (in local mode)

**Time Estimate**: 30 minutes

---

## Phase 3: Docker Configuration (Week 2)

### Goals
- Create Docker configuration files
- Build and test Docker image locally
- Validate full stack works in containers

### Tasks

#### Task 3.1: Create Dockerfile

```dockerfile
# Base image with Node.js
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat git

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy TinaCMS generated files
COPY --from=builder --chown=nextjs:nodejs /app/tina/__generated__ ./tina/__generated__

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

Save as `Dockerfile` in project root.

**Time Estimate**: 15 minutes

#### Task 3.2: Create docker-compose.yml

```yaml
version: '3.8'

services:
  # TinaCMS Application
  tinacms:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tinacms-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - TINA_PUBLIC_IS_LOCAL=false
      - MONGODB_URI=mongodb://mongodb:27017/tinacms
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
      - GITHUB_BRANCH=${GITHUB_BRANCH:-main}
      - GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_PERSONAL_ACCESS_TOKEN}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
    depends_on:
      - mongodb
    restart: unless-stopped
    networks:
      - tinacms-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # MongoDB Database
  mongodb:
    image: mongo:7
    container_name: tinacms-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=tinacms
    restart: unless-stopped
    networks:
      - tinacms-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongodb-data:
    driver: local

networks:
  tinacms-network:
    driver: bridge
```

Save as `docker-compose.yml` in project root.

**Time Estimate**: 20 minutes

#### Task 3.3: Create .dockerignore

```
node_modules
.next
.git
.env
.env.local
.env.production
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
README.md
.vscode
.idea
```

Save as `.dockerignore` in project root.

**Time Estimate**: 5 minutes

#### Task 3.4: Create Environment File

Create `.env`:

```bash
# GitHub Configuration
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-content-repo
GITHUB_BRANCH=main
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here

# NextAuth Configuration
NEXTAUTH_SECRET=generate-this-with-openssl
NEXTAUTH_URL=http://localhost:3000

# Application
NODE_ENV=production
TINA_PUBLIC_IS_LOCAL=false
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -hex 32
# Copy output and paste into .env file
```

**Time Estimate**: 10 minutes

#### Task 3.5: Create Health Check Endpoint

Create `pages/api/health.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Basic health check
  // In production, you might want to check database connectivity
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
}
```

**Time Estimate**: 5 minutes

#### Task 3.6: Build and Test Docker Image

```bash
# Build the image
docker-compose build

# Expected output: Successfully built and tagged
# If errors occur, check:
# - All files are in correct locations
# - package.json has all required dependencies
# - No syntax errors in code
```

**Time Estimate**: 10-30 minutes (depending on internet speed)

#### Task 3.7: Run Docker Containers

```bash
# Start all containers
docker-compose up -d

# Check status
docker-compose ps

# Expected output: Both containers should be "Up"
# If not, check logs (next step)
```

**Time Estimate**: 5 minutes

#### Task 3.8: Verify Deployment

```bash
# Check logs
docker-compose logs -f tinacms

# Verify containers are running
docker-compose ps

# Test health endpoint
curl http://localhost:3000/api/health

# Should return: {"status":"healthy","timestamp":"..."}
```

Open browser to http://localhost:3000:
- [ ] Site loads successfully
- [ ] No console errors
- [ ] Can navigate pages

Try accessing admin:
- [ ] /admin is accessible
- [ ] Login works (if configured)
- [ ] Can view content

**Time Estimate**: 20 minutes

#### Task 3.9: Test Content Operations

1. **Create Content**:
   - Go to /admin
   - Create a new post/page
   - Fill in content
   - Save

2. **Verify Git Commit**:
   ```bash
   # Check your GitHub repository
   # Should see a new commit with your content
   ```

3. **Verify Database**:
   ```bash
   # Connect to MongoDB
   docker-compose exec mongodb mongosh tinacms

   # In mongo shell:
   show collections
   db.tinacms.find().limit(1)
   ```

4. **Test Container Restart**:
   ```bash
   # Restart containers
   docker-compose restart

   # Verify content still exists
   # Check site loads correctly
   ```

**Time Estimate**: 30 minutes

---

## Phase 4: Production Preparation (Week 3)

### Goals
- Harden security
- Configure production environment
- Set up SSL/HTTPS
- Implement monitoring

### Tasks

#### Task 4.1: Create Production docker-compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  tinacms:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/tinacms
    env_file:
      - .env.production
    depends_on:
      - mongodb
    networks:
      - tinacms-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  mongodb:
    image: mongo:7
    restart: always
    volumes:
      - mongodb-data:/data/db
      - ./backup:/backup
    networks:
      - tinacms-network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - tinacms
    restart: always
    networks:
      - tinacms-network

volumes:
  mongodb-data:

networks:
  tinacms-network:
```

**Time Estimate**: 20 minutes

#### Task 4.2: Configure Nginx Reverse Proxy

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream tinacms {
        server tinacms:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        # Redirect to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Proxy settings
        location / {
            proxy_pass http://tinacms;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

**Time Estimate**: 15 minutes

#### Task 4.3: Obtain SSL Certificate

**Option A: Let's Encrypt (Recommended)**
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/key.pem
```

**Option B: Self-Signed (Development Only)**
```bash
mkdir ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem
```

**Time Estimate**: 30 minutes

#### Task 4.4: Create Production Environment File

Create `.env.production`:

```bash
# GitHub Configuration
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-content-repo
GITHUB_BRANCH=main
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_production_token

# NextAuth Configuration
NEXTAUTH_SECRET=super-secure-random-string-32-chars
NEXTAUTH_URL=https://yourdomain.com

# Database
MONGODB_URI=mongodb://mongodb:27017/tinacms

# Application
NODE_ENV=production
TINA_PUBLIC_IS_LOCAL=false
```

**Security Note**: Never commit `.env.production` to git!

**Time Estimate**: 10 minutes

#### Task 4.5: Set Up Backup Script

Create `backup.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="tinacms-mongodb"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup MongoDB
echo "Starting MongoDB backup..."
docker-compose exec -T "$CONTAINER_NAME" mongodump \
  --db tinacms \
  --archive=/backup/tinacms_$DATE.archive \
  --gzip

# Copy backup to host
docker cp "${CONTAINER_NAME}:/backup/tinacms_$DATE.archive" \
  "$BACKUP_DIR/tinacms_$DATE.archive"

# Keep only last 7 backups
ls -t "$BACKUP_DIR"/tinacms_*.archive | tail -n +8 | xargs rm -f

echo "Backup completed: $BACKUP_DIR/tinacms_$DATE.archive"

# Backup Git repository (content is source of truth)
echo "Content is backed up in Git repository"
```

Make executable:
```bash
chmod +x backup.sh
```

Add to crontab for daily backups:
```bash
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

**Time Estimate**: 20 minutes

#### Task 4.6: Set Up Monitoring

Create `docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - tinacms-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=changeme
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - tinacms-network

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks:
      - tinacms-network

volumes:
  prometheus-data:
  grafana-data:

networks:
  tinacms-network:
    external: true
```

**Time Estimate**: 30 minutes (optional)

---

## Phase 5: Deployment (Week 3-4)

### Goals
- Deploy to production server
- Configure DNS
- Verify production deployment
- Set up CI/CD (optional)

### Tasks

#### Task 5.1: Prepare Production Server

**VPS Requirements**:
- Ubuntu 20.04+ or similar
- 2 vCPU, 4GB RAM minimum
- 20GB+ storage
- Docker and Docker Compose installed

```bash
# SSH into server
ssh user@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Verify installations
docker --version
docker compose version
```

**Time Estimate**: 30 minutes

#### Task 5.2: Deploy Application to Server

```bash
# On local machine, push code to Git
git add .
git commit -m "Docker deployment configuration"
git push origin main

# On server, clone repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Copy production environment file (secure method)
# Option 1: Use scp
scp .env.production user@server:/path/to/repo/

# Option 2: Create on server directly
nano .env.production
# Paste contents and save

# Build and start
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose ps
docker compose logs -f
```

**Time Estimate**: 30 minutes

#### Task 5.3: Configure DNS

In your domain registrar:

```
Type   Name    Value           TTL
A      @       your.server.ip  3600
A      www     your.server.ip  3600
```

Wait for DNS propagation (can take up to 48 hours, usually faster).

**Time Estimate**: 15 minutes + waiting time

#### Task 5.4: Verify Production Deployment

```bash
# Check containers are running
docker compose ps

# Check logs for errors
docker compose logs --tail=100 tinacms

# Test health endpoint
curl https://yourdomain.com/api/health

# Full verification checklist:
```

- [ ] Site loads at https://yourdomain.com
- [ ] SSL certificate is valid (green lock in browser)
- [ ] Admin interface accessible
- [ ] Can log in
- [ ] Can create/edit content
- [ ] Content saves to Git
- [ ] Changes reflect on frontend
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Mobile responsive

**Time Estimate**: 30 minutes

#### Task 5.5: Set Up Automated Backups

```bash
# On production server
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/your-repo && ./backup.sh >> /var/log/tinacms-backup.log 2>&1
```

**Time Estimate**: 10 minutes

#### Task 5.6: Set Up CI/CD (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /path/to/your-repo
            git pull origin main
            docker compose -f docker-compose.prod.yml build
            docker compose -f docker-compose.prod.yml up -d
            docker compose -f docker-compose.prod.yml exec -T tinacms npm run build
```

**Time Estimate**: 1 hour (optional)

---

## Phase 6: Post-Deployment (Ongoing)

### Goals
- Monitor performance
- Maintain security
- Optimize as needed

### Tasks

#### Task 6.1: Regular Maintenance Checklist

**Daily**:
- [ ] Check container status: `docker compose ps`
- [ ] Review logs: `docker compose logs --tail=50`
- [ ] Verify backups ran successfully

**Weekly**:
- [ ] Check disk space: `df -h`
- [ ] Review monitoring dashboards (if set up)
- [ ] Test backup restoration process
- [ ] Check for Docker image updates

**Monthly**:
- [ ] Update Docker base images
- [ ] Update TinaCMS dependencies
- [ ] Review and rotate GitHub PAT if needed
- [ ] Security audit
- [ ] Performance review

#### Task 6.2: Update Strategy

```bash
# Update application
cd /path/to/repo
git pull origin main
docker compose build --no-cache
docker compose up -d

# Update base images
docker compose pull
docker compose up -d
```

#### Task 6.3: Scaling (If Needed)

When traffic grows:

1. **Vertical Scaling** (easier):
   - Upgrade server (more CPU/RAM)
   - Update resource limits in docker-compose

2. **Horizontal Scaling** (more complex):
   - Add load balancer
   - Run multiple app containers
   - Use managed database
   - Consider Kubernetes

---

## Success Criteria

Your implementation is complete when:

- [x] Local development works with Docker
- [x] Production deployment is running
- [x] SSL/HTTPS is configured
- [x] Content can be created and edited
- [x] Git commits are being made
- [x] Backups are automated
- [x] Monitoring is in place (optional but recommended)
- [x] Documentation is complete
- [x] Team knows how to maintain the system

## Troubleshooting Reference

| Issue | Solution |
|-------|----------|
| Container won't start | Check logs: `docker compose logs` |
| Database connection failed | Verify MONGODB_URI, check MongoDB is running |
| GitHub API errors | Check PAT is valid and has correct scopes |
| SSL certificate errors | Verify certificate files, check Nginx config |
| Out of disk space | Clean up: `docker system prune -a` |
| Port conflicts | Change ports in docker-compose.yml |
| Build failures | Clear cache: `docker compose build --no-cache` |

## Getting Help

1. Check logs first: `docker compose logs -f tinacms`
2. Review [QUICK-START-GUIDE.md](./QUICK-START-GUIDE.md) troubleshooting section
3. Check TinaCMS Discord: https://discord.com/invite/zumN63Ybpf
4. Search GitHub issues: https://github.com/tinacms/tinacms/issues

## Conclusion

Following this roadmap, you should have a fully functional TinaCMS Docker deployment within 3-4 weeks, including testing and production deployment.

**Key Milestones**:
- Week 1: Planning and local setup
- Week 2: Docker configuration and testing
- Week 3: Production preparation and deployment
- Week 4: Monitoring and optimization

Good luck with your TinaCMS Docker implementation!
