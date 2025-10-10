#!/bin/bash

# Rebuild Database Schema and OpenSearch Index
# This script completely purges and rebuilds the database and search index

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

# Function to rebuild schema locally
rebuild_local() {
    echo "🗑️  Purging and rebuilding database schema and OpenSearch index (LOCAL)..."

    # Check if we're in the right directory
    if [ ! -f "docker-compose.dev.yml" ]; then
        echo "❌ Error: Please run this script from the project root directory"
        exit 1
    fi

    # Check if development environment is running
    if ! docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        echo "❌ Error: Development environment is not running. Please start it first with:"
        echo "   ./scripts/hailmary.sh local deploy"
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

    echo "✅ Local schema rebuild completed successfully!"
    echo ""
    echo "🎯 What was done:"
    echo "   • Dropped existing Customer table"
    echo "   • Deleted OpenSearch customers index"
    echo "   • Regenerated Prisma client with new schema"
    echo "   • Pushed new schema to PostgreSQL"
    echo "   • Rebuilt ingestor with updated schema"
    echo "   • Re-ingested all data from CSV"
    echo ""
    echo "🚀 Your local application is now running with the clean, final schema!"
}

# Function to rebuild schema on VM
rebuild_vm() {
    echo "🗑️  Purging and rebuilding database schema and OpenSearch index (VM)..."

    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        cd hailmary
        
        # Check if services are running
        if ! docker-compose -f deployment/docker-compose.production.yml ps | grep -q 'Up'; then
            echo '❌ Error: VM services are not running. Please start them first with:'
            echo '   ./scripts/hailmary.sh vm deploy'
            exit 1
        fi
        
        echo '📊 Step 1: Dropping existing PostgreSQL table...'
        docker-compose -f deployment/docker-compose.production.yml exec postgres psql -U app -d app -c 'DROP TABLE IF EXISTS \"Customer\" CASCADE;'
        
        echo '🔍 Step 2: Deleting OpenSearch index...'
        curl -X DELETE 'http://localhost:9200/customers' 2>/dev/null || echo 'Index didn'\''t exist or already deleted'
        
        echo '🗄️  Step 3: Regenerating Prisma client...'
        docker-compose -f deployment/docker-compose.production.yml exec web npx prisma generate --schema=./apps/web/prisma/schema.prisma
        
        echo '📋 Step 4: Pushing new schema to database...'
        docker-compose -f deployment/docker-compose.production.yml exec web npx prisma db push --schema=./apps/web/prisma/schema.prisma
        
        echo '🔄 Step 5: Rebuilding ingestor with new schema...'
        docker-compose -f deployment/docker-compose.production.yml build ingestor
        
        echo '📊 Step 6: Ingesting data from CSV with new schema...'
        ./scripts/ingest.sh vm
        
        echo '✅ VM schema rebuild completed successfully!'
        echo ''
        echo '🎯 What was done:'
        echo '   • Dropped existing Customer table'
        echo '   • Deleted OpenSearch customers index'
        echo '   • Regenerated Prisma client with new schema'
        echo '   • Pushed new schema to PostgreSQL'
        echo '   • Rebuilt ingestor with updated schema'
        echo '   • Re-ingested all data from CSV'
        echo ''
        echo '🚀 Your VM application is now running with the clean, final schema!'
    "

    echo "✅ VM schema rebuild completed successfully!"
}

# Main script logic
ENVIRONMENT=${1:-"local"}

case $ENVIRONMENT in
    "local")
        rebuild_local
        ;;
    "vm")
        rebuild_vm
        ;;
    *)
        echo "Usage: $0 [local|vm]"
        echo "  local - Rebuild schema locally (default)"
        echo "  vm    - Rebuild schema on VM"
        exit 1
        ;;
esac
