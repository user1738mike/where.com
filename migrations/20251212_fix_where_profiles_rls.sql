-- Fix RLS infinite recursion on where_profiles table
-- Drop existing broken policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.where_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.where_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.where_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.where_profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.where_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.where_profiles;

-- Recreate policies without recursive subqueries
-- Use (SELECT auth.uid()) syntax for better performance and to avoid recursion

-- SELECT: Allow authenticated users to read all profiles (for matching)
CREATE POLICY "Anyone can view profiles"
    ON public.where_profiles FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Users can only insert their own profile
CREATE POLICY "Users can insert own profile"
    ON public.where_profiles FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update own profile"
    ON public.where_profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- DELETE: Users can only delete their own profile
CREATE POLICY "Users can delete own profile"
    ON public.where_profiles FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);
