-- Check reservation totals to see if they're correct
SELECT 
    id,
    confirmation_number,
    check_in_date,
    check_out_date,
    (check_out_date - check_in_date) as nights,
    base_rate,
    taxes,
    fees,
    total_amount,
    reservation_status,
    CASE 
        WHEN total_amount != (base_rate + taxes + fees) THEN 'MISMATCH'
        ELSE 'OK'
    END as amount_check
FROM reservations
WHERE hotel_id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8'
ORDER BY created_at DESC;

