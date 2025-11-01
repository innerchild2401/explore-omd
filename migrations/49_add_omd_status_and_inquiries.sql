-- =============================================
-- ADD OMD STATUS AND CONTACT INQUIRIES
-- Migration: 49_add_omd_status_and_inquiries.sql
-- =============================================

-- Step 1: Add status field to omds table
ALTER TABLE omds 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive'));

-- Step 2: Create contact_inquiries table
CREATE TABLE IF NOT EXISTS contact_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'resolved', 'archived')),
    notes TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Enable RLS on contact_inquiries
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for contact_inquiries
-- Allow anonymous users to create inquiries (from the form)
CREATE POLICY "Anyone can create contact inquiries"
ON contact_inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow super admins to view all inquiries
CREATE POLICY "Super admins can view all inquiries"
ON contact_inquiries
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
);

-- Allow super admins to update all inquiries
CREATE POLICY "Super admins can update all inquiries"
ON contact_inquiries
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
);

-- Allow super admins to delete all inquiries
CREATE POLICY "Super admins can delete all inquiries"
ON contact_inquiries
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
);

-- Step 5: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON contact_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON contact_inquiries(created_at DESC);

-- Step 6: Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_inquiries_updated_at
    BEFORE UPDATE ON contact_inquiries
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_inquiries_updated_at();

-- Step 7: Update existing OMDs to be active (not pending)
UPDATE omds SET status = 'active' WHERE status IS NULL OR status = '';

-- Verification queries
SELECT 'Migration completed successfully' as status;
SELECT 'OMD table updated with status field' as check_1;
SELECT 'Contact inquiries table created' as check_2;
SELECT COUNT(*) as existing_inquiries FROM contact_inquiries;

