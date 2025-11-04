-- =============================================
-- Check Blocked Dates in Database
-- =============================================

-- 1. Check blocked dates in room_availability (for room types)
-- This table stores blocked dates for room types (not individual rooms)
SELECT 
    ra.id,
    ra.room_id,
    r.name as room_name,
    r.hotel_id,
    h.name as hotel_name,
    ra.date,
    ra.availability_status,
    ra.blocked_reason,
    ra.available_quantity,
    ra.created_at,
    ra.updated_at
FROM room_availability ra
JOIN rooms r ON ra.room_id = r.id
JOIN hotels h ON r.hotel_id = h.id
WHERE ra.availability_status = 'blocked'
ORDER BY ra.date DESC, r.name;

-- 2. Check blocked dates in individual_room_availability (for individual physical rooms)
-- This table stores blocked dates for specific physical rooms
SELECT 
    ira.id,
    ira.individual_room_id,
    ir.room_number,
    ir.floor_number,
    ir.room_id as room_type_id,
    r.name as room_type_name,
    r.hotel_id,
    h.name as hotel_name,
    ira.date,
    ira.status,
    ira.reservation_id,
    ira.created_at,
    ira.updated_at
FROM individual_room_availability ira
JOIN individual_rooms ir ON ira.individual_room_id = ir.id
JOIN rooms r ON ir.room_id = r.id
JOIN hotels h ON r.hotel_id = h.id
WHERE ira.status = 'blocked'
ORDER BY ira.date DESC, ir.room_number;

-- 3. Summary: Count of blocked dates by room
SELECT 
    'Room Type' as block_type,
    r.name as room_name,
    COUNT(*) as blocked_dates_count,
    MIN(ra.date) as earliest_blocked_date,
    MAX(ra.date) as latest_blocked_date
FROM room_availability ra
JOIN rooms r ON ra.room_id = r.id
WHERE ra.availability_status = 'blocked'
GROUP BY r.id, r.name
ORDER BY blocked_dates_count DESC

UNION ALL

SELECT 
    'Individual Room' as block_type,
    r.name || ' - Room #' || ir.room_number as room_name,
    COUNT(*) as blocked_dates_count,
    MIN(ira.date) as earliest_blocked_date,
    MAX(ira.date) as latest_blocked_date
FROM individual_room_availability ira
JOIN individual_rooms ir ON ira.individual_room_id = ir.id
JOIN rooms r ON ir.room_id = r.id
WHERE ira.status = 'blocked'
GROUP BY r.id, r.name, ir.room_number
ORDER BY blocked_dates_count DESC;

-- 4. Check for blocked dates in the future (active blocks)
SELECT 
    'Room Type' as block_type,
    r.name as room_name,
    ra.date,
    ra.blocked_reason,
    ra.created_at
FROM room_availability ra
JOIN rooms r ON ra.room_id = r.id
WHERE ra.availability_status = 'blocked'
    AND ra.date >= CURRENT_DATE
ORDER BY ra.date, r.name

UNION ALL

SELECT 
    'Individual Room' as block_type,
    r.name || ' - Room #' || ir.room_number as room_name,
    ira.date,
    NULL as blocked_reason,
    ira.created_at
FROM individual_room_availability ira
JOIN individual_rooms ir ON ira.individual_room_id = ir.id
JOIN rooms r ON ir.room_id = r.id
WHERE ira.status = 'blocked'
    AND ira.date >= CURRENT_DATE
ORDER BY date, room_name;

