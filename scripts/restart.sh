#!/bin/bash

# Restart script for both local and VM environments

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

# Function to restart locally
restart_local() {
    echo "🔄 Restarting local development environment..."

    # Stop containers
    docker-compose down

    # Start containers
    docker-compose up -d

    # Wait for services to be ready
    echo "⏳ Waiting for services to start..."
    sleep 10

    # Check service status
    echo "📊 Service status:"
    docker-compose ps

    echo "✅ Local development environment restarted."
}

# Function to restart on VM
restart_vm() {
    echo "🔄 Restarting VM environment..."

    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        cd hailmary
        docker-compose -f deployment/docker-compose.production.yml down
        docker-compose -f deployment/docker-compose.production.yml up -d
        
        # Wait for services to be ready
        echo 'Waiting for services to start...'
        sleep 15
        
        # Check service status
        docker-compose -f deployment/docker-compose.production.yml ps
    "

    echo "✅ VM environment restarted."
}

# Main script logic
ENVIRONMENT=${1:-"local"}

case $ENVIRONMENT in
    "local")
        restart_local
        ;;
    "vm")
        restart_vm
        ;;
    *)
        echo "Usage: $0 [local|vm]"
        echo "  local - Restart local environment"
        echo "  vm    - Restart VM environment"
        exit 1
        ;;
esac
