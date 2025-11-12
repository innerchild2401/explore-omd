-- Query 1: Show all rooms with their room_amenities (raw JSONB data)
SELECT 
    r.id AS room_id,
    r.name AS room_name,
    h.id AS hotel_id,
    b.name AS hotel_name,
    r.room_amenities,
    jsonb_typeof(r.room_amenities) AS amenities_type,
    jsonb_array_length(r.room_amenities) AS amenities_count
FROM rooms r
JOIN hotels h ON r.hotel_id = h.id
JOIN businesses b ON h.business_id = b.id
WHERE r.room_amenities IS NOT NULL 
  AND r.room_amenities != '[]'::jsonb
ORDER BY b.name, r.name;

