-- Migration: Create matches table for neighbour random matching
-- Used by the matchmaker edge function for pairing users

CREATE TABLE IF NOT EXISTS public.matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid NOT NULL,
    estate_id uuid REFERENCES public.estates(id) ON DELETE SET NULL,
    initiator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    peer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text NOT NULL CHECK (status IN ('pending', 'active')),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users to manage their matches
CREATE POLICY "Users can view their own matches"
    ON public.matches FOR SELECT
    TO authenticated
    USING (initiator_user_id = auth.uid() OR peer_user_id = auth.uid());

CREATE POLICY "Users can create match records"
    ON public.matches FOR INSERT
    TO authenticated
    WITH CHECK (initiator_user_id = auth.uid());

CREATE POLICY "Users can update their own matches"
    ON public.matches FOR UPDATE
    TO authenticated
    USING (initiator_user_id = auth.uid())
    WITH CHECK (initiator_user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_match_id ON public.matches(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_estate_id ON public.matches(estate_id);

-- Comment
COMMENT ON TABLE public.matches IS 'Stores pending and active neighbour matching records for the Vibes Connect feature';
