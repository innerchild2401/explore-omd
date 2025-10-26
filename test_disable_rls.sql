-- Temporary test: Disable RLS to see if that's the issue
-- WARNING: This is only for testing - re-enable RLS after testing

-- Disable RLS temporarily
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;

-- Test if reservation creation works now
-- (Try creating a reservation in the UI)

-- Re-enable RLS after testing
-- ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
