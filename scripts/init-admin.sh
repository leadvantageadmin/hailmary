#!/bin/bash

# Initialize admin user script for both local and VM environments

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

# Function to initialize admin locally
init_admin_local() {
    echo "🔐 Initializing admin user locally..."
    
    # Check if services are running
    if ! docker-compose ps | grep -q "Up"; then
        echo "❌ Services are not running. Please start them first with: ./scripts/hailmary.sh local"
        exit 1
    fi
    
    # Create admin user using docker-compose exec
    docker-compose exec web node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        async function createAdmin() {
            try {
                const existingAdmin = await prisma.user.findFirst({
                    where: { role: 'ADMIN' }
                });
                
                if (existingAdmin) {
                    console.log('✅ Admin user already exists:', existingAdmin.email);
                    return;
                }
                
                const admin = await prisma.user.create({
                    data: {
                        id: 'admin-001',
                        email: 'admin@leadvantageglobal.com',
                        password: 'temp-hash',
                        firstName: 'Admin',
                        lastName: 'User',
                        role: 'ADMIN'
                    }
                });
                
                console.log('✅ Admin user created:', admin.email);
            } catch (error) {
                console.error('❌ Error creating admin user:', error.message);
            } finally {
                await prisma.\$disconnect();
            }
        }
        
        createAdmin();
    "
}

# Function to initialize admin on VM
init_admin_vm() {
    echo "🔐 Initializing admin user on VM..."
    
    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        cd hailmary
        
        # Check if services are running
        if ! docker-compose -f deployment/docker-compose.production.yml ps | grep -q 'Up'; then
            echo '❌ Services are not running. Please start them first.'
            exit 1
        fi
        
        # Create admin user using docker-compose exec
        docker-compose -f deployment/docker-compose.production.yml exec web node -e \"
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            
            async function createAdmin() {
                try {
                    const existingAdmin = await prisma.user.findFirst({
                        where: { role: 'ADMIN' }
                    });
                    
                    if (existingAdmin) {
                        console.log('✅ Admin user already exists:', existingAdmin.email);
                        return;
                    }
                    
                    const admin = await prisma.user.create({
                        data: {
                            id: 'admin-001',
                            email: 'admin@leadvantageglobal.com',
                            password: 'temp-hash',
                            firstName: 'Admin',
                            lastName: 'User',
                            role: 'ADMIN'
                        }
                    });
                    
                    console.log('✅ Admin user created:', admin.email);
                } catch (error) {
                    console.error('❌ Error creating admin user:', error.message);
                } finally {
                    await prisma.\\\$disconnect();
                }
            }
            
            createAdmin();
        \"
    "
}

# Main script logic
ENVIRONMENT=${1:-"local"}

case $ENVIRONMENT in
    "local")
        init_admin_local
        ;;
    "vm")
        init_admin_vm
        ;;
    *)
        echo "Usage: $0 [local|vm]"
        echo "  local - Initialize admin user locally"
        echo "  vm    - Initialize admin user on VM"
        exit 1
        ;;
esac

echo "✅ Admin user initialization completed!"