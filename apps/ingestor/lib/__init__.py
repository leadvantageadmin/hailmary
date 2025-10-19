"""
HailMary Data Ingestion Library
Utility modules for data processing and database operations
"""

# Import main functions for easy access
from .utils import (
    process_customer_data,
    detect_csv_separator,
    validate_csv_structure,
    get_ingestion_stats,
    extract_domain_from_email,
    parse_revenue,
    parse_employee_size,
    clean_value,
    build_full_address,
    generate_company_id,
    format_revenue_display
)

from .db_operations import (
    bulk_import_customers_fast,
    bulk_import_company_prospect_fast,
    refresh_materialized_views_after_import,
    ensure_opensearch_index,
    bulk_index_to_opensearch,
    clear_redis_cache,
    clear_opensearch_index
)

__all__ = [
    # Utils
    'process_customer_data',
    'detect_csv_separator', 
    'validate_csv_structure',
    'get_ingestion_stats',
    'extract_domain_from_email',
    'parse_revenue',
    'parse_employee_size',
    'clean_value',
    'build_full_address',
    'generate_company_id',
    'format_revenue_display',
    
    # Database operations
    'bulk_import_customers_fast',
    'bulk_import_company_prospect_fast',
    'refresh_materialized_views_after_import',
    'ensure_opensearch_index',
    'bulk_index_to_opensearch',
    'clear_redis_cache',
    'clear_opensearch_index'
]
