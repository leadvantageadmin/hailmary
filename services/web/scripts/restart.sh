#!/bin/bash
set -e

# Web Service Restart Script
# Restarts the Next.js web application

echo "🔄 Restarting HailMary Web Service..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Stop the service
echo "🛑 Stopping web service..."
./scripts/stop.sh

# Wait a moment
echo "⏳ Waiting for graceful shutdown..."
sleep 3

# Start the service
echo "🚀 Starting web service..."
./scripts/start.sh

echo ""
echo "✅ Web Service restarted successfully!"
