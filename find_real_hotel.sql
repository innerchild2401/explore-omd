-- Find what hotels actually exist
SELECT 
  id,
  business_id,
  property_subtype
FROM hotels;

-- Find what the business_id is for the hotel used in reservations
SELECT 
  b.id as business_id,
  b.name as business_name,
  b.type,
  h.id as hotel_id
FROM businesses b
LEFT JOIN hotels h ON h.business_id = b.id
WHERE h.id IS NOT NULL;

