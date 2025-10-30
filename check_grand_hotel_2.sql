-- Query 2: Find the hotel record for this business
SELECT 
    h.id as hotel_id,
    b.id as business_id,
    b.name as business_name
FROM hotels h
JOIN businesses b ON b.id = h.business_id
WHERE b.slug = 'grand-hotel-caraiman' OR b.name ILIKE '%grand hotel caraiman%';

