# Multi-stage build for optimized production image
FROM node:20-alpine AS base

# Install necessary system dependencies for building
RUN apk add --no-cache curl libc6-compat

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Development stage
FROM base AS deps

# Copy package files
COPY package*.json ./

# Install dependencies with exact versions for reproducible builds
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Accept build arguments
ARG NODE_ENV=production
ARG COMMIT_HASH
ENV NODE_ENV=${NODE_ENV}
ENV COMMIT_HASH=${COMMIT_HASH}

# Build the application
RUN npm run build

# Production stage
FROM base AS runner

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Create app directory and set ownership
RUN mkdir -p /app && chown -R nestjs:nodejs /app
WORKDIR /app

# Copy production dependencies
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT}/ || exit 1

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE ${PORT}

# Start the application
CMD ["node", "dist/main"]