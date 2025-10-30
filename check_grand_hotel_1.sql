-- Query 1: Find the business record for Grand Hotel Caraiman
SELECT 
    id as business_id,
    name as business_name,
    slug as business_slug
FROM businesses 
WHERE slug = 'grand-hotel-caraiman' OR name ILIKE '%grand hotel caraiman%';

