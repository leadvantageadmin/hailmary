#!/usr/bin/env python3
"""
Script to generate SQL INSERT statements for JobTitleLevelMap table
from the job_title_level_map.csv file
"""

import csv
import sys

def generate_sql_inserts():
    """Generate SQL INSERT statements from CSV data"""
    
    sql_statements = []
    sql_statements.append("-- Migration 010: Populate Job Title Level Map Data")
    sql_statements.append("-- Inserts mapping data from original job title levels to standardized levels")
    sql_statements.append("")
    
    # Read CSV file
    csv_file = "../../ingestor/data/standardized_data/job_title_level_map.csv"
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            # Collect all entries first
            entries = []
            for row in reader:
                original = row['Job Title Level from DB'].replace("'", "''")  # Escape single quotes
                level = int(row['Level'])
                entries.append((original, level))
            
            # Remove duplicates while preserving order
            seen = set()
            unique_entries = []
            for original, level in entries:
                if original not in seen:
                    seen.add(original)
                    unique_entries.append((original, level))
            
            print(f"Total entries in CSV: {len(entries)}")
            print(f"Unique entries after deduplication: {len(unique_entries)}")
            
            # Prepare INSERT statement
            sql_statements.append("TRUNCATE TABLE \"JobTitleLevelMap\";")
            sql_statements.append("")
            sql_statements.append("INSERT INTO \"JobTitleLevelMap\" (\"originalJobTitleLevel\", \"level\")")
            sql_statements.append("VALUES")
            
            values = []
            for original, level in unique_entries:
                values.append(f"('{original}', {level})")
            
            # Join values with commas and add semicolon
            sql_statements.append(",\n".join(values) + ";")
            
            sql_statements.append("")
            sql_statements.append("-- Verify data insertion")
            sql_statements.append("DO $$")
            sql_statements.append("DECLARE")
            sql_statements.append("    record_count INTEGER;")
            sql_statements.append("BEGIN")
            sql_statements.append("    SELECT COUNT(*) INTO record_count FROM \"JobTitleLevelMap\";")
            sql_statements.append("    ")
            sql_statements.append(f"    IF record_count = {len(unique_entries)} THEN")
            sql_statements.append(f"        RAISE NOTICE 'Successfully inserted {len(unique_entries)} job title level mappings';")
            sql_statements.append("    ELSE")
            sql_statements.append(f"        RAISE WARNING 'Expected {len(unique_entries)} records, but found % records', record_count;")
            sql_statements.append("    END IF;")
            sql_statements.append("END $$;")
            
    except FileNotFoundError:
        print(f"Error: Could not find {csv_file}")
        return None
    except Exception as e:
        print(f"Error processing CSV: {e}")
        return None
    
    return "\n".join(sql_statements)

if __name__ == "__main__":
    sql_content = generate_sql_inserts()
    if sql_content:
        print(sql_content)
    else:
        sys.exit(1)
