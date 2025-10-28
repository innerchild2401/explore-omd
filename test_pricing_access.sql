-- Test to see if pricing system is accessible
-- Check if we can query the pricing tables

-- Test 1: Check if room_pricing table is accessible
SELECT 
  rp.id,
  rp.room_id,
  rp.start_date,
  rp.end_date,
  rp.price_per_night,
  r.name as room_name
FROM room_pricing rp
JOIN rooms r ON rp.room_id = r.id
LIMIT 5;

-- Test 2: Check if pricing_templates table is accessible
SELECT 
  pt.id,
  pt.hotel_id,
  pt.name,
  pt.description,
  h.business_id
FROM pricing_templates pt
JOIN hotels h ON pt.hotel_id = h.id
LIMIT 5;

-- Test 3: Check RLS policies for pricing tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('room_pricing', 'pricing_templates', 'pricing_conflicts')
ORDER BY tablename, policyname;
