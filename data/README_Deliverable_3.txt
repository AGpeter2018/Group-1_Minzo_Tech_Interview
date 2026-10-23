CAREFINDER LIBERIA — DELIVERABLE 3
Cleaned facility dataset and import preparation

FILES
- businesses_cleaned.csv: cleaned copy of the supplied 329-row CSV.
- clean_businesses_csv.py: repeatable Python 3 cleaning/validation script.
- 01_create_staging_table.sql: creates a safe staging table in Supabase.
- 02_match_existing_records.sql: read-only checks to compare CSV IDs/names with existing businesses.

WHAT WAS CLEANED
- Trimmed leading/trailing whitespace.
- Converted phone values like {"+231 886 410 594"} to +231 886 410 594.
- Preserved source IDs and all 15 columns.
- Did not invent missing street addresses or coordinates.
- Did not mark any facility as verified.

IMPORTANT DATA QUALITY NOTE
The supplied file marks all 329 rows is_demo=true and verification_status=unverified.
Treat these as demo/unverified records until the project team confirms their provenance and validates real facilities, contact details, and coordinates. The CSV contains no latitude/longitude columns.

SUPABASE STEPS
1. Open the correct Supabase project.
2. SQL Editor → run 01_create_staging_table.sql.
3. Table Editor → public.businesses_csv_staging → Import data from CSV.
4. Upload businesses_cleaned.csv and check column mapping.
5. Confirm 329 rows imported.
6. Run the read-only queries in 02_match_existing_records.sql.
7. Review matches before any merge into public.businesses. Do not run a bulk update/insert until the actual businesses table types/columns and matching results are confirmed.

TO RE-RUN CLEANING
python clean_businesses_csv.py businesses.csv businesses_cleaned.csv

This package does not connect to Supabase or write live records.
