-- Fix the hotel_id in reservations
-- Reservations currently have business_id as hotel_id
-- Need to update them to use the actual hotel id

UPDATE reservations 
SET hotel_id = (
  SELECT h.id 
  FROM hotels h 
  WHERE h.business_id = reservations.hotel_id
)
WHERE hotel_id = 'bda301a9-b939-4e1c-9d7d-8c3970887c43';

-- Verify the fix
SELECT 
  r.id,
  r.confirmation_number,
  r.hotel_id,
  h.id as hotel_exists,
  h.business_id
FROM reservations r
LEFT JOIN hotels h ON r.hotel_id = h.id;

