#!/bin/bash
set -e

# PostgreSQL Service Start Script
# Starts the PostgreSQL service with proper configuration

echo "🚀 Starting HailMary PostgreSQL Service..."

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
mkdir -p data/postgres
mkdir -p logs/postgres
mkdir -p data/schema
mkdir -p data/pgadmin

# Set proper permissions
chmod 755 data/postgres
chmod 755 logs/postgres
chmod 755 data/schema
chmod 755 data/pgadmin

# Load environment variables if .env file exists
if [ -f ".env" ]; then
    echo "📋 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set default environment variables if not set
export POSTGRES_USER=${POSTGRES_USER:-app}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-app}
export POSTGRES_DB=${POSTGRES_DB:-app}
export POSTGRES_PORT=${POSTGRES_PORT:-5432}
export POSTGRES_DATA_PATH=${POSTGRES_DATA_PATH:-./data/postgres}
export POSTGRES_LOGS_PATH=${POSTGRES_LOGS_PATH:-./logs/postgres}
export SCHEMA_DATA_PATH=${SCHEMA_DATA_PATH:-./data/schema}
export PGADMIN_DATA_PATH=${PGADMIN_DATA_PATH:-./data/pgadmin}

# Start the PostgreSQL service
echo "🐘 Starting PostgreSQL container..."
docker compose up -d postgres

# Wait for PostgreSQL to be healthy
echo "⏳ Waiting for PostgreSQL to be healthy..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if docker compose exec postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
        echo "✅ PostgreSQL is healthy and ready!"
        break
    fi
    echo "⏳ Waiting for PostgreSQL... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ PostgreSQL failed to start within $timeout seconds"
    echo "📋 Checking PostgreSQL logs..."
    docker compose logs postgres
    exit 1
fi

# Run schema migrations if schema service is configured
if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_REPO" ]; then
    echo "🔄 Running schema migrations..."
    docker compose up schema-migrator
else
    echo "⚠️  Schema service not configured. Skipping migrations."
    echo "   Set GITHUB_TOKEN and GITHUB_REPO environment variables to enable schema integration."
fi

# Display service information
echo ""
echo "🎉 PostgreSQL Service started successfully!"
echo ""
echo "📋 Service Information:"
echo "   • Database: $POSTGRES_DB"
echo "   • User: $POSTGRES_USER"
echo "   • Port: $POSTGRES_PORT"
echo "   • Host: localhost"
echo "   • Connection String: postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$POSTGRES_PORT/$POSTGRES_DB"
echo ""
echo "🔧 Management Commands:"
echo "   • View logs: ./scripts/logs.sh"
echo "   • Health check: ./scripts/health-check.sh"
echo "   • Stop service: ./scripts/stop.sh"
echo "   • Restart service: ./scripts/restart.sh"
echo ""
echo "🌐 Optional Services:"
echo "   • Start with pgAdmin: docker compose --profile admin up -d"
echo "   • pgAdmin URL: http://localhost:8080"
echo "   • pgAdmin Email: admin@hailmary.local"
echo "   • pgAdmin Password: admin"
