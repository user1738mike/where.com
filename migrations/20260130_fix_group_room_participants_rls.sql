-- Fix RLS infinite recursion on group_room_participants
-- This migration drops all existing policies and recreates them with simple, non-recursive conditions

-- Drop ALL existing policies on group_room_participants (catch any naming variations)
DROP POLICY IF EXISTS "Authenticated users can view participants" ON public.group_room_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON public.group_room_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.group_room_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.group_room_participants;
DROP POLICY IF EXISTS "view_participants" ON public.group_room_participants;
DROP POLICY IF EXISTS "join_rooms" ON public.group_room_participants;
DROP POLICY IF EXISTS "update_own_participation" ON public.group_room_participants;
DROP POLICY IF EXISTS "leave_rooms" ON public.group_room_participants;
DROP POLICY IF EXISTS "allow_select_participants" ON public.group_room_participants;
DROP POLICY IF EXISTS "allow_insert_own_participation" ON public.group_room_participants;
DROP POLICY IF EXISTS "allow_update_own_participation" ON public.group_room_participants;
DROP POLICY IF EXISTS "allow_delete_own_participation" ON public.group_room_participants;

-- Recreate with simple, non-recursive policies
-- These use direct auth.uid() comparison which doesn't cause recursion

-- SELECT: All authenticated users can view all participants
CREATE POLICY "allow_select_participants"
ON public.group_room_participants FOR SELECT
TO authenticated
USING (true);

-- INSERT: Users can only insert their own participation
CREATE POLICY "allow_insert_own_participation"
ON public.group_room_participants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own participation (mute/video status)
CREATE POLICY "allow_update_own_participation"
ON public.group_room_participants FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own participation (leave room)
CREATE POLICY "allow_delete_own_participation"
ON public.group_room_participants FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
