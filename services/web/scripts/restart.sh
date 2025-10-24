#!/bin/bash
set -e

# Web Service Restart Script
# Restarts the Next.js web application

# Show usage if no arguments provided
show_usage() {
    echo "Usage: $0 [local|vm]"
    echo ""
    echo "Modes:"
    echo "  local    - Local development mode (default)"
    echo "  vm       - VM/production mode"
    echo ""
    echo "Examples:"
    echo "  $0 local    # Restart in local mode"
    echo "  $0 vm       # Restart in VM mode"
    echo "  $0          # Restart in local mode (default)"
    exit 1
}

# Parse arguments
DEPLOYMENT_MODE=${1:-local}

if [[ "$DEPLOYMENT_MODE" != "local" && "$DEPLOYMENT_MODE" != "vm" ]]; then
    echo "❌ Invalid deployment mode: $DEPLOYMENT_MODE"
    show_usage
fi

echo "🔄 Restarting HailMary Web Service ($DEPLOYMENT_MODE mode)"
echo "======================================================="

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Stop the service
echo "🛑 Stopping web service..."
./scripts/stop.sh $DEPLOYMENT_MODE

# Wait a moment
echo "⏳ Waiting for graceful shutdown..."
sleep 3

# Start the service
echo "🚀 Starting web service..."
./scripts/start.sh $DEPLOYMENT_MODE

echo ""
echo "✅ Web Service restarted successfully!"
echo "🌐 Deployment Mode: $DEPLOYMENT_MODE"
