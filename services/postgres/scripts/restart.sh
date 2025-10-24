#!/bin/bash
set -e

# PostgreSQL Service Restart Script
# Restarts the PostgreSQL service

echo "🔄 Restarting HailMary PostgreSQL Service..."

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
./scripts/stop.sh

# Wait a moment
echo "⏳ Waiting 5 seconds before restart..."
sleep 5

# Start the service
echo "🚀 Starting PostgreSQL service..."
./scripts/start.sh

echo ""
echo "✅ PostgreSQL Service restarted successfully!"
