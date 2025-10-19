"""
Utility functions for HailMary Data Ingestion
Contains helper functions for data processing, parsing, and database operations
"""

import pandas as pd
from typing import List, Dict, Any, Tuple


def extract_domain_from_email(email: str) -> Tuple[str, str]:
    """
    Extract domain from email address for Company table and return both domain and processed email.
    Examples:
    - "john.doe@company.com" -> ("company.com", "john.doe@company.com")
    - "jane@subdomain.example.org" -> ("subdomain.example.org", "jane@subdomain.example.org")
    - "ravi.katta@unionbankofindia" -> ("unionbank.com", "ravi.katta@unionbankofindia.com")
    - "invalid-email" -> ("no-domain-available", "invalid-email")
    - None/empty -> ("no-domain-available", "no-email-available")
    """
    if not email or pd.isna(email):
        return "no-domain-available", "no-email-available"
    
    email = str(email).strip()
    if '@' not in email:
        return "no-domain-available", email
    
    try:
        domain = email.split('@')[1].lower()
        
        # If domain has a dot, it's likely valid
        if '.' in domain and len(domain) > 3:
            return domain, email
        
        # If no dot but looks like a domain (letters/numbers), add .com suffix
        if domain and len(domain) > 2 and domain.replace('.', '').replace('-', '').isalnum():
            fixed_domain = f"{domain}.com"
            fixed_email = email.replace(f"@{domain}", f"@{fixed_domain}")
            return fixed_domain, fixed_email
        
        # If domain is invalid, use fallback
        return "no-domain-available", email
        
    except (IndexError, AttributeError):
        return "no-domain-available", email


def parse_revenue(revenue_str: str) -> int | None:
    """
    Parse revenue string and convert to whole dollars (BigInt storage).
    Examples:
    - "100K" -> 100000 (100,000 dollars)
    - "1M" -> 1000000 (1,000,000 dollars)
    - "10M" -> 10000000 (10,000,000 dollars)
    - "500" -> 500 (500 dollars)
    - "1.5M" -> 1500000 (1,500,000 dollars)
    """
    if not revenue_str or pd.isna(revenue_str):
        return None
    
    # Convert to string and strip whitespace
    revenue_str = str(revenue_str).strip().upper()
    
    # Remove common prefixes/suffixes
    revenue_str = revenue_str.replace('USD', '').replace('$', '').replace(',', '').strip()
    
    try:
        # Handle K suffix (thousands)
        if revenue_str.endswith('K'):
            value = float(revenue_str[:-1])
            return int(value * 1000)  # Convert to whole dollars
        
        # Handle M suffix (millions)
        elif revenue_str.endswith('M'):
            value = float(revenue_str[:-1])
            return int(value * 1000000)  # Convert to whole dollars
        
        # Handle B suffix (billions)
        elif revenue_str.endswith('B'):
            value = float(revenue_str[:-1])
            return int(value * 1000000000)  # Convert to whole dollars
        
        # Handle plain numbers
        else:
            value = float(revenue_str)
            # If it's a large number without suffix, assume it's already in dollars
            if value >= 1000:
                return int(value * 1000)  # Assume it's in thousands
            else:
                return int(value)  # Assume it's already in dollars
                
    except (ValueError, TypeError):
        return None


def parse_employee_size(employee_size_str: str) -> Tuple[int | None, int | None]:
    """
    Parse employee size string and return min and max values.
    Examples:
    - "100-500" -> (100, 500)
    - "1000+" -> (1000, None)
    - "50-100" -> (50, 100)
    - "10,001+" -> (10001, None)
    """
    if not employee_size_str or pd.isna(employee_size_str):
        return None, None
    
    employee_size_str = str(employee_size_str).strip()
    
    try:
        # Handle ranges like "100-500"
        if '-' in employee_size_str:
            parts = employee_size_str.split('-')
            if len(parts) == 2:
                min_size = int(parts[0].replace(',', ''))
                max_size = int(parts[1].replace(',', ''))
                return min_size, max_size
        
        # Handle single values with + like "1000+"
        elif employee_size_str.endswith('+'):
            min_size = int(employee_size_str[:-1].replace(',', ''))
            return min_size, None
        
        # Handle plain numbers
        else:
            size = int(employee_size_str.replace(',', ''))
            return size, size
            
    except (ValueError, TypeError):
        return None, None


def clean_value(value: Any) -> str | None:
    """
    Clean and normalize a value from CSV data.
    Converts empty strings, NaN, and whitespace-only values to None.
    """
    if pd.isna(value) or value == "" or str(value).strip() == "":
        return None
    return str(value).strip()


def build_full_address(address_line1: str | None, address_line2: str | None) -> str | None:
    """
    Combine address line 1 and address line 2 into a full address.
    """
    if address_line1 and address_line2:
        return f"{address_line1} {address_line2}"
    elif address_line1:
        return address_line1
    elif address_line2:
        return address_line2
    else:
        return None


def generate_company_id(domain: str) -> str:
    """
    Generate a company ID from a domain.
    Replaces dots and hyphens with underscores for valid database IDs.
    """
    return f"company_{domain.replace('.', '_').replace('-', '_')}"


