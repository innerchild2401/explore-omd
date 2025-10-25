-- =============================================
-- ADD EXPLORE SECTION TYPE
-- Migration: 03_add_explore_section.sql
-- =============================================

-- The explore section will be used for the /explore page
-- It contains: title, subtitle, and description
-- This provides context for the full discovery experience

-- Note: No schema changes needed - sections table already supports
-- any JSON content. This migration is just for documentation.

-- Example explore section content:
-- {
--   "title": "Explore Constanta",
--   "subtitle": "Discover all the amazing hotels, restaurants, and experiences",
--   "description": "Welcome to Constanta! From luxury hotels to hidden dining gems..."
-- }

-- To create an explore section, insert via admin panel or SQL:
-- INSERT INTO sections (omd_id, type, content, order_index, is_visible)
-- VALUES (
--   '<omd-id>',
--   'explore',
--   '{"title": "Explore [Destination]", "subtitle": "...", "description": "..."}',
--   1,
--   true
-- );

