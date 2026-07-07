/*
# Create core tables for Biotrol Professional Production Dashboard

## Overview
Creates the foundational tables for the production dashboard: products, production_entries, and sheet_entries.

## New Tables

### products
- id (uuid, primary key)
- name (text) - Product name
- code (text) - Product code/SKU
- category (text) - Product category
- unit (text) - Unit of measure
- description (text) - Optional description
- created_at (timestamp)

### production_entries
- id (uuid, primary key)
- entry_date (date) - Date of production
- product_id (uuid, FK to products)
- quantity_produced (numeric) - How much was produced
- lot_number (text)
- batch_number (text)
- operator (text)
- remarks (text)
- created_at (timestamp)

### sheet_entries
- id (uuid, primary key)
- entry_date (date) - Date of sheet usage
- product_id (uuid, FK to products, nullable)
- sheets_used (numeric) - Number of sheets used
- lot_number (text)
- batch_number (text)
- remarks (text)
- created_at (timestamp)

## Security
- RLS enabled on all tables with anon + authenticated CRUD (no-auth app)
*/

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  category text,
  unit text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE TO anon, authenticated USING (true);

-- Production entries table
CREATE TABLE IF NOT EXISTS production_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  quantity_produced numeric,
  lot_number text,
  batch_number text,
  operator text,
  remarks text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE production_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_production_entries" ON production_entries;
CREATE POLICY "anon_select_production_entries" ON production_entries FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_production_entries" ON production_entries;
CREATE POLICY "anon_insert_production_entries" ON production_entries FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_production_entries" ON production_entries;
CREATE POLICY "anon_update_production_entries" ON production_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_production_entries" ON production_entries;
CREATE POLICY "anon_delete_production_entries" ON production_entries FOR DELETE TO anon, authenticated USING (true);

-- Sheet entries table
CREATE TABLE IF NOT EXISTS sheet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  sheets_used numeric,
  lot_number text,
  batch_number text,
  remarks text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sheet_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sheet_entries" ON sheet_entries;
CREATE POLICY "anon_select_sheet_entries" ON sheet_entries FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sheet_entries" ON sheet_entries;
CREATE POLICY "anon_insert_sheet_entries" ON sheet_entries FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sheet_entries" ON sheet_entries;
CREATE POLICY "anon_update_sheet_entries" ON sheet_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sheet_entries" ON sheet_entries;
CREATE POLICY "anon_delete_sheet_entries" ON sheet_entries FOR DELETE TO anon, authenticated USING (true);
