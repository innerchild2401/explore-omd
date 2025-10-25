-- =============================================
-- SUPABASE STORAGE SETUP FOR IMAGE UPLOADS
-- Migration: 02_setup_storage.sql
-- =============================================

-- Create 'images' storage bucket for public image hosting
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true, -- Public bucket so images can be accessed via URL
  10485760, -- 10MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STORAGE POLICIES FOR 'images' BUCKET
-- =============================================

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images'
);

-- Allow authenticated users to update their own uploads
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images' AND auth.uid() = owner
);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' AND auth.uid() = owner
);

-- Allow public read access to all images (since bucket is public)
CREATE POLICY "Public can view images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'images'
);

