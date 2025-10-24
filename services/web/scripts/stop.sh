#!/bin/bash
set -e

# Web Service Stop Script
# Stops the Next.js web application

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

echo "🛑 Stopping HailMary Web Service ($DEPLOYMENT_MODE mode)"
echo "====================================================="

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

# Stop the web service
echo "🌐 Stopping web application..."
if [ "$DEPLOYMENT_MODE" = "vm" ]; then
    echo "🔧 Stopping nginx configuration for VM deployment..."
    docker compose -f docker-compose.vm.yml down
else
    echo "🔧 Stopping standard configuration for local development..."
    docker compose down
fi

# Display service information
echo ""
echo "✅ Web Service stopped successfully!"
echo ""
echo "📋 Service Status:"
echo "   • Web application: Stopped"
echo "   • Container: Removed"
echo "   • Network: Preserved (hailmary-network)"
echo "   • Deployment Mode: $DEPLOYMENT_MODE"
echo ""
echo "🔧 Management Commands:"
echo "   • Start service: ./scripts/start.sh $DEPLOYMENT_MODE"
echo "   • Restart service: ./scripts/restart.sh $DEPLOYMENT_MODE"
echo "   • View logs: ./scripts/logs.sh $DEPLOYMENT_MODE"
