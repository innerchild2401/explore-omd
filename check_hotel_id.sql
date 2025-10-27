-- Check if reservations have valid hotel_id
SELECT 
  r.id,
  r.confirmation_number,
  r.hotel_id,
  h.id as hotel_exists,
  h.business_id
FROM reservations r
LEFT JOIN hotels h ON r.hotel_id = h.id;

