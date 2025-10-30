-- Check one specific reservation and all its related data
SELECT 
    r.id as reservation_id,
    r.confirmation_number,
    r.hotel_id,
    r.guest_id,
    r.room_id,
    r.channel_id,
    r.reservation_status,
    r.payment_status,
    r.check_in_date,
    r.check_out_date,
    gp.id as guest_profile_id,
    gp.first_name,
    gp.last_name,
    gp.email,
    room.id as room_table_id,
    room.name as room_name,
    channel.id as channel_table_id,
    channel.name as channel_name
FROM reservations r
LEFT JOIN guest_profiles gp ON gp.id = r.guest_id
LEFT JOIN rooms room ON room.id = r.room_id
LEFT JOIN booking_channels channel ON channel.id = r.channel_id
WHERE r.hotel_id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8'
ORDER BY r.created_at DESC
LIMIT 5;

