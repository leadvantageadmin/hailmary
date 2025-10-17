import os
import json
import requests
from typing import List, Dict, Any
import pandas as pd
from opensearchpy import OpenSearch, helpers
import redis
import psycopg
from psycopg import sql
from fuzzy_standardizer import standardize_customer_data_fuzzy

# Environment variables
WEB_API_URL = os.getenv("WEB_API_URL", "http://web:3000")
POSTGRES_DSN = os.getenv("DATABASE_URL", "postgresql://app:app@postgres:5432/app")
OS_URL = os.getenv("OPENSEARCH_URL", "http://opensearch:9200")
OS_INDEX = os.getenv("OPENSEARCH_INDEX", "customers")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

def parse_employee_size(employee_size_str: str) -> tuple[int | None, int | None]:
    """
    Parse employee size string and convert to min/max numeric values.
    Examples: 
    - "50+" -> (50, None)
    - "1000+" -> (1000, None) 
    - "100-500" -> (100, 500)
    - "100 - 500" -> (100, 500)
    - "1000 to 5000" -> (1000, 5000)
    - "10001+" -> (10001, None)
    - "1000" -> (1000, None)
    """
    if not employee_size_str or pd.isna(employee_size_str):
        return None, None
    
    # Convert to string and strip whitespace
    size_str = str(employee_size_str).strip()
    
    # Handle ranges with "to" keyword like "1000 to 5000"
    if ' to ' in size_str.lower():
        try:
            parts = size_str.lower().split(' to ')
            min_size = int(parts[0].strip())
            max_size = int(parts[1].strip())
            return min_size, max_size
        except (ValueError, IndexError):
            return None, None
    
    # Handle ranges with dash like "100-500" or "100 - 500"
    if '-' in size_str:
        try:
            parts = size_str.split('-')
            min_size = int(parts[0].strip())
            max_size = int(parts[1].strip())
            return min_size, max_size
        except (ValueError, IndexError):
            return None, None
    
    # Handle values with + like "50+", "1000+"
    if '+' in size_str:
        try:
            min_size = int(size_str.replace('+', '').strip())
            return min_size, None  # No upper bound for "+" values
        except ValueError:
            return None, None
    
    # Handle plain numbers - treat as minimum value (no upper bound)
    try:
        min_size = int(size_str)
        return min_size, None
    except ValueError:
        return None, None


def ensure_index(client: OpenSearch):
    if not client.indices.exists(index=OS_INDEX):
        client.indices.create(index=OS_INDEX, body={
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "salutation": {"type": "text", "analyzer": "standard"},
                    "firstName": {"type": "text", "analyzer": "standard"},
                    "lastName": {"type": "text", "analyzer": "standard"},
                    "email": {"type": "keyword"},
                    "company": {"type": "text", "analyzer": "standard"},
                    "address": {"type": "text", "analyzer": "standard"},
                    "city": {"type": "text", "analyzer": "standard"},
                    "state": {"type": "text", "analyzer": "standard"},
                    "country": {"type": "text", "analyzer": "standard"},
                    "zipCode": {"type": "keyword"},
                    "phone": {"type": "keyword"},
                    "mobilePhone": {"type": "keyword"},
                    "industry": {"type": "text", "analyzer": "standard"},
                    "jobTitleLevel": {"type": "text", "analyzer": "standard"},
                    "jobTitle": {"type": "text", "analyzer": "standard"},
                    "department": {"type": "text", "analyzer": "standard"},
                    "minEmployeeSize": {"type": "integer"},
                    "maxEmployeeSize": {"type": "integer"},
                    "jobTitleLink": {"type": "keyword"},
                    "employeeSizeLink": {"type": "keyword"},
                    "externalSource": {"type": "keyword"},
                    "externalId": {"type": "keyword"}
                }
            }
        })


