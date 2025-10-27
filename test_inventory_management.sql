-- =============================================
-- Comprehensive Inventory Management Test
-- =============================================

-- Step 1: Check current reservations and their room assignments
SELECT 
  r.id AS reservation_id,
  r.confirmation_number,
  r.check_in_date,
  r.check_out_date,
  r.reservation_status,
  r.individual_room_id,
  ir.room_number,
  ir.floor_number,
  r.rooms->>'name' AS room_type
FROM reservations r
LEFT JOIN individual_rooms ir ON ir.id = r.individual_room_id
WHERE r.reservation_status IN ('confirmed', 'checked_in', 'checked_out')
ORDER BY r.check_in_date;

-- Step 2: Find any duplicate room assignments (same room, overlapping dates)
SELECT 
  ir.room_number,
  ir.floor_number,
  COUNT(*) as duplicate_count,
  array_agg(r.confirmation_number) as reservation_numbers,
  array_agg(r.check_in_date) as check_in_dates,
  array_agg(r.check_out_date) as check_out_dates
FROM reservations r
JOIN individual_rooms ir ON ir.id = r.individual_room_id
WHERE r.reservation_status IN ('confirmed', 'checked_in', 'checked_out')
  AND r.individual_room_id IS NOT NULL
GROUP BY ir.room_number, ir.floor_number
HAVING COUNT(*) > 1;

-- Step 3: Check for overlapping reservations on the same room
WITH overlapping_reservations AS (
  SELECT 
    r1.id AS reservation_id_1,
    r1.confirmation_number AS conf_num_1,
    r1.check_in_date AS check_in_1,
    r1.check_out_date AS check_out_1,
    r2.id AS reservation_id_2,
    r2.confirmation_number AS conf_num_2,
    r2.check_in_date AS check_in_2,
    r2.check_out_date AS check_out_2,
    r1.individual_room_id,
    ir.room_number,
    ir.floor_number
  FROM reservations r1
  JOIN reservations r2 ON r1.individual_room_id = r2.individual_room_id
  JOIN individual_rooms ir ON ir.id = r1.individual_room_id
  WHERE r1.id < r2.id
    AND r1.reservation_status IN ('confirmed', 'checked_in', 'checked_out')
    AND r2.reservation_status IN ('confirmed', 'checked_in', 'checked_out')
    AND NOT (r1.check_out_date <= r2.check_in_date OR r1.check_in_date >= r2.check_out_date)
)
SELECT * FROM overlapping_reservations;

-- Step 4: Test the availability check function
SELECT 
  is_room_available_for_reservation(
    '875f5155-76ae-4014-92ca-bf2a419ba88e'::UUID, -- Replace with actual room ID
    '2024-01-15'::DATE, -- Replace with test dates
    '2024-01-20'::DATE,
    NULL
  ) AS is_available;

-- Step 5: Get total room inventory vs current bookings
SELECT 
  r.id AS room_type_id,
  r.name AS room_type,
  r.quantity AS total_rooms,
  COUNT(DISTINCT ir.id) AS individual_rooms_count,
  COUNT(DISTINCT CASE WHEN res.reservation_status IN ('confirmed', 'checked_in', 'checked_out') 
    THEN res.id END) AS booked_rooms,
  r.quantity - COUNT(DISTINCT CASE WHEN res.reservation_status IN ('confirmed', 'checked_in', 'checked_out') 
    THEN res.id END) AS available_rooms
FROM rooms r
LEFT JOIN individual_rooms ir ON ir.room_id = r.id
LEFT JOIN reservations res ON res.room_id = r.id
  AND res.check_in_date <= CURRENT_DATE
  AND res.check_out_date > CURRENT_DATE
GROUP BY r.id, r.name, r.quantity;
