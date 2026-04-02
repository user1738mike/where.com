-- Update user_preferences RLS policies for random neighbourhood matching
-- Allow authenticated users to view all user preferences for estate-based matching

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;

-- Add new policy allowing authenticated users to read all preferences
CREATE POLICY "Authenticated users can view all preferences for matching"
    ON public.user_preferences FOR SELECT
    TO authenticated
    USING (true);

-- Keep the update/insert policies as own only
-- (Existing policies should handle this)

-- To enable random cross-estate matching, ensure the matchmaker function can access all estates

-- Temporarily disable RLS on matches table to allow anonymous subscription
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
