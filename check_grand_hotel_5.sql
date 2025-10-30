-- Query 5: Summary counts by status
SELECT 
    COUNT(*) FILTER (WHERE reservation_status = 'tentative') as pending_count,
    COUNT(*) FILTER (WHERE reservation_status = 'confirmed') as confirmed_count,
    COUNT(*) FILTER (WHERE reservation_status = 'checked_in') as checked_in_count,
    COUNT(*) as total_reservations
FROM reservations
WHERE hotel_id IN (
    SELECT id FROM businesses 
    WHERE slug = 'grand-hotel-caraiman' OR name ILIKE '%grand hotel caraiman%'
);

