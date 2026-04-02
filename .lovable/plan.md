

## Fix Two Issues: Video Rooms + Profile Photo Saving

### Issue 1: Users Cannot See Each Other in Video Rooms

**Root cause**: The `peer_ready` handshake has a flaw — when user B joins and broadcasts `join`, user A (the initiator by UUID) sends `peer_ready` to B. But B's `peer_ready` listener only responds if the message has `payload.to === userIdRef.current`. The problem is that B may not yet have processed A's `peer_ready` before A's 3-second fallback fires, and by then both sides may try to create conflicting peers.

More critically, when B receives A's `peer_ready` (lines 484-498), B checks `shouldInitiate = userIdRef.current < payload.from`. If B's UUID is higher, `shouldInitiate` is false and B does **nothing** — it doesn't create a peer as responder. B just waits passively. Meanwhile A's 3s fallback creates a peer as initiator and sends an offer, but B has no peer to receive it (it goes to the signal handler which creates a peer on-demand only for `offer` type — this part works). However, the timing is fragile.

The real fix is to simplify: remove the `peer_ready` ceremony for the group flow and use the same deterministic initiator pattern the 1:1 code uses. When B joins:
- A detects the join broadcast
- If A < B (UUID), A immediately creates a peer as initiator
- B receives the offer via signal handler, creates peer as responder on-demand (already works at line 385-386)

This eliminates the 3-second delay and the race condition.

**Changes to `src/hooks/useGroupWebRTC.ts`**:
- Remove the `peer_ready` broadcast/listener logic entirely
- On `join` event: if `userId < joiner.user_id`, immediately call `createPeer(joiner.user_id, true)` (no delay, no handshake)
- On initial participant fetch: same — if `userId < p.user_id`, immediately create peer
- Keep the on-demand peer creation in `handleSignal` for non-initiator side (already works)
- Remove `peer_ready` from reconnect flow too — just create peer directly

### Issue 2: Profile Photo Not Saving

**Two root causes**:

1. **No storage bucket exists**: `WhereProfile.tsx` uploads to bucket `where-photos`, but there is no migration creating this bucket. The upload silently fails.

2. **Column name mismatch**: `RegistrationSteps.tsx` inserts profiles with `full_name`, but `WhereProfile.tsx` reads `data.name` and updates with `name: formData.name.trim()`. If the actual column is `full_name`, the update writes to a non-existent column and silently does nothing.

**Changes**:

- **New migration** `migrations/20260331_create_where_photos_bucket.sql`:
  - Create `where-photos` storage bucket (public)
  - Add RLS policies allowing authenticated users to upload/read

- **Fix `src/pages/vibez/WhereProfile.tsx`**:
  - Change all references from `name` to `full_name` in the profile fetch mapping and update query
  - Change `data.name` → `data.full_name` in `fetchProfile`
  - Change `name: formData.name.trim()` → `full_name: formData.name.trim()` in the update query

### Files to edit

| File | Changes |
|------|---------|
| `src/hooks/useGroupWebRTC.ts` | Remove peer_ready handshake, create peers immediately on join/init |
| `src/pages/vibez/WhereProfile.tsx` | Fix `name` → `full_name` column references |
| `migrations/20260331_create_where_photos_bucket.sql` | Create `where-photos` storage bucket with RLS |

