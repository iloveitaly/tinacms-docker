# TinaCMS Docker Quick Start Guide

## Decision Matrix: Choose Your Architecture

| Factor | Monolithic (Option 1) | Multi-Container (Option 2) | Hybrid (Option 3) |
|--------|----------------------|---------------------------|-------------------|
| **Complexity** | ⭐ Low | ⭐⭐⭐ High | ⭐⭐ Medium |
| **Scalability** | ⭐ Limited | ⭐⭐⭐ Excellent | ⭐⭐ Good |
| **Resource Usage** | ⭐⭐⭐ Efficient | ⭐⭐ Moderate | ⭐⭐⭐ Efficient |
| **Maintainability** | ⭐⭐ Fair | ⭐⭐⭐ Excellent | ⭐⭐ Good |
| **Production Ready** | ⭐⭐ Staging/Dev | ⭐⭐⭐ Yes | ⭐⭐⭐ Yes |
| **Setup Time** | ⭐⭐⭐ Quick | ⭐ Slower | ⭐⭐ Medium |
| **Best For** | Small sites, dev/test | Production, teams | Medium sites |

## Quick Decision Guide

**Choose Monolithic (Option 1) if:**
- You're testing/learning TinaCMS
- Small personal project or blog
- Limited server resources
- Simple deployment needs
- Development/staging environment

**Choose Multi-Container (Option 2) if:**
- Production deployment
- Need to scale components independently
- Multiple team members
- High traffic expected
- Enterprise requirements

**Choose Hybrid (Option 3) if:**
- Medium-sized production site
- Want modularity but simpler than full multi-container
- Need separate database management
- Balanced approach desired

## Prerequisites

### Required Knowledge
- [ ] Basic Docker understanding
- [ ] Docker Compose basics
- [ ] Git fundamentals
- [ ] Environment variables
- [ ] Basic Next.js/Node.js knowledge

### Required Tools
```bash
# Check if you have these installed
docker --version          # Should be 20.10+
docker-compose --version  # Should be 2.0+
node --version           # Should be 18+
git --version            # Any recent version
```

### Required Accounts/Credentials
- [ ] GitHub account with Personal Access Token (PAT)
  - Scope required: `repo` (full control of private repositories)
  - Generate at: https://github.com/settings/tokens
- [ ] Domain name (optional, but recommended for production)

## 5-Minute Quick Start (Monolithic)

### Step 1: Create Project
```bash
# Create a new TinaCMS project
npx create-tina-app@latest my-tina-docker
cd my-tina-docker
```

### Step 2: Create Dockerfile
```bash
cat > Dockerfile << 'EOF'
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat git

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
EOF
```

### Step 3: Create docker-compose.yml
```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  tinacms:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://db:27017/tinacms
      - GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_PAT}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=http://localhost:3000
    depends_on:
      - db

  db:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongo-data:
EOF
```

### Step 4: Create .env File
```bash
cat > .env << 'EOF'
GITHUB_PAT=ghp_your_token_here
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo
NEXTAUTH_SECRET=generate-with-openssl-rand-hex-32
EOF
```

Generate NextAuth secret:
```bash
openssl rand -hex 32
# Copy output to NEXTAUTH_SECRET in .env
```

### Step 5: Configure next.config.js
```bash
# Add to next.config.js
cat >> next.config.js << 'EOF'

// Enable standalone output for Docker
module.exports = {
  output: 'standalone',
  // ... rest of your config
}
EOF
```

### Step 6: Build and Run
```bash
docker-compose build
docker-compose up -d
```

### Step 7: Access
Open browser to: http://localhost:3000

## Common Commands

### Development
```bash
# Start containers
docker-compose up

# Start in background
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f tinacms

# Rebuild after code changes
docker-compose build --no-cache
docker-compose up -d
```

### Debugging
```bash
# Check container status
docker-compose ps

# Enter container shell
docker-compose exec tinacms sh

# Check environment variables
docker-compose exec tinacms env

# View database
docker-compose exec db mongosh tinacms
```

### Production
```bash
# Build for production
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Update application
docker-compose pull
docker-compose up -d --build
```

## Environment Variables Reference

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub PAT with repo access | `ghp_xxxxx...` |
| `GITHUB_OWNER` | Your GitHub username/org | `myusername` |
| `GITHUB_REPO` | Repository name | `my-content` |
| `NEXTAUTH_SECRET` | Random secret for auth | Generated with openssl |
| `MONGODB_URI` | Database connection string | `mongodb://db:27017/tinacms` |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_BRANCH` | Git branch to use | `main` |
| `NEXTAUTH_URL` | Public URL of your site | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `3000` |

## Troubleshooting

### Problem: Build fails with "git not found"
**Solution**: Ensure `git` is installed in Dockerfile
```dockerfile
RUN apk add --no-cache git
```

### Problem: Database connection refused
**Solution**:
1. Check MongoDB is running: `docker-compose ps`
2. Verify MONGODB_URI uses service name: `mongodb://db:27017/tinacms`
3. Ensure `depends_on` is set in docker-compose.yml

