#!/bin/bash
set -e

# Redis Service Stop Script
# Stops the Redis service gracefully

echo "🛑 Stopping HailMary Redis Service"
echo "=================================="

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

# Change to service directory
cd "$SERVICE_DIR"

# Stop Redis service
echo "🛑 Stopping Redis service..."
docker compose down

echo "✅ Redis service stopped successfully"