def bulk_import_to_postgres_fast(customers_data: List[Dict[str, Any]], clear_existing: bool = False):
    """Fast bulk import using raw SQL - optimized for large datasets"""
    try:
        with psycopg.connect(POSTGRES_DSN) as conn:
            with conn.cursor() as cur:
                # Clear existing data if requested
                if clear_existing:
                    cur.execute('DELETE FROM "Customer"')
                    print("✅ Cleared existing PostgreSQL data")
                
                # Prepare data for bulk insert
                insert_data = []
                for customer in customers_data:
                    insert_data.append((
                        customer["id"],
                        customer.get("salutation"),
                        customer.get("firstName"),
                        customer.get("lastName"),
                        customer.get("email"),
                        customer.get("company"),
                        customer.get("address"),
                        customer.get("city"),
                        customer.get("state"),
                        customer.get("country"),
                        customer.get("zipCode"),
                        customer.get("phone"),
                        customer.get("mobilePhone"),
                        customer.get("industry"),
                        customer.get("jobTitleLevel"),
                        customer.get("jobTitle"),
                        customer.get("department"),
                        customer.get("minEmployeeSize"),
                        customer.get("maxEmployeeSize"),
                        customer.get("jobTitleLink"),
                        customer.get("employeeSizeLink"),
                        customer["externalSource"],
                        customer["externalId"],
                        # New standardized fields
                        customer.get("countryCode"),
                        customer.get("stateCode"),
                        customer.get("cityCode"),
                        customer.get("countryDisplay"),
                        customer.get("stateDisplay"),
                        customer.get("cityDisplay")
                    ))
                
                # Bulk insert with conflict resolution
                cur.executemany("""
                    INSERT INTO "Customer" (
                        id, salutation, "firstName", "lastName", email, company, address, city, state, country, 
                        "zipCode", phone, "mobilePhone", industry, "jobTitleLevel", "jobTitle", department, 
                        "minEmployeeSize", "maxEmployeeSize", "jobTitleLink", "employeeSizeLink", "externalSource", "externalId", 
                        country_code, state_code, city_code, country_display, state_display, city_display, "updatedAt"
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT ("externalSource", "externalId") DO UPDATE SET
                        salutation = EXCLUDED.salutation,
                        "firstName" = EXCLUDED."firstName",
                        "lastName" = EXCLUDED."lastName",
                        email = EXCLUDED.email,
                        company = EXCLUDED.company,
                        address = EXCLUDED.address,
                        city = EXCLUDED.city,
                        state = EXCLUDED.state,
                        country = EXCLUDED.country,
                        "zipCode" = EXCLUDED."zipCode",
                        phone = EXCLUDED.phone,
                        "mobilePhone" = EXCLUDED."mobilePhone",
                        industry = EXCLUDED.industry,
                        "jobTitleLevel" = EXCLUDED."jobTitleLevel",
                        "jobTitle" = EXCLUDED."jobTitle",
                        department = EXCLUDED.department,
                        "minEmployeeSize" = EXCLUDED."minEmployeeSize",
                        "maxEmployeeSize" = EXCLUDED."maxEmployeeSize",
                        "jobTitleLink" = EXCLUDED."jobTitleLink",
                        "employeeSizeLink" = EXCLUDED."employeeSizeLink",
                        country_code = EXCLUDED.country_code,
                        state_code = EXCLUDED.state_code,
                        city_code = EXCLUDED.city_code,
                        country_display = EXCLUDED.country_display,
                        state_display = EXCLUDED.state_display,
                        city_display = EXCLUDED.city_display,
                        "updatedAt" = NOW()
                """, insert_data)
                
                conn.commit()
                print(f"✅ Successfully imported {len(customers_data)} customers to PostgreSQL")
                return True
                
    except Exception as e:
        print(f"❌ Error importing to PostgreSQL: {e}")
        return False


