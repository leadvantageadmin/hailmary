#!/bin/bash

# Ingest script for both local and VM environments

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

# Function to run ingestion locally
ingest_local() {
    echo "📥 Running local data ingestion..."

    # Check if services are running
    if ! docker-compose ps | grep -q "Up"; then
        echo "❌ Services are not running. Please start them first with: ./scripts/hailmary.sh local deploy"
        exit 1
    fi

    # Check if data file exists
    if [ ! -f "data/customers.csv" ]; then
        echo "❌ No data file found at data/customers.csv"
        echo "💡 Please upload a CSV file first with: ./scripts/hailmary.sh local upload-csv <file>"
        exit 1
    fi

    # Clear Redis cache
    echo "🧹 Clearing Redis cache..."
    docker-compose exec redis redis-cli FLUSHALL

    # Run ingestor service
    echo "🔄 Running data ingestion..."
    docker-compose run --rm ingestor

    echo "✅ Local data ingestion complete."
}

# Function to run ingestion on VM
ingest_vm() {
    echo "📥 Running data ingestion on VM..."

    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        cd hailmary
        
        # Check if services are running
        if ! docker-compose -f deployment/docker-compose.production.yml ps | grep -q 'Up'; then
            echo '❌ Services are not running. Please start them first.'
            exit 1
        fi
        
        # Check if data file exists
        if [ ! -f 'data/customers.csv' ]; then
            echo '❌ No data file found at data/customers.csv'
            echo '💡 Please upload a CSV file first with: ./scripts/hailmary.sh vm upload-csv <file>'
            exit 1
        fi
        
        # Clear Redis cache
        echo '🧹 Clearing Redis cache...'
        docker-compose -f deployment/docker-compose.production.yml exec redis redis-cli FLUSHALL
        
        # Run ingestor service
        echo '🔄 Running data ingestion...'
        docker-compose -f deployment/docker-compose.production.yml run --rm ingestor
    "

    echo "✅ VM data ingestion complete."
}

# Main script logic
ENVIRONMENT=${1:-"local"}

case $ENVIRONMENT in
    "local")
        ingest_local
        ;;
    "vm")
        ingest_vm
        ;;
    *)
        echo "Usage: $0 [local|vm]"
        echo "  local - Run data ingestion locally"
        echo "  vm    - Run data ingestion on VM"
        exit 1
        ;;
esac
