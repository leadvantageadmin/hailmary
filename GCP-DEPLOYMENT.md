# GCP Deployment Guide for HailMary Customer Search Platform

This guide will help you deploy the HailMary Customer Search Platform to Google Cloud Platform.

## Prerequisites

1. **Google Cloud Account**: You need a GCP account with billing enabled
2. **Google Cloud CLI**: Install and authenticate with `gcloud auth login`
3. **Docker**: For building container images
4. **Git**: For version control

## Quick Start

### 1. Set Up Your GCP Project

```bash
# Create a new GCP project (or use existing)
gcloud projects create your-project-id --name="HailMary Customer Search"

# Set the project
gcloud config set project your-project-id

# Enable billing (required for Cloud SQL and other services)
# Go to: https://console.cloud.google.com/billing
```

### 2. Configure the Deployment Script

Edit `gcp-deploy.sh` and update these variables:

```bash
PROJECT_ID="your-actual-project-id"
DATABASE_PASSWORD="your-secure-password"
```

### 3. Run the Deployment

```bash
# Make the script executable (already done)
chmod +x gcp-deploy.sh

# Run the deployment
./gcp-deploy.sh
```

## Manual Deployment Steps

If you prefer to deploy manually, follow these steps:

### 1. Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
```

### 2. Create Cloud SQL PostgreSQL Instance

```bash
gcloud sql instances create hailmary-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --storage-type=SSD \
    --storage-size=10GB \
    --backup \
    --enable-ip-alias \
    --authorized-networks=0.0.0.0/0
```

### 3. Create Database and User

```bash
# Create database
gcloud sql databases create hailmary_db --instance=hailmary-db

# Create user
gcloud sql users create app --instance=hailmary-db --password=your-secure-password
```

### 4. Create Redis Instance

```bash
gcloud redis instances create hailmary-redis \
    --size=1 \
    --region=us-central1 \
    --redis-version=redis_7_0 \
    --tier=basic
```

### 5. Deploy Services to Cloud Run

```bash
# Deploy web service
cd apps/web
gcloud run deploy hailmary-web \
    --source . \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --memory=1Gi \
    --cpu=1 \
    --max-instances=10

# Deploy ingestor service
cd ../ingestor
gcloud run deploy hailmary-ingestor \
    --source . \
    --platform managed \
    --region us-central1 \
    --no-allow-unauthenticated \
    --memory=512Mi \
    --cpu=1 \
    --max-instances=5
```

## Environment Variables

Set these environment variables in Cloud Run:

### Web Service
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `OPENSEARCH_URL`: OpenSearch connection string
- `NODE_ENV`: production

### Ingestor Service
- `POSTGRES_DSN`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `OS_URL`: OpenSearch connection string

## Data Ingestion

After deployment, ingest your data:

```bash
# Create a Cloud Run job for data ingestion
gcloud run jobs create hailmary-ingest \
    --image gcr.io/your-project-id/hailmary-ingestor \
    --region us-central1 \
    --set-env-vars="POSTGRES_DSN=your-database-url" \
    --set-env-vars="OS_URL=your-opensearch-url" \
    --set-env-vars="REDIS_URL=your-redis-url"

# Execute the job
gcloud run jobs execute hailmary-ingest --region us-central1
```

## Monitoring and Logs

- **Cloud Run Console**: https://console.cloud.google.com/run
- **Cloud SQL Console**: https://console.cloud.google.com/sql
- **Cloud Logging**: https://console.cloud.google.com/logs
- **Cloud Monitoring**: https://console.cloud.google.com/monitoring

## Cost Optimization

### Development/Testing
- Use `db-f1-micro` for Cloud SQL
- Use `basic` tier for Redis
- Set low max instances for Cloud Run

### Production
- Use `db-g1-small` or higher for Cloud SQL
- Use `standard_ha` tier for Redis
- Set appropriate max instances based on traffic
- Enable auto-scaling

## Security Considerations

1. **Database Security**:
   - Use strong passwords
   - Enable SSL connections
   - Restrict authorized networks

2. **Service Security**:
   - Use IAM roles and service accounts
   - Enable VPC connector for private networking
   - Use Cloud Armor for DDoS protection

3. **Data Security**:
   - Enable encryption at rest
   - Use Cloud KMS for key management
   - Regular security updates

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Check Cloud SQL instance status
   - Verify connection string format
   - Ensure authorized networks are configured

2. **Service Deployment Issues**:
   - Check Cloud Build logs
   - Verify environment variables
   - Ensure sufficient quotas

3. **Performance Issues**:
   - Monitor Cloud Run metrics
   - Check database performance
   - Optimize container resources

### Useful Commands

```bash
# Check service status
gcloud run services list --region us-central1

# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Check database status
gcloud sql instances describe hailmary-db

# Monitor costs
gcloud billing budgets list
```

## Support

- **GCP Documentation**: https://cloud.google.com/docs
- **Cloud Run Documentation**: https://cloud.google.com/run/docs
- **Cloud SQL Documentation**: https://cloud.google.com/sql/docs
- **Community Support**: https://cloud.google.com/community
