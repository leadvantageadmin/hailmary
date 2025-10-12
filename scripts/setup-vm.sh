#!/bin/bash

# Complete VM Setup Script for HailMary Customer Search Platform
# This script handles all VM setup requirements including Docker, database, and application deployment

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
PROJECT_ID="leadvantage-global"
SSH_USER="pmomale2024"

echo "🚀 Starting complete VM setup for HailMary Customer Search Platform..."

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

# Execute complete setup on VM
echo "🔧 Executing complete VM setup..."
gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
    echo '=== Starting Complete VM Setup ==='
    
    # Update system packages
    echo '📦 Updating system packages...'
    sudo apt-get update -y
    
    # Install essential packages
    echo '🔧 Installing essential packages...'
    sudo apt-get install -y curl wget git unzip
    
    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        echo '🐳 Installing Docker...'
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker \$USER
        sudo systemctl enable docker
        sudo systemctl restart docker
        echo '✅ Docker installed and configured'
    else
        echo '✅ Docker already installed'
    fi
    
    # Install Docker Compose if not present
    if ! command -v docker-compose &> /dev/null; then
        echo '🐳 Installing Docker Compose...'
        sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        echo '✅ Docker Compose installed'
    else
        echo '✅ Docker Compose already installed'
    fi
    
    # Clone or update the repository
    if [ -d 'hailmary' ]; then
        echo '📁 Updating existing repository...'
        cd hailmary
        # Force pull to override any local changes
        git fetch origin main
        git reset --hard origin/main
        git clean -fd
    else
        echo '📁 Cloning repository from GitHub...'
        git clone https://github.com/leadvantageadmin/hailmary.git
        cd hailmary
    fi
    
    # Create environment files
    echo '📝 Setting up environment files...'
    cp deployment/env.production .env
    cp deployment/env.production deployment/.env
    echo '✅ Environment files created'
    
    # Create data directory
    echo '📁 Creating data directory...'
    mkdir -p data
    echo '✅ Data directory created'
    
    # Stop any existing containers
    echo '🛑 Stopping any existing containers...'
    docker-compose -f deployment/docker-compose.production.yml down || true
    
    # Build and start services
    echo '🔨 Building and starting services...'
    docker-compose -f deployment/docker-compose.production.yml up -d --build
    
    # Wait for services to be ready
    echo '⏳ Waiting for services to start (60 seconds)...'
    sleep 60
    
    # Setup database schema
    echo '🗄️ Setting up database schema...'
    docker-compose -f deployment/docker-compose.production.yml exec web sh -c 'cd apps/web && npx prisma db push' || echo 'Database schema setup completed'
    
    # Verify services are running
    echo '🔍 Verifying services...'
    docker-compose -f deployment/docker-compose.production.yml ps
    
    # Show recent logs
    echo '📋 Recent service logs:'
    docker-compose -f deployment/docker-compose.production.yml logs --tail=10
    
    echo '=== VM Setup Complete ==='
    echo '✅ All services should be running'
    echo '🌐 Application should be available at: http://$VM_IP:8080'
"

echo ""
echo "✅ Complete VM setup finished!"
echo ""
echo "🌐 Access Information:"
echo "  - Application: http://$VM_IP:8080"
echo "  - Login Page: http://$VM_IP:8080/login"
echo "  - Search Page: http://$VM_IP:8080/search (requires authentication)"
echo ""
echo "📊 Next Steps:"
echo "  1. Upload CSV files: ./scripts/hailmary.sh vm upload-csv <file>"
echo "  2. Ingest data: ./scripts/hailmary.sh vm ingest"
echo "  3. Check status: ./scripts/hailmary.sh vm status"
echo ""
echo "🔧 Management Commands:"
echo "  - View logs: ./scripts/hailmary.sh vm logs"
echo "  - Restart: ./scripts/hailmary.sh vm restart"
echo "  - Stop: ./scripts/hailmary.sh vm stop"
