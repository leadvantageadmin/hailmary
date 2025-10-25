#!/bin/bash
set -e

# Web Service Development Script
# Starts the Next.js web application in development mode

echo "🚀 Starting HailMary Web Service in Development Mode..."

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
export NODE_ENV=${NODE_ENV:-development}
export WEB_PORT=${WEB_PORT:-3000}
export DATABASE_URL=${DATABASE_URL:-postgresql://app:app@localhost:5433/app}
export ELASTICSEARCH_URL=${ELASTICSEARCH_URL:-http://localhost:9200}
export REDIS_URL=${REDIS_URL:-redis://localhost:6390}
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

# Check Elasticsearch
if ! docker ps | grep -q hailmary-elasticsearch; then
    echo "⚠️  Elasticsearch service is not running. Please start it first:"
    echo "   cd ../cdc && ./scripts/start.sh local"
    exit 1
fi

# Check Redis
if ! docker ps | grep -q hailmary-services-redis; then
    echo "⚠️  Redis service is not running. Please start it first:"
    echo "   cd ../redis && ./scripts/start.sh local"
    exit 1
fi

# Start the development service
echo "🌐 Starting web application in development mode..."
docker-compose -f docker-compose.dev.yml up -d web-dev

# Wait for web service to be ready
echo "⏳ Waiting for web service to be ready..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:$WEB_PORT/api/health >/dev/null 2>&1; then
        echo "✅ Web service is ready!"
        break
    fi
    echo "⏳ Waiting for web service... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ Web service failed to start within $timeout seconds"
    echo "📋 Checking web service logs..."
    docker-compose -f docker-compose.dev.yml logs web-dev
    exit 1
fi

# Display service information
echo ""
echo "🎉 Web Service started in Development Mode!"
echo ""
echo "📋 Service Information:"
echo "   • Application URL: http://localhost:$WEB_PORT"
echo "   • Health Check: http://localhost:$WEB_PORT/api/health"
echo "   • Environment: $NODE_ENV"
echo "   • Hot Reload: Enabled"
echo "   • Database: $DATABASE_URL"
echo "   • Elasticsearch: $ELASTICSEARCH_URL"
echo "   • Redis: $REDIS_URL"
echo ""
echo "🔧 Management Commands:"
echo "   • View logs: docker-compose -f docker-compose.dev.yml logs -f web-dev"
echo "   • Stop service: docker-compose -f docker-compose.dev.yml down"
echo "   • Restart service: docker-compose -f docker-compose.dev.yml restart web-dev"
echo ""
echo "🌐 Application Features:"
echo "   • Search Interface: http://localhost:$WEB_PORT/search"
echo "   • Direct Search: http://localhost:$WEB_PORT/direct-search"
echo "   • Admin Panel: http://localhost:$WEB_PORT/admin"
echo "   • Login: http://localhost:$WEB_PORT/login"
echo ""
echo "💡 Development Tips:"
echo "   • Code changes will automatically reload the application"
echo "   • Check browser console for any errors"
echo "   • Use browser dev tools for debugging"
