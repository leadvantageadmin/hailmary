# Materialized View Strategy for Company-Prospect Data

## 🎯 **Objective**
Create and maintain materialized views for fast denormalized reads while keeping them synchronized with the primary Company and Prospect tables.

## 📊 **PostgreSQL Materialized View Capabilities**

### **What PostgreSQL Supports:**
1. **CREATE MATERIALIZED VIEW**: Creates a physical table-like structure
2. **REFRESH MATERIALIZED VIEW**: Updates the view with current data
3. **REFRESH MATERIALIZED VIEW CONCURRENTLY**: Non-blocking refresh (requires unique index)
4. **Indexes on Materialized Views**: Full indexing support for performance
5. **Triggers on Materialized Views**: Can be used for custom refresh logic

### **What PostgreSQL Does NOT Support:**
1. **Automatic Refresh**: No built-in auto-refresh mechanism
2. **Real-time Updates**: Changes to base tables don't automatically update the view
3. **Incremental Updates**: Full refresh required (unless custom logic implemented)

## 🏗️ **Proposed Materialized View Structure**

### **1. Primary Materialized View: CompanyProspectView**
```sql
CREATE MATERIALIZED VIEW company_prospect_view AS
SELECT 
  -- Company fields
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
  c.createdAt as company_createdAt,
  c.updatedAt as company_updatedAt,
  
  -- Prospect fields
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
  p.createdAt as prospect_createdAt,
  p.updatedAt as prospect_updatedAt,
  
  -- Computed fields
  CASE 
    WHEN p.firstName IS NOT NULL AND p.lastName IS NOT NULL 
    THEN CONCAT(p.firstName, ' ', p.lastName)
    WHEN p.firstName IS NOT NULL 
    THEN p.firstName
    WHEN p.lastName IS NOT NULL 
    THEN p.lastName
    ELSE NULL
  END as full_name,
  
  CASE 
    WHEN c.revenue IS NOT NULL AND c.revenue > 0
    THEN 
      CASE 
        WHEN c.revenue >= 1000000000 THEN CONCAT(ROUND(c.revenue/1000000000, 1), 'B')
        WHEN c.revenue >= 1000000 THEN CONCAT(ROUND(c.revenue/1000000, 1), 'M')
        WHEN c.revenue >= 1000 THEN CONCAT(ROUND(c.revenue/1000, 1), 'K')
        ELSE CONCAT('$', c.revenue)
      END
    ELSE 'NA'
  END as formatted_revenue

FROM "Company" c
LEFT JOIN "Prospect" p ON c.id = p.companyId
ORDER BY c.name, p.lastName, p.firstName;
```

### **2. Indexes on Materialized View**
```sql
-- Primary performance indexes
CREATE UNIQUE INDEX idx_company_prospect_view_company_prospect 
ON company_prospect_view(company_id, prospect_id);

CREATE INDEX idx_company_prospect_view_company_id 
ON company_prospect_view(company_id);

CREATE INDEX idx_company_prospect_view_prospect_id 
ON company_prospect_view(prospect_id);

CREATE INDEX idx_company_prospect_view_email 
ON company_prospect_view(email);

CREATE INDEX idx_company_prospect_view_domain 
ON company_prospect_view(domain);

CREATE INDEX idx_company_prospect_view_company_name 
ON company_prospect_view(company_name);

CREATE INDEX idx_company_prospect_view_industry 
ON company_prospect_view(industry);

CREATE INDEX idx_company_prospect_view_revenue 
ON company_prospect_view(revenue);

CREATE INDEX idx_company_prospect_view_job_title 
ON company_prospect_view(jobTitle);

CREATE INDEX idx_company_prospect_view_department 
ON company_prospect_view(department);

CREATE INDEX idx_company_prospect_view_country 
ON company_prospect_view(company_country);

CREATE INDEX idx_company_prospect_view_city 
ON company_prospect_view(company_city);

-- Composite indexes for common queries
CREATE INDEX idx_company_prospect_view_company_industry 
ON company_prospect_view(company_name, industry);

CREATE INDEX idx_company_prospect_view_prospect_company 
ON company_prospect_view(full_name, company_name);
```

### **3. Specialized Materialized Views**

