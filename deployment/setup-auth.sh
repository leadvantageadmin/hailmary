#!/bin/bash

# Setup authentication system on the VM
echo "Setting up authentication system..."

gcloud compute ssh hail-mary --zone=asia-south1-c --command="
cd /home/pmomale2024/hailmary

# Copy the SQL file to the VM
cat > create-user-table.sql << 'EOF'
-- Create UserRole enum
CREATE TYPE \"UserRole\" AS ENUM ('ADMIN', 'USER');

-- Create User table
CREATE TABLE \"User\" (
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

-- Create indexes
CREATE UNIQUE INDEX \"User_email_key\" ON \"User\"(\"email\");
CREATE INDEX \"User_email_idx\" ON \"User\"(\"email\");
CREATE INDEX \"User_role_idx\" ON \"User\"(\"role\");

-- Create initial admin user
INSERT INTO \"User\" (\"id\", \"email\", \"password\", \"firstName\", \"lastName\", \"role\", \"isActive\", \"createdAt\", \"updatedAt\")
VALUES (
    'admin-001',
    'admin@leadvantageglobal.com',
    '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', -- admin123
    'Admin',
    'User',
    'ADMIN',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
EOF

# Run the SQL script
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d hailmary -f /tmp/create-user-table.sql || {
  echo 'Running SQL directly...'
  docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d hailmary << 'SQL'
-- Create UserRole enum
CREATE TYPE \"UserRole\" AS ENUM ('ADMIN', 'USER');

-- Create User table
CREATE TABLE \"User\" (
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

-- Create indexes
CREATE UNIQUE INDEX \"User_email_key\" ON \"User\"(\"email\");
CREATE INDEX \"User_email_idx\" ON \"User\"(\"email\");
CREATE INDEX \"User_role_idx\" ON \"User\"(\"role\");

-- Create initial admin user
INSERT INTO \"User\" (\"id\", \"email\", \"password\", \"firstName\", \"lastName\", \"role\", \"isActive\", \"createdAt\", \"updatedAt\")
VALUES (
    'admin-001',
    'admin@leadvantageglobal.com',
    '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K',
    'Admin',
    'User',
    'ADMIN',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
SQL
}

echo 'Authentication setup completed!'
"

echo "Authentication system setup completed!"
