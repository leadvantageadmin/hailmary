import os
import json
from typing import List, Dict, Any
import pandas as pd
from pydantic import BaseModel, Field
from psycopg import connect
from opensearchpy import OpenSearch, helpers
import redis

POSTGRES_DSN = os.getenv("DATABASE_URL", "postgresql://app:app@postgres:5432/app")
OS_URL = os.getenv("OPENSEARCH_URL", "http://opensearch:9200")
OS_INDEX = os.getenv("OPENSEARCH_INDEX", "customers")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

class Customer(BaseModel):
    id: str
    salutation: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    email: str | None = None
    company: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    zipCode: str | None = None
    phone: str | None = None
    mobilePhone: str | None = None
    industry: str | None = None
    jobTitleLevel: str | None = None
    jobTitle: str | None = None
    department: str | None = None
    employeeSize: int | None = None
    jobTitleLink: str | None = None
    employeeSizeLink: str | None = None
    # Legacy fields for backward compatibility
    name: str | None = None
    sector: str | None = None
    size: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    externalSource: str
    externalId: str


def parse_employee_size(employee_size_str: str) -> int | None:
    """
    Parse employee size string and convert to numeric value.
    Examples: "50+" -> 50, "1000+" -> 1000, "100-500" -> 100, "10001+" -> 10001
    """
    if not employee_size_str or pd.isna(employee_size_str):
        return None
    
    # Convert to string and strip whitespace
    size_str = str(employee_size_str).strip()
    
    # Handle ranges like "100-500" - take the lower bound
    if '-' in size_str:
        try:
            lower_bound = int(size_str.split('-')[0].strip())
            return lower_bound
        except (ValueError, IndexError):
            return None
    
    # Handle values with + like "50+", "1000+"
    if '+' in size_str:
        try:
            return int(size_str.replace('+', '').strip())
        except ValueError:
            return None
    
    # Handle plain numbers
    try:
        return int(size_str)
    except ValueError:
        return None


def ensure_index(client: OpenSearch):
    if not client.indices.exists(index=OS_INDEX):
        client.indices.create(index=OS_INDEX, body={
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "salutation": {"type": "keyword"},
                    "firstName": {"type": "keyword"},
                    "lastName": {"type": "keyword"},
                    "email": {"type": "keyword"},
                    "company": {
                        "type": "text",
                        "fields": {
                            "keyword": {"type": "keyword"},
                            "suggest": {"type": "completion"}
                        }
                    },
                    "address": {"type": "text"},
                    "city": {
                        "type": "text",
                        "fields": {
                            "keyword": {"type": "keyword"}
                        }
                    },
                    "state": {
                        "type": "text",
                        "fields": {
                            "keyword": {"type": "keyword"}
                        }
                    },
                    "country": {
                        "type": "text",
                        "fields": {
                            "keyword": {"type": "keyword"}
                        }
                    },
                    "zipCode": {"type": "keyword"},
                    "phone": {"type": "keyword"},
                    "mobilePhone": {"type": "keyword"},
                    "industry": {
                        "type": "text",
                        "fields": {
                            "keyword": {"type": "keyword"}
                        }
                    },
                    "jobTitleLevel": {"type": "keyword"},
                    "jobTitle": {
                        "type": "text",
                        "fields": {
                            "keyword": {"type": "keyword"}
                        }
                    },
                    "department": {
                        "type": "text",
                        "fields": {
                            "keyword": {"type": "keyword"}
                        }
                    },
                    "employeeSize": {"type": "integer"},
                    "jobTitleLink": {"type": "keyword"},
                    "employeeSizeLink": {"type": "keyword"},
                    # Legacy fields
                    "name": {"type": "keyword"},
                    "sector": {"type": "keyword"},
                    "size": {"type": "integer"},
                    "location": {"type": "geo_point"}
                }
            }
        })


