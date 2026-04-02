-- Create group_rooms table
CREATE TABLE IF NOT EXISTS public.group_rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    topic text NOT NULL,
    description text,
    estate_id uuid,
    max_participants integer DEFAULT 8 CHECK (max_participants >= 2 AND max_participants <= 8),
    is_active boolean DEFAULT true,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create group_room_participants table
CREATE TABLE IF NOT EXISTS public.group_room_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid NOT NULL REFERENCES public.group_rooms(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    is_muted boolean DEFAULT false,
    is_video_off boolean DEFAULT false,
    UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.group_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_room_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_rooms

-- Anyone authenticated can view active rooms
CREATE POLICY "Authenticated users can view active rooms"
ON public.group_rooms FOR SELECT
TO authenticated
USING (is_active = true);

-- Users can create rooms
CREATE POLICY "Authenticated users can create rooms"
ON public.group_rooms FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Room creators can update their rooms
CREATE POLICY "Room creators can update their rooms"
ON public.group_rooms FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Room creators can delete their rooms
CREATE POLICY "Room creators can delete their rooms"
ON public.group_rooms FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- RLS Policies for group_room_participants

-- Anyone authenticated can view participants
CREATE POLICY "Authenticated users can view participants"
ON public.group_room_participants FOR SELECT
TO authenticated
USING (true);

-- Users can join rooms (insert their participation)
CREATE POLICY "Users can join rooms"
ON public.group_room_participants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own participation (mute/video)
CREATE POLICY "Users can update their own participation"
ON public.group_room_participants FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can leave rooms (delete their participation)
CREATE POLICY "Users can leave rooms"
ON public.group_room_participants FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_rooms_is_active ON public.group_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_group_rooms_topic ON public.group_rooms(topic);
CREATE INDEX IF NOT EXISTS idx_group_rooms_estate_id ON public.group_rooms(estate_id);
CREATE INDEX IF NOT EXISTS idx_group_rooms_created_by ON public.group_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_group_room_participants_room_id ON public.group_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_group_room_participants_user_id ON public.group_room_participants(user_id);

-- Create function to get participant count for a room
CREATE OR REPLACE FUNCTION public.get_room_participant_count(room_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM public.group_room_participants
  WHERE room_id = room_uuid;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_room_participant_count(uuid) TO authenticated;
