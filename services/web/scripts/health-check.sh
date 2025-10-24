#!/bin/bash
set -e

# Web Service Health Check Script
# Checks the health of the Next.js web application

# Show usage if no arguments provided
show_usage() {
    echo "Usage: $0 [local|vm]"
    echo ""
    echo "Modes:"
    echo "  local    - Local development mode (default)"
    echo "  vm       - VM/production mode"
    echo ""
    echo "Examples:"
    echo "  $0 local    # Health check in local mode"
    echo "  $0 vm       # Health check in VM mode"
    echo "  $0          # Health check in local mode (default)"
    exit 1
}

# Parse arguments
DEPLOYMENT_MODE=${1:-local}

if [[ "$DEPLOYMENT_MODE" != "local" && "$DEPLOYMENT_MODE" != "vm" ]]; then
    echo "❌ Invalid deployment mode: $DEPLOYMENT_MODE"
    show_usage
fi

echo "🔍 Checking HailMary Web Service Health ($DEPLOYMENT_MODE mode)"
echo "============================================================="

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

# Check if containers are running
echo "📋 Checking container status..."
if ! docker ps | grep -q hailmary-web; then
    echo "❌ Web service container is not running"
    exit 1
fi
echo "✅ Web service container is running"

if [ "$DEPLOYMENT_MODE" = "vm" ]; then
    if ! docker ps | grep -q hailmary-nginx; then
        echo "❌ Nginx container is not running"
        exit 1
    fi
    echo "✅ Nginx container is running"
fi

# Check health endpoint
echo "🔍 Checking health endpoint..."
if [ "$DEPLOYMENT_MODE" = "vm" ]; then
    # Check through nginx
    if curl -f http://localhost/api/health >/dev/null 2>&1; then
        echo "✅ Health endpoint is responding through nginx"
    else
        echo "❌ Health endpoint is not responding through nginx"
        exit 1
    fi
else
    # Check direct port
    if curl -f http://localhost:$WEB_PORT/api/health >/dev/null 2>&1; then
        echo "✅ Health endpoint is responding"
    else
        echo "❌ Health endpoint is not responding"
        exit 1
    fi
fi

# Check main application
echo "🔍 Checking main application..."
if [ "$DEPLOYMENT_MODE" = "vm" ]; then
    # Check through nginx
    if curl -f http://localhost >/dev/null 2>&1; then
        echo "✅ Main application is responding through nginx"
    else
        echo "❌ Main application is not responding through nginx"
        exit 1
    fi
else
    # Check direct port
    if curl -f http://localhost:$WEB_PORT >/dev/null 2>&1; then
        echo "✅ Main application is responding"
    else
        echo "❌ Main application is not responding"
        exit 1
    fi
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

# Check Elasticsearch connection
echo "📋 Checking Elasticsearch connection..."
if curl -f http://localhost:9200/_cluster/health >/dev/null 2>&1; then
    echo "✅ Elasticsearch is healthy"
else
    echo "❌ Elasticsearch is not healthy"
    exit 1
fi

# Check Redis connection
echo "📋 Checking Redis connection..."
if docker exec hailmary-services-redis redis-cli -p 6389 ping >/dev/null 2>&1; then
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
echo "   • Elasticsearch: Healthy"
echo "   • Redis: Healthy"
echo "   • Deployment Mode: $DEPLOYMENT_MODE"
echo ""
echo "🌐 Application URLs:"
if [ "$DEPLOYMENT_MODE" = "vm" ]; then
    echo "   • External URL: http://hailmary.leadvantageglobal.com"
    echo "   • Local URL: http://localhost"
    echo "   • Health Check: http://localhost/api/health"
    echo "   • Search: http://localhost/search"
    echo "   • Direct Search: http://localhost/direct-search"
    echo "   • Admin: http://localhost/admin"
    echo "   • Login: http://localhost/login"
else
    echo "   • Main App: http://localhost:$WEB_PORT"
    echo "   • Health Check: http://localhost:$WEB_PORT/api/health"
    echo "   • Search: http://localhost:$WEB_PORT/search"
    echo "   • Direct Search: http://localhost:$WEB_PORT/direct-search"
    echo "   • Admin: http://localhost:$WEB_PORT/admin"
    echo "   • Login: http://localhost:$WEB_PORT/login"
fi
