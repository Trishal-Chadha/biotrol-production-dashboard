/*
# Rebuild sheet_entries table with new production tracking fields

## Summary
Drops the old sheet_entries table (which had product-centric fields) and creates a new one
with production shift tracking fields as required by the Sheet Entry feature update.

## New Table: sheet_entries
- id (uuid, primary key)
- entry_date (date, NOT NULL) - production date
- sheet_code (text, NOT NULL) - required identifier
- num_sheets (integer) - number of sheets processed
- production_time (text, NOT NULL) - required time field (stored as text e.g. "08:00–16:00")
- dhd_employees (integer) - DHD department employee count
- packing_employees (integer) - Packing department employee count
- total_employees (integer, computed) - dhd + packing, saved at write time
- sheets_per_employee (numeric, computed) - num_sheets / total_employees, saved at write time
- remarks (text)
- created_at (timestamp)

## Security
- RLS enabled, anon + authenticated full CRUD (no-auth app)
*/

DROP TABLE IF EXISTS sheet_entries;

CREATE TABLE sheet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  sheet_code text NOT NULL,
  num_sheets integer,
  production_time text NOT NULL,
  dhd_employees integer,
  packing_employees integer,
  total_employees integer,
  sheets_per_employee numeric,
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
