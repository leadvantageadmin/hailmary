# Database Schema Update Plan: Standardized Job Title Levels

## Overview
This plan outlines the steps to add standardized job title level support to the database by creating two new tables and updating the existing Prospect table and materialized view.

## Phase 1: Create New Tables

### 1.1 Create JobTitleLevelDefinition Table
**Purpose**: Store the standardized job title level definitions (15 levels)

**Table Structure**:
```sql
CREATE TABLE "JobTitleLevelDefinition" (
    "id" INTEGER PRIMARY KEY,
    "level" INTEGER NOT NULL UNIQUE,
    "jobTitleLevel" TEXT NOT NULL UNIQUE,
    "examples" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- Primary key on `id`
- Unique index on `level`
- Unique index on `jobTitleLevel`

### 1.2 Create JobTitleLevelMap Table
**Purpose**: Map original job title levels to standardized levels

**Table Structure**:
```sql
CREATE TABLE "JobTitleLevelMap" (
    "id" SERIAL PRIMARY KEY,
    "originalJobTitleLevel" TEXT NOT NULL,
    "standardizedJobTitleLevel" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "JobTitleLevelMap_level_fkey" 
        FOREIGN KEY ("level") REFERENCES "JobTitleLevelDefinition"("level") ON DELETE CASCADE
);
```

**Indexes**:
- Primary key on `id`
- Unique index on `originalJobTitleLevel`
- Index on `level` (foreign key)
- Index on `standardizedJobTitleLevel`

## Phase 2: Update Prospect Table

### 2.1 Add Foreign Key Column
**Purpose**: Link Prospect records to standardized job title levels

**Alteration**:
```sql
ALTER TABLE "Prospect" 
ADD COLUMN "standardizedJobTitleLevelId" INTEGER;

-- Add foreign key constraint
ALTER TABLE "Prospect" 
ADD CONSTRAINT "Prospect_standardizedJobTitleLevelId_fkey" 
FOREIGN KEY ("standardizedJobTitleLevelId") REFERENCES "JobTitleLevelDefinition"("id") ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX "Prospect_standardizedJobTitleLevelId_idx" ON "Prospect"("standardizedJobTitleLevelId");
```

### 2.2 Data Migration Strategy
**Purpose**: Populate the new foreign key column with standardized mappings

**Migration Steps**:
1. Insert data into `JobTitleLevelDefinition` table from CSV
2. Insert data into `JobTitleLevelMap` table from CSV
3. Update `Prospect` table to set `standardizedJobTitleLevelId` based on mapping

**Migration SQL**:
```sql
-- Step 1: Insert standardized definitions
INSERT INTO "JobTitleLevelDefinition" ("level", "jobTitleLevel", "examples", "description")
VALUES 
(1, 'C-Level Executive', 'CEO, CFO, COO, CTO, CMO, CIO, CSO, CHRO, Chief Growth Officer', 'Chief officers and C-level executives who lead entire organizations or major divisions'),
-- ... (all 15 levels)

-- Step 2: Insert mapping data
INSERT INTO "JobTitleLevelMap" ("originalJobTitleLevel", "standardizedJobTitleLevel", "level")
VALUES 
('AVP Credit Risk Analyst', 'Assistant VP (AVP)', 7),
-- ... (all 151 mappings)

-- Step 3: Update Prospect table
UPDATE "Prospect" 
SET "standardizedJobTitleLevelId" = jtld."id"
FROM "JobTitleLevelMap" jtlm
JOIN "JobTitleLevelDefinition" jtld ON jtlm."level" = jtld."level"
WHERE "Prospect"."jobTitleLevel" = jtlm."originalJobTitleLevel";
```

## Phase 3: Update Materialized View

### 3.1 Modify Materialized View Definition
**Purpose**: Include standardized job title level information in the materialized view

**Updated Materialized View**:
```sql
-- Drop existing materialized view
DROP MATERIALIZED VIEW IF EXISTS company_prospect_view CASCADE;

