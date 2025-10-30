-- Check if there are ANY reservations in the database
SELECT 
    COUNT(*) as total_reservations_count
FROM reservations;

-- List all reservations with their hotel_id and status
SELECT 
    r.id,
    r.confirmation_number,
    r.hotel_id as reservation_hotel_id,
    r.reservation_status,
    b.name as business_name
FROM reservations r
LEFT JOIN businesses b ON b.id = r.hotel_id
ORDER BY r.created_at DESC
LIMIT 20;