def process_customer_data(row: pd.Series, index: int) -> Dict[str, Any]:
    """
    Process a single CSV row into customer data dictionary.
    Handles all data cleaning, parsing, and normalization.
    """
    # Generate unique ID
    customer_id = str(row.get("Email address", f"customer_{index}")).strip()
    if not customer_id or customer_id == "nan":
        customer_id = f"customer_{index}"
    
    # Parse employee size
    min_size, max_size = parse_employee_size(row.get("Employee Size"))
    
    # Parse revenue (if present in CSV)
    revenue = parse_revenue(row.get("Revenue"))
    
    # Build full address
    address_line1 = clean_value(row.get("Address Line 1"))
    address_line2 = clean_value(row.get("Address Line 2"))
    full_address = build_full_address(address_line1, address_line2)
    
    # Build customer data
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
        "revenue": revenue,
        "externalSource": "csv",
        "externalId": customer_id
    }
    
    return customer_data


def process_company_prospect_data(customers_data: List[Dict[str, Any]]) -> Tuple[Dict[str, Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Process customer data into Company and Prospect data structures.
    Returns tuple of (companies_data, prospects_data).
    """
    companies_data = {}
    prospects_data = []
    
    for customer in customers_data:
        original_email = customer.get("email")
        domain, processed_email = extract_domain_from_email(original_email)
        company_name = customer.get("company")
        
        # Generate company ID based on domain
        company_id = generate_company_id(domain)
        
        # Create company data (always create, even for fallback domains)
        if domain not in companies_data:
            companies_data[domain] = {
                "id": company_id,
                "domain": domain,
                "name": company_name if company_name else f"Company-{domain}",
                "industry": customer.get("industry"),
                "minEmployeeSize": customer.get("minEmployeeSize"),
                "maxEmployeeSize": customer.get("maxEmployeeSize"),
                "employeeSizeLink": customer.get("employeeSizeLink"),
                "revenue": customer.get("revenue"),
                "address": customer.get("address"),
                "city": customer.get("city"),
                "state": customer.get("state"),
                "country": customer.get("country"),
                "zipCode": customer.get("zipCode"),
                "phone": customer.get("phone"),
                "mobilePhone": customer.get("mobilePhone"),
                "externalSource": customer["externalSource"],
                "externalId": f"company_{customer['externalId']}"
            }
        
        # Create prospect data with processed email and guaranteed company ID
        prospect_data = {
            "id": customer["id"],
            "salutation": customer.get("salutation"),
            "firstName": customer.get("firstName"),
            "lastName": customer.get("lastName"),
            "email": processed_email,  # Use processed email (with .com added if needed)
            "jobTitle": customer.get("jobTitle"),
            "jobTitleLevel": customer.get("jobTitleLevel"),
            "department": customer.get("department"),
            "jobTitleLink": customer.get("jobTitleLink"),
            "address": customer.get("address"),
            "city": customer.get("city"),
            "state": customer.get("state"),
            "country": customer.get("country"),
            "zipCode": customer.get("zipCode"),
            "phone": customer.get("phone"),
            "mobilePhone": customer.get("mobilePhone"),
            "companyId": company_id,  # Always has a value now
            "externalSource": customer["externalSource"],
            "externalId": customer["externalId"]
        }
        prospects_data.append(prospect_data)
    
    return companies_data, prospects_data


def format_revenue_display(revenue: int | None) -> str:
    """
    Format revenue for display in UI.
    Converts whole dollars to human-readable format.
    """
    if not revenue or revenue == 0:
        return 'NA'
    
    if revenue >= 1000000000:
        billions = revenue / 1000000000
        return f"{billions:.0f}B" if billions % 1 == 0 else f"{billions:.1f}B"
    elif revenue >= 1000000:
        millions = revenue / 1000000
        return f"{millions:.0f}M" if millions % 1 == 0 else f"{millions:.1f}M"
    elif revenue >= 1000:
        thousands = revenue / 1000
        return f"{thousands:.0f}K" if thousands % 1 == 0 else f"{thousands:.1f}K"
    else:
        return f"${revenue}"


def validate_csv_structure(df: pd.DataFrame) -> bool:
    """
    Validate that the CSV has the expected structure for customer data.
    Returns True if valid, False otherwise.
    """
    required_columns = [
        "Email address",
        "First Name", 
        "Last Name",
        "Company"
    ]
    
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        print(f"❌ Missing required columns: {missing_columns}")
        return False
    
    return True


def detect_csv_separator(file_path: str) -> str:
    """
    Auto-detect CSV separator by analyzing the first line.
    Returns the detected separator (',' or ';').
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            first_line = f.readline().strip()
            semicolon_count = first_line.count(';')
            comma_count = first_line.count(',')
            
            if ';' in first_line and semicolon_count > comma_count:
                return ';'
            else:
                return ','
    except Exception:
        return ','  # Default to comma


def get_ingestion_stats(customers_data: List[Dict[str, Any]], companies_data: Dict[str, Dict[str, Any]], prospects_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate statistics about the ingestion process.
    """
    # Count unique domains
    unique_domains = len(companies_data)
    
    # Count prospects with valid domains vs fallback
    valid_domain_prospects = sum(1 for p in prospects_data if not p["email"].endswith("no-email-available"))
    fallback_domain_prospects = len(prospects_data) - valid_domain_prospects
    
    # Count companies with revenue data
    companies_with_revenue = sum(1 for c in companies_data.values() if c.get("revenue") is not None)
    
    return {
        "total_customers": len(customers_data),
        "total_companies": unique_domains,
        "total_prospects": len(prospects_data),
        "valid_domain_prospects": valid_domain_prospects,
        "fallback_domain_prospects": fallback_domain_prospects,
        "companies_with_revenue": companies_with_revenue,
        "avg_prospects_per_company": len(prospects_data) / unique_domains if unique_domains > 0 else 0
    }
