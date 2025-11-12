# Quick Setup Guide

This guide will get you from zero to a running TinaCMS site in about 5 minutes.

## Step-by-Step Setup

### 1. Prerequisites Check

Make sure you have these installed:

```bash
docker --version
# Should output: Docker version 20.10 or higher

docker-compose --version
# Should output: Docker Compose version 2.0 or higher
```

If not installed:
- **Docker**: https://docs.docker.com/get-docker/
- **Docker Compose**: Comes with Docker Desktop

### 2. Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (name it whatever you want, e.g., "my-tinacms-content")
3. Make it public or private (your choice)
4. **Do NOT** initialize with README
5. Note your username and repo name

### 3. Generate GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name it: "TinaCMS Docker"
4. Select scope: ✅ **repo** (full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)
   - Should start with `ghp_`
   - Example: `ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789`

### 4. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and replace these values:

```bash
# Replace with YOUR values:
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_actual_token_here
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
GITHUB_BRANCH=main

# Generate a random secret:
# Run this command: openssl rand -hex 32
# Then paste the output here:
NEXTAUTH_SECRET=paste-your-generated-secret-here

# These can stay as-is for local testing:
NEXTAUTH_URL=http://localhost:3000
MONGODB_URI=mongodb://mongodb:27017/tinacms
TINA_PUBLIC_IS_LOCAL=false
```

#### Generate NEXTAUTH_SECRET

On Mac/Linux:
```bash
openssl rand -hex 32
```

On Windows (PowerShell):
```powershell
-join ((48..57) + (97..102) | Get-Random -Count 32 | % {[char]$_})
```

Copy the output and paste it as `NEXTAUTH_SECRET` in your `.env` file.

### 5. Initialize Git Repository

```bash
# Initialize local git
git init

# Add all files
git add .

# First commit
git commit -m "Initial TinaCMS setup"

# Add your GitHub remote (replace with YOUR repo)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git

# Push to GitHub
git push -u origin main
```

### 6. Build and Run

```bash
# Build the Docker images (takes 2-5 minutes first time)
docker-compose build

# Start all services
docker-compose up -d

# Watch the logs to see when it's ready
docker-compose logs -f tinacms
```

Wait for this message in the logs:
```
tinacms-app | ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

Press `Ctrl+C` to stop watching logs (services keep running).

### 7. Access Your Site

Open your browser to:

- **Homepage**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

### 8. First Login

1. Go to http://localhost:3000/admin
2. You'll see a login screen
3. Click "Create an account" (first time only)
4. Enter:
   - **Email**: your-email@example.com
   - **Password**: (create a strong password)
5. Click "Sign Up"
6. You're now logged into the CMS!

### 9. Create Your First Content

1. In the admin panel, click "Pages" in the sidebar
2. You'll see "Welcome to TinaCMS" page
3. Click on it to edit
4. Make some changes
5. Click "Save"
6. Watch the magic happen:
   - Content saves to MongoDB
   - Commits automatically to GitHub
   - Check your GitHub repo - you'll see a new commit!

### 10. View Your Content

Visit http://localhost:3000 to see your site with the changes.

## Quick Commands

```bash
# Stop services
docker-compose down

# Start services
docker-compose up -d

# View logs
docker-compose logs -f tinacms

# Restart after changes
docker-compose restart

# Rebuild (after code changes)
docker-compose build && docker-compose up -d

# Clean everything (WARNING: deletes data)
docker-compose down -v
```

## Verification Checklist

After setup, verify everything works:

- [ ] Docker containers are running: `docker-compose ps`
- [ ] Homepage loads: http://localhost:3000
- [ ] Admin panel accessible: http://localhost:3000/admin
- [ ] Can log in to admin
- [ ] Can view existing pages
- [ ] Can edit and save a page
- [ ] Changes appear on GitHub
- [ ] Changes appear on frontend

## Common Issues

### "Cannot connect to MongoDB"

**Solution**: Make sure MongoDB container is running

```bash
docker-compose ps
# MongoDB should show "Up"

# If not, check logs:
docker-compose logs mongodb
```

### "GitHub authentication failed"

**Solution**: Check your GitHub token

1. Verify token has `repo` scope
2. Token is not expired
3. GITHUB_OWNER and GITHUB_REPO match your repository

### "Port 3000 already in use"

**Solution**: Another service is using port 3000

```bash
# Option 1: Stop the other service
# Option 2: Change port in docker-compose.yml:
ports:
  - "3001:3000"  # Use port 3001 instead
```

### Docker build fails

**Solution**: Clear Docker cache

```bash
docker-compose down
docker system prune -a
docker-compose build --no-cache
docker-compose up -d
```

## Next Steps

Once everything is working:

1. **Customize**: Edit pages/index.tsx to customize your homepage
2. **Add Content**: Create more pages and blog posts
3. **Styling**: Add custom CSS or Tailwind
4. **Deploy**: Follow deployment guide in README.md
5. **Learn More**: Check TinaCMS docs at https://tina.io/docs

## Getting Help

If you're stuck:

1. Check the main [README.md](./README.md) for detailed docs
2. Look at [Troubleshooting](#common-issues) section above
3. Check Docker logs: `docker-compose logs -f`
4. Visit TinaCMS Discord: https://discord.com/invite/zumN63Ybpf

## Success! 🎉

If you made it here, congratulations! You now have a fully working TinaCMS site with:

- ✅ Docker containerization
- ✅ MongoDB database
- ✅ GitHub content storage
- ✅ Secure authentication
- ✅ Beautiful admin interface

Now go build something amazing!
