-- Query 3: Check which room amenities match existing OMD amenities
-- This is the MAIN diagnostic query - run this first!
WITH room_amenity_items AS (
    SELECT 
        r.id AS room_id,
        r.name AS room_name,
        b.id AS business_id,
        b.omd_id,
        jsonb_array_elements_text(r.room_amenities) AS amenity_id_string,
        jsonb_array_elements(r.room_amenities) AS amenity_item_raw
    FROM rooms r
    JOIN hotels h ON r.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE r.room_amenities IS NOT NULL 
      AND r.room_amenities != '[]'::jsonb
),
parsed_amenities AS (
    SELECT 
        room_id,
        room_name,
        business_id,
        omd_id,
        amenity_id_string,
        amenity_item_raw,
        -- Try to extract ID from different possible formats
        CASE 
            WHEN jsonb_typeof(amenity_item_raw) = 'string' THEN amenity_item_raw::text
            WHEN jsonb_typeof(amenity_item_raw) = 'object' THEN 
                COALESCE(
                    amenity_item_raw->>'id',
                    amenity_item_raw->>'amenity_id',
                    amenity_item_raw->>'key',
                    amenity_item_raw->>'slug',
                    amenity_id_string
                )
            ELSE amenity_id_string
        END AS extracted_id
    FROM room_amenity_items
)
SELECT 
    pa.room_id,
    pa.room_name,
    pa.extracted_id AS room_amenity_id,
    pa.amenity_item_raw AS raw_data,
    CASE 
        WHEN oa.id IS NOT NULL THEN '✓ MATCHED'
        ELSE '✗ NOT FOUND'
    END AS match_status,
    oa.name AS matched_amenity_name,
    oa.category AS matched_category,
    oa.icon AS matched_icon,
    b.name AS hotel_name,
    o.name AS omd_name
FROM parsed_amenities pa
LEFT JOIN omd_amenities oa ON pa.extracted_id = oa.id::text 
    AND pa.omd_id = oa.omd_id
JOIN businesses b ON pa.business_id = b.id
JOIN omds o ON pa.omd_id = o.id
ORDER BY 
    match_status DESC,
    o.name,
    b.name,
    pa.room_name;

