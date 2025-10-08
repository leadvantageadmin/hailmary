#!/bin/bash

# VM Deployment Script for HailMary Customer Search Platform
# This script deploys the application to a GCP VM instance

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"  # Change to your VM's zone
PROJECT_ID="leadvantage-global"
SSH_USER="pmomale2024"  # Replace with your VM username

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

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf hailmary-deployment.tar.gz \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='*.log' \
    --exclude='.env*' \
    .

# Copy files to VM
echo "📤 Copying files to VM..."
gcloud compute scp hailmary-deployment.tar.gz $SSH_USER@$VM_NAME:/home/$SSH_USER/ --zone=$ZONE

# Copy docker-compose file
gcloud compute scp docker-compose.yml $SSH_USER@$VM_NAME:/home/$SSH_USER/ --zone=$ZONE

# Copy environment template
gcloud compute scp env.gcp.example $SSH_USER@$VM_NAME:/home/$SSH_USER/ --zone=$ZONE

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
    
    # Extract deployment files
    tar -xzf hailmary-deployment.tar.gz
    
    # Create environment file
    cp env.gcp.example .env
    
    # Create data directory
    mkdir -p data
    
    # Stop any existing containers
    docker-compose down || true
    
    # Build and start services
    docker-compose up -d --build
    
    # Wait for services to be ready
    echo 'Waiting for services to start...'
    sleep 30
    
    # Check service status
    docker-compose ps
    
    # Show logs
    echo 'Service logs:'
    docker-compose logs --tail=20
"

echo "✅ Deployment completed!"
echo "🌐 Your application should be available at: http://$VM_IP:3000"
echo "📊 OpenSearch should be available at: http://$VM_IP:9200"
echo "🔴 Redis should be available at: $VM_IP:6379"
echo ""
echo "📋 To check status:"
echo "gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command='docker-compose ps'"
echo ""
echo "📋 To view logs:"
echo "gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command='docker-compose logs -f'"
echo ""
echo "📋 To stop services:"
echo "gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command='docker-compose down'"
echo ""
echo "📋 To restart services:"
echo "gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command='docker-compose up -d'"

# Clean up local files
rm -f hailmary-deployment.tar.gz
