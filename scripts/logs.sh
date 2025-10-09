#!/bin/bash

# Logs script for both local and VM environments

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

# Function to show logs locally
logs_local() {
    local service=$1
    
    if [ -n "$service" ]; then
        echo "📋 Showing logs for service: $service"
        docker-compose logs -f "$service"
    else
        echo "📋 Showing logs for all services (press Ctrl+C to exit):"
        docker-compose logs -f
    fi
}

# Function to show logs on VM
logs_vm() {
    local service=$1
    
    echo "📋 Fetching logs from VM..."

    if [ -n "$service" ]; then
        echo "📋 Showing logs for service: $service"
        gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
            cd hailmary
            docker-compose -f deployment/docker-compose.production.yml logs -f $service
        "
    else
        echo "📋 Showing logs for all services (press Ctrl+C to exit):"
        gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
            cd hailmary
            docker-compose -f deployment/docker-compose.production.yml logs -f
        "
    fi
}

# Main script logic
ENVIRONMENT=${1:-"local"}
SERVICE=${2:-""}

case $ENVIRONMENT in
    "local")
        logs_local "$SERVICE"
        ;;
    "vm")
        logs_vm "$SERVICE"
        ;;
    *)
        echo "Usage: $0 [local|vm] [service]"
        echo "  local - Show local logs"
        echo "  vm    - Show VM logs"
        echo "  service - Optional service name (web, postgres, opensearch, redis, ingestor)"
        exit 1
        ;;
esac
