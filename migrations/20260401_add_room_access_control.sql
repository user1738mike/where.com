-- Add access control and room lifecycle improvements
-- This migration adds support for public/private rooms and participant approval

-- Add room_type column to group_rooms
ALTER TABLE public.group_rooms 
ADD COLUMN IF NOT EXISTS room_type TEXT DEFAULT 'public' CHECK (room_type IN ('public', 'private'));

-- Add pending join requests as JSONB to track who requested to join private rooms
-- Structure: { "user_id": { "requested_at": "2026-04-01T...", "user_id": "..." }, ... }
ALTER TABLE public.group_rooms 
ADD COLUMN IF NOT EXISTS pending_join_requests JSONB DEFAULT '{}';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_rooms_room_type ON public.group_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_group_rooms_created_by_is_active ON public.group_rooms(created_by, is_active);

-- Add participant_status column to track approval state for private rooms
-- 'approved' = can participate, 'pending' = awaiting host approval, 'rejected' = cannot participate
ALTER TABLE public.group_room_participants 
ADD COLUMN IF NOT EXISTS participant_status TEXT DEFAULT 'approved' CHECK (participant_status IN ('approved', 'pending', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_group_room_participants_status ON public.group_room_participants(participant_status);
CREATE INDEX IF NOT EXISTS idx_group_room_participants_room_status ON public.group_room_participants(room_id, participant_status);

-- Function to auto-delete empty rooms (called via trigger or periodic task)
CREATE OR REPLACE FUNCTION public.cleanup_empty_rooms()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete rooms with no approved participants that have been empty for more than 1 hour
  DELETE FROM public.group_rooms
  WHERE is_active = true
  AND created_at < NOW() - INTERVAL '1 hour'
  AND id NOT IN (
    SELECT DISTINCT room_id 
    FROM public.group_room_participants 
    WHERE participant_status = 'approved'
  );
END;
$$;

-- Function to check if a room can be auto-deleted (used in trigger immediately on last participant leave)
CREATE OR REPLACE FUNCTION public.check_auto_delete_empty_room()
RETURNS TRIGGER AS $$
BEGIN
  -- When a participant leaves, check if room is now empty
  IF TG_OP = 'DELETE' THEN
    -- Check if any approved participants remain
    IF NOT EXISTS (
      SELECT 1 FROM public.group_room_participants 
      WHERE room_id = OLD.room_id AND participant_status = 'approved'
    ) THEN
      -- No approved participants left - delete the room
      DELETE FROM public.group_rooms WHERE id = OLD.room_id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-delete empty rooms when last participant leaves
DROP TRIGGER IF EXISTS trigger_auto_delete_empty_room ON public.group_room_participants;
CREATE TRIGGER trigger_auto_delete_empty_room
AFTER DELETE ON public.group_room_participants
FOR EACH ROW
EXECUTE FUNCTION public.check_auto_delete_empty_room();

-- Update RLS policy for group_rooms to check room_type and access
-- For private rooms, access control is enforced at the application level via edge functions
DROP POLICY IF EXISTS "Authenticated users can view active rooms" ON public.group_rooms;
CREATE POLICY "Users can view public rooms"
ON public.group_rooms FOR SELECT
TO authenticated
USING (
  is_active = true AND room_type = 'public'
);

-- Room creators can always see their rooms
CREATE POLICY "Users can view their own rooms"
ON public.group_rooms FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
);

-- Ensure group_rooms has RLS enabled for all operations
ALTER TABLE public.group_rooms ENABLE ROW LEVEL SECURITY;

-- Simplified group_room_participants RLS: users can see their own participation and hosts can see all
DROP POLICY IF EXISTS "allow_select_participants" ON public.group_room_participants;
CREATE POLICY "Users can view their own participation"
ON public.group_room_participants FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- Room hosts can view all participants in their rooms
CREATE POLICY "Hosts can view all participants"
ON public.group_room_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_rooms 
    WHERE group_rooms.id = group_room_participants.room_id 
    AND group_rooms.created_by = auth.uid()
  )
);
