-- Add standardized location fields to Customer table
-- This migration adds both standardized codes and display names for fast reads

-- Add standardized location codes
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS country_code VARCHAR(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS state_code VARCHAR(10);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS city_code VARCHAR(20);

-- Add denormalized display names for fast UI rendering
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS country_display VARCHAR(100);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS state_display VARCHAR(100);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS city_display VARCHAR(100);

-- Create indexes for fast filtering and searching
CREATE INDEX IF NOT EXISTS idx_customer_country_code ON "Customer"(country_code);
CREATE INDEX IF NOT EXISTS idx_customer_state_code ON "Customer"(state_code);
CREATE INDEX IF NOT EXISTS idx_customer_city_code ON "Customer"(city_code);

-- Create composite indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_customer_location_codes ON "Customer"(country_code, state_code, city_code);

-- Create indexes for display names (useful for UI searches)
CREATE INDEX IF NOT EXISTS idx_customer_country_display ON "Customer"(country_display);
CREATE INDEX IF NOT EXISTS idx_customer_state_display ON "Customer"(state_display);
CREATE INDEX IF NOT EXISTS idx_customer_city_display ON "Customer"(city_display);

-- Add comments for documentation
COMMENT ON COLUMN "Customer".country_code IS 'Standardized ISO3 country code (e.g., USA, GBR, CAN)';
COMMENT ON COLUMN "Customer".state_code IS 'Standardized state/province code (e.g., CA, NY, NSW)';
COMMENT ON COLUMN "Customer".city_code IS 'Standardized city code or normalized name';
COMMENT ON COLUMN "Customer".country_display IS 'Human-readable country name for UI display';
COMMENT ON COLUMN "Customer".state_display IS 'Human-readable state/province name for UI display';
COMMENT ON COLUMN "Customer".city_display IS 'Human-readable city name for UI display';
