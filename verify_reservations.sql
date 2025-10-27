-- Check reservations now
SELECT 
  id,
  confirmation_number,
  hotel_id,
  check_in_date,
  check_out_date,
  reservation_status
FROM reservations;

-- Check if the hotel_id matches what hotels table has
SELECT 
  h.id as hotel_id,
  h.business_id,
  (SELECT COUNT(*) FROM reservations r WHERE r.hotel_id = h.id) as reservation_count
FROM hotels h;

