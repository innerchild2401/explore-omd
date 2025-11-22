-- =============================================
-- FIX AUTO TOP PAGES RLS FOR UPDATES
-- Migration: 67_fix_auto_top_pages_rls_update.sql
-- =============================================
-- 
-- Allows OMD admins to update last_generated_at field
-- This is needed for the regeneration process
-- =============================================

-- Allow OMD admins to update last_generated_at for pages in their OMD
CREATE POLICY "OMD admins can update last_generated_at for their OMD's pages"
  ON auto_top_pages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('omd_admin', 'super_admin')
        AND (
          user_profiles.role = 'super_admin'
          OR auto_top_pages.omd_id = user_profiles.omd_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('omd_admin', 'super_admin')
        AND (
          user_profiles.role = 'super_admin'
          OR auto_top_pages.omd_id = user_profiles.omd_id
        )
    )
  );

