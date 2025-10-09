#!/bin/bash

# Local Development Cleanup Script for HailMary Customer Search Platform

set -e

echo "🧹 Cleaning up local development environment..."

# Stop and remove containers
echo "🛑 Stopping and removing containers..."
docker-compose down -v

# Remove images
echo "🗑️ Removing images..."
docker-compose down --rmi all || true

# Clean up Docker system
echo "🧽 Cleaning up Docker system..."
docker system prune -f

# Remove node_modules and build artifacts
echo "🗑️ Removing build artifacts..."
rm -rf apps/web/.next
rm -rf apps/web/node_modules
rm -rf node_modules

echo "✅ Local development environment cleaned up."
echo ""
echo "💡 To start fresh, run: ./scripts/local-deploy.sh"
