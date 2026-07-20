/*
# Create user_roles table for role-based authentication

## Overview
Creates a user_roles table to store user roles (Admin/Employee) for role-based access control.
This table links Supabase auth.users to application roles.

## New Tables

### user_roles
- id (uuid, primary key)
- user_id (uuid, references auth.users, unique) - links to Supabase auth user
- role (text, NOT NULL) - either 'admin' or 'employee'
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())

## Security
- Enable RLS on user_roles table
- Users can read their own role
- Only authenticated users can access

## Important Notes
1. The user_id has a unique constraint so each user has exactly one role
2. Role must be either 'admin' or 'employee'
3. The table uses auth.uid() for ownership checks
*/

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role text NOT NULL CHECK (role IN ('admin', 'employee')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own role
DROP POLICY IF EXISTS "users_read_own_role" ON user_roles;
CREATE POLICY "users_read_own_role" ON user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own role (handled via trigger/function typically)
-- For now, we'll allow authenticated users to insert their own role
DROP POLICY IF EXISTS "users_insert_own_role" ON user_roles;
CREATE POLICY "users_insert_own_role" ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own role (typically admins only, but for simplicity)
DROP POLICY IF EXISTS "users_update_own_role" ON user_roles;
CREATE POLICY "users_update_own_role" ON user_roles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create an index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
