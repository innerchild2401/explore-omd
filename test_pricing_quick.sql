-- Quick test to see if pricing system is working
-- Run this to check the current state

-- Check if we have any rooms
SELECT 
  'rooms' as table_name,
  COUNT(*) as count
FROM rooms;

-- Check if we have any pricing data
SELECT 
  'room_pricing' as table_name,
  COUNT(*) as count
FROM room_pricing;

-- Check if we have any pricing templates
SELECT 
  'pricing_templates' as table_name,
  COUNT(*) as count
FROM pricing_templates;

-- Check a specific room's pricing (replace with actual room ID)
SELECT 
  r.id,
  r.name,
  r.base_price,
  rp.start_date,
  rp.end_date,
  rp.price_per_night,
  rp.pricing_type
FROM rooms r
LEFT JOIN room_pricing rp ON r.id = rp.room_id
WHERE r.is_active = true
LIMIT 5;
