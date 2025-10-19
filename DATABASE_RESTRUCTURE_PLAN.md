# Database Restructure Plan: Customer → Prospect + Company

## 🎯 **Objective**
Restructure the current monolithic `Customer` table into two normalized tables (`Prospect` and `Company`) for better data organization, scalability, and future expansion.

## 📊 **Current State Analysis**

### Current Customer Table Fields:
- **Personal Info**: salutation, firstName, lastName, email, phone, mobilePhone
- **Professional Info**: jobTitle, jobTitleLevel, department, jobTitleLink
- **Company Info**: company, industry, minEmployeeSize, maxEmployeeSize, employeeSizeLink, revenue
- **Location Info**: address, city, state, country, zipCode
- **System Info**: id, externalSource, externalId, createdAt, updatedAt

### Issues with Current Structure:
1. **Data Duplication**: Company information repeated for each prospect
2. **Scalability**: Difficult to add company-specific features
3. **Data Integrity**: No referential integrity between prospects and companies
4. **Query Performance**: Full table scans for company-based queries
5. **Future Expansion**: Hard to add company-specific fields without affecting prospects

## 🏗️ **Proposed New Structure**

### 1. Company Table
```sql
CREATE TABLE "Company" (
  id              String   @id @default(cuid())  -- Primary key
  domain          String   @unique               -- Unique identifier (extracted from email)
  name            String?                        -- Company name
  industry        String?                        -- Industry classification
  minEmployeeSize Int?                           -- Minimum employee count
  maxEmployeeSize Int?                           -- Maximum employee count
  employeeSizeLink String?                       -- Link to employee size source
  revenue         BigInt?                        -- Company revenue
  address         String?                        -- Company address
  city            String?                        -- Company city
  state           String?                        -- Company state
  country         String?                        -- Company country
  zipCode         String?                        -- Company ZIP code
  phone           String?                        -- Company phone
  mobilePhone     String?                        -- Company mobile phone
  externalSource  String                         -- Data source identifier
  externalId      String                         -- External system ID
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  -- Relationships
  prospects       Prospect[]                     -- One-to-many with prospects

  -- Indexes
  @@index([domain])
  @@index([name])
  @@index([industry])
  @@index([minEmployeeSize])
  @@index([maxEmployeeSize])
  @@index([revenue])
  @@index([country])
  @@index([city])
  @@index([state])
  @@unique([externalSource, externalId])
)
```

### 2. Prospect Table
```sql
CREATE TABLE "Prospect" (
  id              String   @id @default(cuid())  -- Primary key
  salutation      String?                        -- Mr., Ms., Dr., etc.
  firstName       String?                        -- First name
  lastName        String?                        -- Last name
  email           String?                        -- Email address
  jobTitle        String?                        -- Job title
  jobTitleLevel   String?                        -- Job level (C-Level, Manager, etc.)
  department      String?                        -- Department
  jobTitleLink    String?                        -- Link to job title source
  address         String?                        -- Personal address
  city            String?                        -- Personal city
  state           String?                        -- Personal state
  country         String?                        -- Personal country
  zipCode         String?                        -- Personal ZIP code
  phone           String?                        -- Personal phone
  mobilePhone     String?                        -- Personal mobile phone
  companyId       String                         -- Foreign key to Company
  externalSource  String                         -- Data source identifier
  externalId      String                         -- External system ID
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  -- Relationships
  company         Company  @relation(fields: [companyId], references: [id])

  -- Indexes
  @@index([email])
  @@index([companyId])
  @@index([jobTitle])
  @@index([jobTitleLevel])
  @@index([department])
  @@index([country])
  @@index([city])
  @@index([state])
  @@unique([externalSource, externalId])
)
```

### 3. Materialized Views for Performance

