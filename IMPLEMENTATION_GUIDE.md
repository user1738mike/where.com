# WebRTC & Room Management Implementation Guide

## Overview

This document describes the comprehensive fixes implemented for:
1. Device control without page reload
2. Room auto-deletion when everyone leaves
3. Public/Private room types with host-controlled access
4. WebRTC signaling state errors and peer lifecycle management

## Changes Made

### 1. Database Schema Changes

**File:** `migrations/20260401_add_room_access_control.sql`

#### New Columns Added to `group_rooms`:
- `room_type TEXT` ('public' | 'private') - Determines if room requires host approval
- `pending_join_requests JSONB` - Tracks join requests for private rooms

#### New Columns Added to `group_room_participants`:
- `participant_status TEXT` ('approved' | 'pending' | 'rejected') - Access control state

#### New Functions:
- `cleanup_empty_rooms()` - Deletes rooms with no approved participants after 1 hour
- `check_auto_delete_empty_room()` - Trigger function that deletes room immediately when last participant leaves

#### New Trigger:
- `trigger_auto_delete_empty_room` - AFTER DELETE on group_room_participants
  - Auto-deletes empty rooms when last approved participant leaves

#### Updated RLS Policies:
- `group_rooms` - Only show public rooms OR rooms user is host/approved participant in
- `group_room_participants` - Only show to hosts or approved participants

### 2. Backend Edge Function Changes

**File:** `supabase/functions/manage-room/index.ts`

#### New/Updated Actions:

**`create` (Enhanced)**
- Added `room_type` parameter ('public' or 'private')
- Creator automatically added as 'approved' participant
- Returns room with type info

**`join` (Enhanced)**
- Checks room type
- For **PUBLIC** rooms: validates capacity, joins directly as 'approved'
- For **PRIVATE** rooms: adds user as 'pending', notifies host
- Returns status: 'approved', 'pending', 'rejected'
- Prevents rejoining if already in room

**`approve` (New)**
- Host action: approve a pending join request
- Validates user is host
- Checks room capacity before approving
- Only host can call this

**`reject` (New)**
- Host action: reject a pending join request
- Validates user is host
- Marks participant as 'rejected'
- Only host can call this

**`remove-participant` (New)**
- Host action: remove an approved participant
- Validates user is host
- Completely removes participant from room
- Triggers auto-deletion if room becomes empty

**`get_pending_requests` (New)**
- Host action: fetch pending join requests
- Returns array of pending participants with profile info
- Only host can call this

**`leave` (Enhanced)**
- Calls backend to remove participant
- Automatically triggers room deletion if now empty via PostgreSQL trigger

**`update_status` (Unchanged)**
- Updates is_muted, is_video_off for participant

### 3. Frontend Hook Enhancements

#### `src/hooks/useGroupWebRTC.ts` - Group Video Calls

**New Device Management**
- `audioInputs[]`, `videoInputs[]`, `audioOutputs[]` - Available devices
- `selectedAudioInput`, `selectedVideoInput`, `selectedAudioOutput` - Current selections
- `selectAudioInput()`, `selectVideoInput()`, `selectAudioOutput()` - Switch devices
- `replaceTrack('audio'|'video', deviceId)` - Seamlessly switch tracks without reconnecting
- `enumerateDevices()` - Refresh device list on devicechange event

**New Media Controls**
- `isMuted` state - Local mic mute toggle
- `isVideoOff` state - Local camera off toggle
- `speakerMuted` state - Local speaker mute state
- `toggleMute()` - Instantly mute/unmute mic without reconnection
- `toggleVideo()` - Instantly turn camera on/off without reconnection
- `toggleSpeaker()` - Mute/unmute remote audio playback locally

**Signal Deduplication**
- `processedSignalsRef` Set - Tracks messageIds to prevent duplicate processing
- Each signal includes `messageId` and `timestamp`
- Prevents duplicate "answer" processing errors
- Auto-clears old entries to prevent memory leak

