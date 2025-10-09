#!/bin/bash

# Status script for both local and VM environments

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

# Function to check status locally
status_local() {
    echo "📊 Local Development Environment Status"
    echo "======================================"

    # Check Docker status
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running"
        exit 1
    fi

    echo "✅ Docker is running"

    # Check service status
    echo ""
    echo "🐳 Container Status:"
    docker-compose ps

    # Check if services are healthy
    echo ""
    echo "🏥 Health Checks:"

    # Check web service
    if docker-compose ps web | grep -q "Up"; then
        echo "✅ Web service is running"
        if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
            echo "✅ Web API is responding"
        else
            echo "❌ Web API is not responding"
        fi
    else
        echo "❌ Web service is not running"
    fi

    # Check PostgreSQL
    if docker-compose ps postgres | grep -q "Up"; then
        echo "✅ PostgreSQL is running"
    else
        echo "❌ PostgreSQL is not running"
    fi

    # Check OpenSearch
    if docker-compose ps opensearch | grep -q "Up"; then
        echo "✅ OpenSearch is running"
        if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
            echo "✅ OpenSearch is healthy"
        else
            echo "❌ OpenSearch is not responding"
        fi
    else
        echo "❌ OpenSearch is not running"
    fi

    # Check Redis
    if docker-compose ps redis | grep -q "Up"; then
        echo "✅ Redis is running"
    else
        echo "❌ Redis is not running"
    fi

    echo ""
    echo "🌐 Access Points:"
    echo "  - Web App: http://localhost:3000"
    echo "  - Login: http://localhost:3000/login"
    echo "  - Admin: http://localhost:3000/admin"
    echo "  - Search: http://localhost:3000/search"
    echo "  - OpenSearch: http://localhost:9200"
    echo "  - Redis: localhost:6379"
    echo "  - PostgreSQL: localhost:5432"
}

# Function to check status on VM
status_vm() {
    echo "📊 VM Status Check"
    echo "=================="

    # Get VM external IP
    VM_IP=$(gcloud compute instances describe $VM_NAME --zone=$ZONE --format="value(networkInterfaces[0].accessConfigs[0].natIP)")

    if [ -z "$VM_IP" ]; then
        echo "❌ Could not find VM IP. Please check VM name and zone."
        exit 1
    fi

    echo "📍 VM IP: $VM_IP"

    # Check VM status
    echo ""
    echo "🖥️ VM Status:"
    gcloud compute instances describe $VM_NAME --zone=$ZONE --format="value(status)"

    # Check application status
    echo ""
    echo "🐳 Application Status:"
    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        cd hailmary
        if [ -f 'deployment/docker-compose.production.yml' ]; then
            docker-compose -f deployment/docker-compose.production.yml ps
        else
            echo 'Application not deployed yet'
        fi
    "

    # Check if application is accessible
    echo ""
    echo "🌐 Application Access:"
    if curl -s --connect-timeout 5 http://portal.leadvantageglobal.com > /dev/null 2>&1; then
        echo "✅ Application is accessible at http://portal.leadvantageglobal.com"
    else
        echo "❌ Application is not accessible at http://portal.leadvantageglobal.com"
    fi

    echo ""
    echo "📋 Access Points:"
    echo "  - Application: http://portal.leadvantageglobal.com (via Nginx)"
    echo "  - Login: http://portal.leadvantageglobal.com/login"
    echo "  - Note: OpenSearch and Redis are only accessible within the VM (ports blocked in GCP)"
    echo ""
    echo "💡 To manage the VM, use: ./scripts/hailmary.sh vm manage"
}

# Main script logic
ENVIRONMENT=${1:-"local"}

case $ENVIRONMENT in
    "local")
        status_local
        ;;
    "vm")
        status_vm
        ;;
    *)
        echo "Usage: $0 [local|vm]"
        echo "  local - Check local environment status"
        echo "  vm    - Check VM environment status"
        exit 1
        ;;
esac