-- Create updated materialized view with standardized job title levels
CREATE MATERIALIZED VIEW company_prospect_view AS
SELECT
    -- Company fields (unchanged)
    c.id AS company_id,
    c.domain,
    c.name AS company_name,
    c.industry,
    c.revenue,
    c."minEmployeeSize",
    c."maxEmployeeSize",
    c.address AS company_address,
    c.city AS company_city,
    c.state AS company_state,
    c.country AS company_country,
    c."zipCode" AS company_zipCode,
    c.phone AS company_phone,
    c."mobilePhone" AS company_mobilePhone,
    c."externalSource" AS company_externalSource,
    c."externalId" AS company_externalId,
    c."createdAt" AS company_createdAt,
    c."updatedAt" AS company_updatedAt,
    
    -- Prospect fields (unchanged)
    p.id AS prospect_id,
    p.salutation,
    p."firstName",
    p."lastName",
    p.email,
    p."jobTitle",
    p."jobTitleLevel", -- Original job title level (preserved)
    p.department,
    p."jobTitleLink",
    p.address AS prospect_address,
    p.city AS prospect_city,
    p.state AS prospect_state,
    p.country AS prospect_country,
    p."zipCode" AS prospect_zipCode,
    p.phone AS prospect_phone,
    p."mobilePhone" AS prospect_mobilePhone,
    p."companyId",
    p."externalSource" AS prospect_externalSource,
    p."externalId" AS prospect_externalId,
    p."createdAt" AS prospect_createdAt,
    p."updatedAt" AS prospect_updatedAt,
    
    -- NEW: Standardized job title level fields
    jtld."level" AS standardized_job_title_level_id,
    jtld."jobTitleLevel" AS standardized_job_title_level,
    jtld."description" AS job_title_level_description,
    
    -- Computed fields for search optimization (unchanged)
    CONCAT(p."firstName", ' ', p."lastName") AS fullName,
    CONCAT(c.name, ' ', COALESCE(c.industry, '')) AS companyContext,
    
    -- Timestamps for CDC (unchanged)
    GREATEST(c."updatedAt", p."updatedAt") AS last_updated
    
FROM "Company" c
LEFT JOIN "Prospect" p ON c.id = p."companyId"
LEFT JOIN "JobTitleLevelDefinition" jtld ON p."standardizedJobTitleLevelId" = jtld."id";
```

### 3.2 Update Materialized View Indexes
**Purpose**: Add indexes for the new standardized job title level fields

**New Indexes**:
```sql
-- Index for standardized job title level searches
CREATE INDEX company_prospect_view_standardized_job_title_level_idx 
ON company_prospect_view (standardized_job_title_level);

-- Index for level-based searches
CREATE INDEX company_prospect_view_standardized_job_title_level_id_idx 
ON company_prospect_view (standardized_job_title_level_id);
```

## Phase 4: Update Prisma Schema

### 4.1 Add New Models to schema.prisma
**Purpose**: Update Prisma schema to reflect new database structure

**New Models**:
```prisma
model JobTitleLevelDefinition {
  id            Int      @id
  level         Int      @unique
  jobTitleLevel String   @unique
  examples      String?
  description   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  jobTitleLevelMaps JobTitleLevelMap[]
  prospects         Prospect[]

  @@map("JobTitleLevelDefinition")
}

