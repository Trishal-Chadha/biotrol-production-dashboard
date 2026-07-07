/*
# Add active status to products table

## Overview
Adds an `active` boolean column to the `products` table to support
activate/deactivate functionality, plus a unique constraint on the
combination of (code, category) so that Product Code is unique within
its Category.

## Changes to existing tables

### products
- Added `active` (boolean, NOT NULL, default true) — marks a product
  as Active or Inactive. Existing rows default to Active (true).
- Added UNIQUE constraint `products_code_category_key` on (code, category)
  so that a Product Code is unique within its Category.

## Security
- No RLS policy changes. Existing anon + authenticated CRUD policies
  on `products` remain unchanged.

## Important notes
1. The `active` column defaults to `true`, so all existing product rows
   are automatically marked Active after this migration.
2. The unique constraint is on (code, category) where both are nullable.
   NULL values are treated as distinct by PostgreSQL, so existing rows
   with NULL code or category are not affected.
3. No data is lost — this is an additive migration only.
*/

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Unique constraint: Product Code must be unique within its Category
DROP INDEX IF EXISTS products_code_category_key;
CREATE UNIQUE INDEX IF NOT EXISTS products_code_category_key
  ON products (code, category);
