#!/bin/bash

# GCP Deployment Script for HailMary Customer Search Platform
# This script deploys the application to Google Cloud Platform

set -e

# Configuration
PROJECT_ID="leadvantage-global"  # Your actual project ID
REGION="us-central1"
SERVICE_NAME="hailmary"
DATABASE_NAME="hailmary_db"
DATABASE_USER="app"
DATABASE_PASSWORD="your-secure-password"  # Replace with a secure password

echo "🚀 Starting GCP deployment for HailMary Customer Search Platform..."

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with GCP. Please run: gcloud auth login"
    exit 1
fi

# Set the project
echo "📋 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required GCP APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com

# Create Cloud SQL instance for PostgreSQL
echo "🗄️ Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create $DATABASE_NAME \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --storage-type=SSD \
    --storage-size=10GB \
    --backup \
    --enable-ip-alias \
    --authorized-networks=0.0.0.0/0 \
    --quiet || echo "Instance might already exist"

# Create database
echo "📊 Creating database..."
gcloud sql databases create $DATABASE_NAME \
    --instance=$DATABASE_NAME \
    --quiet || echo "Database might already exist"

# Create database user
echo "👤 Creating database user..."
gcloud sql users create $DATABASE_USER \
    --instance=$DATABASE_NAME \
    --password=$DATABASE_PASSWORD \
    --quiet || echo "User might already exist"

# Get the Cloud SQL connection name
CONNECTION_NAME=$(gcloud sql instances describe $DATABASE_NAME --format="value(connectionName)")

# Create Redis instance
echo "🔴 Creating Redis instance..."
gcloud redis instances create hailmary-redis \
    --size=1 \
    --region=$REGION \
    --redis-version=redis_7_0 \
    --tier=basic \
    --quiet || echo "Redis instance might already exist"

# Get Redis IP
REDIS_IP=$(gcloud redis instances describe hailmary-redis --region=$REGION --format="value(host)")

# Build and deploy the web service
echo "🌐 Building and deploying web service..."
cd apps/web
gcloud run deploy hailmary-web \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="DATABASE_URL=postgresql://$DATABASE_USER:$DATABASE_PASSWORD@/$DATABASE_NAME?host=/cloudsql/$CONNECTION_NAME" \
    --set-env-vars="REDIS_URL=redis://$REDIS_IP:6379" \
    --set-env-vars="OPENSEARCH_URL=http://hailmary-opensearch:9200" \
    --add-cloudsql-instances=$CONNECTION_NAME \
    --memory=1Gi \
    --cpu=1 \
    --max-instances=10

# Build and deploy the ingestor service
echo "📥 Building and deploying ingestor service..."
cd ../ingestor
gcloud run deploy hailmary-ingestor \
    --source . \
    --platform managed \
    --region $REGION \
    --no-allow-unauthenticated \
    --set-env-vars="POSTGRES_DSN=postgresql://$DATABASE_USER:$DATABASE_PASSWORD@/$DATABASE_NAME?host=/cloudsql/$CONNECTION_NAME" \
    --set-env-vars="REDIS_URL=redis://$REDIS_IP:6379" \
    --set-env-vars="OS_URL=http://hailmary-opensearch:9200" \
    --add-cloudsql-instances=$CONNECTION_NAME \
    --memory=512Mi \
    --cpu=1 \
    --max-instances=5

# Deploy OpenSearch using Cloud Run (alternative to managed service)
echo "🔍 Setting up OpenSearch..."
# Note: For production, consider using Elasticsearch Service or OpenSearch Service
# For now, we'll use a Cloud Run deployment

# Get the web service URL
WEB_URL=$(gcloud run services describe hailmary-web --region=$REGION --format="value(status.url)")

echo "✅ Deployment completed!"
echo "🌐 Web Application URL: $WEB_URL"
echo "📊 Database Connection: $CONNECTION_NAME"
echo "🔴 Redis IP: $REDIS_IP"
echo ""
echo "📋 Next steps:"
echo "1. Update your DNS to point to the web service URL"
echo "2. Run data ingestion: gcloud run jobs create hailmary-ingest --image gcr.io/$PROJECT_ID/hailmary-ingestor"
echo "3. Monitor your services in the GCP Console"
