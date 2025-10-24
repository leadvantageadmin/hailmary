#!/bin/bash
set -e

# Web Service Health Check Script
# Checks the health of the Next.js web application

echo "🔍 Checking HailMary Web Service Health..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Load environment variables if .env file exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set default port
WEB_PORT=${WEB_PORT:-3000}

# Check if container is running
echo "📋 Checking container status..."
if ! docker ps | grep -q hailmary-web; then
    echo "❌ Web service container is not running"
    exit 1
fi

echo "✅ Web service container is running"

# Check health endpoint
echo "🔍 Checking health endpoint..."
if curl -f http://localhost:$WEB_PORT/api/health >/dev/null 2>&1; then
    echo "✅ Health endpoint is responding"
else
    echo "❌ Health endpoint is not responding"
    exit 1
fi

# Check main application
echo "🔍 Checking main application..."
if curl -f http://localhost:$WEB_PORT >/dev/null 2>&1; then
    echo "✅ Main application is responding"
else
    echo "❌ Main application is not responding"
    exit 1
fi

# Check service dependencies
echo "🔍 Checking service dependencies..."

# Check PostgreSQL connection
echo "📋 Checking PostgreSQL connection..."
if docker exec hailmary-postgres pg_isready -U app -d app >/dev/null 2>&1; then
    echo "✅ PostgreSQL is healthy"
else
    echo "❌ PostgreSQL is not healthy"
    exit 1
fi

# Check OpenSearch connection
echo "📋 Checking OpenSearch connection..."
if curl -f http://localhost:9201/_cluster/health >/dev/null 2>&1; then
    echo "✅ OpenSearch is healthy"
else
    echo "❌ OpenSearch is not healthy"
    exit 1
fi

# Check Redis connection
echo "📋 Checking Redis connection..."
if docker exec hailmary-redis redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis is healthy"
else
    echo "❌ Redis is not healthy"
    exit 1
fi

# Display service information
echo ""
echo "🎉 Web Service Health Check: PASSED"
echo ""
echo "📋 Service Status:"
echo "   • Container: Running"
echo "   • Health Endpoint: Healthy"
echo "   • Main Application: Healthy"
echo "   • PostgreSQL: Healthy"
echo "   • OpenSearch: Healthy"
echo "   • Redis: Healthy"
echo ""
echo "🌐 Application URLs:"
echo "   • Main App: http://localhost:$WEB_PORT"
echo "   • Health Check: http://localhost:$WEB_PORT/api/health"
echo "   • Search: http://localhost:$WEB_PORT/search"
echo "   • Direct Search: http://localhost:$WEB_PORT/direct-search"
echo "   • Admin: http://localhost:$WEB_PORT/admin"
