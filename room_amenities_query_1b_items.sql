-- Query 1b: Show individual amenity items from rooms (to see their format)
SELECT 
    r.id AS room_id,
    r.name AS room_name,
    b.name AS hotel_name,
    jsonb_array_elements(r.room_amenities) AS amenity_item,
    jsonb_typeof(jsonb_array_elements(r.room_amenities)) AS item_type
FROM rooms r
JOIN hotels h ON r.hotel_id = h.id
JOIN businesses b ON h.business_id = b.id
WHERE r.room_amenities IS NOT NULL 
  AND r.room_amenities != '[]'::jsonb
ORDER BY b.name, r.name;

