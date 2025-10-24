-- Initial Schema Migration v1.0.0
-- Creates all tables for HailMary Customer Search Platform

-- Create Customer table (legacy support)
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL,
    "salutation" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "company" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipCode" TEXT,
    "phone" TEXT,
    "mobilePhone" TEXT,
    "industry" TEXT,
    "jobTitleLevel" TEXT,
    "jobTitle" TEXT,
    "department" TEXT,
    "minEmployeeSize" INTEGER,
    "maxEmployeeSize" INTEGER,
    "jobTitleLink" TEXT,
    "employeeSizeLink" TEXT,
    "revenue" BIGINT,
    "externalSource" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- Create Company table (new normalized structure)
CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "name" TEXT,
    "industry" TEXT,
    "minEmployeeSize" INTEGER,
    "maxEmployeeSize" INTEGER,
    "employeeSizeLink" TEXT,
    "revenue" BIGINT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipCode" TEXT,
    "phone" TEXT,
    "mobilePhone" TEXT,
    "externalSource" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- Create Prospect table (new normalized structure)
CREATE TABLE IF NOT EXISTS "Prospect" (
    "id" TEXT NOT NULL,
    "salutation" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "jobTitle" TEXT,
    "jobTitleLevel" TEXT,
    "department" TEXT,
    "jobTitleLink" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipCode" TEXT,
    "phone" TEXT,
    "mobilePhone" TEXT,
    "companyId" TEXT NOT NULL,
    "externalSource" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- Create materialized view monitoring tables
CREATE TABLE IF NOT EXISTS "MaterializedViewLog" (
    "id" SERIAL PRIMARY KEY,
    "viewName" TEXT NOT NULL,
    "refreshType" TEXT NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    "recordsProcessed" INTEGER
);

CREATE TABLE IF NOT EXISTS "MaterializedViewError" (
    "id" SERIAL PRIMARY KEY,
    "viewName" TEXT,
    "errorMessage" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for Customer table
CREATE INDEX IF NOT EXISTS "Customer_email_idx" ON "Customer"("email");
CREATE INDEX IF NOT EXISTS "Customer_company_idx" ON "Customer"("company");
CREATE INDEX IF NOT EXISTS "Customer_revenue_idx" ON "Customer"("revenue");
CREATE INDEX IF NOT EXISTS "Customer_externalSource_externalId_idx" ON "Customer"("externalSource", "externalId");

-- Create indexes for Company table
CREATE UNIQUE INDEX IF NOT EXISTS "Company_domain_key" ON "Company"("domain");
CREATE INDEX IF NOT EXISTS "Company_name_idx" ON "Company"("name");
CREATE INDEX IF NOT EXISTS "Company_industry_idx" ON "Company"("industry");
CREATE INDEX IF NOT EXISTS "Company_revenue_idx" ON "Company"("revenue");

-- Create indexes for Prospect table
CREATE INDEX IF NOT EXISTS "Prospect_email_idx" ON "Prospect"("email");
CREATE INDEX IF NOT EXISTS "Prospect_companyId_idx" ON "Prospect"("companyId");
CREATE INDEX IF NOT EXISTS "Prospect_externalSource_externalId_idx" ON "Prospect"("externalSource", "externalId");

-- Create indexes for monitoring tables
CREATE INDEX IF NOT EXISTS "MaterializedViewLog_refreshedAt_idx" ON "MaterializedViewLog"("refreshedAt");
CREATE INDEX IF NOT EXISTS "MaterializedViewLog_viewName_idx" ON "MaterializedViewLog"("viewName");
CREATE INDEX IF NOT EXISTS "MaterializedViewError_occurredAt_idx" ON "MaterializedViewError"("occurredAt");
CREATE INDEX IF NOT EXISTS "MaterializedViewError_viewName_idx" ON "MaterializedViewError"("viewName");

-- Add foreign key constraint for Prospect -> Company relationship
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
