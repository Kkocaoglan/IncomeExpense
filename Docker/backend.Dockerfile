# Multi-stage build for security and size optimization
FROM node:20-alpine AS builder

# Install dependencies for build
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first for better caching
COPY ./Backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY ./Backend .

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app .

# Security: Remove unnecessary files
RUN rm -rf /app/node_modules/.cache && \
    rm -rf /app/.git && \
    rm -rf /app/scripts && \
    rm -rf /app/Docker

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5001

# Environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["npm", "start"]
