-- Debug hotel availability filtering issue - Combined queries
-- Check what data we have and why hotels aren't showing as available

-- 1. Check all hotels in the OMD
SELECT 
  'HOTELS_OVERVIEW' as query_type,
  h.id as hotel_id,
  h.business_id,
  b.name as hotel_name,
  b.slug,
  NULL as business_active,
  COUNT(r.id) as total_rooms,
  COUNT(CASE WHEN r.is_active = true THEN 1 END) as active_rooms,
  NULL as room_id,
  NULL as room_name,
  NULL as reservation_id,
  NULL as reservation_status,
  NULL as check_in_date,
  NULL as check_out_date,
  NULL as is_available
FROM hotels h
JOIN businesses b ON h.business_id = b.id
LEFT JOIN rooms r ON h.id = r.hotel_id
WHERE b.omd_id = (SELECT id FROM omds WHERE slug = 'mangalia')
GROUP BY h.id, h.business_id, b.name, b.slug

UNION ALL

-- 2. Check rooms for each hotel
SELECT 
  'ROOMS_DETAILS' as query_type,
  h.id as hotel_id,
  h.business_id,
  b.name as hotel_name,
  b.slug,
  NULL as business_active,
  NULL as total_rooms,
  NULL as active_rooms,
  r.id as room_id,
  r.name as room_name,
  NULL as reservation_id,
  NULL as reservation_status,
  NULL as check_in_date,
  NULL as check_out_date,
  NULL as is_available
FROM hotels h
JOIN businesses b ON h.business_id = b.id
LEFT JOIN rooms r ON h.id = r.hotel_id
WHERE b.omd_id = (SELECT id FROM omds WHERE slug = 'mangalia')

UNION ALL

-- 3. Check reservations for these hotels
SELECT 
  'RESERVATIONS' as query_type,
  h.id as hotel_id,
  h.business_id,
  b.name as hotel_name,
  b.slug,
  NULL as business_active,
  NULL as total_rooms,
  NULL as active_rooms,
  res.room_id as room_id,
  r.name as room_name,
  res.id as reservation_id,
  res.reservation_status,
  res.check_in_date,
  res.check_out_date,
  NULL as is_available
FROM hotels h
JOIN businesses b ON h.business_id = b.id
LEFT JOIN reservations res ON h.id = res.hotel_id
LEFT JOIN rooms r ON res.room_id = r.id
WHERE b.omd_id = (SELECT id FROM omds WHERE slug = 'mangalia')

UNION ALL

-- 4. Test the availability function with sample dates
-- Replace '2026-06-07' and '2026-06-14' with your actual search dates
SELECT 
  'AVAILABILITY_TEST' as query_type,
  h.id as hotel_id,
  h.business_id,
  b.name as hotel_name,
  b.slug,
  NULL as business_active,
  NULL as total_rooms,
  NULL as active_rooms,
  NULL as room_id,
  NULL as room_name,
  NULL as reservation_id,
  NULL as reservation_status,
  NULL as check_in_date,
  NULL as check_out_date,
  check_hotel_availability_simple_bookings(
    h.id,
    '2026-06-07'::DATE,
    '2026-06-14'::DATE,
    1,
    0
  ) as is_available
FROM hotels h
JOIN businesses b ON h.business_id = b.id
WHERE b.omd_id = (SELECT id FROM omds WHERE slug = 'mangalia')

UNION ALL

-- 5. Check if there are any room availability records
SELECT 
  'ROOM_AVAILABILITY' as query_type,
  h.id as hotel_id,
  h.business_id,
  b.name as hotel_name,
  b.slug,
  NULL as business_active,
  NULL as total_rooms,
  NULL as active_rooms,
  ra.room_id as room_id,
  r.name as room_name,
  ra.reservation_id,
  NULL as reservation_status,
  ra.date as check_in_date,
  NULL as check_out_date,
  NULL as is_available
FROM room_availability ra
JOIN rooms r ON ra.room_id = r.id
JOIN hotels h ON r.hotel_id = h.id
JOIN businesses b ON h.business_id = b.id
WHERE b.omd_id = (SELECT id FROM omds WHERE slug = 'mangalia')

ORDER BY query_type, hotel_name, room_name;