def upsert_postgres(rows: List[Customer]):
    with connect(POSTGRES_DSN) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                create table if not exists "Customer" (
                  id text primary key,
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
                  "employeeSize" text,
                  "jobTitleLink" text,
                  "employeeSizeLink" text,
                  -- Legacy fields
                  name text,
                  sector text,
                  size int,
                  latitude double precision,
                  longitude double precision,
                  "externalSource" text not null,
                  "externalId" text not null,
                  "createdAt" timestamptz not null default now(),
                  "updatedAt" timestamptz not null default now(),
                  unique ("externalSource", "externalId")
                );
                """
            )
            for r in rows:
                cur.execute(
                    """
                    insert into "Customer" (
                      id, salutation, "firstName", "lastName", email, company, address, city, state, country, 
                      "zipCode", phone, "mobilePhone", industry, "jobTitleLevel", "jobTitle", department, 
                      "employeeSize", "jobTitleLink", "employeeSizeLink", name, sector, size, latitude, longitude, 
                      "externalSource", "externalId"
                    )
                    values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    on conflict (id) do update set
                      salutation=excluded.salutation,
                      "firstName"=excluded."firstName",
                      "lastName"=excluded."lastName",
                      email=excluded.email,
                      company=excluded.company,
                      address=excluded.address,
                      city=excluded.city,
                      state=excluded.state,
                      country=excluded.country,
                      "zipCode"=excluded."zipCode",
                      phone=excluded.phone,
                      "mobilePhone"=excluded."mobilePhone",
                      industry=excluded.industry,
                      "jobTitleLevel"=excluded."jobTitleLevel",
                      "jobTitle"=excluded."jobTitle",
                      department=excluded.department,
                      "employeeSize"=excluded."employeeSize",
                      "jobTitleLink"=excluded."jobTitleLink",
                      "employeeSizeLink"=excluded."employeeSizeLink",
                      name=excluded.name,
                      sector=excluded.sector,
                      size=excluded.size,
                      latitude=excluded.latitude,
                      longitude=excluded.longitude,
                      "updatedAt"=now();
                    """,
                    (r.id, r.salutation, r.firstName, r.lastName, r.email, r.company, r.address, r.city, r.state, r.country,
                     r.zipCode, r.phone, r.mobilePhone, r.industry, r.jobTitleLevel, r.jobTitle, r.department,
                     r.employeeSize, r.jobTitleLink, r.employeeSizeLink, r.name, r.sector, r.size, r.latitude, r.longitude,
                     r.externalSource, r.externalId)
                )
        conn.commit()


def bulk_index_os(client: OpenSearch, rows: List[Customer]):
    actions = []
    for r in rows:
        source_data = {
            "id": r.id,
            "salutation": r.salutation,
            "firstName": r.firstName,
            "lastName": r.lastName,
            "email": r.email,
            "company": r.company,
            "address": r.address,
            "city": r.city,
            "state": r.state,
            "country": r.country,
            "zipCode": r.zipCode,
            "phone": r.phone,
            "mobilePhone": r.mobilePhone,
            "industry": r.industry,
            "jobTitleLevel": r.jobTitleLevel,
            "jobTitle": r.jobTitle,
            "department": r.department,
            "employeeSize": r.employeeSize,
            "jobTitleLink": r.jobTitleLink,
            "employeeSizeLink": r.employeeSizeLink,
            # Legacy fields
            "name": r.name,
            "sector": r.sector,
            "size": r.size,
        }
        
        # Only add location if coordinates are available
        if r.latitude is not None and r.longitude is not None:
            source_data["location"] = {"lat": r.latitude, "lon": r.longitude}
            
        actions.append({
            "_op_type": "index",
            "_index": OS_INDEX,
            "_id": r.id,
            "_source": source_data
        })
    helpers.bulk(client, actions, chunk_size=1000)


def clear_redis_cache():
    """Clear Redis cache to ensure fresh data"""
    try:
        redis_client = redis.from_url(REDIS_URL)
        redis_client.flushall()
        print("✓ Cleared Redis cache")
    except Exception as e:
        print(f"⚠️  Warning: Could not clear Redis cache: {e}")


def clear_all_data():
    """Clear all data from PostgreSQL, OpenSearch, and Redis"""
    print("Clearing all existing data...")
    
    # Clear PostgreSQL
    with connect(POSTGRES_DSN) as conn:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM "Customer"')
        conn.commit()
    print("✓ Cleared PostgreSQL data")
    
    # Clear OpenSearch
    os_client = OpenSearch(OS_URL)
    if os_client.indices.exists(index=OS_INDEX):
        os_client.delete_by_query(
            index=OS_INDEX,
            body={"query": {"match_all": {}}}
        )
    print("✓ Cleared OpenSearch data")
    
    # Clear Redis cache
    clear_redis_cache()


def run_from_csv(path: str, clear_existing: bool = False):
    """
    Ingest data from CSV file
    
    Args:
        path: Path to CSV file
        clear_existing: If True, clear all existing data before ingestion
    """
    if clear_existing:
        clear_all_data()
    
    df = pd.read_csv(path)
    rows: List[Customer] = []
    for idx, row in df.iterrows():
        # Skip empty rows
        if pd.isna(row.get("First Name")) and pd.isna(row.get("Last Name")):
            continue
            
        # Generate ID from email or use index
        customer_id = str(row.get("Email address", f"customer_{idx}"))
        
        # Build full name from first and last name
        first_name = str(row.get("First Name", "")).strip() if not pd.isna(row.get("First Name")) else ""
        last_name = str(row.get("Last Name", "")).strip() if not pd.isna(row.get("Last Name")) else ""
        full_name = f"{first_name} {last_name}".strip()
        
        rows.append(Customer(
            id=customer_id,
            salutation=str(row.get("Salutation", "")).strip() if not pd.isna(row.get("Salutation")) else None,
            firstName=first_name if first_name else None,
            lastName=last_name if last_name else None,
            email=str(row.get("Email address", "")).strip() if not pd.isna(row.get("Email address")) else None,
            company=str(row.get("Company", "")).strip() if not pd.isna(row.get("Company")) else None,
            address=str(row.get("Address", "")).strip() if not pd.isna(row.get("Address")) else None,
            city=str(row.get("City", "")).strip() if not pd.isna(row.get("City")) else None,
            state=str(row.get("State", "")).strip() if not pd.isna(row.get("State")) else None,
            country=str(row.get("Country", "")).strip() if not pd.isna(row.get("Country")) else None,
            zipCode=str(row.get("Zip Code", "")).strip() if not pd.isna(row.get("Zip Code")) else None,
            phone=str(row.get("Phone", "")).strip() if not pd.isna(row.get("Phone")) else None,
            mobilePhone=str(row.get("Mobile Phone", "")).strip() if not pd.isna(row.get("Mobile Phone")) else None,
            industry=str(row.get("Industry", "")).strip() if not pd.isna(row.get("Industry")) else None,
            jobTitleLevel=str(row.get("Job Title Level", "")).strip() if not pd.isna(row.get("Job Title Level")) else None,
            jobTitle=str(row.get("Job Title", "")).strip() if not pd.isna(row.get("Job Title")) else None,
            department=str(row.get("Department", "")).strip() if not pd.isna(row.get("Department")) else None,
                employeeSize=parse_employee_size(row.get("Employee Size")),
            jobTitleLink=str(row.get("Job Title Link", "")).strip() if not pd.isna(row.get("Job Title Link")) else None,
            employeeSizeLink=str(row.get("Employee Size Link", "")).strip() if not pd.isna(row.get("Employee Size Link")) else None,
            # Legacy fields - derive from new data
            name=full_name if full_name else None,
            sector=None,  # Could be derived from industry if needed
            size=None,  # Could parse employee size if needed
            latitude=None,  # Would need geocoding service
            longitude=None,  # Would need geocoding service
            externalSource="csv",
            externalId=customer_id
        ))
    
    upsert_postgres(rows)
    os_client = OpenSearch(OS_URL)
    ensure_index(os_client)
    bulk_index_os(os_client, rows)
    print(f"Ingested {len(rows)} rows from {path}")
    
    # Clear Redis cache to ensure fresh data is served
    clear_redis_cache()


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python app.py /data/customers.csv [--clear]")
        print("  --clear: Clear all existing data before ingestion")
        raise SystemExit(2)
    
    clear_existing = "--clear" in sys.argv
    csv_path = sys.argv[1]
    run_from_csv(csv_path, clear_existing=clear_existing)
