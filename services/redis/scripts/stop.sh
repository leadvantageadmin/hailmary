#!/bin/bash
set -e

# Redis Service Stop Script
# Stops the Redis service gracefully

# Show usage if no arguments provided
show_usage() {
    echo "Usage: $0 [local|vm]"
    echo ""
    echo "Modes:"
    echo "  local    - Local development mode (default)"
    echo "  vm       - VM/production mode"
    echo ""
    echo "Examples:"
    echo "  $0 local    # Stop in local mode"
    echo "  $0 vm       # Stop in VM mode"
    echo "  $0          # Stop in local mode (default)"
    exit 1
}

# Parse arguments
DEPLOYMENT_MODE=${1:-local}

if [[ "$DEPLOYMENT_MODE" != "local" && "$DEPLOYMENT_MODE" != "vm" ]]; then
    echo "❌ Invalid deployment mode: $DEPLOYMENT_MODE"
    show_usage
fi

echo "🛑 Stopping HailMary Redis Service ($DEPLOYMENT_MODE mode)"
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

# Stop Redis service
echo "🛑 Stopping Redis service..."
docker-compose down

echo "✅ Redis service stopped successfully"
echo "🌐 Deployment Mode: $DEPLOYMENT_MODE"
