/*
# Add "No. of Tests Produced" columns to production_data

## Summary
Each Product Data Entry section (up to 3 products per production entry)
now has a dedicated "No. of Tests Produced" field. Previously, the production
section only captured sheets and target sheets per product. This migration
adds three nullable integer columns — one per product section — so users
can record the number of tests produced for each product independently.

## New Columns (all nullable — existing rows are unaffected)
- `prod_tests_1` integer — No. of Tests Produced for Product 1
- `prod_tests_2` integer — No. of Tests Produced for Product 2
- `prod_tests_3` integer — No. of Tests Produced for Product 3

## Security
- No RLS or policy changes. Existing production_data policies still apply.
- All new columns are nullable and default to NULL; existing rows are unaffected.

## Notes
1. This is an additive ALTER TABLE only — no data is lost or modified.
2. The columns are nullable so existing records remain valid without changes.
3. The frontend form already supports 3 product sections; these columns
   give each section its own "No. of Tests Produced" input.
*/

ALTER TABLE production_data
  ADD COLUMN IF NOT EXISTS prod_tests_1 integer,
  ADD COLUMN IF NOT EXISTS prod_tests_2 integer,
  ADD COLUMN IF NOT EXISTS prod_tests_3 integer;
