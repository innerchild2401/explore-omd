-- =============================================
-- FEATURED BUSINESSES FOR EMAIL RECOMMENDATIONS
-- Migration: 55_featured_businesses_for_emails.sql
-- =============================================

-- Add featured flag to businesses table for OMD admin to set featured items
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_featured_for_emails BOOLEAN DEFAULT false;

-- Add order index for featured items (to control order when explicitly set)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email_featured_order INTEGER;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_businesses_featured_for_emails ON businesses(omd_id, is_featured_for_emails, email_featured_order) WHERE is_featured_for_emails = true;

-- Add comment
COMMENT ON COLUMN businesses.is_featured_for_emails IS 'Set by OMD admin to feature this business in post-checkin emails';
COMMENT ON COLUMN businesses.email_featured_order IS 'Order index for featured items (lower number = higher priority)';

