-- Debug script to check for .single() errors
-- This error typically occurs when a query expects exactly 1 row but gets 0

-- Check if the hotel exists
SELECT 'Hotel Check' as check_type, id, name, business_id 
FROM hotels 
WHERE id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8';

-- Check if the business exists
SELECT 'Business Check' as check_type, id, name, slug 
FROM businesses 
WHERE id = (SELECT business_id FROM hotels WHERE id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8');

-- Check rooms for this hotel
SELECT 'Rooms Check' as check_type, COUNT(*) as room_count
FROM rooms 
WHERE hotel_id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8';

-- Check if there are any reservations for this hotel
SELECT 'Reservations Check' as check_type, COUNT(*) as reservation_count
FROM reservations 
WHERE hotel_id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8';

-- Check individual rooms
SELECT 'Individual Rooms Check' as check_type, COUNT(*) as individual_room_count
FROM individual_rooms 
WHERE hotel_id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8';

-- Check booking channels
SELECT 'Booking Channels Check' as check_type, COUNT(*) as channel_count
FROM booking_channels;
