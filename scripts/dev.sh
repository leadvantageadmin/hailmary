#!/bin/bash

# Development script for HailMary
# This script starts the application in development mode with hot reloading

set -e

echo "🚀 Starting HailMary in Development Mode with Hot Reloading..."

# Stop any existing containers
echo "📦 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Build and start development containers
echo "🔨 Building and starting development containers..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Checking service status..."
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "🌐 Web Application: http://localhost:3000"
echo "🔍 Search Page: http://localhost:3000/search"
echo "📊 Admin Panel: http://localhost:3000/admin"
echo ""
echo "📝 Hot reloading is enabled - changes to frontend code will automatically reload!"
echo ""
echo "🛑 To stop: docker-compose -f docker-compose.dev.yml down"
echo "📋 To view logs: docker-compose -f docker-compose.dev.yml logs -f web"
