# Redis Service Dockerfile
# Independent Redis service with schema integration

FROM redis:7-alpine

# Install additional tools
RUN apk add --no-cache \
    curl \
    jq \
    bash \
    ca-certificates

# Set working directory
WORKDIR /app

# Create necessary directories
RUN mkdir -p /app/data/schema /app/data/logs /app/config

# Copy configuration files
COPY config/ /app/config/

# Copy scripts
COPY scripts/ /app/scripts/

# Make scripts executable
RUN chmod +x /app/scripts/*.sh

# Set environment variables
ENV REDIS_PORT=6389
ENV REDIS_PASSWORD=""
ENV REDIS_DB=0
ENV TZ=UTC

# Expose Redis port
EXPOSE 6389

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD redis-cli -p 6389 ping || exit 1

# Start Redis server
CMD ["redis-server", "/app/config/redis.conf"]
