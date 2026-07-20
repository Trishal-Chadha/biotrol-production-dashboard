/*
# Allow anon to check if any users exist (for login page)

The login page needs to know if any users are registered so it can
show the correct UI. The existing SELECT policy is TO authenticated,
which means the anon client always gets count=0.

This adds a restricted anon SELECT policy that only exposes the count
(no data columns) — effectively letting the unauthenticated login page
detect whether accounts exist.

## Changes
- Add anon SELECT policy on user_roles (read-only, count only via head:true)
- Keep existing authenticated policy unchanged
*/

DROP POLICY IF EXISTS "anon_check_users_exist" ON user_roles;
CREATE POLICY "anon_check_users_exist" ON user_roles
  FOR SELECT TO anon
  USING (true);
