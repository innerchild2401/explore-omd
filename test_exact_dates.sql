-- Test availability function with the exact dates from the search
SELECT 
  h.id as hotel_id,
  b.name as hotel_name,
  check_hotel_availability_simple_bookings(
    h.id,
    '2026-07-06'::DATE,
    '2026-07-10'::DATE,
    1,
    0
  ) as is_available_function_result
FROM hotels h
JOIN businesses b ON h.business_id = b.id
WHERE b.omd_id = (SELECT id FROM omds WHERE slug = 'mangalia');
