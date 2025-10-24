#!/bin/bash
set -e

# PostgreSQL Service Stop Script
# Stops the PostgreSQL service gracefully

echo "🛑 Stopping HailMary PostgreSQL Service..."

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

# Set default environment variables if not set
export POSTGRES_USER=${POSTGRES_USER:-app}
export POSTGRES_DB=${POSTGRES_DB:-app}

# Check if PostgreSQL container is running
if ! docker compose ps postgres | grep -q "Up"; then
    echo "⚠️  PostgreSQL service is not running"
    exit 0
fi

# Stop all PostgreSQL-related containers
echo "🛑 Stopping PostgreSQL containers..."
docker compose down

# Stop pgAdmin if running
if docker compose ps postgres-admin | grep -q "Up"; then
    echo "🛑 Stopping pgAdmin..."
    docker compose --profile admin down
fi

# Display status
echo ""
echo "✅ PostgreSQL Service stopped successfully!"
echo ""
echo "📋 Service Status:"
docker compose ps

echo ""
echo "💾 Data is preserved in:"
echo "   • Database data: ./data/postgres"
echo "   • Logs: ./logs/postgres"
echo "   • Schema files: ./data/schema"
echo "   • pgAdmin data: ./data/pgadmin"
echo ""
echo "🚀 To start the service again:"
echo "   ./scripts/start.sh"
