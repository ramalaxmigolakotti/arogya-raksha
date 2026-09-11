# Multi-stage or optimized production image for Express Backend
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install curl for docker healthchecks
RUN apk add --no-cache curl

# Copy package manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source code and data assets
COPY . .

# Expose backend API & WebSocket port
EXPOSE 5000

# Set default environment
ENV NODE_ENV=production \
    PORT=5000

# Health check against the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the Express server
CMD ["node", "server.js"]
