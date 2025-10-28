-- Migration 008: Add Job Title Level Tables
-- Creates tables for standardized job title level definitions and mappings

-- Create JobTitleLevelDefinition table
CREATE TABLE IF NOT EXISTS "JobTitleLevelDefinition" (
    "level" INTEGER PRIMARY KEY,
    "jobTitleLevel" TEXT NOT NULL UNIQUE,
    "examples" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create JobTitleLevelMap table
CREATE TABLE IF NOT EXISTS "JobTitleLevelMap" (
    "originalJobTitleLevel" TEXT PRIMARY KEY,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "JobTitleLevelMap_level_fkey" 
        FOREIGN KEY ("level") REFERENCES "JobTitleLevelDefinition"("level") ON DELETE CASCADE
);

-- Create indexes for JobTitleLevelDefinition
CREATE UNIQUE INDEX IF NOT EXISTS "JobTitleLevelDefinition_jobTitleLevel_key" 
ON "JobTitleLevelDefinition"("jobTitleLevel");

-- Create indexes for JobTitleLevelMap
CREATE INDEX IF NOT EXISTS "JobTitleLevelMap_level_idx" 
ON "JobTitleLevelMap"("level");

-- Add comments for documentation
COMMENT ON TABLE "JobTitleLevelDefinition" IS 'Standardized job title level definitions with 15 hierarchical levels';
COMMENT ON TABLE "JobTitleLevelMap" IS 'Mapping table from original job title levels to standardized levels';

COMMENT ON COLUMN "JobTitleLevelDefinition"."level" IS 'Numeric level from 1 (highest) to 15 (lowest)';
COMMENT ON COLUMN "JobTitleLevelDefinition"."jobTitleLevel" IS 'Standardized job title level name';
COMMENT ON COLUMN "JobTitleLevelDefinition"."examples" IS 'Example job titles for this level';
COMMENT ON COLUMN "JobTitleLevelDefinition"."description" IS 'Description of the level and responsibilities';

COMMENT ON COLUMN "JobTitleLevelMap"."originalJobTitleLevel" IS 'Original job title level from database';
COMMENT ON COLUMN "JobTitleLevelMap"."level" IS 'Foreign key reference to JobTitleLevelDefinition.level';
