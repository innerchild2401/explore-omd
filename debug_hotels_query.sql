-- Debug the initial hotels query step by step

-- 1. Check if OMD exists
SELECT id, name, slug FROM omds WHERE slug = 'mangalia';

-- 2. Check if businesses exist for this OMD
SELECT 
  b.id as business_id,
  b.name as business_name,
  b.slug as business_slug,
  b.omd_id
FROM businesses b
WHERE b.omd_id = (SELECT id FROM omds WHERE slug = 'mangalia');

-- 3. Check if hotels exist for these businesses
SELECT 
  h.id as hotel_id,
  h.business_id,
  b.name as business_name,
  b.slug as business_slug
FROM hotels h
JOIN businesses b ON h.business_id = b.id
WHERE b.omd_id = (SELECT id FROM omds WHERE slug = 'mangalia');

-- 4. Test the exact query from the frontend
SELECT 
  h.*,
  b.id as business_id,
  b.name as business_name,
  b.description,
  b.slug as business_slug,
  b.images,
  b.address,
  b.phone,
  b.email,
  b.website,
  b.rating
FROM hotels h
JOIN businesses b ON h.business_id = b.id
WHERE b.omd_id = (SELECT id FROM omds WHERE slug = 'mangalia');
