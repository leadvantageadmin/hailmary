#!/usr/bin/env python3
"""
Simple script to generate SQL INSERT statements for JobTitleLevelMap table
from the job_title_level_map.csv file
"""

import csv
import sys

def generate_sql_inserts():
    """Generate SQL INSERT statements from CSV data"""
    
    sql_statements = []
    sql_statements.append("-- Insert all job title level mappings from CSV")
    sql_statements.append("")
    
    # Read CSV file
    csv_file = "../../ingestor/data/standardized_data/job_title_level_map.csv"
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            # Prepare INSERT statement with ON CONFLICT to handle duplicates
            sql_statements.append("INSERT INTO \"JobTitleLevelMap\" (\"originalJobTitleLevel\", \"level\")")
            sql_statements.append("VALUES")
            
            values = []
            for row in reader:
                original = row['Job Title Level from DB'].replace("'", "''")  # Escape single quotes
                level = int(row['Level'])
                values.append(f"('{original}', {level})")
            
            # Join values with commas and add ON CONFLICT clause
            sql_statements.append(",\n".join(values))
            sql_statements.append("ON CONFLICT (\"originalJobTitleLevel\") DO UPDATE SET")
            sql_statements.append("    \"level\" = EXCLUDED.\"level\",")
            sql_statements.append("    \"updatedAt\" = CURRENT_TIMESTAMP;")
            
            sql_statements.append("")
            sql_statements.append("-- Verify data insertion")
            sql_statements.append("SELECT COUNT(*) as total_records FROM \"JobTitleLevelMap\";")
            
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
