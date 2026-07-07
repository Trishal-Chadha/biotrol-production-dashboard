/*
# Create production_data and employees tables

## Summary
Creates two new tables for the Production Data module:
- `employees` — staff directory for incharge dropdowns
- `production_data` — full production records with production, packaging and final details sections

## New Tables

### employees
- id (uuid, primary key)
- name (text, not null)
- role (text) — e.g. Production Incharge, Packaging Incharge
- active (boolean, default true)
- created_at (timestamp)

### production_data
- id (uuid, primary key)
- entry_date (date, not null)
- product_id (uuid, FK → products)
- batch_number (text, not null)
- produced_units (integer, not null)
- produced_sheets (integer, not null)
- target_sheets (integer, not null)
- production_employees (integer, not null)
- production_incharge_id (uuid, FK → employees)
- production_remarks (text)
- pkg_product_id (uuid, FK → products) — packaging product (may differ)
- pkg_employees (integer)
- pkg_incharge_id (uuid, FK → employees)
- pkg_remarks (text)
- test_pouch_produced (integer, not null)
- day_remarks (text)
- created_at (timestamp)

## Security
- RLS enabled, anon + authenticated full CRUD (no-auth app)
*/

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_employees" ON employees;
CREATE POLICY "anon_select_employees" ON employees FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_employees" ON employees;
CREATE POLICY "anon_insert_employees" ON employees FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_employees" ON employees;
CREATE POLICY "anon_update_employees" ON employees FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_employees" ON employees;
CREATE POLICY "anon_delete_employees" ON employees FOR DELETE TO anon, authenticated USING (true);

-- Production data table
CREATE TABLE IF NOT EXISTS production_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  batch_number text NOT NULL,
  produced_units integer NOT NULL,
  produced_sheets integer NOT NULL,
  target_sheets integer NOT NULL,
  production_employees integer NOT NULL,
  production_incharge_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  production_remarks text,
  pkg_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  pkg_employees integer,
  pkg_incharge_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  pkg_remarks text,
  test_pouch_produced integer NOT NULL,
  day_remarks text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE production_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_production_data" ON production_data;
CREATE POLICY "anon_select_production_data" ON production_data FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_production_data" ON production_data;
CREATE POLICY "anon_insert_production_data" ON production_data FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_production_data" ON production_data;
CREATE POLICY "anon_update_production_data" ON production_data FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_production_data" ON production_data;
CREATE POLICY "anon_delete_production_data" ON production_data FOR DELETE TO anon, authenticated USING (true);
