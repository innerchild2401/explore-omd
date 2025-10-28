-- =============================================
-- DEBUG BOOKING ISSUE
-- =============================================

-- 1. Check if the reservation was created
SELECT 
  'Recent Reservations' as check_type,
  id,
  confirmation_number,
  reservation_status,
  hotel_id,
  guest_id,
  check_in_date,
  check_out_date,
  created_at
FROM reservations 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check if there are any tentative reservations
SELECT 
  'Tentative Reservations' as check_type,
  id,
  confirmation_number,
  reservation_status,
  hotel_id,
  guest_id,
  check_in_date,
  check_out_date,
  created_at
FROM reservations 
WHERE reservation_status = 'tentative'
ORDER BY created_at DESC;

-- 3. Check guest profiles created today
SELECT 
  'Recent Guest Profiles' as check_type,
  id,
  first_name,
  last_name,
  email,
  created_at
FROM guest_profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check booking channels
SELECT 
  'Booking Channels' as check_type,
  id,
  name,
  display_name,
  channel_type
FROM booking_channels;

-- 5. Check if there are any errors in booking_events
SELECT 
  'Recent Booking Events' as check_type,
  id,
  reservation_id,
  event_type,
  event_description,
  created_at
FROM booking_events 
ORDER BY created_at DESC 
LIMIT 10;
