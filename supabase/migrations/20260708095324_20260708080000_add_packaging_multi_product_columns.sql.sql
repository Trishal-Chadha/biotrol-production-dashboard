/*
# Add multi-product packaging columns to production_data

## Summary
The Packaging section of a Production Entry now supports entering up to 3
products in a single submission. Previously only one packaging product could
be recorded per record. This migration adds nullable columns for a second and
third packaging product (product id, number of pouches, remarks), plus a
dedicated `pkg_pouches` column for the first packaging product so every
product section has its own "No. of Pouches" field.

## New Columns (all nullable — packaging data is optional)
- `pkg_pouches`     integer — number of pouches for packaging product 1
- `pkg_product_id_2` uuid FK → products(id) — packaging product 2
- `pkg_pouches_2`   integer — number of pouches for packaging product 2
- `pkg_remarks_2`   text    — remarks for packaging product 2
- `pkg_product_id_3` uuid FK → products(id) — packaging product 3
- `pkg_pouches_3`   integer — number of pouches for packaging product 3
- `pkg_remarks_3`   text    — remarks for packaging product 3

## Security
- No RLS or policy changes. Existing production_data policies still apply.
- All new columns are nullable and default to NULL; existing rows are unaffected.

## Notes
1. The existing `pkg_product_id`, `pkg_employees`, `pkg_incharge_id`, and
   `pkg_remarks` columns remain and now describe packaging product 1 and the
   shared packaging staffing fields (incharge + employees apply to all 3
   product sections).
2. No data is lost — this is an additive ALTER TABLE only.
*/

ALTER TABLE production_data
  ADD COLUMN IF NOT EXISTS pkg_pouches integer,
  ADD COLUMN IF NOT EXISTS pkg_product_id_2 uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pkg_pouches_2 integer,
  ADD COLUMN IF NOT EXISTS pkg_remarks_2 text,
  ADD COLUMN IF NOT EXISTS pkg_product_id_3 uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pkg_pouches_3 integer,
  ADD COLUMN IF NOT EXISTS pkg_remarks_3 text;
