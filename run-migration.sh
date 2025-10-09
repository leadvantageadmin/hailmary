#!/bin/bash

# Run database migration on the VM
echo "Running database migration..."

gcloud compute ssh hail-mary --zone=asia-south1-c --command="
cd /home/pmomale2024/hailmary

# Create a temporary container to run the migration
docker run --rm \
  --network hailmary_app-network \
  -e DATABASE_URL='postgresql://postgres:password@postgres:5432/hailmary' \
  -v \$(pwd)/apps/web/prisma:/app/prisma \
  -v \$(pwd)/apps/web/node_modules:/app/node_modules \
  -w /app \
  node:18-alpine \
  sh -c '
    npm install -g prisma@5.20.0
    npx prisma migrate deploy
  '
"

echo "Migration completed!"
