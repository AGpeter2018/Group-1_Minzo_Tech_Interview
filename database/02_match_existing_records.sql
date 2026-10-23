-- CareFinder Liberia: read-only matching checks.
-- Run only AFTER importing businesses_cleaned.csv into businesses_csv_staging.
-- These queries do not update or insert into public.businesses.

-- A. Check how many CSV IDs match existing business IDs.
SELECT
    COUNT(*) AS csv_records,
    COUNT(b.id) AS matched_ids,
    COUNT(*) - COUNT(b.id) AS unmatched_ids
FROM public.businesses_csv_staging AS s
LEFT JOIN public.businesses AS b
    ON b.id::text = s.id;

-- B. Find exact-ID matches and compare names.
SELECT
    s.id AS csv_id,
    s.name AS csv_name,
    b.id AS existing_id,
    b.name AS existing_name,
    s.town AS csv_town,
    b.town AS existing_town,
    s.county AS csv_county,
    b.county AS existing_county
FROM public.businesses_csv_staging AS s
JOIN public.businesses AS b
    ON b.id::text = s.id
ORDER BY s.name;

-- C. Find possible name matches with different IDs. These require manual review.
SELECT
    s.id AS csv_id,
    s.name AS csv_name,
    b.id AS existing_id,
    b.name AS existing_name,
    s.town AS csv_town,
    b.town AS existing_town,
    s.county AS csv_county,
    b.county AS existing_county
FROM public.businesses_csv_staging AS s
JOIN public.businesses AS b
    ON LOWER(TRIM(b.name)) = LOWER(TRIM(s.name))
WHERE b.id::text <> s.id
ORDER BY s.name;
