#!/bin/bash

# Environment verification script for both local and VM environments

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

# Function to verify environment locally
verify_environment_local() {
    echo "=== Local Environment Verification ==="
    echo "This script verifies that the Docker environment is consistent"
    echo

    # Check Docker version
    echo "1. Docker Version:"
    docker --version
    echo

    # Check if we can build the image
    echo "2. Testing Docker Build:"
    echo "Building web service image..."
    if docker build -f apps/web/Dockerfile -t hailmary-web-test . > /tmp/docker-build.log 2>&1; then
        echo "✅ Docker build successful"
    else
        echo "❌ Docker build failed. Check /tmp/docker-build.log for details"
        echo "Last 20 lines of build log:"
        tail -20 /tmp/docker-build.log
        exit 1
    fi
    echo

    # Check Prisma binary targets
    echo "3. Prisma Binary Targets:"
    echo "Checking if Prisma client can be loaded..."
    if docker run --rm hailmary-web-test sh -c "cd /app/apps/web && node -e \"
        const { PrismaClient } = require('@prisma/client');
        console.log('✅ Prisma client loaded successfully');
        console.log('Binary targets:', process.env.PRISMA_QUERY_ENGINE_BINARY || 'Using default');
    \"" 2>/dev/null; then
        echo "✅ Prisma client loading successful"
    else
        echo "❌ Prisma client loading failed"
        echo "Checking Prisma installation..."
        docker run --rm hailmary-web-test sh -c "cd /app/apps/web && ls -la node_modules/@prisma/"
        exit 1
    fi
    echo

    # Check Node.js version
    echo "4. Node.js Environment:"
    docker run --rm hailmary-web-test node --version
    docker run --rm hailmary-web-test npm --version
    echo

    # Check system info
    echo "5. System Information:"
    docker run --rm hailmary-web-test uname -a
    docker run --rm hailmary-web-test cat /etc/os-release | head -3
    echo

    # Check OpenSSL
    echo "6. OpenSSL Version:"
    docker run --rm hailmary-web-test openssl version
    echo

    # Clean up test image
    docker rmi hailmary-web-test

    echo "=== Local Environment Verification Complete ==="
    echo "If all checks passed, your local environment is ready"
}

# Function to verify environment on VM
verify_environment_vm() {
    echo "=== VM Environment Verification ==="
    echo "This script verifies that the Docker environment is consistent on VM"
    echo

    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        cd hailmary
        
        # Check Docker version
        echo '1. Docker Version:'
        docker --version
        echo
        
        # Check if we can build the image
        echo '2. Testing Docker Build:'
        echo 'Building web service image...'
        if docker build -f apps/web/Dockerfile -t hailmary-web-test . > /tmp/docker-build.log 2>&1; then
            echo '✅ Docker build successful'
        else
            echo '❌ Docker build failed. Check /tmp/docker-build.log for details'
            echo 'Last 20 lines of build log:'
            tail -20 /tmp/docker-build.log
            exit 1
        fi
        echo
        
        # Check Prisma binary targets
        echo '3. Prisma Binary Targets:'
        echo 'Checking if Prisma client can be loaded...'
        if docker run --rm hailmary-web-test sh -c 'cd /app/apps/web && node -e \"const { PrismaClient } = require(\\\"@prisma/client\\\"); console.log(\\\"✅ Prisma client loaded successfully\\\"); console.log(\\\"Binary targets:\\\", process.env.PRISMA_QUERY_ENGINE_BINARY || \\\"Using default\\\");\"' 2>/dev/null; then
            echo '✅ Prisma client loading successful'
        else
            echo '❌ Prisma client loading failed'
            echo 'Checking Prisma installation...'
            docker run --rm hailmary-web-test sh -c 'cd /app/apps/web && ls -la node_modules/@prisma/'
            exit 1
        fi
        echo
        
        # Check Node.js version
        echo '4. Node.js Environment:'
        docker run --rm hailmary-web-test node --version
        docker run --rm hailmary-web-test npm --version
        echo
        
        # Check system info
        echo '5. System Information:'
        docker run --rm hailmary-web-test uname -a
        docker run --rm hailmary-web-test cat /etc/os-release | head -3
        echo
        
        # Check OpenSSL
        echo '6. OpenSSL Version:'
        docker run --rm hailmary-web-test openssl version
        echo
        
        # Clean up test image
        docker rmi hailmary-web-test
        
        echo '=== VM Environment Verification Complete ==='
        echo 'If all checks passed, your VM environment is ready'
    "
}

# Main script logic
ENVIRONMENT=${1:-"local"}

case $ENVIRONMENT in
    "local")
        verify_environment_local
        ;;
    "vm")
        verify_environment_vm
        ;;
    *)
        echo "Usage: $0 [local|vm]"
        echo "  local - Verify local environment"
        echo "  vm    - Verify VM environment"
        exit 1
        ;;
esac