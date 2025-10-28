-- Migration 011: Update Prospect Table with Standardized Job Title Level
-- Adds jobTitleLevelId column (data migration will be done separately via script)

-- Step 1: Add jobTitleLevelId column (fast, ~1 second)
ALTER TABLE "Prospect" 
ADD COLUMN "jobTitleLevelId" INTEGER;

-- Step 2: Add index for performance (fast, ~2-5 minutes with CONCURRENTLY)
CREATE INDEX CONCURRENTLY "Prospect_jobTitleLevelId_idx" 
ON "Prospect"("jobTitleLevelId");

-- Step 3: Add comments for documentation
COMMENT ON COLUMN "Prospect"."jobTitleLevelId" IS 'Numeric job title level (1-15) - source of truth for standardized job title levels';
COMMENT ON COLUMN "Prospect"."jobTitleLevel" IS 'Standardized job title level name - derived from jobTitleLevelId';

-- Note: Data migration will be performed separately using batch processing script
-- to avoid blocking the Prospect table for extended periods