def bulk_import_to_postgres_api(customers_data: List[Dict[str, Any]], clear_existing: bool = False):
    """Import via web API - slower but uses Prisma (for small datasets)"""
    try:
        response = requests.post(
            f"{WEB_API_URL}/api/bulk-import",
            json={
                "customers": customers_data,
                "clearExisting": clear_existing
            },
            headers={"Content-Type": "application/json"},
            timeout=300
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ PostgreSQL import: {result['message']}")
            return True
        else:
            print(f"❌ PostgreSQL import failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error importing to PostgreSQL: {e}")
        return False


def bulk_copy_postgres(customers_data: List[Dict[str, Any]], clear_existing: bool = False):
    """Ultra-fast import using PostgreSQL COPY - for million+ records"""
    try:
        with psycopg.connect(POSTGRES_DSN) as conn:
            with conn.cursor() as cur:
                # Clear existing data if requested
                if clear_existing:
                    cur.execute('DELETE FROM "Customer"')
                    print("✅ Cleared existing PostgreSQL data")
                
                # Create temporary table with same structure
                cur.execute("""
                    CREATE TEMP TABLE temp_customers (
                        id text,
                        salutation text,
                        "firstName" text,
                        "lastName" text,
                        email text,
                        company text,
                        address text,
                        city text,
                        state text,
                        country text,
                        "zipCode" text,
                        phone text,
                        "mobilePhone" text,
                        industry text,
                        "jobTitleLevel" text,
                        "jobTitle" text,
                        department text,
                        "minEmployeeSize" integer,
                        "maxEmployeeSize" integer,
                        "jobTitleLink" text,
                        "employeeSizeLink" text,
                        "externalSource" text,
                        "externalId" text
                    )
                """)
                
                # Prepare data for COPY
                copy_data = []
                for customer in customers_data:
                    copy_data.append((
                        customer["id"],
                        customer.get("salutation"),
                        customer.get("firstName"),
                        customer.get("lastName"),
                        customer.get("email"),
                        customer.get("company"),
                        customer.get("address"),
                        customer.get("city"),
                        customer.get("state"),
                        customer.get("country"),
                        customer.get("zipCode"),
                        customer.get("phone"),
                        customer.get("mobilePhone"),
                        customer.get("industry"),
                        customer.get("jobTitleLevel"),
                        customer.get("jobTitle"),
                        customer.get("department"),
                        customer.get("minEmployeeSize"),
                        customer.get("maxEmployeeSize"),
                        customer.get("jobTitleLink"),
                        customer.get("employeeSizeLink"),
                        customer["externalSource"],
                        customer["externalId"]
                    ))
                
                # Use COPY for ultra-fast bulk insert
                cur.copy_records_to_table('temp_customers', copy_data)
                print(f"✅ Copied {len(customers_data)} records to temporary table")
                
                # Merge with main table using UPSERT
                cur.execute("""
                    INSERT INTO "Customer" (
                        id, salutation, "firstName", "lastName", email, company, address, city, state, country, 
                        "zipCode", phone, "mobilePhone", industry, "jobTitleLevel", "jobTitle", department, 
                        "minEmployeeSize", "maxEmployeeSize", "jobTitleLink", "employeeSizeLink", "externalSource", "externalId"
                    )
                    SELECT * FROM temp_customers
                    ON CONFLICT ("externalSource", "externalId") DO UPDATE SET
                        salutation = EXCLUDED.salutation,
                        "firstName" = EXCLUDED."firstName",
                        "lastName" = EXCLUDED."lastName",
                        email = EXCLUDED.email,
                        company = EXCLUDED.company,
                        address = EXCLUDED.address,
                        city = EXCLUDED.city,
                        state = EXCLUDED.state,
                        country = EXCLUDED.country,
                        "zipCode" = EXCLUDED."zipCode",
                        phone = EXCLUDED.phone,
                        "mobilePhone" = EXCLUDED."mobilePhone",
                        industry = EXCLUDED.industry,
                        "jobTitleLevel" = EXCLUDED."jobTitleLevel",
                        "jobTitle" = EXCLUDED."jobTitle",
                        department = EXCLUDED.department,
                        "minEmployeeSize" = EXCLUDED."minEmployeeSize",
                        "maxEmployeeSize" = EXCLUDED."maxEmployeeSize",
                        "jobTitleLink" = EXCLUDED."jobTitleLink",
                        "employeeSizeLink" = EXCLUDED."employeeSizeLink",
                        "updatedAt" = NOW()
                """)
                
                conn.commit()
                print(f"✅ Successfully imported {len(customers_data)} customers to PostgreSQL using COPY")
                return True
                
    except Exception as e:
        print(f"❌ Error importing to PostgreSQL with COPY: {e}")
        return False


def bulk_index_os(client: OpenSearch, customers_data: List[Dict[str, Any]]):
    """Bulk index customers to OpenSearch"""
    actions = []
    for customer in customers_data:
        actions.append({
            "_index": OS_INDEX,
            "_id": customer["id"],
            "_source": customer
        })
    
    if actions:
        helpers.bulk(client, actions)


def clear_redis_cache():
    """Clear Redis cache"""
    try:
        r = redis.from_url(REDIS_URL)
        r.flushall()
        print("✅ Redis cache cleared")
    except Exception as e:
        print(f"⚠️  Warning: Could not clear Redis cache: {e}")


def run_from_csv(csv_path: str, clear_existing: bool = False, separator: str = None):
    """Main function to process CSV and ingest data"""
    print(f"📊 Processing CSV file: {csv_path}")
    
    # Auto-detect separator if not provided
    if separator is None:
        # Read first few lines to detect separator
        with open(csv_path, 'r', encoding='utf-8') as f:
            first_line = f.readline().strip()
            semicolon_count = first_line.count(';')
            comma_count = first_line.count(',')
            if ';' in first_line and semicolon_count > comma_count:
                separator = ';'
                print("🔍 Auto-detected semicolon (;) as separator")
            else:
                separator = ','
                print("🔍 Auto-detected comma (,) as separator")
    
    # Read CSV with detected or specified separator
    df = pd.read_csv(csv_path, sep=separator)
    print(f"📋 Found {len(df)} rows in CSV")
    
    # Clear existing data if requested
    if clear_existing:
        print("🗑️  Clearing existing data...")
        
        # Clear OpenSearch
        client = OpenSearch(OS_URL)
        if client.indices.exists(index=OS_INDEX):
            client.indices.delete(index=OS_INDEX)
            print("✅ OpenSearch index cleared")
        
        # Clear Redis
        clear_redis_cache()
    
    # Process CSV data
    customers_data = []
    for index, row in df.iterrows():
        # Generate unique ID
        customer_id = str(row.get("Email address", f"customer_{index}")).strip()
        if not customer_id or customer_id == "nan":
            customer_id = f"customer_{index}"
        
        # Parse employee size
        min_size, max_size = parse_employee_size(row.get("Employee Size"))
        
        # Build customer data - convert empty strings to None for proper null handling
        def clean_value(value):
            if pd.isna(value) or value == "" or str(value).strip() == "":
                return None
            return str(value).strip()
        
        # Combine Address Line 1 and Address Line 2
        address_line1 = clean_value(row.get("Address Line 1"))
        address_line2 = clean_value(row.get("Address Line 2"))
        full_address = None
        if address_line1 and address_line2:
            full_address = f"{address_line1} {address_line2}"
        elif address_line1:
            full_address = address_line1
        elif address_line2:
            full_address = address_line2
        
        customer_data = {
            "id": customer_id,
            "salutation": clean_value(row.get("Salutation")),
            "firstName": clean_value(row.get("First Name")),
            "lastName": clean_value(row.get("Last Name")),
            "email": clean_value(row.get("Email address")),
            "company": clean_value(row.get("Company")),
            "address": full_address,
            "city": clean_value(row.get("City")),
            "state": clean_value(row.get("State")),
            "country": clean_value(row.get("Country")),
            "zipCode": clean_value(row.get("Zip/Postal code")),
            "phone": clean_value(row.get("Phone")),
            "mobilePhone": clean_value(row.get("Mobile Phone (optional)")),
            "industry": clean_value(row.get("Industry")),
            "jobTitleLevel": clean_value(row.get("Job Title Level")),
            "jobTitle": clean_value(row.get("Job Title")),
            "department": clean_value(row.get("Department")),
            "minEmployeeSize": min_size,
            "maxEmployeeSize": max_size,
            "jobTitleLink": clean_value(row.get("Job Title Link")),
            "employeeSizeLink": clean_value(row.get("Employee size link")),
            "externalSource": "csv",
            "externalId": customer_id
        }
        
        # Apply fuzzy location standardization
        customer_data = standardize_customer_data_fuzzy(customer_data)
        
        customers_data.append(customer_data)
    
    print(f"🔄 Processing {len(customers_data)} customers...")
    
    # Choose import method based on dataset size
    # Future: For 1M+ records, use bulk_copy_postgres() for ultra-fast COPY operations
    if len(customers_data) > 1000:
        print("🚀 Using fast bulk import (raw SQL) for large dataset...")
        postgres_success = bulk_import_to_postgres_fast(customers_data, clear_existing)
    else:
        print("🌐 Using API import (Prisma) for small dataset...")
        postgres_success = bulk_import_to_postgres_api(customers_data, clear_existing)
    
    if not postgres_success:
        print("❌ PostgreSQL import failed, aborting...")
        return False
    
    # Index to OpenSearch
    print("🔍 Indexing to OpenSearch...")
    client = OpenSearch(OS_URL)
    ensure_index(client)
    bulk_index_os(client, customers_data)
    print(f"✅ Successfully indexed {len(customers_data)} customers to OpenSearch")
    
    # Print standardization performance report
    from fuzzy_standardizer import fuzzy_standardizer
    fuzzy_standardizer.print_performance_report()
    
    print("🎉 Data ingestion completed successfully!")
    return True


if __name__ == "__main__":
    import sys
    
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "/data/customers.csv"
    clear_existing = "--clear" in sys.argv
    
    # Check for separator argument
    separator = None
    if "--separator" in sys.argv:
        try:
            sep_index = sys.argv.index("--separator")
            if sep_index + 1 < len(sys.argv):
                separator = sys.argv[sep_index + 1]
        except (ValueError, IndexError):
            pass
    
    print("🚀 Starting HailMary Data Ingestion...")
    print(f"📁 CSV Path: {csv_path}")
    print(f"🗑️  Clear Existing: {clear_existing}")
    if separator:
        print(f"🔧 Separator: {separator}")
    print("-" * 50)
    
    try:
        success = run_from_csv(csv_path, clear_existing, separator)
        if not success:
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error during ingestion: {e}")
        sys.exit(1)