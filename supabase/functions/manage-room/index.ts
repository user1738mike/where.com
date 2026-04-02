import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth token from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { action } = body

    const cleanupEmptyRoom = async (room_id: string) => {
      try {
        const { count, error: countError } = await supabase
          .from('group_room_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room_id)
          .eq('participant_status', 'approved')

        if (countError) {
          console.warn('Failed to count participants for cleanup:', countError)
          return
        }

        if ((count || 0) === 0) {
          const { error: deleteError } = await supabase
            .from('group_rooms')
            .delete()
            .eq('id', room_id)

          if (deleteError) {
            console.error('Failed to delete empty room:', deleteError)
          } else {
            console.log(`🗑️ Auto-removed empty room: ${room_id}`)
          }
        }
      } catch (err) {
        console.error('Cleanup empty room failed:', err)
      }
    }

    switch (action) {
      case 'create': {
        const { name, topic, description, estate_id, max_participants, room_type = 'public' } = body

        if (!name || !topic) {
          return new Response(
            JSON.stringify({ error: 'Name and topic are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!['public', 'private'].includes(room_type)) {
          return new Response(
            JSON.stringify({ error: 'room_type must be "public" or "private"' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: room, error: createError } = await supabase
          .from('group_rooms')
          .insert({
            name,
            topic,
            description: description || null,
            estate_id: estate_id || null,
            max_participants: max_participants || 8,
            room_type: room_type,
            created_by: user.id,
            pending_join_requests: {},
          })
          .select()
          .single()

        if (createError) {
          console.error('Create room error:', createError)
          return new Response(
            JSON.stringify({ error: 'Failed to create room' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Auto-join the creator as approved
        const { error: joinError } = await supabase
          .from('group_room_participants')
          .insert({
            room_id: room.id,
            user_id: user.id,
            participant_status: 'approved',
          })

        if (joinError) {
          console.error('Create room - auto-join creator error:', joinError)
          // Continue anyway, the room was created
        }

        console.log(`📌 Room created: ${room.id}, type: ${room_type}, host: ${user.id}`)

        return new Response(
          JSON.stringify({ room }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'join': {
        const { room_id } = body

        if (!room_id) {
          return new Response(
            JSON.stringify({ error: 'Room ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get room and check capacity, type, active status
        const { data: room, error: roomError } = await supabase
          .from('group_rooms')
          .select('id, max_participants, is_active, room_type, created_by')
          .eq('id', room_id)
          .single()

        if (roomError || !room) {
          return new Response(
            JSON.stringify({ error: 'Room not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!room.is_active) {
          return new Response(
            JSON.stringify({ error: 'Room is no longer active' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if user is already in the room (and approved)
        const { data: existing } = await supabase
          .from('group_room_participants')
          .select('id, participant_status')
          .eq('room_id', room_id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (existing) {
          if (existing.participant_status === 'approved') {
            return new Response(
              JSON.stringify({ message: 'Already in room', participant_id: existing.id }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          if (existing.participant_status === 'pending') {
            return new Response(
              JSON.stringify({ error: 'Your join request is pending host approval', status: 'pending' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          if (existing.participant_status === 'rejected') {
            return new Response(
              JSON.stringify({ error: 'Your join request was rejected by the host', status: 'rejected' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        // For private rooms, require host approval
        if (room.room_type === 'private') {
          // Add participant as pending
          const { data: participant, error: joinError } = await supabase
            .from('group_room_participants')
            .insert({
              room_id,
              user_id: user.id,
              participant_status: 'pending',
            })
            .select()
            .single()

          if (joinError) {
            console.error('Join private room - create pending error:', joinError)
            return new Response(
              JSON.stringify({ error: 'Failed to request access' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          console.log(`📌 Join request pending: ${room_id}, user: ${user.id} (private room)`)

          return new Response(
            JSON.stringify({ 
              message: 'Join request sent to host', 
              participant_id: participant.id,
              status: 'pending'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // For public rooms, check capacity and join directly
        const { count } = await supabase
          .from('group_room_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room_id)
          .eq('participant_status', 'approved')

        if ((count || 0) >= room.max_participants) {
          return new Response(
            JSON.stringify({ error: 'Room is full' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Join the public room
        const { data: participant, error: joinError } = await supabase
          .from('group_room_participants')
          .insert({
            room_id,
            user_id: user.id,
            participant_status: 'approved',
          })
          .select()
          .single()

        if (joinError) {
          console.error('Join public room error:', joinError)
          return new Response(
            JSON.stringify({ error: 'Failed to join room' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`📌 Joined room: ${room_id}, user: ${user.id} (public room)`)

        return new Response(
          JSON.stringify({ participant, status: 'approved' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'leave': {
        const { room_id } = body

        if (!room_id) {
          return new Response(
            JSON.stringify({ error: 'Room ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: leaveError } = await supabase
          .from('group_room_participants')
          .delete()
          .eq('room_id', room_id)
          .eq('user_id', user.id)

        if (leaveError) {
          console.error('Leave room error:', leaveError)
          return new Response(
            JSON.stringify({ error: 'Failed to leave room' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`📌 User left room: ${room_id}, user: ${user.id}`)
        await cleanupEmptyRoom(room_id)

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'approve': {
        const { room_id, user_id } = body

        if (!room_id || !user_id) {
          return new Response(
            JSON.stringify({ error: 'Room ID and user ID are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify user is the host
        const { data: room, error: roomError } = await supabase
          .from('group_rooms')
          .select('created_by, max_participants')
          .eq('id', room_id)
          .single()

        if (roomError || !room || room.created_by !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Only the host can approve join requests' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check capacity
        const { count } = await supabase
          .from('group_room_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room_id)
          .eq('participant_status', 'approved')

        if ((count || 0) >= room.max_participants) {
          return new Response(
            JSON.stringify({ error: 'Room is full' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Approve the participant
        const { error: approveError } = await supabase
          .from('group_room_participants')
          .update({ participant_status: 'approved' })
          .eq('room_id', room_id)
          .eq('user_id', user_id)

        if (approveError) {
          console.error('Approve join request error:', approveError)
          return new Response(
            JSON.stringify({ error: 'Failed to approve join request' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`✅ Approved join request: ${room_id}, user: ${user_id}`)

        return new Response(
          JSON.stringify({ success: true, message: 'Join request approved' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'reject': {
        const { room_id, user_id } = body

        if (!room_id || !user_id) {
          return new Response(
            JSON.stringify({ error: 'Room ID and user ID are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify user is the host
        const { data: room } = await supabase
          .from('group_rooms')
          .select('created_by')
          .eq('id', room_id)
          .single()

        if (!room || room.created_by !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Only the host can reject join requests' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Reject the participant
        const { error: rejectError } = await supabase
          .from('group_room_participants')
          .update({ participant_status: 'rejected' })
          .eq('room_id', room_id)
          .eq('user_id', user_id)

        if (rejectError) {
          console.error('Reject join request error:', rejectError)
          return new Response(
            JSON.stringify({ error: 'Failed to reject join request' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`❌ Rejected join request: ${room_id}, user: ${user_id}`)

        return new Response(
          JSON.stringify({ success: true, message: 'Join request rejected' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'remove-participant': {
        const { room_id, user_id } = body

        if (!room_id || !user_id) {
          return new Response(
            JSON.stringify({ error: 'Room ID and user ID are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify user is the host
        const { data: room } = await supabase
          .from('group_rooms')
          .select('created_by')
          .eq('id', room_id)
          .single()

        if (!room || room.created_by !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Only the host can remove participants' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Remove the participant
        const { error: removeError } = await supabase
          .from('group_room_participants')
          .delete()
          .eq('room_id', room_id)
          .eq('user_id', user_id)

        if (removeError) {
          console.error('Remove participant error:', removeError)
          return new Response(
            JSON.stringify({ error: 'Failed to remove participant' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`🚫 Removed participant: ${room_id}, user: ${user_id}`)
        await cleanupEmptyRoom(room_id)

        return new Response(
          JSON.stringify({ success: true, message: 'Participant removed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'close': {
        const { room_id } = body

        if (!room_id) {
          return new Response(
            JSON.stringify({ error: 'Room ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify user is the room creator
        const { data: room } = await supabase
          .from('group_rooms')
          .select('created_by')
          .eq('id', room_id)
          .single()

        if (!room || room.created_by !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Only the room creator can close the room' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Deactivate room
        const { error: closeError } = await supabase
          .from('group_rooms')
          .update({ is_active: false })
          .eq('id', room_id)

        if (closeError) {
          console.error('Close room error:', closeError)
          return new Response(
            JSON.stringify({ error: 'Failed to close room' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Remove all participants (optional - could let them stay but room won't appear in listings)
        await supabase
          .from('group_room_participants')
          .delete()
          .eq('room_id', room_id)

        console.log(`🔒 Room closed: ${room_id}`)

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update_status': {
        const { room_id, is_muted, is_video_off } = body

        if (!room_id) {
          return new Response(
            JSON.stringify({ error: 'Room ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const updates: Record<string, boolean> = {}
        if (typeof is_muted === 'boolean') updates.is_muted = is_muted
        if (typeof is_video_off === 'boolean') updates.is_video_off = is_video_off

        const { error: updateError } = await supabase
          .from('group_room_participants')
          .update(updates)
          .eq('room_id', room_id)
          .eq('user_id', user.id)

        if (updateError) {
          console.error('Update status error:', updateError)
          return new Response(
            JSON.stringify({ error: 'Failed to update status' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_pending_requests': {
        const { room_id } = body

        if (!room_id) {
          return new Response(
            JSON.stringify({ error: 'Room ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify user is the host
        const { data: room } = await supabase
          .from('group_rooms')
          .select('created_by')
          .eq('id', room_id)
          .single()

        if (!room || room.created_by !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Only the host can view pending requests' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get pending participants with their profile info
        const { data: pendingParticipants, error: fetchError } = await supabase
          .from('group_room_participants')
          .select(`
            id,
            user_id,
            participant_status,
            joined_at
          `)
          .eq('room_id', room_id)
          .eq('participant_status', 'pending')

        if (fetchError) {
          console.error('Fetch pending requests error:', fetchError)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch pending requests' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Fetch profile info for pending users
        const userIds = pendingParticipants?.map(p => p.user_id) || []
        let profiles: any[] = []
        if (userIds.length > 0) {
          const { data } = await supabase
            .from('where_profiles')
            .select('user_id, full_name, profile_photo_url')
            .in('user_id', userIds)
          profiles = data || []
        }

        const profileMap = new Map(profiles.map(p => [p.user_id, p]))
        const requestsWithProfiles = pendingParticipants?.map(p => ({
          ...p,
          name: profileMap.get(p.user_id)?.full_name || 'Unknown',
          avatar_url: profileMap.get(p.user_id)?.profile_photo_url
        })) || []

        return new Response(
          JSON.stringify({ pending_requests: requestsWithProfiles }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
