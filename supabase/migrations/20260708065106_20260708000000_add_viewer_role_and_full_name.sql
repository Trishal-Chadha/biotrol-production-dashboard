/*
# Add viewer role and full_name to user_roles

## Changes
1. Drop the existing role CHECK constraint and recreate it to also allow 'viewer'.
2. Add a `full_name` text column (nullable) for storing the user's display name.

## Modified Tables
### user_roles
- role CHECK now accepts 'admin', 'employee', 'viewer'
- full_name (text, nullable) — display name entered at registration

## Notes
- No data is lost; existing rows remain unchanged.
- full_name is nullable so existing rows without a name are unaffected.
*/

-- Drop old check constraint on role
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Re-add with viewer included
ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('admin', 'employee', 'viewer'));

-- Add full_name column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN full_name text;
  END IF;
END $$;
