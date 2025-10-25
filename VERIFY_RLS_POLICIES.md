# Verify RLS Policies Are Applied

## Step 1: Check Current Policies

Go to your **Supabase Dashboard**:
1. Click on **Database** (left sidebar)
2. Click on **Policies** (under Database)
3. Find the `user_profiles` table
4. Take a screenshot or list all policies you see

## Step 2: If No Policies Exist, Run This Again:

Copy and paste into **SQL Editor** and run:

```sql
-- First, let's check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- List all current policies
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- Now fix the policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "OMD admins can update user profiles in their OMD" ON user_profiles;
DROP POLICY IF EXISTS "OMD admins can view user profiles in their OMD" ON user_profiles;

-- Create NEW policies
CREATE POLICY "Users can view their own profile" 
ON user_profiles FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Authenticated users can insert their own profile" 
ON user_profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON user_profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "OMD admins can update user profiles in their OMD" 
ON user_profiles FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.omd_id = user_profiles.omd_id
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

CREATE POLICY "OMD admins can view user profiles in their OMD" 
ON user_profiles FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.omd_id = user_profiles.omd_id
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';
```

## Step 3: Alternative - Temporarily Disable RLS for Testing

**⚠️ ONLY FOR TESTING - NOT PRODUCTION!**

If you just want to test the flow quickly:

```sql
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
```

This will allow all operations on user_profiles. You can re-enable it later with proper policies.

## Step 4: Check What You See

After running the SQL, tell me:
1. Is RLS enabled? (true/false from first query)
2. How many policies exist? (count from second query)
3. What are their names? (list from last query)

