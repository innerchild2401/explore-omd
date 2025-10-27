-- Debug why bookings tab shows nothing
-- Test if the query structure works

-- 1. Check if reservations have the required foreign keys
SELECT 
  r.id,
  r.confirmation_number,
  r.guest_id,
  r.room_id,
  r.channel_id,
  r.hotel_id,
  r.check_in_date,
  r.reservation_status
FROM reservations r
LIMIT 5;

-- 2. Check if guest_profiles exists for these reservations
SELECT 
  r.id,
  gp.id as guest_profile_id,
  gp.first_name,
  gp.last_name
FROM reservations r
LEFT JOIN guest_profiles gp ON r.guest_id = gp.id
LIMIT 5;

-- 3. Check if rooms exist for these reservations
SELECT 
  r.id,
  r.room_id,
  rm.name as room_name
FROM reservations r
LEFT JOIN rooms rm ON r.room_id = rm.id
LIMIT 5;

-- 4. Check if booking_channels exist
SELECT 
  r.id,
  r.channel_id,
  bc.name as channel_name
FROM reservations r
LEFT JOIN booking_channels bc ON r.channel_id = bc.id
LIMIT 5;

