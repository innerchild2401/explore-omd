-- Query 2: Show all OMD amenities with category='room'
SELECT 
    oa.id AS amenity_id,
    oa.name AS amenity_name,
    oa.category,
    oa.icon,
    o.name AS omd_name,
    o.slug AS omd_slug
FROM omd_amenities oa
JOIN omds o ON oa.omd_id = o.id
WHERE oa.category = 'room'
ORDER BY o.name, oa.name;

