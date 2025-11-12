-- Query 4: Summary - Count of matched vs unmatched room amenities
WITH room_amenity_items AS (
    SELECT 
        r.id AS room_id,
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
        omd_id,
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
    CASE 
        WHEN oa.id IS NOT NULL THEN 'Matched'
        ELSE 'Unmatched'
    END AS status,
    COUNT(*) AS count,
    STRING_AGG(DISTINCT pa.extracted_id, ', ' ORDER BY pa.extracted_id) AS sample_ids
FROM parsed_amenities pa
LEFT JOIN omd_amenities oa ON pa.extracted_id = oa.id::text 
    AND pa.omd_id = oa.omd_id
GROUP BY status
ORDER BY status;