#### CompanyProspectView (Denormalized for Fast Reads)
```sql
CREATE MATERIALIZED VIEW company_prospect_view AS
SELECT 
  c.id as company_id,
  c.domain,
  c.name as company_name,
  c.industry,
  c.minEmployeeSize,
  c.maxEmployeeSize,
  c.revenue,
  c.address as company_address,
  c.city as company_city,
  c.state as company_state,
  c.country as company_country,
  c.zipCode as company_zipCode,
  c.phone as company_phone,
  c.mobilePhone as company_mobilePhone,
  p.id as prospect_id,
  p.salutation,
  p.firstName,
  p.lastName,
  p.email,
  p.jobTitle,
  p.jobTitleLevel,
  p.department,
  p.jobTitleLink,
  p.address as prospect_address,
  p.city as prospect_city,
  p.state as prospect_state,
  p.country as prospect_country,
  p.zipCode as prospect_zipCode,
  p.phone as prospect_phone,
  p.mobilePhone as prospect_mobilePhone,
  p.createdAt,
  p.updatedAt
FROM "Company" c
LEFT JOIN "Prospect" p ON c.id = p.companyId;

-- Indexes on materialized view
CREATE INDEX idx_company_prospect_view_company_id ON company_prospect_view(company_id);
CREATE INDEX idx_company_prospect_view_prospect_id ON company_prospect_view(prospect_id);
CREATE INDEX idx_company_prospect_view_email ON company_prospect_view(email);
CREATE INDEX idx_company_prospect_view_domain ON company_prospect_view(domain);
CREATE INDEX idx_company_prospect_view_company_name ON company_prospect_view(company_name);
CREATE INDEX idx_company_prospect_view_industry ON company_prospect_view(industry);
CREATE INDEX idx_company_prospect_view_revenue ON company_prospect_view(revenue);
```

## 🔄 **Data Migration Strategy**

### Phase 1: Schema Creation
1. **Create new tables** (Company, Prospect) alongside existing Customer table
2. **Create materialized view** for performance
3. **Add indexes** for optimal query performance
4. **Update Prisma schema** with new models

### Phase 2: Data Migration
1. **Extract domain from email**: `domain = email.split('@')[1]`
2. **Create Company records**:
   - Group by domain (unique companies)
   - Use company info from CSV
   - Handle duplicate domains with data merging strategy
3. **Create Prospect records**:
   - Link to Company via companyId
   - Use personal info from CSV
4. **Populate materialized view**

### Phase 3: Application Updates
1. **Update data ingestion logic**:
   - Parse email to extract domain
   - Create/update Company records
   - Create Prospect records with companyId
2. **Update API endpoints**:
   - Modify search API to use new structure
   - Update bulk-import API
   - Add company-specific endpoints
3. **Update UI components**:
   - Modify search results to show company + prospect data
   - Update direct search to show related data
   - Add company-focused views

### Phase 4: OpenSearch Integration
1. **Update OpenSearch mapping**:
   - Add Company index
   - Add Prospect index
   - Update materialized view index
2. **Update ingestion logic**:
   - Index Company data
   - Index Prospect data
   - Index materialized view for fast searches

### Phase 5: Testing & Validation
1. **Data integrity checks**:
   - Verify all prospects have valid companyId
   - Check domain extraction accuracy
   - Validate referential integrity
2. **Performance testing**:
   - Compare query performance
   - Test materialized view refresh
   - Validate search functionality
3. **User acceptance testing**:
   - Test search functionality
   - Verify UI displays correctly
   - Test direct search

### Phase 6: Cleanup
1. **Remove old Customer table** (after validation)
2. **Update documentation**
3. **Deploy to production**

## 🛠️ **Implementation Steps**

