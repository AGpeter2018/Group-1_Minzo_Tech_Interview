-- CareFinder Liberia: staging table for businesses.csv
-- Run this in Supabase SQL Editor BEFORE importing the cleaned CSV.
-- This table is separate from public.businesses and does not change live records.

CREATE TABLE IF NOT EXISTS public.businesses_csv_staging (
    id TEXT,
    name TEXT,
    category TEXT,
    description TEXT,
    street TEXT,
    town TEXT,
    county TEXT,
    address TEXT,
    phones TEXT,
    website TEXT,
    email TEXT,
    verification_status TEXT,
    review_count INTEGER,
    is_demo BOOLEAN,
    source TEXT
);

-- After importing businesses_cleaned.csv through Table Editor, run:
SELECT COUNT(*) AS imported_rows
FROM public.businesses_csv_staging;

-- Expected count for the supplied file: 329.
