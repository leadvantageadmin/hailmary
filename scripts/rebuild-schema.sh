#!/bin/bash

# Rebuild Database Schema and OpenSearch Index
# This script completely purges and rebuilds the database and search index

set -e

echo "🗑️  Purging and rebuilding database schema and OpenSearch index..."

# Check if we're in the right directory
if [ ! -f "docker-compose.dev.yml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if development environment is running
if ! docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo "❌ Error: Development environment is not running. Please start it first with:"
    echo "   ./scripts/dev.sh"
    exit 1
fi

echo "📊 Step 1: Dropping existing PostgreSQL table..."
docker-compose -f docker-compose.dev.yml exec postgres psql -U app -d app -c "DROP TABLE IF EXISTS \"Customer\" CASCADE;"

echo "🔍 Step 2: Deleting OpenSearch index..."
curl -X DELETE "http://localhost:9200/customers" 2>/dev/null || echo "Index didn't exist or already deleted"

echo "🗄️  Step 3: Regenerating Prisma client..."
docker-compose -f docker-compose.dev.yml exec web pnpm prisma:generate

echo "📋 Step 4: Pushing new schema to database..."
docker-compose -f docker-compose.dev.yml exec web npx prisma db push

echo "🔄 Step 5: Rebuilding ingestor with new schema..."
docker-compose -f docker-compose.dev.yml build ingestor

echo "📊 Step 6: Ingesting data from CSV with new schema..."
./scripts/ingest.sh local

echo "✅ Schema rebuild completed successfully!"
echo ""
echo "🎯 What was done:"
echo "   • Dropped existing Customer table"
echo "   • Deleted OpenSearch customers index"
echo "   • Regenerated Prisma client with new schema"
echo "   • Pushed new schema to PostgreSQL"
echo "   • Rebuilt ingestor with updated schema"
echo "   • Re-ingested all data from CSV"
echo ""
echo "🚀 Your application is now running with the clean, final schema!"
