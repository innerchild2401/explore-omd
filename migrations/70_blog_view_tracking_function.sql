-- =============================================
-- BLOG VIEW TRACKING FUNCTION
-- Migration: 70_blog_view_tracking_function.sql
-- =============================================
-- 
-- Creates a function to atomically increment blog post view count
-- =============================================

-- Function to atomically increment blog post view count
CREATE OR REPLACE FUNCTION increment_blog_post_view_count(p_post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE blog_posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_post_id;
END;
$$;

-- Grant execute permission to authenticated users and anon
GRANT EXECUTE ON FUNCTION increment_blog_post_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_blog_post_view_count(UUID) TO anon;

