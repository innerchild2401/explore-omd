-- =============================================
-- DEBUG: View All Hotel Reservations
-- =============================================
-- This query shows all reservations with their assignment status

SELECT 
  hr.id as reservation_id,
  hr.check_in,
  hr.check_out,
  hr.guests,
  hr.status as reservation_status,
  hr.individual_room_id,
  hr.assignment_method,
  hr.room_assigned_at,
  
  -- Room info
  r.name as room_type,
  r.room_type as room_type_category,
  ir.room_number as individual_room_number,
  ir.floor_number,
  ir.current_status as room_status,
  
  -- Guest info
  hr.guest_name,
  hr.guest_email,
  hr.guest_phone,
  
  -- Hotel info
  h.id as hotel_id,
  
  -- Timestamps
  hr.created_at as reservation_created_at,
  hr.updated_at as reservation_updated_at
  
FROM hotel_reservations hr
LEFT JOIN rooms r ON hr.room_id = r.id
LEFT JOIN individual_rooms ir ON hr.individual_room_id = ir.id
LEFT JOIN hotels h ON hr.hotel_id = h.id
ORDER BY hr.check_in DESC, hr.created_at DESC;

-- =============================================
-- DEBUG: View Unassigned Reservations
-- =============================================

SELECT 
  hr.id as reservation_id,
  hr.check_in,
  hr.check_out,
  hr.guests,
  hr.status,
  r.name as room_type,
  hr.guest_name,
  hr.guest_email,
  hr.created_at
FROM hotel_reservations hr
LEFT JOIN rooms r ON hr.room_id = r.id
WHERE hr.individual_room_id IS NULL
  AND hr.status IN ('confirmed', 'checked_in')
ORDER BY hr.check_in DESC;

-- =============================================
-- DEBUG: Check Individual Rooms Count
-- =============================================

SELECT 
  r.name as room_type_name,
  COUNT(ir.id) as total_individual_rooms,
  COUNT(CASE WHEN ir.current_status = 'clean' THEN 1 END) as clean_rooms,
  COUNT(CASE WHEN ir.current_status = 'occupied' THEN 1 END) as occupied_rooms,
  COUNT(CASE WHEN ir.current_status = 'dirty' THEN 1 END) as dirty_rooms
FROM rooms r
LEFT JOIN individual_rooms ir ON r.id = ir.room_id
WHERE r.is_active = true
GROUP BY r.id, r.name
ORDER BY r.name;

-- =============================================
-- DEBUG: Recent Reservations Activity
-- =============================================

SELECT 
  'Reservations created in last 7 days' as activity,
  COUNT(*) as count
FROM hotel_reservations hr
WHERE hr.created_at >= NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
  'Reservations created in last 30 days' as activity,
  COUNT(*) as count
FROM hotel_reservations hr
WHERE hr.created_at >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
  'Total reservations' as activity,
  COUNT(*) as count
FROM hotel_reservations hr;

