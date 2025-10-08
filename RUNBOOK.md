# Customer Search Platform - Runbook

This runbook provides step-by-step instructions for operating and maintaining the Customer Search Platform.

## Table of Contents
1. [Data Ingestion](#data-ingestion)
2. [Database Operations](#database-operations)
3. [OpenSearch Operations](#opensearch-operations)
4. [Backend Updates](#backend-updates)
5. [Frontend Updates](#frontend-updates)

---

## Data Ingestion

### How to Ingest New Data

#### Method 1: Using Docker Compose (Recommended)
```bash
# 1. Place your CSV file in the data/ directory
cp your-customers.csv data/customers.csv

# 2. Restart the ingestor service
docker compose restart ingestor

# 3. Check ingestion logs
docker compose logs -f ingestor
```

#### Method 2: Manual Ingestion
```bash
# 1. Ensure services are running
docker compose up -d postgres opensearch

# 2. Run the ingestor manually (incremental update)
docker compose run --rm ingestor python app.py /data/customers.csv

# 3. Run the ingestor with full data replacement
docker compose run --rm ingestor python app.py /data/customers.csv --clear
```

### Data Management Strategies

#### Option 1: Incremental Updates (Default)
- **Behavior**: Updates existing records, adds new ones, keeps old records
- **Use Case**: When you want to add new customers or update existing ones
- **Command**: `docker compose run --rm ingestor python app.py /data/customers.csv`

#### Option 2: Full Data Replacement
- **Behavior**: Clears all existing data, then ingests new data
- **Use Case**: When you want to completely replace all customer data
- **Command**: `docker compose run --rm ingestor python app.py /data/customers.csv --clear`

#### Option 3: Manual Data Clearing
```bash
# Clear all data from PostgreSQL, OpenSearch, and Redis
docker compose exec postgres psql -U app -d app -c 'DELETE FROM "Customer";'
curl -X POST http://localhost:9200/customers/_delete_by_query -H "Content-Type: application/json" -d '{"query":{"match_all":{}}}'
docker compose exec redis redis-cli FLUSHALL
```

### Automatic Cache Management
The ingestion pipeline now automatically clears the Redis cache after every successful ingestion to ensure users always get fresh data. No manual cache clearing is required.

### CSV Format Requirements
Your CSV file must have the following columns:
```csv
Salutation,First Name,Last Name,Email address,Company,Address,City,State,Country,Zip Code,Phone,Mobile Phone,Industry,Job Title Level,Job Title,Department,Employee Size,Job Title Link,Employee Size Link
Ms.,Laura,Maggioni,laura.maggioni@st.com,Stmicroelectronics,"Via Camillo Olivetti 2",Agrate Brianza,NON US,Italy,20864,393489995537,NA,Semiconductor Manufacturing,Director,"Digital Information Technology | Agrate IT Director",Information Technology,10001+,https://www.linkedin.com/in/laura-maggioni-5103a84/,https://www.linkedin.com/company/stmicroelectronics/about/
```

### How to Verify Ingestion is Completed Correctly

#### 1. Check Ingestor Logs
```bash
# View recent logs
docker compose logs --tail=50 ingestor

# Look for success message like:
# "Ingested X rows from /data/customers.csv"
```

#### 2. Verify Database Records
```bash
# Connect to PostgreSQL and check record count
docker compose exec postgres psql -U app -d app -c "SELECT COUNT(*) FROM \"Customer\";"

# View sample records with new fields
docker compose exec postgres psql -U app -d app -c "SELECT id, \"firstName\", \"lastName\", email, company, industry, \"jobTitle\", department FROM \"Customer\" LIMIT 5;"
```

#### 3. Verify OpenSearch Index
```bash
# Check index exists and document count
curl -s http://localhost:9200/_cat/indices/customers?v

# View sample documents
curl -s http://localhost:9200/customers/_search?size=5 | jq '.hits.hits[]._source'
```

#### 4. Test Search API
```bash
# Test basic search
curl -X POST http://localhost:3000/api/search \
  -H "content-type: application/json" \
  -d '{"filters":{},"page":{"size":5}}'

# Test filtered search by company (exact match)
curl -X POST http://localhost:3000/api/search \
  -H "content-type: application/json" \
  -d '{"filters":{"company":["Stmicroelectronics"]},"page":{"size":5}}'

# Test partial matching (case-insensitive)
curl -X POST http://localhost:3000/api/search \
  -H "content-type: application/json" \
  -d '{"filters":{"department":["Technology"]},"page":{"size":5}}'

curl -X POST http://localhost:3000/api/search \
  -H "content-type: application/json" \
  -d '{"filters":{"company":["Micro"]},"page":{"size":5}}'

curl -X POST http://localhost:3000/api/search \
  -H "content-type: application/json" \
  -d '{"filters":{"industry":["Semi"]},"page":{"size":5}}'

# Test numeric employee size filtering
curl -X POST http://localhost:3000/api/search \
  -H "content-type: application/json" \
  -d '{"filters":{"employeeSize":[10000]},"page":{"size":5}}'

curl -X POST http://localhost:3000/api/search \
  -H "content-type: application/json" \
  -d '{"filters":{"employeeSize":[5000]},"page":{"size":5}}'

# Test filtered search by country
curl -X POST http://localhost:3000/api/search \
  -H "content-type: application/json" \
  -d '{"filters":{"country":["Italy"]},"page":{"size":5}}'

# Test filtered search by industry
curl -X POST http://localhost:3000/api/search \
  -H "content-type: application/json" \
  -d '{"filters":{"industry":["Semiconductor Manufacturing"]},"page":{"size":5}}'
```

---

## Database Operations

### How to Connect to Database

#### Method 1: Using Docker Compose
```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U app -d app

# Connect to Redis
docker compose exec redis redis-cli
```

#### Method 2: External Connection
```bash
# PostgreSQL (from host machine)
psql -h localhost -p 5432 -U app -d app

# Redis (from host machine)
redis-cli -h localhost -p 6379
```

### Database Connection Details
- **PostgreSQL**: `postgresql://app:app@localhost:5432/app`
- **Redis**: `redis://localhost:6379`

### Common Database Queries

#### PostgreSQL Queries

##### Basic Table Information
```sql
-- List all tables in the database
\dt

-- View table schema and structure
\d "Customer"

-- Check total customer count
SELECT COUNT(*) FROM "Customer";

-- View all columns in Customer table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Customer' 
ORDER BY ordinal_position;
```

##### Sample Data Queries
```sql
-- View all customers with new fields
SELECT id, "firstName", "lastName", email, company, industry, "jobTitle", department 
FROM "Customer" 
LIMIT 10;

-- View complete customer record
SELECT * FROM "Customer" LIMIT 5;

-- Check recent updates
SELECT id, "firstName", "lastName", "updatedAt" 
FROM "Customer" 
ORDER BY "updatedAt" DESC 
LIMIT 5;
```

##### Search Queries by New Fields
```sql
-- Search by company
SELECT "firstName", "lastName", email, company, "jobTitle", department 
FROM "Customer" 
WHERE company = 'Stmicroelectronics';

-- Search by country
SELECT "firstName", "lastName", company, country, city, state 
FROM "Customer" 
WHERE country = 'Italy';

-- Search by industry
SELECT "firstName", "lastName", company, industry, "jobTitle" 
FROM "Customer" 
WHERE industry = 'Semiconductor Manufacturing';

-- Search by job title (partial match)
SELECT "firstName", "lastName", company, "jobTitle", department 
FROM "Customer" 
WHERE "jobTitle" LIKE '%Director%';

-- Search by department
SELECT "firstName", "lastName", company, department, "jobTitle" 
FROM "Customer" 
WHERE department = 'Information Technology';

-- Search by employee size
SELECT "firstName", "lastName", company, "employeeSize", industry 
FROM "Customer" 
WHERE "employeeSize" = '10001+';
```

##### Advanced Queries
```sql
-- Find customers by location (country and city)
SELECT "firstName", "lastName", company, country, city, state 
FROM "Customer" 
WHERE country = 'Italy' AND city = 'Agrate Brianza';

-- Find customers with LinkedIn profiles
SELECT "firstName", "lastName", company, "jobTitleLink", "employeeSizeLink" 
FROM "Customer" 
WHERE "jobTitleLink" IS NOT NULL OR "employeeSizeLink" IS NOT NULL;

-- Count customers by country
SELECT country, COUNT(*) as customer_count 
FROM "Customer" 
WHERE country IS NOT NULL 
GROUP BY country 
ORDER BY customer_count DESC;

-- Count customers by industry
SELECT industry, COUNT(*) as customer_count 
FROM "Customer" 
WHERE industry IS NOT NULL 
GROUP BY industry 
ORDER BY customer_count DESC;

-- Count customers by employee size
SELECT "employeeSize", COUNT(*) as customer_count 
FROM "Customer" 
WHERE "employeeSize" IS NOT NULL 
GROUP BY "employeeSize" 
ORDER BY customer_count DESC;

-- Find customers by job title level
SELECT "firstName", "lastName", company, "jobTitleLevel", "jobTitle" 
FROM "Customer" 
WHERE "jobTitleLevel" = 'Director';

-- Search by phone number pattern
SELECT "firstName", "lastName", company, phone, "mobilePhone" 
FROM "Customer" 
WHERE phone LIKE '39%' OR "mobilePhone" LIKE '39%';
```

##### Data Quality and Validation Queries
```sql
-- Find customers with missing email addresses
SELECT id, "firstName", "lastName", company 
FROM "Customer" 
WHERE email IS NULL OR email = '';

-- Find customers with missing company information
SELECT id, "firstName", "lastName", email 
FROM "Customer" 
WHERE company IS NULL OR company = '';

-- Check for duplicate email addresses
SELECT email, COUNT(*) as count 
FROM "Customer" 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Find customers with invalid phone numbers (too short)
SELECT "firstName", "lastName", company, phone 
FROM "Customer" 
WHERE phone IS NOT NULL AND LENGTH(phone) < 10;

-- Check data completeness by field
SELECT 
  COUNT(*) as total_records,
  COUNT("firstName") as has_first_name,
  COUNT("lastName") as has_last_name,
  COUNT(email) as has_email,
  COUNT(company) as has_company,
  COUNT(industry) as has_industry,
  COUNT("jobTitle") as has_job_title,
  COUNT(department) as has_department,
  COUNT(country) as has_country
FROM "Customer";
```

##### Legacy Field Queries (Backward Compatibility)
```sql
-- Search by legacy sector field
SELECT * FROM "Customer" WHERE sector = 'technology';

-- Search by legacy size range
SELECT * FROM "Customer" WHERE size BETWEEN 1000 AND 5000;

-- Search by legacy name field
SELECT * FROM "Customer" WHERE name LIKE '%Laura%';
```

#### Redis Queries
```bash
# List all keys
KEYS *

# Check cache for search results
GET "search:{\"filters\":{},\"pageSize\":20,\"cursor\":null}"

# Clear all cache
FLUSHALL

# Check Redis info
INFO
```

---

## OpenSearch Operations

### Search Features

#### Partial Matching
All search filters support **partial matching** with **case-insensitive** search:
- Search for "Tech" to find "Technology"
- Search for "Micro" to find "Stmicroelectronics"  
- Search for "Semi" to find "Semiconductor Manufacturing"
- Search for "IT" to find "Information Technology"

This makes the search much more user-friendly and forgiving of typos or incomplete entries.

#### Numeric Employee Size Filtering
The **Employee Size** field uses **numeric range filtering**:
- **Input**: Enter a minimum employee count (e.g., 1000)
- **Behavior**: Finds companies with employee size ≥ entered value
- **Examples**: 
  - Enter `1000` → finds companies with 1000+ employees
  - Enter `5000` → finds companies with 5000+ employees
  - Enter `10000` → finds companies with 10000+ employees
- **Data Processing**: Values like "10001+", "50+", "100-500" are automatically converted to numeric values (10001, 50, 100)

### How to Ensure OpenSearch is Working Fine

#### 1. Health Check
```bash
# Check cluster health
curl -s http://localhost:9200/_cluster/health | jq .

# Should return: {"status":"green"}
```

#### 2. Index Operations
```bash
# List all indices
curl -s http://localhost:9200/_cat/indices?v

# Check customers index specifically
curl -s http://localhost:9200/_cat/indices/customers?v

# View index mapping
curl -s http://localhost:9200/customers/_mapping | jq .
```

#### 3. Search Operations
```bash
# Basic search
curl -s http://localhost:9200/customers/_search | jq '.hits.total'

# Search by company
curl -s -H "content-type: application/json" http://localhost:9200/customers/_search \
  -d '{"query":{"term":{"company":"Stmicroelectronics"}}}' | jq '.hits.total'

# Search by country
curl -s -H "content-type: application/json" http://localhost:9200/customers/_search \
  -d '{"query":{"term":{"country":"Italy"}}}' | jq '.hits.total'

# Search by industry
curl -s -H "content-type: application/json" http://localhost:9200/customers/_search \
  -d '{"query":{"term":{"industry":"Semiconductor Manufacturing"}}}' | jq '.hits.total'

# Search by job title (partial match)
curl -s -H "content-type: application/json" http://localhost:9200/customers/_search \
  -d '{"query":{"wildcard":{"jobTitle":"*Director*"}}}' | jq '.hits.total'

# Search by department
curl -s -H "content-type: application/json" http://localhost:9200/customers/_search \
  -d '{"query":{"term":{"department":"Information Technology"}}}' | jq '.hits.total'

# Search by employee size
curl -s -H "content-type: application/json" http://localhost:9200/customers/_search \
  -d '{"query":{"term":{"employeeSize":"10001+"}}}' | jq '.hits.total'

# Legacy: Search by sector
curl -s -H "content-type: application/json" http://localhost:9200/customers/_search \
  -d '{"query":{"term":{"sector":"technology"}}}' | jq '.hits.total'

# Legacy: Search by size range
curl -s -H "content-type: application/json" http://localhost:9200/customers/_search \
  -d '{"query":{"range":{"size":{"gte":1000,"lte":5000}}}}' | jq '.hits.total'
```

### Basic Troubleshooting

#### Common Issues and Solutions

**1. OpenSearch Not Starting**
```bash
# Check container logs
docker compose logs opensearch

# Check if port 9200 is available
lsof -i :9200

# Restart OpenSearch
docker compose restart opensearch
```

**2. Index Not Found**
```bash
# Check if index exists
curl -s http://localhost:9200/_cat/indices/customers

# If missing, re-run ingestion
docker compose restart ingestor
```

**3. Search Returns No Results**
```bash
# Check document count
curl -s http://localhost:9200/customers/_count

# Check sample documents
curl -s http://localhost:9200/customers/_search?size=1 | jq '.hits.hits[0]._source'

# Verify mapping
curl -s http://localhost:9200/customers/_mapping | jq '.customers.mappings.properties'
```

**4. Performance Issues**
```bash
# Check cluster stats
curl -s http://localhost:9200/_cluster/stats | jq .

# Check node stats
curl -s http://localhost:9200/_nodes/stats | jq .
```

---

## Backend Updates

### How to Update Server-Side Code

#### 1. Update Ingestor (Python)
```bash
# 1. Edit the Python code
vim apps/ingestor/app.py

# 2. Rebuild the ingestor image
docker compose build ingestor --no-cache

# 3. Restart the service
docker compose up -d ingestor

# 4. Check logs
docker compose logs -f ingestor
```

#### 2. Update Web API (Node.js/Next.js)
```bash
# 1. Edit the API code
vim apps/web/src/app/api/search/route.ts

# 2. Rebuild the web image
docker compose build web --no-cache

# 3. Restart the service
docker compose up -d web

# 4. Test the API
curl -s http://localhost:3000/api/health
```

#### 3. Update Environment Variables
```bash
# 1. Edit environment files
vim apps/web/.env.local
vim apps/ingestor/.env.local

# 2. Restart affected services
docker compose up -d web ingestor
```

#### 4. Update Dependencies
```bash
# For Python dependencies
vim apps/ingestor/requirements.txt
docker compose build ingestor --no-cache

# For Node.js dependencies
vim apps/web/package.json
docker compose build web --no-cache
```

### Development Workflow
```bash
# 1. Make code changes
# 2. Test locally (optional)
# 3. Rebuild affected services
docker compose build [service-name] --no-cache

# 4. Deploy changes
docker compose up -d [service-name]

# 5. Verify deployment
docker compose logs [service-name]
curl -s http://localhost:3000/api/health
```

---

## Frontend Updates

### How to Update Frontend Code

#### 1. Update React Components
```bash
# 1. Edit the frontend code
vim apps/web/src/app/page.tsx

# 2. Rebuild the web image
docker compose build web --no-cache

# 3. Restart the web service
docker compose up -d web

# 4. Test the UI
open http://localhost:3000/
```

#### 2. Update Styling/CSS
```bash
# 1. Edit styles (inline styles in React components)
vim apps/web/src/app/page.tsx

# 2. Rebuild and restart
docker compose build web --no-cache
docker compose up -d web
```

#### 3. Update Dependencies
```bash
# 1. Edit package.json
vim apps/web/package.json

# 2. Rebuild with new dependencies
docker compose build web --no-cache

# 3. Restart service
docker compose up -d web
```

### Frontend Development Workflow
```bash
# 1. Make UI changes
# 2. Rebuild web service
docker compose build web --no-cache

# 3. Deploy changes
docker compose up -d web

# 4. Test in browser
open http://localhost:3000/

# 5. Check browser console for errors
# (Open Developer Tools -> Console)
```

### Testing Frontend Changes
```bash
# 1. Test basic functionality
curl -s http://localhost:3000/ | grep -i "customer search"

# 2. Test API integration
curl -X POST http://localhost:3000/api/search \
  -H "content-type: application/json" \
  -d '{"filters":{},"page":{"size":1}}'

# 3. Manual UI testing
# - Open http://localhost:3000/
# - Test search form
# - Verify results display
# - Check error handling
```

---

## Quick Reference Commands

### Service Management
```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart specific service
docker compose restart [service-name]

# View logs
docker compose logs -f [service-name]

# Check service status
docker compose ps
```

### Health Checks
```bash
# API health
curl -s http://localhost:3000/api/health

# Database connection
docker compose exec postgres pg_isready -U app -d app

# OpenSearch health
curl -s http://localhost:9200/_cluster/health

# Redis health
docker compose exec redis redis-cli ping
```

### Data Operations
```bash
# Ingest new data
cp new-data.csv data/customers.csv
docker compose restart ingestor

# Clear cache (usually not needed - automatic after ingestion)
docker compose exec redis redis-cli FLUSHALL

# Backup database
docker compose exec postgres pg_dump -U app app > backup.sql
```

### Quick Database Inspection
```bash
# Connect to database interactively
docker compose exec postgres psql -U app -d app

# Quick table overview
docker compose exec postgres psql -U app -d app -c "\dt"

# Check customer table structure
docker compose exec postgres psql -U app -d app -c "\d \"Customer\""

# Count total customers
docker compose exec postgres psql -U app -d app -c "SELECT COUNT(*) FROM \"Customer\";"

# View sample customer data
docker compose exec postgres psql -U app -d app -c "SELECT \"firstName\", \"lastName\", company, industry, country FROM \"Customer\" LIMIT 5;"

# Check data completeness
docker compose exec postgres psql -U app -d app -c "SELECT COUNT(*) as total, COUNT(email) as has_email, COUNT(company) as has_company, COUNT(industry) as has_industry FROM \"Customer\";"
```

---

## Troubleshooting Guide

### Common Issues

1. **Port Conflicts**: If port 3000 is in use, the web service uses port 3001
2. **Memory Issues**: OpenSearch requires at least 1GB RAM
3. **Permission Issues**: Ensure Docker has proper permissions
4. **Network Issues**: Check if all services can communicate

### Log Locations
- **Web API**: `docker compose logs web`
- **Ingestor**: `docker compose logs ingestor`
- **PostgreSQL**: `docker compose logs postgres`
- **OpenSearch**: `docker compose logs opensearch`
- **Redis**: `docker compose logs redis`

### Emergency Procedures
```bash
# Complete restart
docker compose down
docker compose up -d

# Reset all data (WARNING: This deletes all data)
docker compose down -v
docker compose up -d
```

---

## Support

For issues not covered in this runbook:
1. Check service logs: `docker compose logs [service-name]`
2. Verify service health: Use health check commands above
3. Check resource usage: `docker stats`
4. Review configuration files in `apps/` directory