### Step 1: Update Prisma Schema
```prisma
model Company {
  id              String   @id @default(cuid())
  domain          String   @unique
  name            String?
  industry        String?
  minEmployeeSize Int?
  maxEmployeeSize Int?
  employeeSizeLink String?
  revenue         BigInt?
  address         String?
  city            String?
  state           String?
  country         String?
  zipCode         String?
  phone           String?
  mobilePhone     String?
  externalSource  String
  externalId      String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  prospects       Prospect[]

  @@index([domain])
  @@index([name])
  @@index([industry])
  @@index([minEmployeeSize])
  @@index([maxEmployeeSize])
  @@index([revenue])
  @@index([country])
  @@index([city])
  @@index([state])
  @@unique([externalSource, externalId])
}

model Prospect {
  id              String   @id @default(cuid())
  salutation      String?
  firstName       String?
  lastName        String?
  email           String?
  jobTitle        String?
  jobTitleLevel   String?
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

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([email])
  @@index([companyId])
  @@index([jobTitle])
  @@index([jobTitleLevel])
  @@index([department])
  @@index([country])
  @@index([city])
  @@index([state])
  @@unique([externalSource, externalId])
}
```

### Step 2: Create Migration Scripts
1. **Domain extraction utility**
2. **Data migration script**
3. **Materialized view creation**
4. **Index creation scripts**

### Step 3: Update Data Ingestion
1. **Modify Python ingestor**:
   - Extract domain from email
   - Create Company records first
   - Create Prospect records with companyId
2. **Update OpenSearch indexing**:
   - Index Company data
   - Index Prospect data
   - Index materialized view

### Step 4: Update API Layer
1. **Search API**: Query materialized view for fast results
2. **Company API**: CRUD operations for companies
3. **Prospect API**: CRUD operations for prospects
4. **Bulk Import API**: Handle new data structure

### Step 5: Update UI Components
1. **Search Results**: Display company + prospect info
2. **Direct Search**: Show prospect with company details
3. **Company View**: New page for company-focused data
4. **Prospect View**: Enhanced prospect details

## 📈 **Benefits of New Structure**

### 1. **Data Normalization**
- Eliminates data duplication
- Ensures referential integrity
- Reduces storage requirements

### 2. **Scalability**
- Easy to add company-specific features
- Independent scaling of prospect vs company data
- Better query performance with proper indexes

### 3. **Future Expansion**
- Company-specific fields (revenue, industry, etc.)
- Prospect-specific fields (personal info, job details)
- Easy to add new relationships

### 4. **Performance**
- Materialized views for fast reads
- Optimized indexes for common queries
- Reduced data redundancy

### 5. **Data Quality**
- Domain-based company identification
- Consistent company data across prospects
- Better data validation and integrity

## ⚠️ **Risks & Mitigation**

### 1. **Data Migration Complexity**
- **Risk**: Data loss or corruption during migration
- **Mitigation**: Comprehensive testing, backup strategy, rollback plan

### 2. **Performance Impact**
- **Risk**: Slower queries during transition
- **Mitigation**: Materialized views, proper indexing, gradual rollout

### 3. **Application Downtime**
- **Risk**: Service interruption during migration
- **Mitigation**: Blue-green deployment, feature flags, gradual migration

### 4. **Domain Extraction Accuracy**
- **Risk**: Incorrect company grouping
- **Mitigation**: Validation rules, manual review process, data quality checks

## 🎯 **Success Criteria**

1. **Data Integrity**: All prospects linked to valid companies
2. **Performance**: Query performance maintained or improved
3. **Functionality**: All existing features work with new structure
4. **Scalability**: Easy to add new company/prospect features
5. **User Experience**: No degradation in user experience

## 📅 **Timeline Estimate**

- **Phase 1 (Schema)**: 2-3 days
- **Phase 2 (Migration)**: 3-4 days
- **Phase 3 (Application)**: 5-7 days
- **Phase 4 (OpenSearch)**: 2-3 days
- **Phase 5 (Testing)**: 3-4 days
- **Phase 6 (Cleanup)**: 1-2 days

**Total Estimated Time**: 16-23 days

## 🔧 **Tools & Technologies**

- **Database**: PostgreSQL with Prisma ORM
- **Search**: OpenSearch with custom mappings
- **Migration**: Custom Python scripts
- **Testing**: Jest, Cypress, manual testing
- **Deployment**: Docker, blue-green deployment

---

*This plan provides a comprehensive roadmap for restructuring the database while maintaining data integrity and system performance.*