**Perfect Negotiation Pattern**
- `peerStateRef` for each peer tracks:
  - `makingOffer` - We're currently making an offer
  - `ignoreOffer` - We should ignore incoming offer (we're the polite side)
  - `isSettingRemoteAnswerPending` - We're setting remote answer
- `negotiationneeded` event handler with glare prevention
- Only creates offer when `signalingState === 'stable'` and not already making offer

**Enhanced Signaling Validation**
- BEFORE `setRemoteDescription(offer)`: No state check needed (can be called in stable)
- BEFORE `setRemoteDescription(answer)`: REQUIRED state = 'have-local-offer'
- BEFORE `addIceCandidate()`: REQUIRED remoteDescription exists
- Buffers ICE candidates until remote description is set

**ICE/Connection Diagnostics**
- `icecandidateerror` listener - Logs detailed error info
- `iceconnectionstatechange` listener - Triggers ICE restart on disconnect
- `connectionstatechange` listener - Tracks overall connection state
- `signalingstatechange` listener - Logs signaling state transitions
- `handleIceRestart()` - Creates ICE restart offer with iceRestart flag

**Peer Cleanup**
- `cleanupPeer(peerId)` - Fully cleans up single peer:
  - Destroys RTCPeerConnection
  - Clears peer state
  - Clears ICE restart timers
  - Clears from maps
  - Removes streams
- Prevents stale peers from receiving late signals

**Enhanced Cleanup on Leave**
- Calls `manage-room` edge function with `action: 'leave'`
- Clears all ICE restart timers
- Destroys all peer connections
- Clears all maps and refs
- Stops all media tracks
- Removes channel subscription

#### `src/hooks/useWebRTC.ts` - 1-on-1 Matches

**Same improvements as useGroupWebRTC:**
- Device enumeration and selection
- replaceTrack() for device switching
- toggleMute/toggleVideo without reconnection
- Signal deduplication with messageId tracking
- Perfect negotiation pattern with state guards
- Enhanced ICE error handling (ignores transient errors 701, 702, 703, 768)
- Proper validation before setLocalDescription/setRemoteDescription/addIceCandidate
- Graceful glare handling (polite side ignores offer)
- Comprehensive diagnostics logging
- Full cleanup in hangup()

### 4. Socket Events

All signaling events now include metadata for deduplication and debugging:

```typescript
{
  type: 'broadcast',
  event: 'signal' | 'join' | 'status_update' | 'leave',
  payload: {
    from: string (userId)
    to?: string (targetUserId for signal events)
    data?: { type: 'offer'|'answer'|'candidate', sdp?: string }
    messageId: string (unique ID like "offer-1234567890-0.456")
    timestamp: number (milliseconds since epoch)
    name?: string (for join events)
    avatar_url?: string (for join events)
    is_muted?: boolean (for status_update)
    is_video_off?: boolean (for status_update)
    user_id?: string (for leave events)
  }
}
```

## Migration Steps

### 1. Run Database Migration

```sql
-- Execute the migration file in Supabase SQL editor
-- File: migrations/20260401_add_room_access_control.sql

-- This will:
-- - Add room_type column to group_rooms
-- - Add pending_join_requests JSONB to group_rooms
-- - Add participant_status column to group_room_participants
-- - Create cleanup functions
-- - Create auto-delete trigger
-- - Update RLS policies
```

### 2. Update Room Creation UI

When creating a room, the user should select room type:

```typescript
// Example
const handleCreateRoom = async (name: string, topic: string, roomType: 'public' | 'private') => {
  const { data: room, error } = await supabase.functions.invoke('manage-room', {
    body: {
      action: 'create',
      name,
      topic,
      room_type: roomType,
      description: '',
      max_participants: 8,
    }
  })
  // Navigate to room...
}
```

### 3. Update Room Listing (if Private Rooms Shown)

Show only:
- All public rooms that are active
- Private rooms where user is host or approved participant

The RLS policies handle this automatically - only show rooms user has access to.

### 4. Implement Host Controls UI

For room hosts (for private rooms):

```typescript
// Fetch pending join requests
const pending = await supabase.functions.invoke('manage-room', {
  body: {
    action: 'get_pending_requests',
    room_id: roomId,
  }
})

// Approve a request
await supabase.functions.invoke('manage-room', {
  body: {
    action: 'approve',
    room_id: roomId,
    user_id: requestingUserId,
  }
})

// Reject a request
await supabase.functions.invoke('manage-room', {
  body: {
    action: 'reject',
    room_id: roomId,
    user_id: requestingUserId,
  }
})

// Remove participant
await supabase.functions.invoke('manage-room', {
  body: {
    action: 'remove-participant',
    room_id: roomId,
    user_id: participantId,
  }
})
```

### 5. Update Join Room Flow

```typescript
// When user clicks join on a private room
const response = await supabase.functions.invoke('manage-room', {
  body: {
    action: 'join',
    room_id: roomId,
  }
})

if (response.data.status === 'pending') {
  // Show "Waiting for host approval..." message
} else if (response.data.status === 'approved') {
  // Join the room via useGroupWebRTC
} else if (response.data.status === 'rejected') {
  // Show "Your request was rejected" error
}
```

## Frontend Component Integration

### Using Enhanced Hooks

```typescript
import { useGroupWebRTC } from '@/hooks/useGroupWebRTC'

function WhereGroupChat({ roomId }: { roomId: string }) {
  const userId = useAuth().user?.id
  const {
    localStream,
    peerStreams,
    participants,
    audioInputs,
    videoInputs,
    selectedAudioInput,
    selectedVideoInput,
    isMuted,
    isVideoOff,
    speakerMuted,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    selectAudioInput,
    selectVideoInput,
    joinRoom,
    leaveRoom,
  } = useGroupWebRTC(userId, roomId)

  useEffect(() => {
    joinRoom()
  }, [])

  return (
    <div>
      {/* Device selector */}
      <select value={selectedAudioInput} onChange={e => selectAudioInput(e.target.value)}>
        {audioInputs.map(device => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>

      {/* Media controls */}
      <button onClick={toggleMute}>{isMuted ? '🔇 Unmute' : '🔊 Mute'}</button>
      <button onClick={toggleVideo}>{isVideoOff ? '📵 Camera On' : '📹 Camera Off'}</button>
      <button onClick={toggleSpeaker}>{speakerMuted ? '🔈 Speaker On' : '🔈 Speaker Off'}</button>

      {/* Room UI */}
      {/* ... VideoGrid, etc ... */}

      <button onClick={leaveRoom}>Leave Room</button>
    </div>
  )
}
```

## Testing Checklist

### Device Controls (No Reload Required)

- [ ] **Mic Toggle**
  - [ ] Join room with mic enabled
  - [ ] Click mute button - other users see mute icon, audio stops
  - [ ] Click unmute button - other users see unmute icon, audio resumes
  - [ ] Verify no page reload occurred
  - [ ] Verify peer connection still active

- [ ] **Camera Toggle**
  - [ ] Join room with camera enabled
  - [ ] Click camera off button - local preview shows avatar, remote users see no video
  - [ ] Click camera on button - video resumes
  - [ ] Verify no page reload occurred
  - [ ] Verify peer connection still active

- [ ] **Speaker Mute**
  - [ ] Receive audio from remote user
  - [ ] Click speaker mute - local audio stops
  - [ ] Click speaker unmute - local audio resumes
  - [ ] Verify other participants unconscious of this toggle

- [ ] **Device Switching**
  - [ ] Have 2+ Audio Input devices available
  - [ ] Select different microphone - should seamlessly switch
  - [ ] Verify no audio gap or reconnection
  - [ ] Have 2+ Video Input devices
  - [ ] Select different camera - should seamlessly switch
  - [ ] Verify no video freeze or reconnection

### Room Auto-Deletion

- [ ] **Public Room Auto-Deletion**
  - [ ] User A creates public room
  - [ ] User A joins room
  - [ ] Room appears in room listing
  - [ ] User A leaves room
  - [ ] Room disappears from listing (auto-deleted)
  - [ ] Verify room not listed or joinable

- [ ] **Group Room with Multiple Users**
  - [ ] 3 users create and join public room
  - [ ] User 1 leaves - room still visible
  - [ ] User 2 leaves - room still visible
  - [ ] User 3 (last one) leaves - room auto-deleted
  - [ ] Verify cleanup happened
  - [ ] Check database that room is deleted

- [ ] **Unexpected Disconnect**
  - [ ] 2 users in room
  - [ ] User 1 loses connection (disconnect network)
  - [ ] Wait 5-10 seconds
  - [ ] User 2 still in room
  - [ ] Force-close User 1's browser
  - [ ] Database cleanup should eventually remove User 1's participant record
  - [ ] If User 2 leaves, room should auto-delete

### Public Rooms

- [ ] **Create Public Room**
  - [ ] User A creates room with room_type='public'
  - [ ] Room appears in listing immediately
  - [ ] User B can find room in listing

- [ ] **Direct Join Public Room**
  - [ ] User B joins public room (no approval needed)
  - [ ] User B immediately joins
  - [ ] Can call manage-room with action='join' and get status='approved'
  - [ ] Media/peer connections establish

- [ ] **Public Room Capacity**
  - [ ] Public room set to max_participants=2
  - [ ] User A joins (count=1)
  - [ ] User B joins (count=2)
  - [ ] User C tries to join - gets "Room is full" error
  - [ ] User A leaves (count=1)
  - [ ] User C now able to join

### Private Rooms

- [ ] **Create Private Room**
  - [ ] User A creates room with room_type='private'
  - [ ] Room does NOT appear in public listing
  - [ ] User A (host) can see room in dashboard/owned rooms

- [ ] **Join Request Flow**
  - [ ] User B searches/navigates to User A's private room link
  - [ ] User B clicks "Join" or calls manage-room with action='join'
  - [ ] Response shows status='pending'
  - [ ] UI shows "Waiting for host approval..."
  - [ ] User B is added as participant_status='pending'
  - [ ] User B cannot see/join the WebRTC video yet

- [ ] **Host Approval**
  - [ ] User A (host) sees list of pending join requests
  - [ ] User A clicks "Approve" for User B
  - [ ] Call manage-room with action='approve', user_id=B
  - [ ] User B's participant_status changes to 'approved'
  - [ ] User B immediately notified (or polls) and joins WebRTC
  - [ ] User B sees video/audio

- [ ] **Host Rejection**
  - [ ] User C requests to join private room
  - [ ] User A clicks "Reject" for User C
  - [ ] Call manage-room with action='reject', user_id=C
  - [ ] User C's participant_status changes to 'rejected'
  - [ ] User C sees error "Your request was rejected"
  - [ ] User C cannot rejoin without new request

- [ ] **Host Removes Participant**
  - [ ] User B is approved and in the room (participant_status='approved')
  - [ ] User A clicks "Remove" on User B
  - [ ] Call manage-room with action='remove-participant', user_id=B
  - [ ] User B is deleted from group_room_participants
  - [ ] User B kicked from room (peer connections close)
  - [ ] User B can re-request to join

### WebRTC Signaling Fixes

- [ ] **No Duplicate Answer Errors**
  - [ ] Join room with 2 users
  - [ ] Check browser console - should NOT see:
    - "Received signal: answer" repeated
    - "Failed to set remote answer sdp: Called in wrong state: stable"
  - [ ] Video/audio connects smoothly

- [ ] **Proper Signaling State Transitions**
  - [ ] Check console logs for signaling state changes
  - [ ] Should see transitions: `stable → have-local-offer → stable`
  - [ ] Should NOT see jumps or unexpected states
  - [ ] For each signal, logs should show: `📥 Setting remote offer/answer from [peerId]`

- [ ] **Peer Connection Cleanup**
  - [ ] Join room with 3+ participants
  - [ ] One user leaves
  - [ ] Check console: `👋 Peer [leftUserId] disconnected`
  - [ ] Check that streams for that peer are removed
  - [ ] No memory leaks - check DevTools > Memory
  - [ ] Re-join that user - new peer connection created

- [ ] **ICE Candidate Handling**
  - [ ] Check console ICE logs
  - [ ] Should see: `🧊 ICE state [peerId]: connected` or `completed`
  - [ ] Should see: `🧊✅ Selected pair [peerId]: local=... remote=...`
  - [ ] If TURN fails, should fallback to STUN/direct
  - [ ] Should NOT see repeated errors for same candidate

- [ ] **Perfect Negotiation**
  - [ ] Join room - both peers simultaneously see each other
  - [ ] No glare/race conditions
  - [ ] Should see: `📤 Sending offer to [peerId]`
  - [ ] Responder should see: `📥 Setting remote offer`
  - [ ] Then responder: `📤 Sending answer`
  - [ ] Initiator: `📥 Setting remote answer`
  - [ ] Connection established

### Signal Deduplication

- [ ] **Duplicate Signals Ignored**
  - [ ] Check console during connection
  - [ ] If same answer received twice (messageId same), should see:
    - `⏭️ Ignoring duplicate signal [messageId]`
  - [ ] Should NOT process duplicate answer
  - [ ] Should NOT get "Called in wrong state" error

- [ ] **Message Metadata Present**
  - [ ] Inspect network tab (Supabase Realtime messages)
  - [ ] Each signal should include:
    - `messageId` (unique per signal)
    - `timestamp` (milliseconds)
    - `from` (senderId)
    - `to` (optional targetId)
    - `data` (offer/answer/candidate)

### Error Resilience

- [ ] **Transient ICE Errors Ignored**
  - [ ] Check console during connection
  - [ ] May see: `🧊⚠️ ICE candidate transient error [errorCode] ...`
  - [ ] Should NOT crash or disconnect
  - [ ] Connection should eventually establish

- [ ] **Network Reconnection**
  - [ ] Disconnect network briefly
  - [ ] Check: `🧊 ICE disconnected for [peerId], scheduling ICE restart`
  - [ ] After 5s: `🧊 Attempting ICE restart for [peerId]`
  - [ ] New offer sent with `iceRestart: true`
  - [ ] Connection re-established

- [ ] **Peer Reconnection**
  - [ ] Disconnect one user from network for 20+ seconds
  - [ ] Should see: `🔄 Auto-reconnect attempt 1/5`
  - [ ] Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s
  - [ ] On attempt 2+: `🧊 Will force relay...` 
  - [ ] Connection re-established with relay

### End-to-End Scenario

- [ ] **Full Workflow**
  1. User A creates PRIVATE room, "Movie Night"
  2. User A joins room, sees local video preview
  3. User B finds room via link
  4. User B requests to join
  5. User A sees "1 pending request"
  6. User A approves User B
  7. User B joins, WebRTC connects
  8. User A and B see each other's video
  9. User A toggles mic mute - User B sees mute icon, no audio
  10. User A toggles camera off - User B sees avatar
  11. User B toggles mic mute - User A sees mute icon
  12. User B toggles camera back on
  13. User C requests to join


  14. User A rejects User C
  15. User C gets "rejected" message
  16. User A leaves room
  17. User B is last - room auto-deletes
  18. User B cannot see room anymore
  19. No errors in console
  20. No page reloads during any action

## Debugging Tips

### Check Signaling State
```javascript
// In browser console
const pc = peerConnection // get from SimplePeer or store
console.log('Signaling state:', pc.signalingState)
console.log('ICE connection state:', pc.iceConnectionState)
console.log('Connection state:', pc.connectionState)
```

### Enable Verbose Logging
Look for console logs with these emojis:
- 🔗 Peer creation
- 🧊 ICE events
- 📤 Outgoing signals
- 📥 Incoming signals
- 🎉 Connection success
- 💥 Errors
- 📡 State changes
- ⏭️ Duplicate/skipped signals

### Check for Memory Leaks
1. Open DevTools > Memory
2. Take heap snapshot before joining
3. Take heap snapshot after multiple join/leave cycles
4. Detached DOM nodes and Map objects should not grow indefinitely

### Verify Room Deletion
```sql
-- In Supabase SQL editor
SELECT id, name, is_active, created_at
FROM group_rooms
WHERE id = '[test-room-id]';

-- Should return empty if room was deleted
```

### Check Participant Status
```sql
SELECT id, user_id, participant_status
FROM group_room_participants
WHERE room_id = '[test-room-id]';

-- Should show 'approved' for joined users
-- Should show 'pending' for awaiting approval
-- Should show 'rejected' if denied
```

## Troubleshooting

### "Called in wrong state: stable" Error
**Cause:** Trying to setRemoteDescription(answer) when not in 'have-local-offer' state
**Fix:** Check signaling state before processing answer. New code validates this.
**Verify:** Check console for `📥 Setting remote answer` - should only appear in have-local-offer state

### Duplicate Answer Processing
**Cause:** Supabase Realtime delivers same message twice
**Fix:** Message deduplication by messageId
**Verify:** Search console for "⏭️ Ignoring duplicate signal" - duplicates are now ignored

### Empty Room Not Deleting
**Cause:** Cleanup trigger not firing or RLS preventing deletion
**Fix:** Check participant_status='approved' for cleanup trigger
**Verify:** Leave room, check database that room record is deleted

### Private Room Always Pending
**Cause:** User status not changed to 'approved' by host
**Fix:** Call manage-room with action='approve'
**Verify:** Check participant_status in database is 'approved'

### Device Switch Fails
**Cause:** Device not available or constraints not met
**Fix:** Check device enumeration, ensure device still connected
**Verify:** Check console for `replaceTrack error`, try different device

### ICE Connection Fails
**Cause:** TURN credentials expired, firewall issue, or bad network
**Fix:** Check TURN credentials in iceServers, ensure relay=true on retry
**Verify:** Look for "🧊Use RELAY candidate" in console
