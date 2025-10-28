-- =============================================
-- SIMPLER DEBUG QUERY FOR PENDING RESERVATIONS
-- =============================================

-- Check reservations without inner joins first
SELECT 
  'Reservations without joins' as check_type,
  r.id,
  r.confirmation_number,
  r.reservation_status,
  r.hotel_id,
  r.guest_id,
  r.room_id,
  r.channel_id,
  r.check_in_date,
  r.check_out_date,
  r.created_at
FROM reservations r
WHERE r.reservation_status = 'tentative'
ORDER BY r.created_at DESC;

-- Check if the joins work
SELECT 
  'Reservations with joins' as check_type,
  r.id,
  r.confirmation_number,
  r.reservation_status,
  gp.first_name,
  gp.last_name,
  gp.email,
  rm.name as room_name,
  bc.display_name as channel_name
FROM reservations r
LEFT JOIN guest_profiles gp ON r.guest_id = gp.id
LEFT JOIN rooms rm ON r.room_id = rm.id  
LEFT JOIN booking_channels bc ON r.channel_id = bc.id
WHERE r.reservation_status = 'tentative'
ORDER BY r.created_at DESC;

-- Check what hotel_id is being used in the admin panel
-- (You'll need to check the browser console or component for this)
SELECT 
  'All hotels' as check_type,
  h.id as hotel_id,
  b.name as business_name,
  b.slug as business_slug
FROM hotels h
JOIN businesses b ON h.business_id = b.id
ORDER BY b.name;
