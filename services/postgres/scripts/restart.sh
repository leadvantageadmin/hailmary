#!/bin/bash
set -e

# PostgreSQL Service Restart Script
# Restarts the PostgreSQL service
# Usage: ./restart.sh [local|vm]
#   local: Local development deployment (default)
#   vm: VM/production deployment

# Get deployment mode from argument
DEPLOYMENT_MODE=${1:-local}

# Validate deployment mode
if [[ "$DEPLOYMENT_MODE" != "local" && "$DEPLOYMENT_MODE" != "vm" ]]; then
    echo "❌ Invalid deployment mode. Use 'local' or 'vm'"
    echo "   Usage: ./restart.sh [local|vm]"
    exit 1
fi

echo "🔄 Restarting HailMary PostgreSQL Service ($DEPLOYMENT_MODE mode)..."

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

# Stop the service
echo "🛑 Stopping PostgreSQL service..."
./scripts/stop.sh "$DEPLOYMENT_MODE"

# Wait a moment
echo "⏳ Waiting 5 seconds before restart..."
sleep 5

# Start the service
echo "🚀 Starting PostgreSQL service..."
./scripts/start.sh "$DEPLOYMENT_MODE"

echo ""
echo "✅ PostgreSQL Service restarted successfully!"
echo ""
echo "🔧 Management Commands:"
echo "   • Health check: ./scripts/health-check.sh $DEPLOYMENT_MODE"
echo "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
echo "   • Stop service: ./scripts/stop.sh $DEPLOYMENT_MODE"
