-- =============================================
-- COMPREHENSIVE DIAGNOSTIC QUERY
-- =============================================

-- 1. Check if reservations exist
SELECT 'STEP 1: Checking reservations' as step;
SELECT 
  COUNT(*) as total_reservations,
  COUNT(CASE WHEN individual_room_id IS NULL THEN 1 END) as unassigned_reservations,
  COUNT(CASE WHEN individual_room_id IS NOT NULL THEN 1 END) as assigned_reservations
FROM reservations;

-- 2. Show all reservations
SELECT 'STEP 2: All Reservations' as step;
SELECT 
  id,
  confirmation_number,
  check_in_date,
  check_out_date,
  reservation_status,
  individual_room_id,
  adults,
  children,
  infants,
  created_at
FROM reservations
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check hotels
SELECT 'STEP 3: Hotels' as step;
SELECT 
  id,
  business_id,
  property_subtype
FROM hotels;

-- 4. Check room types (rooms table)
SELECT 'STEP 4: Room Types' as step;
SELECT 
  id,
  name,
  hotel_id,
  room_type,
  quantity,
  is_active
FROM rooms
ORDER BY name;

-- 5. Check individual rooms
SELECT 'STEP 5: Individual Rooms' as step;
SELECT 
  ir.id,
  ir.room_number,
  ir.floor_number,
  ir.current_status,
  r.name as room_type_name
FROM individual_rooms ir
JOIN rooms r ON ir.room_id = r.id
ORDER BY r.name, ir.room_number;

-- 6. Count individual rooms per room type
SELECT 'STEP 6: Individual Rooms Summary' as step;
SELECT 
  r.name as room_type,
  COUNT(ir.id) as total_individual_rooms,
  COUNT(CASE WHEN ir.current_status = 'clean' THEN 1 END) as clean,
  COUNT(CASE WHEN ir.current_status = 'occupied' THEN 1 END) as occupied
FROM rooms r
LEFT JOIN individual_rooms ir ON r.id = ir.room_id
GROUP BY r.id, r.name
ORDER BY r.name;

-- 7. Check reservations with room assignment details
SELECT 'STEP 7: Reservations with Room Details' as step;
SELECT 
  res.id as reservation_id,
  res.confirmation_number,
  res.check_in_date,
  res.check_out_date,
  res.reservation_status,
  res.individual_room_id,
  ir.room_number as assigned_room_number,
  r.name as room_type
FROM reservations res
LEFT JOIN individual_rooms ir ON res.individual_room_id = ir.id
LEFT JOIN rooms r ON res.room_id = r.id
ORDER BY res.check_in_date DESC;

