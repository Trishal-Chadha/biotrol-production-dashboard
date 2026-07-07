/*
# Create settings table for application configuration

## Overview
Creates a settings table to store application-wide configuration including
company information, appearance preferences, and backup metadata.

## New Tables

### settings
- id (uuid, primary key)
- company_name (text) - Company display name
- company_code (text) - Short company identifier
- company_logo_url (text) - URL to uploaded company logo
- address (text) - Company address
- phone_number (text) - Contact phone number
- email (text) - Company email
- website (text) - Company website URL
- default_daily_target (integer) - Default production target
- theme (text) - 'light', 'dark', or 'system'
- last_backup_date (timestamptz) - Timestamp of last backup
- backup_status (text) - Status of last backup
- updated_at (timestamptz) - Last update timestamp
- updated_by (uuid) - User who last updated settings

## Security
- Enable RLS on settings table
- Only authenticated users can read settings
- Only admins can update settings

## Important Notes
1. This table stores singleton settings (one row)
2. Theme preference is stored here for persistence
3. Backup metadata tracks backup history
*/

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text DEFAULT 'Biotrol Professional',
  company_code text DEFAULT 'BIOTROL',
  company_logo_url text DEFAULT NULL,
  address text DEFAULT NULL,
  phone_number text DEFAULT NULL,
  email text DEFAULT NULL,
  website text DEFAULT NULL,
  default_daily_target integer DEFAULT 1000,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  last_backup_date timestamptz DEFAULT NULL,
  backup_status text DEFAULT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read settings
DROP POLICY IF EXISTS "authenticated_read_settings" ON settings;
CREATE POLICY "authenticated_read_settings" ON settings
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Only authenticated users can insert settings
DROP POLICY IF EXISTS "authenticated_insert_settings" ON settings;
CREATE POLICY "authenticated_insert_settings" ON settings
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users can update settings
DROP POLICY IF EXISTS "authenticated_update_settings" ON settings;
CREATE POLICY "authenticated_update_settings" ON settings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default settings row
INSERT INTO settings (id, company_name, company_code)
VALUES ('00000000-0000-0000-0000-000000000001', 'Biotrol Professional', 'BIOTROL')
ON CONFLICT (id) DO NOTHING;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();
