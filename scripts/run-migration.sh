#!/bin/bash

# Run database migration script for both local and VM environments

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

# Function to run migration locally
run_migration_local() {
    echo "🗄️ Running database migration locally..."
    
    # Check if services are running
    if ! docker-compose ps | grep -q "Up"; then
        echo "❌ Services are not running. Please start them first with: ./scripts/hailmary.sh local"
        exit 1
    fi
    
    # Run migration using docker-compose exec
    docker-compose exec web npx prisma migrate deploy
    
    echo "✅ Database migration completed locally!"
}

# Function to run migration on VM
run_migration_vm() {
    echo "🗄️ Running database migration on VM..."
    
    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        cd hailmary
        
        # Check if services are running
        if ! docker-compose -f deployment/docker-compose.production.yml ps | grep -q 'Up'; then
            echo '❌ Services are not running. Please start them first.'
            exit 1
        fi
        
        # Run migration using docker-compose exec
        docker-compose -f deployment/docker-compose.production.yml exec web npx prisma migrate deploy
    "
    
    echo "✅ Database migration completed on VM!"
}

# Main script logic
ENVIRONMENT=${1:-"local"}

case $ENVIRONMENT in
    "local")
        run_migration_local
        ;;
    "vm")
        run_migration_vm
        ;;
    *)
        echo "Usage: $0 [local|vm]"
        echo "  local - Run migration locally"
        echo "  vm    - Run migration on VM"
        exit 1
        ;;
esac