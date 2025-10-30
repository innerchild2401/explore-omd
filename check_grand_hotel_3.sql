-- Query 3: Find ALL reservations for this hotel
SELECT 
    r.id as reservation_id,
    r.confirmation_number,
    r.reservation_status,
    r.payment_status,
    r.check_in_date,
    r.check_out_date,
    r.total_amount,
    r.created_at,
    gp.first_name || ' ' || gp.last_name as guest_name,
    g.name as room_name
FROM reservations r
LEFT JOIN guest_profiles gp ON gp.id = r.guest_id
LEFT JOIN rooms g ON g.id = r.room_id
WHERE r.hotel_id IN (
    SELECT id FROM businesses 
    WHERE slug = 'grand-hotel-caraiman' OR name ILIKE '%grand hotel caraiman%'
)
ORDER BY r.created_at DESC;