#### **Company Summary View**
```sql
CREATE MATERIALIZED VIEW company_summary_view AS
SELECT 
  c.id as company_id,
  c.domain,
  c.name as company_name,
  c.industry,
  c.minEmployeeSize,
  c.maxEmployeeSize,
  c.revenue,
  c.address,
  c.city,
  c.state,
  c.country,
  COUNT(p.id) as prospect_count,
  COUNT(DISTINCT p.department) as department_count,
  COUNT(DISTINCT p.jobTitleLevel) as job_level_count,
  MAX(p.updatedAt) as last_prospect_update
FROM "Company" c
LEFT JOIN "Prospect" p ON c.id = p.companyId
GROUP BY c.id, c.domain, c.name, c.industry, c.minEmployeeSize, 
         c.maxEmployeeSize, c.revenue, c.address, c.city, c.state, c.country;
```

#### **Prospect Search View**
```sql
CREATE MATERIALIZED VIEW prospect_search_view AS
SELECT 
  p.id as prospect_id,
  p.email,
  p.firstName,
  p.lastName,
  p.jobTitle,
  p.jobTitleLevel,
  p.department,
  p.city as prospect_city,
  p.country as prospect_country,
  c.id as company_id,
  c.domain,
  c.name as company_name,
  c.industry,
  c.revenue,
  c.city as company_city,
  c.country as company_country,
  -- Search optimization fields
  LOWER(CONCAT(
    COALESCE(p.firstName, ''), ' ',
    COALESCE(p.lastName, ''), ' ',
    COALESCE(p.email, ''), ' ',
    COALESCE(p.jobTitle, ''), ' ',
    COALESCE(c.name, ''), ' ',
    COALESCE(c.industry, '')
  )) as search_text
FROM "Prospect" p
INNER JOIN "Company" c ON p.companyId = c.id;
```

## 🔄 **Data Synchronization Strategies**

### **Strategy 1: Scheduled Refresh (Recommended for Most Cases)**

#### **Implementation:**
```sql
-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  -- Refresh main view
  REFRESH MATERIALIZED VIEW CONCURRENTLY company_prospect_view;
  
  -- Refresh summary view
  REFRESH MATERIALIZED VIEW CONCURRENTLY company_summary_view;
  
  -- Refresh search view
  REFRESH MATERIALIZED VIEW CONCURRENTLY prospect_search_view;
  
  -- Log refresh
  INSERT INTO materialized_view_log (view_name, refreshed_at) 
  VALUES ('all_views', NOW());
END;
$$ LANGUAGE plpgsql;
```

#### **Scheduling Options:**
1. **PostgreSQL pg_cron Extension** (if available):
   ```sql
   SELECT cron.schedule('refresh-views', '*/15 * * * *', 'SELECT refresh_materialized_views();');
   ```

2. **Application-level Cron Job**:
   ```bash
   # Every 15 minutes
   */15 * * * * docker-compose exec postgres psql -U app -d app -c "SELECT refresh_materialized_views();"
   ```

3. **Database-level Event Scheduler** (PostgreSQL 14+):
   ```sql
   CREATE EVENT refresh_views
   ON SCHEDULE EVERY 15 MINUTE
   DO CALL refresh_materialized_views();
   ```

### **Strategy 2: Trigger-based Refresh (Real-time)**

#### **Implementation:**
```sql
-- Create refresh trigger function
CREATE OR REPLACE FUNCTION trigger_refresh_views()
RETURNS TRIGGER AS $$
BEGIN
  -- Use pg_notify to signal application to refresh
  PERFORM pg_notify('refresh_views', 'company_prospect_data_changed');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on Company table
CREATE TRIGGER company_refresh_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Company"
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_views();

-- Create triggers on Prospect table
CREATE TRIGGER prospect_refresh_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Prospect"
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_views();
```

#### **Application Listener:**
```javascript
// In Node.js application
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect();
client.on('notification', (msg) => {
  if (msg.channel === 'refresh_views') {
    // Refresh materialized views
    refreshMaterializedViews();
  }
});

client.query('LISTEN refresh_views');
```

### **Strategy 3: Hybrid Approach (Recommended)**

#### **Implementation:**
1. **Scheduled Refresh**: Every 15 minutes for consistency
2. **Trigger-based Notifications**: For immediate awareness
3. **Manual Refresh**: For critical updates
4. **Stale Data Handling**: Graceful degradation when views are stale

## 📈 **Performance Considerations**

