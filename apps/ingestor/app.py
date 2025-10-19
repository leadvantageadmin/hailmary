"""
HailMary Data Ingestion - Main Application
Clean, refactored version using utility modules
"""

import os
import json
import requests
from typing import List, Dict, Any
import pandas as pd
from opensearchpy import OpenSearch

# Import utility modules
from lib.utils import (
    process_customer_data, 
    detect_csv_separator, 
    validate_csv_structure,
    get_ingestion_stats
)
from lib.db_operations import (
    bulk_import_customers_fast,
    bulk_import_company_prospect_fast,
    refresh_materialized_views_after_import,
    ensure_opensearch_index,
    bulk_index_to_opensearch,
    clear_redis_cache,
    clear_opensearch_index
)

# Environment variables
WEB_API_URL = os.getenv("WEB_API_URL", "http://web:3000")


def bulk_import_to_postgres_api(customers_data: List[Dict[str, Any]], clear_existing: bool = False) -> bool:
    """
    Import via web API - slower but uses Prisma (for small datasets).
    """
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


def run_from_csv(csv_path: str, clear_existing: bool = False, separator: str = None) -> bool:
    """
    Main function to process CSV and ingest data.
    """
    print(f"📊 Processing CSV file: {csv_path}")
    
    # Auto-detect separator if not provided
    if separator is None:
        separator = detect_csv_separator(csv_path)
        print(f"🔍 Auto-detected {separator} as separator")
    
    # Read CSV with detected or specified separator
    df = pd.read_csv(csv_path, sep=separator)
    print(f"📋 Found {len(df)} rows in CSV")
    
    # Validate CSV structure
    if not validate_csv_structure(df):
        return False
    
    # Clear existing data if requested
    if clear_existing:
        print("🗑️  Clearing existing data...")
        
        # Clear OpenSearch
        client = OpenSearch(os.getenv("OPENSEARCH_URL", "http://opensearch:9200"))
        clear_opensearch_index(client)
        
        # Clear Redis
        clear_redis_cache()
    
    # Process CSV data
    customers_data = []
    for index, row in df.iterrows():
        customer_data = process_customer_data(row, index)
        customers_data.append(customer_data)
    
    print(f"🔄 Processing {len(customers_data)} customers...")
    
    # Import to both Customer table (legacy) and Company/Prospect tables (new structure)
    print("🔄 Importing to Customer table (legacy support)...")
    
    # Choose import method based on dataset size for Customer table
    # For testing, always use fast bulk import to avoid API dependency
    print("🚀 Using fast bulk import (raw SQL) for Customer table...")
    customer_success = bulk_import_customers_fast(customers_data, clear_existing)
    
    if not customer_success:
        print("❌ Customer table import failed, aborting...")
        return False
    
    # Import to Company and Prospect tables (new normalized structure)
    print("🔄 Importing to Company and Prospect tables (new structure)...")
    company_prospect_success = bulk_import_company_prospect_fast(customers_data, clear_existing)
    
    if not company_prospect_success:
        print("⚠️ Company/Prospect import failed, but Customer import succeeded")
        print("⚠️ Continuing with Customer table data only...")
    
    # Both imports completed (at least Customer table)
    postgres_success = customer_success
    
    # Refresh materialized views after successful PostgreSQL import
    refresh_materialized_views_after_import()
    
    # Index to OpenSearch
    print("🔍 Indexing to OpenSearch...")
    client = OpenSearch(os.getenv("OPENSEARCH_URL", "http://opensearch:9200"))
    ensure_opensearch_index(client)
    bulk_index_to_opensearch(client, customers_data)
    
    # Print ingestion statistics
    if company_prospect_success:
        from lib.utils import process_company_prospect_data
        companies_data, prospects_data = process_company_prospect_data(customers_data)
        stats = get_ingestion_stats(customers_data, companies_data, prospects_data)
        print(f"📊 Ingestion Statistics:")
        print(f"   • Total Customers: {stats['total_customers']}")
        print(f"   • Total Companies: {stats['total_companies']}")
        print(f"   • Total Prospects: {stats['total_prospects']}")
        print(f"   • Avg Prospects/Company: {stats['avg_prospects_per_company']:.1f}")
        print(f"   • Companies with Revenue: {stats['companies_with_revenue']}")
    
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
