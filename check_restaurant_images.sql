-- Query to check restaurant images and count
-- Specifically for tais-gastrobar restaurant

SELECT 
    b.id,
    b.name,
    b.slug,
    b.images,
    array_length(b.images, 1) as image_count,
    pg_typeof(b.images) as column_type
FROM businesses b
JOIN restaurants r ON r.business_id = b.id
WHERE b.slug = 'tais-gastrobar'
   AND b.type = 'restaurant'
   AND b.status = 'active';

-- To see all images for all restaurants in mangalia:
-- SELECT 
--     b.name,
--     b.slug,
--     array_length(b.images, 1) as image_count,
--     b.images
-- FROM businesses b
-- JOIN restaurants r ON r.business_id = b.id
-- JOIN omds o ON b.omd_id = o.id
-- WHERE o.slug = 'mangalia'
--    AND b.type = 'restaurant'
-- ORDER BY image_count DESC NULLS LAST;

