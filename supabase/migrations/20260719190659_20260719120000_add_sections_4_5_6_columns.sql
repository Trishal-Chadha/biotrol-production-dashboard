/*
# Add columns for Production sections 4-6 and Packaging sections 4-6

## Summary
The Production Data entry form previously supported up to 3 production
product sections and up to 3 packaging product sections per record.
This migration extends that to 6 sections of each, so users can record
up to 6 production products and up to 6 packaging products in a single
production entry. The change is purely additive: new nullable columns
are added for the additional sections. Existing rows are NOT modified
and remain exactly as they are.

## New Columns (all nullable — existing rows are unaffected)

Production "No. of Tests Produced" for the new product sections:
- `prod_tests_4` integer — No. of Tests Produced for Product 4
- `prod_tests_5` integer — No. of Tests Produced for Product 5
- `prod_tests_6` integer — No. of Tests Produced for Product 6

Packaging product slots 4, 5, 6 (product id, pouches, remarks each):
- `pkg_product_id_4` uuid FK → products(id) — packaging product 4
- `pkg_pouches_4`   integer — number of pouches for packaging product 4
- `pkg_remarks_4`   text    — remarks for packaging product 4
- `pkg_product_id_5` uuid FK → products(id) — packaging product 5
- `pkg_pouches_5`   integer — number of pouches for packaging product 5
- `pkg_remarks_5`   text    — remarks for packaging product 5
- `pkg_product_id_6` uuid FK → products(id) — packaging product 6
- `pkg_pouches_6`   integer — number of pouches for packaging product 6
- `pkg_remarks_6`   text    — remarks for packaging product 6

## Security
- No RLS or policy changes. Existing production_data policies still apply.
- All new columns are nullable and default to NULL; existing rows are
  unaffected and remain valid.

## Important Notes
1. This is an additive ALTER TABLE only — no data is lost, renamed,
   dropped, or modified. Existing production records (including all
   records up to today) remain exactly as they are.
2. All new columns are nullable, so existing rows are valid without
   any changes.
3. The frontend form will be updated separately to render 6 production
   sections and 6 packaging sections, reusing the existing searchable
   Product dropdown component for every section.
4. Backward compatibility: records saved before this migration continue
   to load, display, and edit exactly as before. Sections 4-6 simply
   appear as empty/optional fields on those records.
*/

ALTER TABLE production_data
  ADD COLUMN IF NOT EXISTS prod_tests_4 integer,
  ADD COLUMN IF NOT EXISTS prod_tests_5 integer,
  ADD COLUMN IF NOT EXISTS prod_tests_6 integer,
  ADD COLUMN IF NOT EXISTS pkg_product_id_4 uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pkg_pouches_4 integer,
  ADD COLUMN IF NOT EXISTS pkg_remarks_4 text,
  ADD COLUMN IF NOT EXISTS pkg_product_id_5 uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pkg_pouches_5 integer,
  ADD COLUMN IF NOT EXISTS pkg_remarks_5 text,
  ADD COLUMN IF NOT EXISTS pkg_product_id_6 uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pkg_pouches_6 integer,
  ADD COLUMN IF NOT EXISTS pkg_remarks_6 text;
