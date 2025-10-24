#!/bin/bash
set -e

# Redis Service Start Script
# Starts the Redis service with proper configuration

# Show usage if no arguments provided
show_usage() {
    echo "Usage: $0 [local|vm]"
    echo ""
    echo "Modes:"
    echo "  local    - Local development mode (default)"
    echo "  vm       - VM/production mode"
    echo ""
    echo "Examples:"
    echo "  $0 local    # Start in local mode"
    echo "  $0 vm       # Start in VM mode"
    echo "  $0          # Start in local mode (default)"
    exit 1
}

# Parse arguments
DEPLOYMENT_MODE=${1:-local}

if [[ "$DEPLOYMENT_MODE" != "local" && "$DEPLOYMENT_MODE" != "vm" ]]; then
    echo "❌ Invalid deployment mode: $DEPLOYMENT_MODE"
    show_usage
fi

echo "🚀 Starting HailMary Redis Service ($DEPLOYMENT_MODE mode)"
echo "========================================================"

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Load environment variables if .env file exists
if [ -f ".env" ]; then
    echo "📋 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration functions
configure_local() {
    echo "🔧 Configuring for local development..."
    REDIS_PORT=${REDIS_PORT:-6390}
    REDIS_PASSWORD=${REDIS_PASSWORD:-}
    REDIS_DB=${REDIS_DB:-0}
    echo "✅ Local configuration complete"
}

configure_vm() {
    echo "🔧 Configuring for VM/production deployment..."
    REDIS_PORT=${REDIS_PORT:-6390}
    REDIS_PASSWORD=${REDIS_PASSWORD:-}
    REDIS_DB=${REDIS_DB:-0}
    echo "✅ VM configuration complete"
}

# Configure based on deployment mode
if [ "$DEPLOYMENT_MODE" = "local" ]; then
    configure_local
else
    configure_vm
fi

echo "🔍 Configuration:"
echo "   • Redis Port: $REDIS_PORT"
echo "   • Redis DB: $REDIS_DB"
echo "   • Password: ${REDIS_PASSWORD:+[SET]}${REDIS_PASSWORD:-[NOT SET]}"
echo "   • Deployment Mode: $DEPLOYMENT_MODE"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p data/schema data/logs
echo "✅ Directories created"

# Check if Redis is already running
if docker-compose ps redis | grep -q "Up"; then
    echo "⚠️  Redis service is already running"
    echo "   Use './scripts/restart.sh' to restart or './scripts/stop.sh' to stop"
    exit 0
fi

# Start Redis service
echo "🚀 Starting Redis service..."
docker-compose up -d redis

# Wait for Redis to be healthy
echo "⏳ Waiting for Redis to be healthy..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if docker-compose exec redis redis-cli ping >/dev/null 2>&1; then
        echo "✅ Redis is healthy and ready"
        break
    fi
    
    retry_count=$((retry_count + 1))
    echo "⏳ Waiting for Redis... ($retry_count/$max_retries)"
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo "❌ Redis failed to start within expected time"
    echo "📋 Checking logs..."
    docker-compose logs redis --tail 20
    exit 1
fi

# Display service information
echo ""
echo "🎉 Redis service started successfully!"
echo "🔧 Redis URL: redis://localhost:$REDIS_PORT"
echo "📊 Redis Info:"
docker-compose exec redis redis-cli info server | grep -E "(redis_version|uptime_in_seconds|connected_clients)"

echo ""
echo "🔧 Management Commands:"
echo "   • Connect to Redis: docker-compose exec redis redis-cli"
echo "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
echo "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
echo "   • Stop service: ./scripts/stop.sh $DEPLOYMENT_MODE"

echo ""
echo "🌐 Deployment Information:"
echo "   • Mode: $DEPLOYMENT_MODE"
echo "   • Port: $REDIS_PORT"
echo "   • Container: hailmary-services-redis"
