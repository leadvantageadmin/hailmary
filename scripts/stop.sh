#!/bin/bash

# Stop script for both local and VM environments

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

# Function to stop locally
stop_local() {
    echo "🛑 Stopping local development environment..."

    # Stop containers
    docker-compose down

    echo "✅ Local development environment stopped."
}

# Function to stop on VM
stop_vm() {
    echo "🛑 Stopping VM environment..."

    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        cd hailmary
        docker-compose -f deployment/docker-compose.production.yml down
    "

    echo "✅ VM environment stopped."
}

# Main script logic
ENVIRONMENT=${1:-"local"}

case $ENVIRONMENT in
    "local")
        stop_local
        ;;
    "vm")
        stop_vm
        ;;
    *)
        echo "Usage: $0 [local|vm]"
        echo "  local - Stop local environment"
        echo "  vm    - Stop VM environment"
        exit 1
        ;;
esac
