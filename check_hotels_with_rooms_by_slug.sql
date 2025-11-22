-- Check hotels with rooms for a specific OMD by slug
-- Replace 'lamare' with your OMD slug
-- Shows detailed room information for each hotel

SELECT 
  o.name as omd_name,
  o.slug as omd_slug,
  b.id as business_id,
  b.name as business_name,
  b.slug as business_slug,
  b.status,
  b.is_published,
  h.id as hotel_id,
  r.id as room_id,
  r.name as room_name,
  r.base_price,
  r.is_active as room_active,
  r.room_type,
  -- Summary columns (same for all rows of same hotel)
  COUNT(*) OVER (PARTITION BY b.id) as total_rooms_for_hotel,
  MIN(r.base_price) OVER (PARTITION BY b.id) as min_price_for_hotel,
  MAX(r.base_price) OVER (PARTITION BY b.id) as max_price_for_hotel
FROM businesses b
INNER JOIN omds o ON o.id = b.omd_id
INNER JOIN hotels h ON h.business_id = b.id
INNER JOIN rooms r ON r.hotel_id = h.id
WHERE b.type = 'hotel'
  AND b.status = 'active'
  AND b.is_published = true
  AND r.is_active = true
  AND r.base_price > 0
  AND o.slug = 'lamare'  -- Replace with your OMD slug
ORDER BY b.name, r.base_price ASC;

