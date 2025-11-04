-- =============================================
-- Check Blocked Dates in Database
-- =============================================

-- QUERY 1: Blocked dates in room_availability (for room types)
-- Run this first and share the results
SELECT 
    ra.id,
    ra.room_id,
    r.name as room_name,
    r.hotel_id,
    b.name as hotel_name,
    ra.date,
    ra.availability_status,
    ra.blocked_reason,
    ra.available_quantity,
    ra.created_at
FROM room_availability ra
JOIN rooms r ON ra.room_id = r.id
JOIN hotels h ON r.hotel_id = h.id
JOIN businesses b ON h.business_id = b.id
WHERE ra.availability_status = 'blocked'
ORDER BY ra.date DESC, r.name;

-- QUERY 2: Blocked dates in individual_room_availability (for individual physical rooms)
-- Run this second and share the results
SELECT 
    ira.id,
    ira.individual_room_id,
    ir.room_number,
    ir.floor_number,
    ir.room_id as room_type_id,
    r.name as room_type_name,
    r.hotel_id,
    b.name as hotel_name,
    ira.date,
    ira.status,
    ira.reservation_id,
    ira.created_at,
    ira.updated_at
FROM individual_room_availability ira
JOIN individual_rooms ir ON ira.individual_room_id = ir.id
JOIN rooms r ON ir.room_id = r.id
JOIN hotels h ON r.hotel_id = h.id
JOIN businesses b ON h.business_id = b.id
WHERE ira.status = 'blocked'
ORDER BY ira.date DESC, ir.room_number;