### Problem: GitHub authentication fails
**Solution**:
1. Verify PAT has `repo` scope
2. Check PAT is not expired
3. Ensure GITHUB_OWNER and GITHUB_REPO are correct
4. Test PAT with: `curl -H "Authorization: token $GITHUB_PAT" https://api.github.com/user`

### Problem: Changes not persisting
**Solution**:
1. Verify volumes are created: `docker volume ls`
2. Check database is storing data: `docker-compose exec db mongosh`
3. Verify Git commits are being made in your repository

### Problem: Cannot access at localhost:3000
**Solution**:
1. Check container is running: `docker-compose ps`
2. Verify port mapping: `docker-compose port tinacms 3000`
3. Check logs: `docker-compose logs tinacms`
4. Ensure firewall allows port 3000

### Problem: "Invalid environment variables" error
**Solution**:
1. Check all required vars in .env file
2. Ensure .env is in same directory as docker-compose.yml
3. Restart containers: `docker-compose down && docker-compose up`

## Production Checklist

### Security
- [ ] Use strong NEXTAUTH_SECRET (32+ characters)
- [ ] Enable HTTPS with reverse proxy (Nginx/Traefik)
- [ ] Rotate GitHub PAT regularly
- [ ] Use Docker secrets for sensitive data
- [ ] Configure firewall rules
- [ ] Enable CORS properly
- [ ] Use non-root user in containers ✓ (included in Dockerfile)

### Performance
- [ ] Enable Redis caching
- [ ] Configure database indexes
- [ ] Set up CDN for static assets
- [ ] Enable compression
- [ ] Monitor resource usage
- [ ] Implement rate limiting

### Reliability
- [ ] Set up automated backups
- [ ] Configure health checks
- [ ] Implement log aggregation
- [ ] Set up monitoring/alerts
- [ ] Test disaster recovery
- [ ] Document runbooks

### Deployment
- [ ] Use docker-compose.prod.yml for production config
- [ ] Set up CI/CD pipeline
- [ ] Implement blue-green or rolling deployments
- [ ] Configure auto-restart policies
- [ ] Set resource limits (CPU/memory)
- [ ] Use tagged Docker images (not `latest`)

## Backup Strategy

### Database Backups
```bash
# Manual backup
docker-compose exec db mongodump --out=/backup
docker cp $(docker-compose ps -q db):/backup ./backup-$(date +%Y%m%d)

# Automated daily backup (add to cron)
0 2 * * * cd /path/to/project && docker-compose exec -T db mongodump --out=/backup
```

### Restore Database
```bash
docker cp ./backup-20240115 $(docker-compose ps -q db):/restore
docker-compose exec db mongorestore /restore
```

### Content Backup
Your content is automatically backed up in your Git repository. Additional backup:
```bash
# Clone your content repo as backup
git clone https://github.com/your-username/your-repo.git backup-repo
```

## Scaling Strategies

### Horizontal Scaling
```yaml
# docker-compose.prod.yml
services:
  tinacms:
    deploy:
      replicas: 3
    # Add load balancer (nginx)

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### Vertical Scaling
```yaml
services:
  tinacms:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

## Migration from Vercel/Netlify

If you're currently using TinaCMS on Vercel or Netlify:

### Step 1: Export Environment Variables
```bash
# From Vercel
vercel env pull .env.vercel

# From Netlify
netlify env:list > .env.netlify
```

### Step 2: Adapt Configuration
- Replace Vercel KV with MongoDB/Redis
- Update API routes if using Vercel-specific features
- Change NEXTAUTH_URL to your Docker deployment URL

### Step 3: Test Locally
```bash
docker-compose up
# Test all functionality
```

### Step 4: Deploy
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Step 5: Update DNS
Point your domain to new Docker deployment

## Resources

- [Full Deployment Plan](./DOCKER-DEPLOYMENT-PLAN.md)
- [TinaCMS Documentation](https://tina.io/docs)
- [TinaCMS Self-Hosted Guide](https://tina.io/docs/self-hosted/overview)
- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Documentation](https://docs.docker.com/compose)

## Getting Help

### Check Logs First
```bash
docker-compose logs -f tinacms
```

### Community Resources
- TinaCMS Discord: https://discord.com/invite/zumN63Ybpf
- GitHub Discussions: https://github.com/tinacms/tinacms/discussions
- GitHub Issues: https://github.com/tinacms/tinacms/issues

### Common Log Patterns

| Log Message | Meaning | Solution |
|-------------|---------|----------|
| `ECONNREFUSED` | Can't connect to service | Check service is running |
| `Authentication failed` | GitHub PAT issue | Verify token and scopes |
| `Module not found` | Missing dependency | Rebuild with `--no-cache` |
| `Port 3000 already in use` | Port conflict | Stop other service or change port |

## Next Steps

1. ✅ Review the [Full Deployment Plan](./DOCKER-DEPLOYMENT-PLAN.md)
2. ✅ Choose your architecture (Monolithic vs Multi-Container)
3. ✅ Follow the 5-minute quick start above
4. ✅ Test locally with Docker Compose
5. ✅ Review production checklist
6. ✅ Deploy to your production environment
7. ✅ Set up monitoring and backups

Good luck with your TinaCMS Docker deployment!
