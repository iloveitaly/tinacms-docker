# TinaCMS Docker Build
# Multi-stage build for optimized image size

# Base image with Node.js LTS
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat git
# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN \
  if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
  else echo "Warning: pnpm-lock.yaml not found, running pnpm install" && pnpm install; \
  fi

# Build TinaCMS and Next.js application
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build TinaCMS (generates GraphQL schema) and Next.js
# The build command will:
# 1. Run 'tinacms build --partial-reindex' to generate TinaCMS files
# 2. Run 'next build' to build the Next.js app
RUN pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy TinaCMS generated files
COPY --from=builder --chown=nextjs:nodejs /app/tina/__generated__ ./tina/__generated__

# Copy admin build
COPY --from=builder /app/public/admin ./public/admin

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname and port
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application
CMD ["node", "server.js"]
