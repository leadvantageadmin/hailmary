#!/bin/bash
set -e

# Web Service Stop Script
# Stops the Next.js web application

echo "🛑 Stopping HailMary Web Service..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Stop the web service
echo "🌐 Stopping web application..."
docker compose down

# Display service information
echo ""
echo "✅ Web Service stopped successfully!"
echo ""
echo "📋 Service Status:"
echo "   • Web application: Stopped"
echo "   • Container: Removed"
echo "   • Network: Preserved (hailmary-network)"
echo ""
echo "🔧 Management Commands:"
echo "   • Start service: ./scripts/start.sh"
echo "   • Restart service: ./scripts/restart.sh"
echo "   • View logs: ./scripts/logs.sh"
