-- =============================================
-- Migration: Add omd_id to contact_inquiries table
-- =============================================
-- This migration adds the omd_id column to contact_inquiries table
-- to allow filtering inquiries by OMD in the admin dashboard

-- Add omd_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'contact_inquiries' 
        AND column_name = 'omd_id'
    ) THEN
        ALTER TABLE contact_inquiries 
        ADD COLUMN omd_id UUID REFERENCES omds(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN contact_inquiries.omd_id IS 'OMD that this inquiry is related to, for filtering in admin dashboard';
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_contact_inquiries_omd_id ON contact_inquiries(omd_id);
    END IF;
END $$;

