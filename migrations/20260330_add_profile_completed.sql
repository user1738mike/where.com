ALTER TABLE public.where_profiles 
  ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Mark all existing profiles as completed (they already went through registration)
UPDATE public.where_profiles SET profile_completed = true WHERE profile_completed IS NULL OR profile_completed = false;
