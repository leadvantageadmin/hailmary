#!/bin/bash

# Initialize admin user on the VM
echo "Initializing admin user..."

gcloud compute ssh hail-mary --zone=asia-south1-c --command="
cd /home/pmomale2024/hailmary

# Create a temporary container to run the admin initialization
docker run --rm \
  --network hailmary_app-network \
  -e DATABASE_URL='postgresql://postgres:password@postgres:5432/hailmary' \
  -e JWT_SECRET='your-super-secret-jwt-key-change-in-production' \
  -v \$(pwd)/apps/web/src:/app/src \
  -v \$(pwd)/apps/web/node_modules:/app/node_modules \
  -v \$(pwd)/apps/web/prisma:/app/prisma \
  -w /app \
  node:18-alpine \
  sh -c '
    npm install -g prisma@5.20.0 tsx@4.20.6
    npx prisma generate
    npx tsx src/scripts/init-admin.ts
  '
"

echo "Admin user initialization completed!"
