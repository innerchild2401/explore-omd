-- =============================================
-- OMD MEMBER BADGE SYSTEM
-- Migration: 56_omd_member_badge.sql
-- =============================================

-- Add is_omd_member flag to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_omd_member BOOLEAN DEFAULT false;

-- Create index for faster queries when sorting by OMD member status
CREATE INDEX IF NOT EXISTS idx_businesses_omd_member ON businesses(omd_id, is_omd_member) WHERE is_omd_member = true;

-- Add comment
COMMENT ON COLUMN businesses.is_omd_member IS 'Set by OMD admin to mark businesses as preferred members. Affects sorting and displays "Membru OMD" badge.';

