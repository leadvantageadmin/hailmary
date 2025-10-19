"""
Database operations for HailMary Data Ingestion
Contains functions for PostgreSQL, OpenSearch, and Redis operations
"""

import os
import psycopg
from typing import List, Dict, Any
from opensearchpy import OpenSearch, helpers
import redis


# Environment variables
POSTGRES_DSN = os.getenv("DATABASE_URL", "postgresql://app:app@postgres:5432/app")
OS_URL = os.getenv("OPENSEARCH_URL", "http://opensearch:9200")
OS_INDEX = os.getenv("OPENSEARCH_INDEX", "customers")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")


def bulk_import_customers_fast(customers_data: List[Dict[str, Any]], clear_existing: bool = False) -> bool:
    """
    Fast bulk import to Customer table using raw SQL - optimized for large datasets.
    """
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
                        customer.get("revenue"),
                        customer["externalSource"],
                        customer["externalId"]
                    ))
                
                # Bulk insert with conflict resolution
                cur.executemany("""
                    INSERT INTO "Customer" (
                        id, salutation, "firstName", "lastName", email, company, address, city, state, country, 
                        "zipCode", phone, "mobilePhone", industry, "jobTitleLevel", "jobTitle", department, 
                        "minEmployeeSize", "maxEmployeeSize", "jobTitleLink", "employeeSizeLink", revenue, "externalSource", "externalId", "updatedAt"
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
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
                        revenue = EXCLUDED.revenue,
                        "updatedAt" = NOW()
                """, insert_data)
                
                conn.commit()
                print(f"✅ Successfully imported {len(customers_data)} customers to PostgreSQL")
                return True
                
    except Exception as e:
        print(f"❌ Error importing to PostgreSQL: {e}")
        return False


def bulk_import_company_prospect_fast(customers_data: List[Dict[str, Any]], clear_existing: bool = False) -> bool:
    """
    Fast bulk import to Company and Prospect tables - optimized for large datasets.
    """
    try:
        from lib.utils import process_company_prospect_data
        
        with psycopg.connect(POSTGRES_DSN) as conn:
            with conn.cursor() as cur:
                # Clear existing data if requested
                if clear_existing:
                    cur.execute('DELETE FROM "Prospect"')
                    cur.execute('DELETE FROM "Company"')
                    print("✅ Cleared existing Company and Prospect data")
                
                # Process customer data into company and prospect structures
                companies_data, prospects_data = process_company_prospect_data(customers_data)
                
                # Bulk insert companies
                if companies_data:
                    company_insert_data = []
                    for company in companies_data.values():
                        company_insert_data.append((
                            company["id"],
                            company["domain"],
                            company["name"],
                            company["industry"],
                            company["minEmployeeSize"],
                            company["maxEmployeeSize"],
                            company["employeeSizeLink"],
                            company["revenue"],
                            company["address"],
                            company["city"],
                            company["state"],
                            company["country"],
                            company["zipCode"],
                            company["phone"],
                            company["mobilePhone"],
                            company["externalSource"],
                            company["externalId"]
                        ))
                    
                    cur.executemany("""
                        INSERT INTO "Company" (
                            id, domain, name, industry, "minEmployeeSize", "maxEmployeeSize", "employeeSizeLink", 
                            revenue, address, city, state, country, "zipCode", phone, "mobilePhone", 
                            "externalSource", "externalId", "createdAt", "updatedAt"
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                        ON CONFLICT (domain) DO UPDATE SET
                            name = EXCLUDED.name,
                            industry = EXCLUDED.industry,
                            "minEmployeeSize" = EXCLUDED."minEmployeeSize",
                            "maxEmployeeSize" = EXCLUDED."maxEmployeeSize",
                            "employeeSizeLink" = EXCLUDED."employeeSizeLink",
                            revenue = EXCLUDED.revenue,
                            address = EXCLUDED.address,
                            city = EXCLUDED.city,
                            state = EXCLUDED.state,
                            country = EXCLUDED.country,
                            "zipCode" = EXCLUDED."zipCode",
                            phone = EXCLUDED.phone,
                            "mobilePhone" = EXCLUDED."mobilePhone",
                            "updatedAt" = NOW()
                    """, company_insert_data)
                    
                    print(f"✅ Successfully imported {len(companies_data)} companies to PostgreSQL")
                
                # Bulk insert prospects
                if prospects_data:
                    prospect_insert_data = []
                    for prospect in prospects_data:
                        prospect_insert_data.append((
                            prospect["id"],
                            prospect["salutation"],
                            prospect["firstName"],
                            prospect["lastName"],
                            prospect["email"],
                            prospect["jobTitle"],
                            prospect["jobTitleLevel"],
                            prospect["department"],
                            prospect["jobTitleLink"],
                            prospect["address"],
                            prospect["city"],
                            prospect["state"],
                            prospect["country"],
                            prospect["zipCode"],
                            prospect["phone"],
                            prospect["mobilePhone"],
                            prospect["companyId"],
                            prospect["externalSource"],
                            prospect["externalId"]
                        ))
                    
                    cur.executemany("""
                        INSERT INTO "Prospect" (
                            id, salutation, "firstName", "lastName", email, "jobTitle", "jobTitleLevel", 
                            department, "jobTitleLink", address, city, state, country, "zipCode", 
                            phone, "mobilePhone", "companyId", "externalSource", "externalId", "createdAt", "updatedAt"
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                        ON CONFLICT ("externalSource", "externalId") DO UPDATE SET
                            salutation = EXCLUDED.salutation,
                            "firstName" = EXCLUDED."firstName",
                            "lastName" = EXCLUDED."lastName",
                            email = EXCLUDED.email,
                            "jobTitle" = EXCLUDED."jobTitle",
                            "jobTitleLevel" = EXCLUDED."jobTitleLevel",
                            department = EXCLUDED.department,
                            "jobTitleLink" = EXCLUDED."jobTitleLink",
                            address = EXCLUDED.address,
                            city = EXCLUDED.city,
                            state = EXCLUDED.state,
                            country = EXCLUDED.country,
                            "zipCode" = EXCLUDED."zipCode",
                            phone = EXCLUDED.phone,
                            "mobilePhone" = EXCLUDED."mobilePhone",
                            "companyId" = EXCLUDED."companyId",
                            "updatedAt" = NOW()
                    """, prospect_insert_data)
                    
                    print(f"✅ Successfully imported {len(prospects_data)} prospects to PostgreSQL")
                
                conn.commit()
                return True
                
    except Exception as e:
        print(f"❌ Error importing Company/Prospect data to PostgreSQL: {e}")
        return False


