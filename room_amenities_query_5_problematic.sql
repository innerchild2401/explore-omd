-- Query 5: Show rooms that have amenities but no matching OMD amenities
-- Run this to see which specific amenities are problematic
WITH room_amenity_items AS (
    SELECT 
        r.id AS room_id,
        r.name AS room_name,
        b.id AS business_id,
        b.name AS hotel_name,
        b.omd_id,
        o.name AS omd_name,
        jsonb_array_elements(r.room_amenities) AS amenity_item_raw
    FROM rooms r
    JOIN hotels h ON r.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    JOIN omds o ON b.omd_id = o.id
    WHERE r.room_amenities IS NOT NULL 
      AND r.room_amenities != '[]'::jsonb
),
parsed_amenities AS (
    SELECT 
        room_id,
        room_name,
        hotel_name,
        omd_name,
        omd_id,
        CASE 
            WHEN jsonb_typeof(amenity_item_raw) = 'string' THEN amenity_item_raw::text
            WHEN jsonb_typeof(amenity_item_raw) = 'object' THEN 
                COALESCE(
                    amenity_item_raw->>'id',
                    amenity_item_raw->>'amenity_id',
                    amenity_item_raw->>'key',
                    amenity_item_raw->>'slug',
                    amenity_item_raw::text
                )
            ELSE amenity_item_raw::text
        END AS extracted_id,
        amenity_item_raw
    FROM room_amenity_items
)
SELECT 
    pa.omd_name,
    pa.hotel_name,
    pa.room_name,
    pa.extracted_id AS problematic_amenity_id,
    pa.amenity_item_raw AS raw_data_format,
    jsonb_typeof(pa.amenity_item_raw) AS data_type
FROM parsed_amenities pa
LEFT JOIN omd_amenities oa ON pa.extracted_id = oa.id::text 
    AND pa.omd_id = oa.omd_id
WHERE oa.id IS NULL
ORDER BY pa.omd_name, pa.hotel_name, pa.room_name;

