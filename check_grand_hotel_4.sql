-- Query 4: Check for tentative (pending) reservations
SELECT 
    r.id as reservation_id,
    r.confirmation_number,
    r.check_in_date,
    r.check_out_date,
    gp.first_name || ' ' || gp.last_name as guest_name,
    r.total_amount,
    r.created_at
FROM reservations r
LEFT JOIN guest_profiles gp ON gp.id = r.guest_id
WHERE r.hotel_id IN (
    SELECT id FROM businesses 
    WHERE slug = 'grand-hotel-caraiman' OR name ILIKE '%grand hotel caraiman%'
)
AND r.reservation_status = 'tentative'
ORDER BY r.created_at DESC;