model JobTitleLevelMap {
  id                      Int      @id @default(autoincrement())
  originalJobTitleLevel    String   @unique
  standardizedJobTitleLevel String
  level                   Int
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  // Relations
  jobTitleLevelDefinition JobTitleLevelDefinition @relation(fields: [level], references: [level])

  @@map("JobTitleLevelMap")
}
```

### 4.2 Update Prospect Model
**Purpose**: Add foreign key relationship to standardized job title levels

**Updated Prospect Model**:
```prisma
model Prospect {
  id              String   @id
  salutation      String?
  firstName       String?
  lastName        String?
  email           String?
  jobTitle        String?
  jobTitleLevel   String?  // Original job title level (preserved)
  department      String?
  jobTitleLink    String?
  address         String?
  city            String?
  state           String?
  country         String?
  zipCode         String?
  phone           String?
  mobilePhone     String?
  companyId       String
  externalSource  String
  externalId      String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // NEW: Foreign key to standardized job title level
  standardizedJobTitleLevelId Int?

  // Relations
  company                    Company                    @relation(fields: [companyId], references: [id])
  standardizedJobTitleLevel  JobTitleLevelDefinition?   @relation(fields: [standardizedJobTitleLevelId], references: [id])

  @@index([email])
  @@index([companyId])
  @@index([jobTitle])
  @@index([jobTitleLevel])
  @@index([standardizedJobTitleLevelId]) // NEW index
  @@index([department])
  @@index([country])
  @@index([city])
  @@index([state])
  @@unique([externalSource, externalId])
}
```

## Phase 5: Update Application Code

### 5.1 Update Ingestion Logic
**Purpose**: Modify data ingestion to populate standardized job title level mappings

**Changes Required**:
1. Update `db_operations.py` to include standardized job title level mapping
2. Modify bulk insert operations to set `standardizedJobTitleLevelId`
3. Update CSV processing to handle job title level mapping

### 5.2 Update Search API
**Purpose**: Modify search functionality to use standardized job title levels

**Changes Required**:
1. Update search filters to include standardized job title level options
2. Modify Elasticsearch indexing to include standardized fields
3. Update search queries to use standardized job title levels

### 5.3 Update Web Interface
**Purpose**: Update search interface to use standardized job title levels

**Changes Required**:
1. Update job title level dropdown to use standardized levels
2. Modify search filters to show standardized options
3. Update search results to display standardized job title levels

## Phase 6: Data Validation and Testing

### 6.1 Data Validation
**Purpose**: Ensure data integrity and mapping accuracy

**Validation Steps**:
1. Verify all 151 original job title levels are mapped
2. Check that all mappings point to valid standardized levels
3. Validate that Prospect records are correctly linked to standardized levels
4. Test materialized view refresh with new structure

### 6.2 Performance Testing
**Purpose**: Ensure performance is maintained with new structure

**Testing Areas**:
1. Materialized view refresh performance
2. Search query performance with new indexes
3. Data ingestion performance with mapping logic
4. Database query performance for standardized levels

## Phase 7: Deployment Strategy

### 7.1 Migration Scripts
**Purpose**: Create safe migration scripts for production deployment

**Scripts Required**:
1. `008_add_job_title_level_tables.sql` - Create new tables
2. `009_populate_job_title_level_data.sql` - Insert CSV data
3. `010_update_prospect_table.sql` - Add foreign key and migrate data
4. `011_update_materialized_view.sql` - Update materialized view
5. `012_update_prisma_schema.sql` - Update Prisma schema

### 7.2 Rollback Plan
**Purpose**: Ensure ability to rollback changes if issues arise

**Rollback Steps**:
1. Drop materialized view
2. Remove foreign key constraint from Prospect table
3. Drop new columns from Prospect table
4. Drop new tables
5. Restore original materialized view

## Phase 8: Monitoring and Maintenance

### 8.1 Monitoring
**Purpose**: Monitor system performance and data quality

**Monitoring Areas**:
1. Materialized view refresh times
2. Search query performance
3. Data ingestion success rates
4. Job title level mapping accuracy

### 8.2 Maintenance Tasks
**Purpose**: Ongoing maintenance of the standardized job title level system

**Maintenance Tasks**:
1. Regular validation of job title level mappings
2. Performance monitoring and optimization
3. Updates to standardized levels as business requirements change
4. Data quality checks for new incoming data

## Implementation Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Create Tables | 1 day | None |
| Phase 2: Update Prospect Table | 1 day | Phase 1 |
| Phase 3: Update Materialized View | 1 day | Phase 2 |
| Phase 4: Update Prisma Schema | 0.5 days | Phase 3 |
| Phase 5: Update Application Code | 2-3 days | Phase 4 |
| Phase 6: Data Validation | 1 day | Phase 5 |
| Phase 7: Deployment | 1 day | Phase 6 |
| Phase 8: Monitoring Setup | 0.5 days | Phase 7 |

**Total Estimated Duration**: 7-8 days

## Risk Mitigation

### High-Risk Areas
1. **Data Migration**: Risk of data loss during Prospect table updates
2. **Materialized View**: Risk of performance degradation
3. **Application Compatibility**: Risk of breaking existing functionality

### Mitigation Strategies
1. **Backup Strategy**: Full database backup before migration
2. **Staged Deployment**: Deploy in stages with rollback capability
3. **Testing**: Comprehensive testing in staging environment
4. **Monitoring**: Real-time monitoring during deployment

## Success Criteria

1. **Data Integrity**: All 151 job title levels successfully mapped
2. **Performance**: No degradation in search or ingestion performance
3. **Functionality**: All existing features continue to work
4. **New Features**: Standardized job title level filtering works correctly
5. **Data Quality**: 100% of Prospect records have valid standardized job title level mappings
