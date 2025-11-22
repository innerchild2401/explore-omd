-- =============================================
-- GRANT SUPER ADMIN FULL OMD UPDATE PERMISSIONS
-- Migration: 61_grant_super_admin_omd_update.sql
-- =============================================

-- Allow super admins to update any OMD regardless of omd_id assignment
DROP POLICY IF EXISTS "Super admins can update any OMD" ON omds;

CREATE POLICY "Super admins can update any OMD"
ON omds
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'super_admin'
  )
);

-- Provide verification feedback
SELECT 'Super admins can now update any OMD' AS status;