### **Refresh Performance:**
- **CONCURRENTLY**: Non-blocking but requires unique index
- **Full Refresh**: Faster but blocks reads during refresh
- **Incremental Updates**: Custom logic for large datasets

### **Storage Requirements:**
- **Materialized Views**: Additional storage (typically 1.5-2x base data)
- **Indexes**: Additional storage for performance indexes
- **Temporary Space**: Required during refresh operations

### **Query Performance:**
- **Read Performance**: 10-100x faster than JOIN queries
- **Write Performance**: No impact on base table writes
- **Memory Usage**: Views cached in PostgreSQL buffer pool

## 🛠️ **Implementation Plan**

### **Phase 1: Basic Materialized View**
1. Create `company_prospect_view` with basic fields
2. Add essential indexes
3. Implement manual refresh mechanism
4. Test with small dataset

### **Phase 2: Advanced Views**
1. Add specialized views (summary, search)
2. Implement computed fields
3. Add comprehensive indexing
4. Performance testing

### **Phase 3: Automation**
1. Implement scheduled refresh
2. Add trigger-based notifications
3. Create monitoring and logging
4. Error handling and recovery

### **Phase 4: Optimization**
1. Analyze query patterns
2. Optimize indexes
3. Implement incremental refresh (if needed)
4. Performance tuning

## 📊 **Monitoring and Maintenance**

### **Health Checks:**
```sql
-- Check view freshness
SELECT 
  schemaname,
  matviewname,
  matviewowner,
  tablespace,
  hasindexes,
  ispopulated,
  definition
FROM pg_matviews 
WHERE matviewname LIKE '%company%' OR matviewname LIKE '%prospect%';

-- Check refresh history
SELECT * FROM materialized_view_log 
ORDER BY refreshed_at DESC 
LIMIT 10;

-- Check view sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename LIKE '%company%' OR tablename LIKE '%prospect%';
```

### **Error Handling:**
```sql
-- Create error logging table
CREATE TABLE materialized_view_errors (
  id SERIAL PRIMARY KEY,
  view_name VARCHAR(100),
  error_message TEXT,
  occurred_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced refresh function with error handling
CREATE OR REPLACE FUNCTION refresh_materialized_views_safe()
RETURNS void AS $$
DECLARE
  view_name TEXT;
  error_msg TEXT;
BEGIN
  FOR view_name IN SELECT matviewname FROM pg_matviews 
  WHERE matviewname LIKE '%company%' OR matviewname LIKE '%prospect%'
  LOOP
    BEGIN
      EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY ' || view_name;
    EXCEPTION WHEN OTHERS THEN
      error_msg := SQLERRM;
      INSERT INTO materialized_view_errors (view_name, error_message) 
      VALUES (view_name, error_msg);
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## ⚠️ **Risks and Mitigation**

### **1. Stale Data Risk**
- **Risk**: Views may contain outdated information
- **Mitigation**: 
  - Short refresh intervals (15 minutes)
  - Stale data indicators in UI
  - Manual refresh capability

### **2. Performance Impact**
- **Risk**: Refresh operations may impact system performance
- **Mitigation**:
  - Use CONCURRENTLY for non-blocking refresh
  - Schedule refreshes during low-traffic periods
  - Monitor system resources during refresh

### **3. Storage Overhead**
- **Risk**: Materialized views consume additional storage
- **Mitigation**:
  - Monitor storage usage
  - Implement data retention policies
  - Optimize view definitions

### **4. Complexity**
- **Risk**: Additional complexity in data management
- **Mitigation**:
  - Comprehensive documentation
  - Automated monitoring
  - Clear rollback procedures

## 🎯 **Success Criteria**

1. **Performance**: 10x+ improvement in query response times
2. **Reliability**: 99.9% uptime for materialized views
3. **Freshness**: Data no more than 15 minutes stale
4. **Maintenance**: Automated refresh with minimal manual intervention
5. **Scalability**: Views perform well with 100k+ records

## 📅 **Timeline**

- **Phase 1**: 2-3 days (basic view and refresh)
- **Phase 2**: 3-4 days (advanced views and indexing)
- **Phase 3**: 2-3 days (automation and monitoring)
- **Phase 4**: 2-3 days (optimization and tuning)

**Total Estimated Time**: 9-13 days

---

*This strategy provides a robust foundation for high-performance data access while maintaining data consistency and system reliability.*
