#!/bin/bash
set -e

# Web Service Start Script
# Starts the Next.js web application with proper configuration

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

echo "🚀 Starting HailMary Web Service ($DEPLOYMENT_MODE mode)"
echo "====================================================="

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if the hailmary-network exists
if ! docker network ls | grep -q hailmary-network; then
    echo "🔧 Creating hailmary-network..."
    docker network create hailmary-network
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs/web
mkdir -p data/schema

# Set proper permissions
chmod 755 logs/web
chmod 755 data/schema

# Load environment variables if .env file exists
if [ -f ".env" ]; then
    echo "📋 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration functions
configure_local() {
    echo "🔧 Configuring for local development..."
    export WEB_PORT=${WEB_PORT:-3000}
    export NODE_ENV=${NODE_ENV:-development}
    export DATABASE_URL=${DATABASE_URL:-postgresql://app:app@localhost:5433/app}
    export ELASTICSEARCH_URL=${ELASTICSEARCH_URL:-http://localhost:9200}
    export REDIS_URL=${REDIS_URL:-redis://localhost:6390}
    export WEB_LOGS_PATH=${WEB_LOGS_PATH:-./logs/web}
    export SCHEMA_DATA_PATH=${SCHEMA_DATA_PATH:-./data/schema}
    export NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
    echo "✅ Local configuration complete"
}

configure_vm() {
    echo "🔧 Configuring for VM/production deployment..."
    export WEB_PORT=${WEB_PORT:-3000}
    export NODE_ENV=${NODE_ENV:-production}
    export DATABASE_URL=${DATABASE_URL:-postgresql://app:app@hailmary-postgres:5432/app}
    export ELASTICSEARCH_URL=${ELASTICSEARCH_URL:-http://hailmary-elasticsearch:9200}
    export REDIS_URL=${REDIS_URL:-redis://hailmary-services-redis:6389}
    export WEB_LOGS_PATH=${WEB_LOGS_PATH:-./logs/web}
    export SCHEMA_DATA_PATH=${SCHEMA_DATA_PATH:-./data/schema}
    export NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
    echo "✅ VM configuration complete"
}

# Configure based on deployment mode
if [ "$DEPLOYMENT_MODE" = "local" ]; then
    configure_local
else
    configure_vm
fi

echo "🔍 Configuration:"
echo "   • Web Port: $WEB_PORT"
echo "   • Node Environment: $NODE_ENV"
echo "   • Database URL: $DATABASE_URL"
echo "   • Elasticsearch URL: $ELASTICSEARCH_URL"
echo "   • Redis URL: $REDIS_URL"
echo "   • Deployment Mode: $DEPLOYMENT_MODE"

# Check if required services are running
echo "🔍 Checking service dependencies..."

# Check PostgreSQL
if ! docker ps | grep -q hailmary-postgres; then
    echo "⚠️  PostgreSQL service is not running. Please start it first:"
    if [ "$DEPLOYMENT_MODE" = "local" ]; then
        echo "   cd ../postgres && ./scripts/start.sh local"
    else
        echo "   cd ../postgres && ./scripts/start.sh vm"
    fi
    exit 1
fi

# Check Elasticsearch (CDC service)
if ! docker ps | grep -q hailmary-elasticsearch; then
    echo "⚠️  Elasticsearch service is not running. Please start it first:"
    if [ "$DEPLOYMENT_MODE" = "local" ]; then
        echo "   cd ../cdc && ./scripts/start.sh local"
    else
        echo "   cd ../cdc && ./scripts/start.sh vm"
    fi
    exit 1
fi

# Check Redis
if ! docker ps | grep -q hailmary-services-redis; then
    echo "⚠️  Redis service is not running. Please start it first:"
    if [ "$DEPLOYMENT_MODE" = "local" ]; then
        echo "   cd ../redis && ./scripts/start.sh local"
    else
        echo "   cd ../redis && ./scripts/start.sh vm"
    fi
    exit 1
fi

# Wait for dependencies to be healthy
echo "⏳ Waiting for service dependencies to be healthy..."

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if docker exec hailmary-postgres pg_isready -U app -d app >/dev/null 2>&1; then
        echo "✅ PostgreSQL is healthy"
        break
    fi
    echo "⏳ Waiting for PostgreSQL... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ PostgreSQL is not healthy after $timeout seconds"
    exit 1
fi

# Wait for Elasticsearch
echo "⏳ Waiting for Elasticsearch..."
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:9200/_cluster/health >/dev/null 2>&1; then
        echo "✅ Elasticsearch is healthy"
        break
    fi
    echo "⏳ Waiting for Elasticsearch... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ Elasticsearch is not healthy after $timeout seconds"
    exit 1
fi

# Wait for Redis
echo "⏳ Waiting for Redis..."
counter=0
while [ $counter -lt $timeout ]; do
    if docker exec hailmary-services-redis redis-cli -p 6389 ping >/dev/null 2>&1; then
        echo "✅ Redis is healthy"
        break
    fi
    echo "⏳ Waiting for Redis... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ Redis is not healthy after $timeout seconds"
    exit 1
fi

# Schema files are expected to be present in ./data/schema/
# Use ./scripts/pull-schema.sh $DEPLOYMENT_MODE [VERSION] to update schema independently

# Start the web service
echo "🌐 Starting web application..."
if [ "$DEPLOYMENT_MODE" = "vm" ]; then
    echo "🔧 Using nginx configuration for VM deployment..."
    docker compose -f docker-compose.vm.yml up -d
else
    echo "🔧 Using standard configuration for local development..."
    docker compose up -d web
fi

# Wait for web service to be healthy
echo "⏳ Waiting for web service to be healthy..."
counter=0
while [ $counter -lt $timeout ]; do
    if [ "$DEPLOYMENT_MODE" = "vm" ]; then
        # Check through nginx
        if curl -f http://localhost/api/health >/dev/null 2>&1; then
            echo "✅ Web service is healthy and ready!"
            break
        fi
    else
        # Check direct port
        if curl -f http://localhost:$WEB_PORT/api/health >/dev/null 2>&1; then
            echo "✅ Web service is healthy and ready!"
            break
        fi
    fi
    echo "⏳ Waiting for web service... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ Web service failed to start within $timeout seconds"
    echo "📋 Checking web service logs..."
    if [ "$DEPLOYMENT_MODE" = "vm" ]; then
        docker compose -f docker-compose.vm.yml logs
    else
        docker compose logs web
    fi
    exit 1
fi

# Display service information
echo ""
echo "🎉 Web Service started successfully!"
echo ""
echo "📋 Service Information:"
if [ "$DEPLOYMENT_MODE" = "vm" ]; then
    echo "   • External URL: http://hailmary.leadvantageglobal.com"
    echo "   • Local URL: http://localhost"
    echo "   • Health Check: http://localhost/api/health"
    echo "   • Nginx Proxy: Enabled"
else
    echo "   • Application URL: http://localhost:$WEB_PORT"
    echo "   • Health Check: http://localhost:$WEB_PORT/api/health"
fi
echo "   • Environment: $NODE_ENV"
echo "   • Database: $DATABASE_URL"
echo "   • Elasticsearch: $ELASTICSEARCH_URL"
echo "   • Redis: $REDIS_URL"
echo "   • Deployment Mode: $DEPLOYMENT_MODE"
echo ""
echo "🔧 Management Commands:"
echo "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
echo "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
echo "   • Stop service: ./scripts/stop.sh $DEPLOYMENT_MODE"
echo "   • Restart service: ./scripts/restart.sh $DEPLOYMENT_MODE"
echo "   • Pull schema: ./scripts/pull-schema.sh $DEPLOYMENT_MODE [VERSION]"
echo ""
echo "🌐 Application Features:"
if [ "$DEPLOYMENT_MODE" = "vm" ]; then
    echo "   • Search Interface: http://localhost/search"
    echo "   • Direct Search: http://localhost/direct-search"
    echo "   • Admin Panel: http://localhost/admin"
    echo "   • Login: http://localhost/login"
    echo ""
    echo "🔒 Security Features:"
    echo "   • Rate limiting enabled"
    echo "   • Security headers configured"
    echo "   • Static file caching enabled"
    echo "   • SSL ready (uncomment in nginx.conf when certificate is available)"
else
    echo "   • Search Interface: http://localhost:$WEB_PORT/search"
    echo "   • Direct Search: http://localhost:$WEB_PORT/direct-search"
    echo "   • Admin Panel: http://localhost:$WEB_PORT/admin"
    echo "   • Login: http://localhost:$WEB_PORT/login"
fi
