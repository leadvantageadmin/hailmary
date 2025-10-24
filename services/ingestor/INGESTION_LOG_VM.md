# CSV Ingestion Log - VM Environment

This document tracks the ingestion details for each CSV file processed by the ingestor service on the VM environment.

## Ingestion Summary

| File Name | Date Processed | CSV Records | Companies Processed | Prospects Processed | Companies Added | Prospects Added | Processing Time | Status | Company Prospect View Count (Before) | Company Prospect View Count (After) |
|-----------|----------------|-------------|-------------------|-------------------|----------------|----------------|-----------------|---------|-------------------------------------|-------------------------------------|
| | | | | | | | | | | |

## Database Counts Tracking

### Current Database State
- **Companies**: 0
- **Prospects**: 0  
- **Company Prospect View**: 0

### Elasticsearch Index Counts
- **Company Index**: 0
- **Prospect Index**: 0
- **Company Prospect View Index**: 0

## VM Environment Notes

- **Environment**: VM/Production
- **Database**: PostgreSQL (hailmary-postgres:5432)
- **Elasticsearch**: Via CDC service
- **Redis**: Cache layer
- **Materialized View Refresh**: Automatic via CDC

## Ingestion Process

Each ingestion process will:
1. **Before Ingestion**: Capture current company_prospect_view count
2. **Process CSV**: Parse and normalize data
3. **Database Operations**: Insert/update companies and prospects
4. **After Ingestion**: Capture updated company_prospect_view count
5. **CDC Sync**: Automatic sync to Elasticsearch indices
6. **Logging**: Record all metrics in this file

## Monitoring

### Health Checks
- Database connectivity
- Materialized view refresh status
- CDC service health
- Elasticsearch index synchronization

### Performance Metrics
- Processing time per file
- Records processed per second
- Database operation efficiency
- CDC sync timing

---

*Last Updated: 2025-10-24*
*Environment: VM/Production*
*Location: /opt/hailmary/services/ingestor/INGESTION_LOG_VM.md*
