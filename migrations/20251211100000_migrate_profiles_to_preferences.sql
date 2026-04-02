-- Migration: Migrate profile data to user_preferences for neighbourhood matching
-- Transfer apartment_name and estate_id from mtaaloop_profiles to user_preferences for existing users

INSERT INTO public.user_preferences (user_id, estate_id, apartment_name)
SELECT
    mp.user_id,
    mp.estate_id,
    mp.apartment_name
FROM public.mtaaloop_profiles mp
WHERE mp.user_id NOT IN (SELECT user_id FROM public.user_preferences)
ON CONFLICT (user_id)
DO UPDATE SET
    estate_id = EXCLUDED.estate_id,
    apartment_name = EXCLUDED.apartment_name,
    updated_at = now();
