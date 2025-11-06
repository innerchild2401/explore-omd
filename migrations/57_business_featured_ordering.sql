-- =============================================
-- BUSINESS FEATURED ORDERING SYSTEM
-- Migration: 57_business_featured_ordering.sql
-- =============================================

-- Add featured_order field to businesses table
-- Values: 1, 2, or 3 for featured businesses (first 3 shown), NULL for others
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS featured_order INTEGER 
  CHECK (featured_order IS NULL OR (featured_order >= 1 AND featured_order <= 3));

-- Create unique constraint: only one business per OMD can have each featured_order (1, 2, or 3)
-- This ensures we can't have duplicate featured orders within the same OMD
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_featured_order_unique 
ON businesses(omd_id, featured_order) 
WHERE featured_order IS NOT NULL;

-- Create index for faster queries when sorting by featured order
CREATE INDEX IF NOT EXISTS idx_businesses_featured_order 
ON businesses(omd_id, featured_order) 
WHERE featured_order IS NOT NULL;

-- Add comment
COMMENT ON COLUMN businesses.featured_order IS 'Featured order (1-3) set by OMD admin. Businesses with featured_order 1, 2, 3 are shown first, then remaining members (random), then non-members (random).';

