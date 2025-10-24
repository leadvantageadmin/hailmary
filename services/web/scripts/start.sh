#!/bin/bash
set -e

# Web Service Start Script
# Starts the Next.js web application with proper configuration

echo "🚀 Starting HailMary Web Service..."

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

# Set default environment variables if not set
export WEB_PORT=${WEB_PORT:-3000}
export NODE_ENV=${NODE_ENV:-production}
export DATABASE_URL=${DATABASE_URL:-postgresql://app:app@localhost:5433/app}
export OPENSEARCH_URL=${OPENSEARCH_URL:-http://localhost:9201}
export REDIS_URL=${REDIS_URL:-redis://localhost:6380}
export WEB_LOGS_PATH=${WEB_LOGS_PATH:-./logs/web}
export SCHEMA_DATA_PATH=${SCHEMA_DATA_PATH:-./data/schema}

# Check if required services are running
echo "🔍 Checking service dependencies..."

# Check PostgreSQL
if ! docker ps | grep -q hailmary-postgres; then
    echo "⚠️  PostgreSQL service is not running. Please start it first:"
    echo "   cd ../postgres && ./scripts/start.sh"
    exit 1
fi

# Check OpenSearch
if ! docker ps | grep -q hailmary-opensearch; then
    echo "⚠️  OpenSearch service is not running. Please start it first:"
    echo "   cd ../opensearch && ./scripts/start.sh"
    exit 1
fi

# Check Redis
if ! docker ps | grep -q hailmary-redis; then
    echo "⚠️  Redis service is not running. Please start it first:"
    echo "   cd ../redis && ./scripts/start.sh"
    exit 1
fi

# Check Schema API
if ! docker ps | grep -q hailmary-schema-api; then
    echo "⚠️  Schema API service is not running. Please start it first:"
    echo "   cd ../schema && ./scripts/start.sh"
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

# Wait for OpenSearch
echo "⏳ Waiting for OpenSearch..."
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:9201/_cluster/health >/dev/null 2>&1; then
        echo "✅ OpenSearch is healthy"
        break
    fi
    echo "⏳ Waiting for OpenSearch... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ OpenSearch is not healthy after $timeout seconds"
    exit 1
fi

# Wait for Redis
echo "⏳ Waiting for Redis..."
counter=0
while [ $counter -lt $timeout ]; do
    if docker exec hailmary-redis redis-cli ping >/dev/null 2>&1; then
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

# Wait for Schema API
echo "⏳ Waiting for Schema API..."
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:3001/health >/dev/null 2>&1; then
        echo "✅ Schema API is healthy"
        break
    fi
    echo "⏳ Waiting for Schema API... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ Schema API is not healthy after $timeout seconds"
    exit 1
fi

# Pull schema from schema-api if configured
if [ -n "$SCHEMA_API_URL" ]; then
    echo "📥 Pulling schema from Schema API..."
    ./scripts/pull-schema.sh ${SCHEMA_VERSION:-latest}
else
    echo "⚠️  Schema API not configured. Skipping schema update."
    echo "   Set SCHEMA_API_URL environment variable to enable schema integration."
fi

# Start the web service
echo "🌐 Starting web application..."
docker compose up -d web

# Wait for web service to be healthy
echo "⏳ Waiting for web service to be healthy..."
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:$WEB_PORT/api/health >/dev/null 2>&1; then
        echo "✅ Web service is healthy and ready!"
        break
    fi
    echo "⏳ Waiting for web service... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ Web service failed to start within $timeout seconds"
    echo "📋 Checking web service logs..."
    docker compose logs web
    exit 1
fi

# Display service information
echo ""
echo "🎉 Web Service started successfully!"
echo ""
echo "📋 Service Information:"
echo "   • Application URL: http://localhost:$WEB_PORT"
echo "   • Health Check: http://localhost:$WEB_PORT/api/health"
echo "   • Environment: $NODE_ENV"
echo "   • Database: $DATABASE_URL"
echo "   • OpenSearch: $OPENSEARCH_URL"
echo "   • Redis: $REDIS_URL"
echo ""
echo "🔧 Management Commands:"
echo "   • View logs: ./scripts/logs.sh"
echo "   • Health check: ./scripts/health-check.sh"
echo "   • Stop service: ./scripts/stop.sh"
echo "   • Restart service: ./scripts/restart.sh"
echo ""
echo "🌐 Application Features:"
echo "   • Search Interface: http://localhost:$WEB_PORT/search"
echo "   • Direct Search: http://localhost:$WEB_PORT/direct-search"
echo "   • Admin Panel: http://localhost:$WEB_PORT/admin"
echo "   • Login: http://localhost:$WEB_PORT/login"
