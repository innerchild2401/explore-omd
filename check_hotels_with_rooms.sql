-- Check hotels with rooms for auto-top-pages generation
-- Replace 'YOUR_OMD_ID' with your actual OMD ID

-- 1. Get all active published hotels
SELECT 
  b.id as business_id,
  b.name as business_name,
  b.slug,
  b.status,
  b.is_published,
  h.id as hotel_id,
  COUNT(r.id) as room_count,
  MIN(r.base_price) as min_price,
  MAX(r.base_price) as max_price
FROM businesses b
LEFT JOIN hotels h ON h.business_id = b.id
LEFT JOIN rooms r ON r.hotel_id = h.id AND r.is_active = true
WHERE b.type = 'hotel'
  AND b.status = 'active'
  AND b.is_published = true
  -- Replace with your OMD ID:
  -- AND b.omd_id = 'YOUR_OMD_ID'
GROUP BY b.id, b.name, b.slug, b.status, b.is_published, h.id
HAVING COUNT(r.id) > 0
ORDER BY min_price ASC;

-- 2. Detailed view - see all rooms for each hotel
SELECT 
  b.id as business_id,
  b.name as business_name,
  b.slug,
  h.id as hotel_id,
  r.id as room_id,
  r.name as room_name,
  r.base_price,
  r.is_active as room_active
FROM businesses b
INNER JOIN hotels h ON h.business_id = b.id
INNER JOIN rooms r ON r.hotel_id = h.id
WHERE b.type = 'hotel'
  AND b.status = 'active'
  AND b.is_published = true
  AND r.is_active = true
  AND r.base_price > 0
  -- Replace with your OMD ID:
  -- AND b.omd_id = 'YOUR_OMD_ID'
ORDER BY b.name, r.base_price ASC;

-- 3. Count summary
SELECT 
  COUNT(DISTINCT b.id) as total_hotels,
  COUNT(DISTINCT h.id) as hotels_with_hotel_record,
  COUNT(DISTINCT r.id) as total_active_rooms,
  COUNT(DISTINCT CASE WHEN r.base_price > 0 THEN r.id END) as rooms_with_price
FROM businesses b
LEFT JOIN hotels h ON h.business_id = b.id
LEFT JOIN rooms r ON r.hotel_id = h.id AND r.is_active = true
WHERE b.type = 'hotel'
  AND b.status = 'active'
  AND b.is_published = true;
  -- Replace with your OMD ID:
  -- AND b.omd_id = 'YOUR_OMD_ID';

