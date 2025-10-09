#!/bin/bash

# Deploy script for both local and VM environments

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
PROJECT_ID="leadvantage-global"
SSH_USER="pmomale2024"

# Function to deploy locally
deploy_local() {
    echo "🚀 Starting local development deployment..."

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker Desktop."
        exit 1
    fi

    # Check if environment file exists
    if [ ! -f "apps/web/.env.local" ]; then
        echo "📝 Creating environment file from template..."
        cp apps/web/env.local.example apps/web/.env.local
        echo "✅ Environment file created. Please update apps/web/.env.local with your settings."
    fi

    if [ ! -f "apps/ingestor/.env.local" ]; then
        echo "📝 Creating ingestor environment file from template..."
        cp apps/ingestor/env.local.example apps/ingestor/.env.local
        echo "✅ Ingestor environment file created. Please update apps/ingestor/.env.local with your settings."
    fi

    # Stop any existing containers
    echo "🛑 Stopping existing containers..."
    docker-compose down || true

    # Build and start services
    echo "🔨 Building and starting services..."
    docker-compose up -d --build

    # Wait for services to be ready
    echo "⏳ Waiting for services to start..."
    sleep 15

    # Check service status
    echo "📊 Service status:"
    docker-compose ps

    # Show logs
    echo "📋 Recent logs:"
    docker-compose logs --tail=20

    echo ""
    echo "✅ Local development environment is ready!"
    echo ""
    echo "🌐 Access points:"
    echo "  - Web App: http://localhost:3000"
    echo "  - OpenSearch: http://localhost:9200"
    echo "  - Redis: localhost:6379"
    echo "  - PostgreSQL: localhost:5432"
    echo ""
    echo "📋 Useful commands:"
    echo "  - View logs: ./scripts/hailmary.sh local logs"
    echo "  - Stop services: ./scripts/hailmary.sh local stop"
    echo "  - Restart services: ./scripts/hailmary.sh local restart"
    echo "  - Clean up: ./scripts/hailmary.sh local cleanup"
}

# Function to deploy to VM
deploy_vm() {
    echo "🚀 Starting VM deployment for HailMary Customer Search Platform..."

    # Check if gcloud is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        echo "❌ Not authenticated with GCP. Please run: gcloud auth login"
        exit 1
    fi

    # Set the project
    echo "📋 Setting project to $PROJECT_ID..."
    gcloud config set project $PROJECT_ID

    # Get VM external IP
    echo "🔍 Getting VM external IP..."
    VM_IP=$(gcloud compute instances describe $VM_NAME --zone=$ZONE --format="value(networkInterfaces[0].accessConfigs[0].natIP)")

    if [ -z "$VM_IP" ]; then
        echo "❌ Could not find VM IP. Please check VM name and zone."
        exit 1
    fi

    echo "📍 VM IP: $VM_IP"

    # Execute deployment on VM
    echo "🔧 Executing deployment on VM..."
    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        # Update system
        sudo apt-get update
        
        # Install Docker if not present
        if ! command -v docker &> /dev/null; then
            echo 'Installing Docker...'
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker \$USER
        fi
        
        # Install Docker Compose if not present
        if ! command -v docker-compose &> /dev/null; then
            echo 'Installing Docker Compose...'
            sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        fi
        
        # Install Git if not present
        if ! command -v git &> /dev/null; then
            echo 'Installing Git...'
            sudo apt-get install -y git
        fi
        
        # Clone or update the repository
        if [ -d 'hailmary' ]; then
            echo 'Updating existing repository...'
            cd hailmary
            git pull origin main
        else
            echo 'Cloning repository from GitHub...'
            git clone https://github.com/leadvantageadmin/hailmary.git
            cd hailmary
        fi
        
        # Create environment file
        cp deployment/env.production.example .env
        
        # Create data directory
        mkdir -p data
        
        # Run environment verification
        echo 'Running environment verification...'
        chmod +x scripts/verify-environment.sh
        ./scripts/verify-environment.sh vm
        
        # Stop any existing containers
        docker-compose -f deployment/docker-compose.production.yml down || true
        
        # Build and start services using production configuration
        docker-compose -f deployment/docker-compose.production.yml up -d --build
        
        # Wait for services to be ready
        echo 'Waiting for services to start...'
        sleep 30
        
        # Check service status
        docker-compose -f deployment/docker-compose.production.yml ps
        
        # Show logs
        echo 'Service logs:'
        docker-compose -f deployment/docker-compose.production.yml logs --tail=20
    "

    echo "✅ Deployment completed!"
    echo "🌐 Your application should be available at: http://portal.leadvantageglobal.com"
    echo "🔐 Login page: http://portal.leadvantageglobal.com/login"
    echo "📝 Note: OpenSearch and Redis are only accessible within the VM (ports blocked in GCP)"
    echo ""
    echo "📋 To manage the VM, use: ./scripts/hailmary.sh vm manage"
}

# Main script logic
ENVIRONMENT=${1:-"local"}

case $ENVIRONMENT in
    "local")
        deploy_local
        ;;
    "vm")
        deploy_vm
        ;;
    *)
        echo "Usage: $0 [local|vm]"
        echo "  local - Deploy locally"
        echo "  vm    - Deploy to VM"
        exit 1
        ;;
esac
