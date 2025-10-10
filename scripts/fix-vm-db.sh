#!/bin/bash

# Fix VM Database Setup
# This script creates the PostgreSQL user and database, then sets up the schema

set -e

# Configuration
VM_NAME="hail-mary"
ZONE="asia-south1-c"
SSH_USER="pmomale2024"

echo "🔧 Fixing VM database setup..."

gcloud compute ssh $SSH_USER@$VM_NAME --zone=$ZONE --command="
    cd hailmary
    echo '📊 Step 1: Creating PostgreSQL user and database...'
    docker-compose -f deployment/docker-compose.production.yml exec postgres psql -U postgres -c \"
        CREATE USER app WITH PASSWORD 'app';
        CREATE DATABASE app OWNER app;
        GRANT ALL PRIVILEGES ON DATABASE app TO app;
    \" || echo 'User and database may already exist'
    
    echo '📋 Step 2: Pushing schema to database...'
    docker-compose -f deployment/docker-compose.production.yml exec web sh -c 'cd apps/web && npx prisma db push'
    
    echo '✅ Database setup completed successfully!'
"

echo "✅ VM database setup completed!"
