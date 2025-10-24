#!/bin/bash
set -e

# PostgreSQL Service Stop Script
# Stops the PostgreSQL service gracefully
# Usage: ./stop.sh [local|vm]
#   local: Local development deployment (default)
#   vm: VM/production deployment

# Get deployment mode from argument
DEPLOYMENT_MODE=${1:-local}

# Validate deployment mode
if [[ "$DEPLOYMENT_MODE" != "local" && "$DEPLOYMENT_MODE" != "vm" ]]; then
    echo "❌ Invalid deployment mode. Use 'local' or 'vm'"
    echo "   Usage: ./stop.sh [local|vm]"
    exit 1
fi

echo "🛑 Stopping HailMary PostgreSQL Service ($DEPLOYMENT_MODE mode)..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Function to configure local development environment
configure_local() {
    echo "🔧 Configuring for local development..."
    
    # Local development configurations
    export POSTGRES_USER=${POSTGRES_USER:-app}
    export POSTGRES_DB=${POSTGRES_DB:-app}
    export POSTGRES_DATA_PATH=${POSTGRES_DATA_PATH:-"./data/postgres"}
    export POSTGRES_LOGS_PATH=${POSTGRES_LOGS_PATH:-"./logs/postgres"}
    export SCHEMA_DATA_PATH=${SCHEMA_DATA_PATH:-"./data/schema"}
    export PGADMIN_DATA_PATH=${PGADMIN_DATA_PATH:-"./data/pgadmin"}
    
    echo "✅ Local configuration complete"
}

# Function to configure VM/production environment
configure_vm() {
    echo "🔧 Configuring for VM/production deployment..."
    
    # VM-specific configurations
    export POSTGRES_USER=${POSTGRES_USER:-app}
    export POSTGRES_DB=${POSTGRES_DB:-app}
    export POSTGRES_DATA_PATH=${POSTGRES_DATA_PATH:-"/opt/hailmary/services/postgres/data/postgres"}
    export POSTGRES_LOGS_PATH=${POSTGRES_LOGS_PATH:-"/var/log/hailmary/postgres"}
    export SCHEMA_DATA_PATH=${SCHEMA_DATA_PATH:-"/opt/hailmary/services/postgres/data/schema"}
    export PGADMIN_DATA_PATH=${PGADMIN_DATA_PATH:-"/opt/hailmary/services/postgres/data/pgadmin"}
    
    echo "✅ VM configuration complete"
}

# Configure based on deployment mode
if [[ "$DEPLOYMENT_MODE" == "vm" ]]; then
    configure_vm
else
    configure_local
fi

# Load environment variables if .env file exists
if [ -f ".env" ]; then
    echo "📋 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
fi

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
echo "   • Database data: $POSTGRES_DATA_PATH"
echo "   • Logs: $POSTGRES_LOGS_PATH"
echo "   • Schema files: $SCHEMA_DATA_PATH"
echo "   • pgAdmin data: $PGADMIN_DATA_PATH"
echo ""
echo "🚀 To start the service again:"
echo "   ./scripts/start.sh $DEPLOYMENT_MODE"
echo ""
echo "🔧 Management Commands:"
echo "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
echo "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
echo "   • Restart service: ./scripts/restart.sh $DEPLOYMENT_MODE"
