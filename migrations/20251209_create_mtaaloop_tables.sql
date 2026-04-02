-- Migration: Create missing MtaaLoop tables - mtaaloop_profiles and user_preferences
-- Run this on the Supabase/Postgres instance.

-- MtaaLoop User Profiles Table
CREATE TABLE IF NOT EXISTS public.mtaaloop_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    name text,
    email text,
    phone text,
    estate text NOT NULL,
    neighborhood text,
    unit_number text,
    bio text,
    age integer,
    gender text CHECK (gender IN ('male', 'female', 'non-binary', 'other', 'prefer_not_to_say')),
    interests text[] DEFAULT '{}',
    profile_photo_url text,
    video_enabled boolean DEFAULT true,
    text_only boolean DEFAULT false,
    is_online boolean DEFAULT false,
    last_seen_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mtaaloop_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "MtaaLoop users can view profiles"
    ON public.mtaaloop_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile"
    ON public.mtaaloop_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.mtaaloop_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_mtaaloop_profiles_estate ON public.mtaaloop_profiles(estate);
CREATE INDEX idx_mtaaloop_profiles_online ON public.mtaaloop_profiles(is_online) WHERE is_online = true;
CREATE INDEX idx_mtaaloop_profiles_age ON public.mtaaloop_profiles USING gin(interests);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_mtaaloop_profiles_ts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mtaaloop_profiles_ts
    BEFORE UPDATE ON public.mtaaloop_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_mtaaloop_profiles_ts();


-- User Preferences Table for Apartment/Building info
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    apartment_name text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences"
    ON public.user_preferences FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.mtaaloop_profiles IS 'MtaaLoop user profiles for neighborhood social networking platform';
COMMENT ON TABLE public.user_preferences IS 'User preferences including apartment/building information';
