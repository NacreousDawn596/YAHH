# Build stage for frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend ./frontend
RUN cd frontend && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --production

# Copy backend source
COPY backend .

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build ./public

# Install MySQL client and tini
RUN apk add --no-cache mysql-client tini

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=UTC

# Set entrypoint and command
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]

# Expose port
EXPOSE 8080