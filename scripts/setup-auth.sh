#!/bin/bash

# Setup authentication system script for both local and VM environments

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

# Function to setup auth locally
setup_auth_local() {
    echo "🔐 Setting up authentication system locally..."
    
    # Check if services are running
    if ! docker-compose ps | grep -q "Up"; then
        echo "❌ Services are not running. Please start them first with: ./scripts/hailmary.sh local"
        exit 1
    fi
    
    # Create User table and admin user using docker-compose exec
    docker-compose exec postgres psql -U app -d app -c "
        -- Create UserRole enum if it doesn't exist
        DO \$\$ BEGIN
            CREATE TYPE \"UserRole\" AS ENUM ('ADMIN', 'USER');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END \$\$;
        
        -- Create User table if it doesn't exist
        CREATE TABLE IF NOT EXISTS \"User\" (
            \"id\" TEXT NOT NULL,
            \"email\" TEXT NOT NULL,
            \"password\" TEXT NOT NULL,
            \"firstName\" TEXT NOT NULL,
            \"lastName\" TEXT NOT NULL,
            \"role\" \"UserRole\" NOT NULL DEFAULT 'USER',
            \"isActive\" BOOLEAN NOT NULL DEFAULT true,
            \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \"updatedAt\" TIMESTAMP(3) NOT NULL,
            CONSTRAINT \"User_pkey\" PRIMARY KEY (\"id\")
        );
        
        -- Create indexes if they don't exist
        CREATE UNIQUE INDEX IF NOT EXISTS \"User_email_key\" ON \"User\"(\"email\");
        CREATE INDEX IF NOT EXISTS \"User_role_idx\" ON \"User\"(\"role\");
        
        -- Insert admin user if it doesn't exist
        INSERT INTO \"User\" (\"id\", \"email\", \"password\", \"firstName\", \"lastName\", \"role\")
        VALUES ('admin-001', 'admin@leadvantageglobal.com', 'temp-hash', 'Admin', 'User', 'ADMIN')
        ON CONFLICT (\"email\") DO NOTHING;
    "
    
    echo "✅ Authentication system setup completed locally!"
}

# Function to setup auth on VM
setup_auth_vm() {
    echo "🔐 Setting up authentication system on VM..."
    
    gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
        cd hailmary
        
        # Check if services are running
        if ! docker-compose -f deployment/docker-compose.production.yml ps | grep -q 'Up'; then
            echo '❌ Services are not running. Please start them first.'
            exit 1
        fi
        
        # Create User table and admin user using docker-compose exec
        docker-compose -f deployment/docker-compose.production.yml exec postgres psql -U postgres -d hailmary -c \"
            -- Create UserRole enum if it doesn't exist
            DO \\\$\\\$ BEGIN
                CREATE TYPE \\\"UserRole\\\" AS ENUM ('ADMIN', 'USER');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END \\\$\\\$;
            
            -- Create User table if it doesn't exist
            CREATE TABLE IF NOT EXISTS \\\"User\\\" (
                \\\"id\\\" TEXT NOT NULL,
                \\\"email\\\" TEXT NOT NULL,
                \\\"password\\\" TEXT NOT NULL,
                \\\"firstName\\\" TEXT NOT NULL,
                \\\"lastName\\\" TEXT NOT NULL,
                \\\"role\\\" \\\"UserRole\\\" NOT NULL DEFAULT 'USER',
                \\\"isActive\\\" BOOLEAN NOT NULL DEFAULT true,
                \\\"createdAt\\\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \\\"updatedAt\\\" TIMESTAMP(3) NOT NULL,
                CONSTRAINT \\\"User_pkey\\\" PRIMARY KEY (\\\"id\\\")
            );
            
            -- Create indexes if they don't exist
            CREATE UNIQUE INDEX IF NOT EXISTS \\\"User_email_key\\\" ON \\\"User\\\"(\\\"email\\\");
            CREATE INDEX IF NOT EXISTS \\\"User_role_idx\\\" ON \\\"User\\\"(\\\"role\\\");
            
            -- Insert admin user if it doesn't exist
            INSERT INTO \\\"User\\\" (\\\"id\\\", \\\"email\\\", \\\"password\\\", \\\"firstName\\\", \\\"lastName\\\", \\\"role\\\")
            VALUES ('admin-001', 'admin@leadvantageglobal.com', 'temp-hash', 'Admin', 'User', 'ADMIN')
            ON CONFLICT (\\\"email\\\") DO NOTHING;
        \"
    "
    
    echo "✅ Authentication system setup completed on VM!"
}

# Main script logic
ENVIRONMENT=${1:-"local"}

case $ENVIRONMENT in
    "local")
        setup_auth_local
        ;;
    "vm")
        setup_auth_vm
        ;;
    *)
        echo "Usage: $0 [local|vm]"
        echo "  local - Setup authentication locally"
        echo "  vm    - Setup authentication on VM"
        exit 1
        ;;
esac