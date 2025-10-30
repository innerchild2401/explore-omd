-- Check a specific reservation with room pricing details
SELECT 
    r.id,
    r.confirmation_number,
    r.check_in_date,
    r.check_out_date,
    (r.check_out_date - r.check_in_date) as nights,
    r.base_rate,
    r.taxes,
    r.fees,
    r.total_amount,
    r.reservation_status,
    room.id as room_id,
    room.name as room_name,
    room.base_price as room_base_price
FROM reservations r
LEFT JOIN rooms room ON room.id = r.room_id
WHERE r.confirmation_number = 'WEB-1761825574672';

