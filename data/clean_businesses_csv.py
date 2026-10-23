#!/usr/bin/env python3
"""
Clean the CareFinder Liberia facility CSV without connecting to Supabase.
Usage:
  python clean_businesses_csv.py businesses.csv businesses_cleaned.csv
Requires Python 3 only.
"""
import csv
import re
import sys

if len(sys.argv) != 3:
    raise SystemExit("Usage: python clean_businesses_csv.py input.csv output.csv")

input_path, output_path = sys.argv[1], sys.argv[2]

with open(input_path, "r", newline="", encoding="utf-8-sig") as source:
    reader = csv.DictReader(source)
    if not reader.fieldnames:
        raise SystemExit("ERROR: CSV has no header row.")

    required = {
        "id", "name", "category", "description", "street", "town", "county",
        "address", "phones", "website", "email", "verification_status",
        "review_count", "is_demo", "source"
    }
    missing = required - set(reader.fieldnames)
    if missing:
        raise SystemExit("ERROR: Missing columns: " + ", ".join(sorted(missing)))

    rows = []
    seen_ids = set()
    duplicate_ids = []
    for row in reader:
        row = {key: (value or "").strip() for key, value in row.items()}
        # Convert phone values like {"+231 886 410 594"} into plain text.
        row["phones"] = re.sub(r'^\{\s*"?|"?\s*\}$', "", row["phones"]).strip()
        # Validate ID and name without silently changing IDs.
        if not row["id"] or not row["name"]:
            raise SystemExit("ERROR: A row is missing id or name.")
        if row["id"] in seen_ids:
            duplicate_ids.append(row["id"])
        seen_ids.add(row["id"])
        if row["review_count"] == "":
            row["review_count"] = "0"
        rows.append(row)

    if duplicate_ids:
        raise SystemExit(
            f"ERROR: Found {len(duplicate_ids)} duplicate IDs. Resolve them before import."
        )

with open(output_path, "w", newline="", encoding="utf-8") as target:
    writer = csv.DictWriter(target, fieldnames=reader.fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)

print(f"Cleaned {len(rows)} rows into {output_path}")
print("Note: this script does not verify facilities or invent missing coordinates.")
