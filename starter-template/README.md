# TinaCMS Docker Starter Template

A production-ready starter template for running TinaCMS with Docker, MongoDB, and Next.js.

## Features

- ✅ **Docker-Ready**: Complete Docker setup with docker-compose
- ✅ **MongoDB**: Self-hosted database adapter
- ✅ **GitHub Integration**: Git-backed content storage
- ✅ **HTTP Basic Auth**: Simple, secure authentication
- ✅ **Next.js**: Modern React framework with SSR
- ✅ **TypeScript**: Fully typed codebase
- ✅ **Production-Ready**: Optimized Docker build with health checks

## Architecture

```
┌─────────────────────────┐
│   TinaCMS Container     │
│   - Next.js Frontend    │
│   - TinaCMS Backend API │
│   - Port: 3000          │
└─────────────────────────┘
         ↓           ↓
   [MongoDB]     [GitHub]
   Container     External
```

## Prerequisites

### Required

- **Docker**: 20.10+ ([Install](https://docs.docker.com/get-docker/))
- **Docker Compose**: 2.0+ ([Install](https://docs.docker.com/compose/install/))
- **GitHub Account**: For content storage
- **GitHub Personal Access Token**: With `repo` scope ([Generate](https://github.com/settings/tokens))

### Optional

- **Node.js 22 LTS**: For local development without Docker
- **pnpm**: Latest package manager ([Install](https://pnpm.io/installation))
- **MongoDB Compass**: For database inspection

## Quick Start

### 1. Clone or Copy This Template

```bash
# If using the template
cp -r starter-template my-tinacms-site
cd my-tinacms-site
```

### 2. Set Up GitHub Repository

Create a new GitHub repository for your content:

```bash
# Create a new repository on GitHub, then:
git init
git remote add origin https://github.com/your-username/your-repo.git
```

### 3. Configure Environment Variables

Create `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and fill in your details:

```bash
# GitHub Configuration
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxx  # Generate at https://github.com/settings/tokens
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo-name
GITHUB_BRANCH=main

# HTTP Basic Auth credentials
TINA_ADMIN_USERNAME=admin
TINA_ADMIN_PASSWORD=your-secure-password

# MongoDB (uses docker-compose MongoDB by default)
MONGODB_URI=mongodb://mongodb:27017/tinacms

# Application Mode
TINA_PUBLIC_IS_LOCAL=false
```

### 4. Build and Run with Docker

```bash
# Build the Docker image
docker-compose build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f tinacms
```

### 5. Access Your Site

- **Frontend**: http://localhost:3000
- **Admin**: http://localhost:3000/admin
- **Health Check**: http://localhost:3000/api/health

## Development Workflows

### Local Development (Without Docker)

For faster development without Docker:

```bash
# 1. Copy local development config
cp .env.local.example .env.local

# 2. Install dependencies
pnpm install

# 3. Run in local mode (no MongoDB/GitHub required)
pnpm run dev

# Visit http://localhost:3000
```

### Production Testing with Docker

```bash
# Build and run in production mode
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Building for Production

```bash
# Build optimized production image
docker-compose build --no-cache

# Push to registry (example with Docker Hub)
docker tag tinacms-docker-starter your-username/tinacms:latest
docker push your-username/tinacms:latest
```

## Project Structure

```
.
├── content/                 # Content files (MDX)
│   ├── pages/              # Page content
│   └── posts/              # Blog post content
├── pages/                   # Next.js pages
│   ├── api/                # API routes
│   │   ├── health.ts       # Health check endpoint
│   │   └── tina/           # TinaCMS backend
│   ├── _app.tsx            # App wrapper
│   └── index.tsx           # Homepage
├── public/                  # Static assets
├── styles/                  # Global styles
├── tina/                    # TinaCMS configuration
│   ├── collections/        # Content schemas
│   │   ├── page.ts         # Page collection
│   │   └── post.ts         # Post collection
│   ├── config.tsx          # TinaCMS config
│   └── database.ts         # Database adapter config
├── .dockerignore           # Docker ignore file
├── .env.example            # Example environment variables
├── .gitignore              # Git ignore file
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile              # Docker build instructions
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies
├── README.md               # This file
└── tsconfig.json           # TypeScript configuration
```

## Docker Commands Reference

### Basic Operations

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f tinacms

# View all logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Maintenance

```bash
# Rebuild after code changes
docker-compose build
docker-compose up -d

# Clean rebuild (no cache)
docker-compose build --no-cache

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# View database data
docker-compose exec mongodb mongosh tinacms
```

### Debugging

```bash
# Enter container shell
docker-compose exec tinacms sh

# Check environment variables
docker-compose exec tinacms env

# Test MongoDB connection
docker-compose exec mongodb mongosh --eval "db.version()"

# View container resources
docker stats
```

## Content Management

### Creating Content

1. Visit http://localhost:3000/admin
2. Log in (first time will create an admin user)
3. Click on "Pages" or "Blog Posts"
4. Click "Create New"
5. Fill in content and click "Save"

### Content Storage

- **Git Repository**: Source of truth for all content
- **MongoDB**: Ephemeral cache for fast queries
- **Content Files**: Stored as MDX in `content/` directory

### Editing Workflow

```
Edit in Admin → Save → Commit to Git → Push to GitHub
                ↓
            Update MongoDB Cache
```

## Customization

### Adding New Content Types

1. Create a new collection in `tina/collections/`:

```typescript
// tina/collections/product.ts
import type { Collection } from "tinacms";

export const ProductCollection: Collection = {
  name: "product",
  label: "Products",
  path: "content/products",
  format: "mdx",
  fields: [
    {
      type: "string",
      name: "title",
      label: "Product Name",
      required: true,
    },
    {
      type: "number",
      name: "price",
      label: "Price",
      required: true,
    },
    // Add more fields...
  ],
};
```

2. Add to `tina/config.tsx`:

```typescript
import { ProductCollection } from "./collections/product";

export default defineConfig({
  // ...
  schema: {
    collections: [TinaUserCollection, PageCollection, PostCollection, ProductCollection],
  },
});
```

3. Rebuild: `docker-compose build && docker-compose up -d`

### Styling

Edit `styles/globals.css` or add Tailwind CSS:

```bash
pnpm add tailwindcss postcss autoprefixer
pnpm exec tailwindcss init -p
```

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub PAT with repo scope | `ghp_xxxxx...` |
| `GITHUB_OWNER` | GitHub username/org | `your-username` |
| `GITHUB_REPO` | Repository name | `my-content` |
| `TINA_ADMIN_USERNAME` | Admin username | `admin` |
| `TINA_ADMIN_PASSWORD` | Admin password | Strong password |
| `MONGODB_URI` | MongoDB connection string | `mongodb://mongodb:27017/tinacms` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_BRANCH` | Git branch to use | `main` |
| `TINA_PUBLIC_IS_LOCAL` | Local development mode | `false` |
| `NODE_ENV` | Node environment | `production` |

## Troubleshooting

### Problem: Build fails with "git not found"

**Solution**: Git is included in the Dockerfile. If you modified it, ensure:

```dockerfile
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat git
RUN corepack enable && corepack prepare pnpm@latest --activate
```

### Problem: MongoDB connection refused

**Solution**:

1. Check MongoDB is running: `docker-compose ps`
2. Verify MONGODB_URI uses service name: `mongodb://mongodb:27017/tinacms`
3. Check logs: `docker-compose logs mongodb`

### Problem: GitHub authentication fails

**Solution**:

1. Verify PAT has `repo` scope
2. Check PAT is not expired at https://github.com/settings/tokens
3. Ensure GITHUB_OWNER and GITHUB_REPO are correct

### Problem: Changes not appearing

**Solution**:

1. Rebuild: `docker-compose build --no-cache`
2. Restart: `docker-compose up -d`
3. Check Git commits in your repository

### Problem: Port 3000 already in use

**Solution**:

```bash
# Find what's using the port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use port 3001 instead
```

## Deployment

### Deploy to Production

1. **Update Environment Variables**:

```bash
# In production .env
TINA_PUBLIC_IS_LOCAL=false
TINA_ADMIN_USERNAME=admin
TINA_ADMIN_PASSWORD=strong-random-production-password
```

2. **Build and Deploy**:

```bash
# On your server
git clone your-repo
cd your-repo
cp .env.example .env
# Edit .env with production values
docker-compose -f docker-compose.yml up -d
```

3. **Set Up SSL**: Use Nginx or Traefik as reverse proxy

### Cloud Deployment

**AWS ECS, Google Cloud Run, Azure**: Build and push Docker image

```bash
# Build
docker build -t tinacms:latest .

# Tag for your registry
docker tag tinacms:latest your-registry/tinacms:latest

# Push
docker push your-registry/tinacms:latest
```

## Backup and Recovery

### Backup Database

```bash
# Backup MongoDB
docker-compose exec -T mongodb mongodump --archive=/backup.archive --gzip
docker cp $(docker-compose ps -q mongodb):/backup.archive ./backup.archive
```

### Restore Database

```bash
# Restore MongoDB
docker cp ./backup.archive $(docker-compose ps -q mongodb):/backup.archive
docker-compose exec -T mongodb mongorestore --archive=/backup.archive --gzip
```

### Content Backup

Your content is automatically backed up in your Git repository!

```bash
# Clone your content repo as backup
git clone https://github.com/your-username/your-repo.git backup-content
```

## Performance Optimization

### Image Size

Current image size: ~200-300MB (with optimizations)

Optimizations applied:
- Multi-stage build
- Alpine base image
- Next.js standalone output
- Minimal dependencies

### Resource Limits

Add to docker-compose.yml:

```yaml
services:
  tinacms:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Support and Resources

- **TinaCMS Docs**: https://tina.io/docs
- **TinaCMS Discord**: https://discord.com/invite/zumN63Ybpf
- **Docker Docs**: https://docs.docker.com
- **Next.js Docs**: https://nextjs.org/docs

## License

This starter template is open source and available under the MIT License.

## Contributing

Contributions welcome! Please open an issue or PR.

---

Built with ❤️ using TinaCMS, Next.js, MongoDB, and Docker