def refresh_materialized_views_after_import() -> bool:
    """
    Refresh materialized views after successful data ingestion.
    """
    try:
        print("🔄 Refreshing materialized views after data ingestion...")
        
        with psycopg.connect(POSTGRES_DSN) as conn:
            with conn.cursor() as cur:
                # Call the safe refresh function
                cur.execute("SELECT refresh_materialized_views_safe();")
                result = cur.fetchone()
                
                if result and result[0] is None:  # Function completed successfully
                    print("✅ Materialized views refreshed successfully")
                    return True
                else:
                    print("⚠️ Materialized view refresh completed with warnings")
                    return True
                    
    except Exception as e:
        print(f"⚠️ Warning: Failed to refresh materialized views: {e}")
        # Log the error to the database if possible
        try:
            with psycopg.connect(POSTGRES_DSN) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO materialized_view_errors (view_name, error_message) 
                        VALUES ('post_ingestion_refresh', %s)
                    """, (str(e),))
        except:
            pass  # Don't fail the entire ingestion for logging errors
        
        # Don't fail the entire ingestion for view refresh issues
        return True


def ensure_opensearch_index(client: OpenSearch) -> None:
    """
    Ensure OpenSearch index exists with proper mapping.
    """
    if not client.indices.exists(index=OS_INDEX):
        mapping = {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "salutation": {"type": "text"},
                    "firstName": {"type": "text"},
                    "lastName": {"type": "text"},
                    "email": {"type": "keyword"},
                    "company": {"type": "text"},
                    "address": {"type": "text"},
                    "city": {"type": "keyword"},
                    "state": {"type": "keyword"},
                    "country": {"type": "keyword"},
                    "zipCode": {"type": "keyword"},
                    "phone": {"type": "keyword"},
                    "mobilePhone": {"type": "keyword"},
                    "industry": {"type": "keyword"},
                    "jobTitleLevel": {"type": "keyword"},
                    "jobTitle": {"type": "text"},
                    "department": {"type": "keyword"},
                    "minEmployeeSize": {"type": "integer"},
                    "maxEmployeeSize": {"type": "integer"},
                    "jobTitleLink": {"type": "keyword"},
                    "employeeSizeLink": {"type": "keyword"},
                    "revenue": {"type": "long"},
                    "externalSource": {"type": "keyword"},
                    "externalId": {"type": "keyword"},
                    "createdAt": {"type": "date"},
                    "updatedAt": {"type": "date"}
                }
            }
        }
        client.indices.create(index=OS_INDEX, body=mapping)
        print(f"✅ Created OpenSearch index: {OS_INDEX}")


def bulk_index_to_opensearch(client: OpenSearch, customers_data: List[Dict[str, Any]]) -> None:
    """
    Bulk index customer data to OpenSearch.
    """
    def generate_actions():
        for customer in customers_data:
            yield {
                "_index": OS_INDEX,
                "_id": customer["id"],
                "_source": customer
            }
    
    try:
        helpers.bulk(client, generate_actions())
        print(f"✅ Successfully indexed {len(customers_data)} customers to OpenSearch")
    except Exception as e:
        print(f"❌ Error indexing to OpenSearch: {e}")


def clear_redis_cache() -> None:
    """
    Clear Redis cache.
    """
    try:
        r = redis.from_url(REDIS_URL)
        r.flushall()
        print("✅ Redis cache cleared")
    except Exception as e:
        print(f"⚠️ Warning: Failed to clear Redis cache: {e}")


def clear_opensearch_index(client: OpenSearch) -> None:
    """
    Clear OpenSearch index.
    """
    try:
        if client.indices.exists(index=OS_INDEX):
            client.indices.delete(index=OS_INDEX)
            print("✅ OpenSearch index cleared")
    except Exception as e:
        print(f"⚠️ Warning: Failed to clear OpenSearch index: {e}")
