-- Query 6: Verify the relationship between hotels and rooms
SELECT 
    r.id as room_id,
    r.name as room_name,
    r.hotel_id as room_hotel_id,
    h.id as hotels_id,
    h.business_id as hotels_business_id,
    b.id as businesses_id,
    b.name as business_name
FROM rooms r
LEFT JOIN hotels h ON h.id = r.hotel_id
LEFT JOIN businesses b ON b.id = h.business_id
WHERE b.slug = 'grand-hotel-caraiman' OR b.name ILIKE '%grand hotel caraiman%';

