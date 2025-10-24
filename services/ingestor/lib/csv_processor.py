"""
CSV Processor Module
Handles CSV file processing and data transformation
"""

import os
import logging
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import re
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

class CSVProcessor:
    """Handles CSV file processing and data transformation"""
    
    def __init__(self):
        self.supported_formats = ['.csv', '.tsv', '.txt']
        
    def validate_file(self, file_path: str) -> Dict[str, Any]:
        """Validate CSV file"""
        try:
            file_path = Path(file_path)
            
            # Check if file exists
            if not file_path.exists():
                return {
                    "valid": False,
                    "error": f"File does not exist: {file_path}"
                }
            
            # Check file extension
            if file_path.suffix.lower() not in self.supported_formats:
                return {
                    "valid": False,
                    "error": f"Unsupported file format: {file_path.suffix}"
                }
            
            # Check file size
            file_size = file_path.stat().st_size
            if file_size == 0:
                return {
                    "valid": False,
                    "error": "File is empty"
                }
            
            # Try to read the file
            try:
                df = pd.read_csv(file_path, nrows=1)
                columns = df.columns.tolist()
            except Exception as e:
                return {
                    "valid": False,
                    "error": f"Failed to read CSV file: {e}"
                }
            
            return {
                "valid": True,
                "file_path": str(file_path),
                "file_size": file_size,
                "columns": columns,
                "estimated_rows": self._estimate_rows(file_path)
            }
            
        except Exception as e:
            logger.error(f"File validation failed: {e}")
            return {
                "valid": False,
                "error": str(e)
            }
    
    def _estimate_rows(self, file_path: Path) -> int:
        """Estimate number of rows in CSV file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                # Count lines, subtract 1 for header
                return sum(1 for _ in f) - 1
        except:
            return 0
    
    def process_csv_file(self, file_path: str, chunk_size: int = 1000) -> List[Dict[str, Any]]:
        """Process CSV file and return processed data"""
        try:
            logger.info(f"Processing CSV file: {file_path}")
            
            # Validate file first
            validation = self.validate_file(file_path)
            if not validation["valid"]:
                raise Exception(f"File validation failed: {validation['error']}")
            
            # Read CSV file
            df = pd.read_csv(file_path)
            logger.info(f"Loaded {len(df)} rows from CSV file")
            
            # Process data in chunks
            processed_data = []
            for i in range(0, len(df), chunk_size):
                chunk = df.iloc[i:i + chunk_size]
                processed_chunk = self._process_chunk(chunk)
                processed_data.extend(processed_chunk)
                
                if i % (chunk_size * 10) == 0:  # Log progress every 10 chunks
                    logger.info(f"Processed {i + len(chunk)} rows")
            
            logger.info(f"Successfully processed {len(processed_data)} records")
            return processed_data
            
        except Exception as e:
            logger.error(f"Failed to process CSV file {file_path}: {e}")
            raise
    
    def _process_chunk(self, chunk: pd.DataFrame) -> List[Dict[str, Any]]:
        """Process a chunk of data"""
        processed_records = []
        
        for _, row in chunk.iterrows():
            try:
                # Convert row to dictionary
                record = row.to_dict()
                
                # Clean and standardize data
                cleaned_record = self._clean_record(record)
                
                # Transform to normalized structure
                normalized_records = self._normalize_record(cleaned_record)
                
                processed_records.extend(normalized_records)
                
            except Exception as e:
                logger.warning(f"Failed to process record: {e}")
                continue
        
        return processed_records
    
    def _clean_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and standardize record data"""
        cleaned = {}
        
        for key, value in record.items():
            # Clean column name
            clean_key = self._clean_column_name(key)
            
            # Clean value
            clean_value = self._clean_value(value)
            
            cleaned[clean_key] = clean_value
        
        return cleaned
    
    def _clean_column_name(self, column_name: str) -> str:
        """Clean column name"""
        if pd.isna(column_name):
            return "unknown_column"
        
        # Convert to string and strip whitespace
        clean_name = str(column_name).strip()
        
        # Replace spaces and special characters with underscores
        clean_name = re.sub(r'[^a-zA-Z0-9_]', '_', clean_name)
        
        # Remove multiple underscores
        clean_name = re.sub(r'_+', '_', clean_name)
        
        # Remove leading/trailing underscores
        clean_name = clean_name.strip('_')
        
        # Convert to camelCase for consistency
        parts = clean_name.split('_')
        if len(parts) > 1:
            clean_name = parts[0].lower() + ''.join(word.capitalize() for word in parts[1:])
        else:
            clean_name = clean_name.lower()
        
        return clean_name
    
    def _clean_value(self, value: Any) -> Any:
        """Clean and standardize value"""
        if pd.isna(value) or value is None:
            return None
        
        # Convert to string and strip whitespace
        if isinstance(value, str):
            value = value.strip()
            if value == '' or value.lower() in ['null', 'none', 'n/a', 'na']:
                return None
        
        # Handle numeric values
        if isinstance(value, (int, float)):
            if pd.isna(value):
                return None
            return value
        
        # Handle string values
        if isinstance(value, str):
            # Try to convert to number
            try:
                if '.' in value:
                    return float(value)
                else:
                    return int(value)
            except ValueError:
                pass
            
            # Try to convert to boolean
            if value.lower() in ['true', 'yes', '1']:
                return True
            elif value.lower() in ['false', 'no', '0']:
                return False
            
            return value
        
        return value
    
    def _parse_employee_size(self, employee_size_str: str) -> Tuple[int | None, int | None]:
        """
        Parse employee size string and return min and max values.
        Examples:
        - "100-500" -> (100, 500)
        - "1000 to 5000" -> (1000, 5000)
        - "1000+" -> (1000, None)
        - "50-100" -> (50, 100)
        - "10,001+" -> (10001, None)
        - "51 to 200" -> (51, 200)
        - "51-200 employees" -> (51, 200)
        - "10,001+ employees" -> (10001, None)
        - "11 TO 50" -> (11, 50)
        """
        if not employee_size_str or pd.isna(employee_size_str):
            return None, None
        
        employee_size_str = str(employee_size_str).strip()
        
        # Skip obvious non-employee size data
        if any(skip_word in employee_size_str.lower() for skip_word in [
            'information technology', 'other', 'sales', 'marketing', 'finance', 
            'human resources', 'operations', 'compliance', 'business development',
            'linkedin.com', 'http', 'www', 'qq', 'operation'
        ]):
            return None, None
        
        try:
            # Clean the string: remove common suffixes and normalize
            cleaned_str = employee_size_str.lower()
            
            # Remove common suffixes
            for suffix in ['employees', 'employee', 'emp']:
                if cleaned_str.endswith(suffix):
                    cleaned_str = cleaned_str[:-len(suffix)].strip()
                    break
            
            # Handle ranges with different separators
            separators = ['-', ' to ', ' t0 ', 'to', 't0']  # Include typos
            
            for separator in separators:
                if separator in cleaned_str:
                    parts = cleaned_str.split(separator)
                    if len(parts) == 2:
                        try:
                            min_size = int(parts[0].replace(',', '').strip())
                            max_size = int(parts[1].replace(',', '').strip())
                            return min_size, max_size
                        except (ValueError, TypeError):
                            continue
                    break
            
            # Handle single values with + like "1000+"
            if cleaned_str.endswith('+'):
                try:
                    min_size = int(cleaned_str[:-1].replace(',', '').strip())
                    return min_size, None
                except (ValueError, TypeError):
                    return None, None
            
            # Handle plain numbers
            else:
                try:
                    size = int(cleaned_str.replace(',', '').strip())
                    return size, size
                except (ValueError, TypeError):
                    return None, None
                    
        except (ValueError, TypeError):
            return None, None
    
    def _parse_revenue(self, revenue_str: str) -> int | None:
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
    
    def _extract_domain_from_email(self, email: str) -> Tuple[str, str]:
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
    
    def _clean_value(self, value: Any) -> str | None:
        """
        Clean and normalize a value from CSV data.
        Converts empty strings, NaN, and whitespace-only values to None.
        """
        if pd.isna(value) or value == "" or str(value).strip() == "":
            return None
        return str(value).strip()
    
    def _build_full_address(self, address_line1: str | None, address_line2: str | None) -> str | None:
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
    
    def _normalize_record(self, record: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Normalize record into Company and Prospect structures"""
        normalized_records = []
        
        # Extract email and domain (handle different email field names)
        email = record.get('email') or record.get('emailAddress') or record.get('email_address') or record.get('Email address')
        if not email:
            return []
        
        # Use the internal function to extract domain
        domain, processed_email = self._extract_domain_from_email(email)
        if not domain or domain == "no-domain-available":
            return []
        
        # Parse employee size using the internal function
        employee_size_str = record.get('Employee Size') or record.get('employeeSize') or record.get('employee_size')
        min_employee_size, max_employee_size = self._parse_employee_size(employee_size_str)
        
        # Parse revenue using the internal function
        revenue = self._parse_revenue(record.get('Revenue') or record.get('revenue'))
        
        # Build full address using internal function
        address_line1 = self._clean_value(record.get('Address Line 1') or record.get('addressLine1') or record.get('address'))
        address_line2 = self._clean_value(record.get('Address Line 2') or record.get('addressLine2'))
        full_address = self._build_full_address(address_line1, address_line2)
        
        # Generate IDs using meaningful values
        company_id = domain  # Use domain directly as company ID
        prospect_id = processed_email  # Use processed email as prospect ID
        
        # Current timestamp
        now = datetime.utcnow().isoformat()
        
        # Create Company record
        company_record = {
            'id': company_id,
            'domain': domain,
            'name': self._clean_value(record.get('Company') or record.get('company') or record.get('companyName') or record.get('company_name')),
            'industry': self._clean_value(record.get('Industry') or record.get('industry')),
            'minEmployeeSize': min_employee_size,
            'maxEmployeeSize': max_employee_size,
            'employeeSizeLink': self._clean_value(record.get('Employee size link') or record.get('employeeSizeLink') or record.get('employee_size_link')),
            'revenue': revenue,
            'address': full_address,
            'city': self._clean_value(record.get('City') or record.get('city')),
            'state': self._clean_value(record.get('State') or record.get('state') or record.get('province')),
            'country': self._clean_value(record.get('Country') or record.get('country')),
            'zipCode': self._clean_value(record.get('Zip/Postal code') or record.get('zipCode') or record.get('zip_code') or record.get('postalCode') or record.get('postal_code')),
            'phone': self._clean_value(record.get('Phone') or record.get('phone') or record.get('companyPhone') or record.get('company_phone')),
            'mobilePhone': self._clean_value(record.get('Mobile Phone (optional)') or record.get('mobilePhone') or record.get('mobile_phone') or record.get('companyMobilePhone')),
            'externalSource': 'csv',
            'externalId': f"company_{prospect_id}",
            'createdAt': now,
            'updatedAt': now
        }
        
        # Create Prospect record
        prospect_record = {
            'id': prospect_id,
            'salutation': self._clean_value(record.get('Salutation') or record.get('salutation') or record.get('title_prefix')),
            'firstName': self._clean_value(record.get('First Name') or record.get('firstName') or record.get('first_name')),
            'lastName': self._clean_value(record.get('Last Name') or record.get('lastName') or record.get('last_name')),
            'email': processed_email,  # Use processed email
            'jobTitle': self._clean_value(record.get('Job Title') or record.get('title') or record.get('jobTitle') or record.get('job_title')),
            'jobTitleLevel': self._clean_value(record.get('Job Title Level') or record.get('jobTitleLevel') or record.get('job_title_level')),
            'department': self._clean_value(record.get('Department') or record.get('department')),
            'jobTitleLink': self._clean_value(record.get('Job Title Link') or record.get('jobTitleLink') or record.get('job_title_link')),
            'address': full_address,  # Use the built full address
            'city': self._clean_value(record.get('City') or record.get('city')),
            'state': self._clean_value(record.get('State') or record.get('state') or record.get('province')),
            'country': self._clean_value(record.get('Country') or record.get('country')),
            'zipCode': self._clean_value(record.get('Zip/Postal code') or record.get('zipCode') or record.get('zip_code') or record.get('postalCode') or record.get('postal_code')),
            'phone': self._clean_value(record.get('Phone') or record.get('phone') or record.get('phoneNumber') or record.get('phone_number')),
            'mobilePhone': self._clean_value(record.get('Mobile Phone (optional)') or record.get('mobilePhone') or record.get('mobile_phone')),
            'companyId': company_id,  # Use the generated company ID
            'externalSource': 'csv',
            'externalId': prospect_id,
            'createdAt': now,
            'updatedAt': now
        }
        
        normalized_records.extend([company_record, prospect_record])
        return normalized_records
    
    
    def get_processing_stats(self, file_path: str) -> Dict[str, Any]:
        """Get processing statistics for a file"""
        try:
            validation = self.validate_file(file_path)
            if not validation["valid"]:
                return {"error": validation["error"]}
            
            return {
                "file_path": validation["file_path"],
                "file_size": validation["file_size"],
                "estimated_rows": validation["estimated_rows"],
                "columns": validation["columns"],
                "supported": True
            }
            
        except Exception as e:
            logger.error(f"Failed to get processing stats: {e}")
            return {"error": str(e)}
