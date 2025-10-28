-- Test pricing system tables and data
-- Check if tables exist and have data

-- 1. Check room_pricing table structure and data
SELECT 
  'room_pricing' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT room_id) as unique_rooms
FROM room_pricing;

-- 2. Check pricing_templates table structure and data  
SELECT 
  'pricing_templates' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT hotel_id) as unique_hotels
FROM pricing_templates;

-- 3. Check pricing_conflicts table structure and data
SELECT 
  'pricing_conflicts' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT room_id) as unique_rooms_with_conflicts
FROM pricing_conflicts;

-- 4. Check if there are any rooms with pricing data
SELECT 
  r.id as room_id,
  r.name as room_name,
  r.base_price,
  COUNT(rp.id) as pricing_rules_count
FROM rooms r
LEFT JOIN room_pricing rp ON r.id = rp.room_id
GROUP BY r.id, r.name, r.base_price
ORDER BY pricing_rules_count DESC;

-- 5. Check RLS policies for pricing tables
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
