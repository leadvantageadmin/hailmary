-- Migration: Implement Meaningful IDs for Company and Prospect Tables (Simplified)
-- Version: v2.1.0
-- Description: Change primary keys from auto-generated UUIDs to meaningful values
--              Company.id = domain, Prospect.id = email, Prospect.companyId = domain
-- Note: This simplified version works because tables are empty
-- Checksum: 003_meaningful_ids_simple

BEGIN;

-- Step 1: Drop existing foreign key constraint
ALTER TABLE "Prospect" DROP CONSTRAINT IF EXISTS "Prospect_companyId_fkey";

-- Step 2: Remove default UUID generation from primary keys
ALTER TABLE "Company" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Prospect" ALTER COLUMN "id" DROP DEFAULT;

-- Step 3: Add foreign key constraint (now references Company.id which will contain domain)
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_companyId_fkey" 
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- Step 4: Log this migration
SELECT log_schema_migration('003_meaningful_ids_simple', 'Implement meaningful IDs for Company and Prospect tables', '003_meaningful_ids_simple');

COMMIT;
