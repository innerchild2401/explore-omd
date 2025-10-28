-- Check current reservation status after approval
SELECT 
  id,
  confirmation_number,
  reservation_status,
  hotel_id,
  guest_id,
  room_id,
  channel_id,
  check_in_date,
  check_out_date,
  created_at
FROM reservations 
WHERE hotel_id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8'
ORDER BY created_at DESC
LIMIT 5;
