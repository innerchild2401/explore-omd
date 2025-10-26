-- =============================================
-- FIX IMAGES SCHEMA FOR PROPER OBJECT STORAGE
-- Migration: 14_fix_images_schema.sql
-- =============================================

-- This migration fixes the images column from TEXT[] to JSONB[]
-- to properly store objects with url and description properties

-- =============================================
-- 1. CHECK CURRENT DATA STRUCTURE
-- =============================================

-- First, let's see what we're working with
SELECT 
    'Current businesses images:' as info,
    id,
    name,
    images,
    array_length(images, 1) as image_count,
    pg_typeof(images) as column_type
FROM businesses 
WHERE images IS NOT NULL 
    AND array_length(images, 1) > 0
ORDER BY updated_at DESC
LIMIT 3;

-- =============================================
-- 2. FIX BUSINESSES TABLE
-- =============================================

-- Add new JSONB array column
ALTER TABLE businesses 
ADD COLUMN images_new JSONB[] DEFAULT '{}';

-- Migrate existing data (convert stringified JSON to proper JSONB objects)
UPDATE businesses 
SET images_new = (
    SELECT COALESCE(
        array_agg(
            CASE 
                WHEN img IS NULL THEN NULL
                WHEN img::text ~ '^\s*\{.*\}\s*$' THEN 
                    -- It's already a JSON string, parse it
                    img::jsonb
                WHEN img::text ~ '^https?://' THEN 
                    -- It's a plain URL, wrap it in an object
                    jsonb_build_object('url', img::text, 'description', '')
                ELSE 
                    -- Fallback: treat as URL
                    jsonb_build_object('url', img::text, 'description', '')
            END
        ), 
        '{}'::jsonb[]
    )
    FROM unnest(COALESCE(images, '{}'::text[])) AS img
)
WHERE images IS NOT NULL;

-- Drop old column and rename new one
ALTER TABLE businesses DROP COLUMN images;
ALTER TABLE businesses RENAME COLUMN images_new TO images;

-- =============================================
-- 3. FIX ROOMS TABLE
-- =============================================

-- Add new JSONB array column
ALTER TABLE rooms 
ADD COLUMN images_new JSONB[] DEFAULT '{}';

-- Migrate existing data
UPDATE rooms 
SET images_new = (
    SELECT COALESCE(
        array_agg(
            CASE 
                WHEN img IS NULL THEN NULL
                WHEN img::text ~ '^\s*\{.*\}\s*$' THEN 
                    -- It's already a JSON string, parse it
                    img::jsonb
                WHEN img::text ~ '^https?://' THEN 
                    -- It's a plain URL, wrap it in an object
                    jsonb_build_object('url', img::text, 'description', '')
                ELSE 
                    -- Fallback: treat as URL
                    jsonb_build_object('url', img::text, 'description', '')
            END
        ), 
        '{}'::jsonb[]
    )
    FROM unnest(COALESCE(images, '{}'::text[])) AS img
)
WHERE images IS NOT NULL;

-- Drop old column and rename new one
ALTER TABLE rooms DROP COLUMN images;
ALTER TABLE rooms RENAME COLUMN images_new TO images;

-- =============================================
-- 4. VERIFY THE CHANGES
-- =============================================

-- Check businesses table
SELECT 
    'After migration - businesses:' as info,
    id,
    name,
    images,
    array_length(images, 1) as image_count,
    pg_typeof(images) as column_type
FROM businesses 
WHERE images IS NOT NULL 
    AND array_length(images, 1) > 0
ORDER BY updated_at DESC
LIMIT 3;

-- Check rooms table
SELECT 
    'After migration - rooms:' as info,
    id,
    name,
    images,
    array_length(images, 1) as image_count,
    pg_typeof(images) as column_type
FROM rooms 
WHERE images IS NOT NULL 
    AND array_length(images, 1) > 0
ORDER BY updated_at DESC
LIMIT 3;

-- =============================================
-- 5. TEST QUERY TO EXTRACT URLS
-- =============================================

-- Test that we can now properly extract URLs from the JSONB objects
SELECT 
    'URL extraction test:' as info,
    id,
    name,
    images,
    -- Extract just the URLs
    array_agg(img->>'url') as extracted_urls,
    -- Extract descriptions
    array_agg(img->>'description') as extracted_descriptions
FROM businesses,
     unnest(images) as img
WHERE images IS NOT NULL 
    AND array_length(images, 1) > 0
GROUP BY id, name, images
ORDER BY updated_at DESC
LIMIT 2;
