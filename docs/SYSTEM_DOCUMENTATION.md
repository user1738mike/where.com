# Where Connect - System Documentation

> **Last Updated:** January 30, 2026  
> **Version:** 1.0.0  
> **Status:** Beta

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Database Schema](#database-schema)
5. [Authentication](#authentication)
6. [Features](#features)
7. [WebRTC Implementation](#webrtc-implementation)
8. [Edge Functions](#edge-functions)
9. [Routes & Pages](#routes--pages)
10. [Component Library](#component-library)
11. [Security](#security)
12. [Known Issues & Solutions](#known-issues--solutions)
13. [Deployment](#deployment)

---

## Overview

**Where Connect** is a neighborhood-focused video chat application that enables residents of the same estate or geographical area to connect through:

- **Random 1:1 Video Chats** - Omegle-style random matching with verified neighbors
- **Topic-Based Group Rooms** - Up to 8 participants in interest-based video calls
- **Estate-Based Matching** - Location verification ensures users only connect with actual neighbors

### Core Value Proposition

```
"Meet your neighbors before you meet them"
```

The platform solves the urban isolation problem by facilitating genuine connections between people who live near each other but have never met.

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  React + Vite + TypeScript + Tailwind CSS                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Pages     │  │ Components  │  │   Hooks     │             │
│  │  (Routes)   │  │  (UI/Logic) │  │ (State/RTC) │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SUPABASE BACKEND                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Database   │  │   Auth      │  │  Realtime   │             │
│  │ (PostgreSQL)│  │ (JWT/Magic) │  │ (WebSocket) │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────────────────────────────────────────┐           │
│  │              Edge Functions (Deno)              │           │
│  │  • matchmaker     • manage-room                 │           │
│  │  • get-turn-creds • get-peer-profile            │           │
│  └─────────────────────────────────────────────────┘           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     WEBRTC (P2P)                                 │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │    STUN     │  │    TURN     │  (ICE servers)               │
│  │  (Google)   │  │  (Twilio)   │                               │
│  └─────────────┘  └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow - Random Matching

```
User A                    Supabase                    User B
  │                          │                          │
  ├──── Request Match ──────►│                          │
  │     (matchmaker edge fn) │                          │
  │                          │◄──── Request Match ─────┤
  │                          │      (matchmaker)        │
  │                          │                          │
  │◄─── Match Created ───────┤────── Match Created ────►│
  │     (with match_id)      │      (with match_id)     │
  │                          │                          │
  ├── Subscribe to channel ─►│◄── Subscribe to channel ─┤
  │   where:match:{id}       │    where:match:{id}      │
  │                          │                          │
  │◄──────────────── WebRTC Signaling ────────────────►│
  │     (SDP offer/answer, ICE candidates)              │
  │                          │                          │
  │◄══════════════ Direct P2P Video Stream ══════════►│
```

### Data Flow - Group Rooms

```
Room Creator              Supabase              Participant B           Participant C
     │                       │                        │                       │
     ├── Create Room ───────►│                        │                       │
     │   (manage-room)       │                        │                       │
     │                       │                        │                       │
     │◄── Room Created ──────┤                        │                       │
     │                       │◄─── Join Room ────────┤                       │
     │                       │    (manage-room)       │                       │
     │                       │                        │                       │
     │                       │◄────────────────────── Join Room ─────────────┤
     │                       │                       (manage-room)            │
     │                       │                        │                       │
     ├─ Subscribe channel ──►│◄──────────────────────┼───────────────────────┤
     │  group:room:{id}      │  (all subscribe)      │                       │
     │                       │                        │                       │
     │◄═════════════════ Full Mesh WebRTC (3 peer connections) ═════════════►│
     │                       │                        │                       │
     │   A↔B connection      │                        │   B↔C connection      │
     │   A↔C connection      │                        │                       │
```

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI Framework |
| Vite | Latest | Build tool & dev server |
| TypeScript | Latest | Type safety |
| Tailwind CSS | Latest | Styling |
| shadcn/ui | Latest | Component library |
| Framer Motion | 12.x | Animations |
| React Router | 6.30.1 | Routing |
| TanStack Query | 5.x | Server state management |
| Zustand | 5.x | Client state management |

### Backend (Supabase)

| Service | Purpose |
|---------|---------|
| PostgreSQL | Primary database |
| Auth | User authentication (Email/Magic Link) |
| Realtime | WebSocket for signaling |
| Edge Functions | Serverless Deno functions |
| Row Level Security | Data access control |

### WebRTC

| Library | Purpose |
|---------|---------|
| SimplePeer | WebRTC abstraction |
| webrtc-adapter | Browser compatibility |
| Twilio TURN | NAT traversal (fallback) |

---

## Database Schema

### Core Tables

#### `where_profiles`
User profiles with neighborhood information.

```sql
CREATE TABLE where_profiles (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    name text NOT NULL,
    bio text,
    avatar_url text,
    estate_id uuid,
    apartment_name text,
    interests text[],
    is_available boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

#### `group_rooms`
Topic-based video chat rooms.

```sql
CREATE TABLE group_rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    topic text NOT NULL,          -- e.g., 'fitness', 'cooking', 'gaming'
    description text,
    estate_id uuid,               -- Optional: restrict to estate
    max_participants integer DEFAULT 8,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);
```

#### `group_room_participants`
Tracks who is currently in a room.

```sql
CREATE TABLE group_room_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid REFERENCES group_rooms(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    is_muted boolean DEFAULT false,
    is_video_off boolean DEFAULT false,
    UNIQUE(room_id, user_id)
);
```

#### `matches`
1:1 random match records.

```sql
CREATE TABLE matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id uuid REFERENCES auth.users(id),
    user2_id uuid REFERENCES auth.users(id),
    status text DEFAULT 'pending',  -- pending, active, completed
    created_at timestamptz DEFAULT now(),
    ended_at timestamptz
);
```

#### `user_preferences`
Matching preferences and settings.

```sql
CREATE TABLE user_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    estate_id uuid,
    apartment_name text,
    matching_radius integer DEFAULT 2,  -- km
    interests text[],
    created_at timestamptz DEFAULT now()
);
```

### RLS Policies

**Critical:** The `group_room_participants` table uses simple, non-recursive RLS policies:

```sql
-- SELECT: All authenticated users can view all participants
CREATE POLICY "allow_select_participants"
ON group_room_participants FOR SELECT
TO authenticated
USING (true);

-- INSERT: Users can only insert their own participation
CREATE POLICY "allow_insert_own_participation"
ON group_room_participants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own record
CREATE POLICY "allow_update_own_participation"
ON group_room_participants FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- DELETE: Users can only remove themselves
CREATE POLICY "allow_delete_own_participation"
ON group_room_participants FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

**⚠️ Important:** Never use subqueries that reference the same table in RLS policies - this causes infinite recursion errors.

---

## Authentication

### Implementation

The `useAuth` hook manages authentication state:

```typescript
// src/hooks/useAuth.ts
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession();
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  return { user, loading };
};
```

### Auth Flow

1. **Registration** (`/vibez/where/register`)
   - Multi-step form: Name, Estate, Interests
   - Creates Supabase auth user
   - Creates `where_profiles` record

2. **Login** (`/vibez/where/login`)
   - Email + Password OR
   - Magic Link (passwordless)

3. **Session Management**
   - JWT stored in localStorage
   - Auto-refresh handled by Supabase client
   - Session persists across page refreshes

---

## Features

### 1. Random 1:1 Video Matching

**Location:** `src/pages/vibez/WhereChat.tsx`

**Flow:**
1. User clicks "Find a Neighbor"
2. `matchmaker` edge function finds compatible online user
3. Both users join Supabase Realtime channel
4. WebRTC signaling establishes P2P connection
5. Video/audio streams directly between browsers

**Key Components:**
- `RandomMatcher` - UI for finding matches
- `VideoChat` - Video display and controls
- `ChatSidebar` - Text chat overlay
- `useWebRTC` - WebRTC connection management

### 2. Topic-Based Group Rooms

**Location:** `src/pages/vibez/WhereGroupRooms.tsx`, `WhereGroupChat.tsx`

**Topics Available:**
- 🏋️ Fitness
- 🍳 Cooking
- 💻 Technology
- 🎮 Gaming
- 🎵 Music
- 🎬 Movies
- 📚 Reading
- 🌱 Gardening
- 🐾 Pets
- 👶 Parenting
- 💼 Business
- 🎨 Art
- ⚽ Sports
- 💬 General Chat

**Flow:**
1. User creates or joins a room
2. `manage-room` edge function handles room lifecycle
3. All participants join Realtime channel
4. Full mesh WebRTC connects everyone
5. Grid displays all video feeds

**Key Components:**
- `RoomCard` - Room preview card
- `CreateRoomModal` - Room creation form
- `GroupVideoGrid` - Video tile layout
- `useGroupWebRTC` - Multi-peer WebRTC

### 3. User Dashboard

**Location:** `src/pages/vibez/WhereDashboard.tsx`

Features:
- Online neighbor count
- Recent connections
- Quick match button
- Profile summary
- Group room access

---

## WebRTC Implementation

### 1:1 Matching (`useWebRTC.ts`)

```typescript
// Key functions
const startCall = async (matchId: string) => {
  // 1. Join signaling channel
  await joinMatchChannel(matchId);
  
  // 2. Create peer as initiator
  await createPeer(true, matchId);
};

const answerCall = async (matchId: string) => {
  // 1. Join signaling channel
  await joinMatchChannel(matchId);
  
  // 2. Initialize local stream
  await initLocalStream();
  
  // 3. Wait for offer, then create responder peer
};
```

### Group Rooms (`useGroupWebRTC.ts`)

**Topology:** Full Mesh (every participant connects to every other)

```typescript
// Deterministic initiator selection
const shouldInitiate = userIdRef.current! < payload.user_id;
if (shouldInitiate) {
  await createPeer(payload.user_id, true);
}
```

**Why deterministic?** Prevents race conditions where both peers try to initiate simultaneously.

### ICE Server Configuration

```typescript
// src/lib/webrtc/iceServers.ts
export const getIceServers = async (roomId: string) => {
  // 1. Try to get TURN credentials from edge function
  const turnCreds = await getTurnCredentials(roomId);
  
  // 2. Return servers with fallback
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ...(turnCreds ? [turnCreds] : [])
  ];
};
```

### Media Constraints

```typescript
// Desktop
{
  video: { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
}

// Mobile (optimized for bandwidth)
{
  video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
}
```

---

## Edge Functions

### `manage-room/index.ts`

Handles all group room operations.

| Action | Description |
|--------|-------------|
| `create` | Create new room, auto-join creator |
| `join` | Add user to room (with capacity check) |
| `leave` | Remove user from room |
| `close` | Deactivate room (creator only) |
| `update_status` | Update mute/video state |

**Example Request:**
```typescript
await supabase.functions.invoke('manage-room', {
  body: {
    action: 'create',
    name: 'Morning Fitness',
    topic: 'fitness',
    max_participants: 6
  }
});
```

### `matchmaker/index.ts`

Finds compatible users for 1:1 matching.

**Algorithm:**
1. Get user's estate/preferences
2. Find online users in same estate
3. Exclude recent matches
4. Randomly select partner
5. Create match record

### `get-turn-credentials/index.ts`

Returns TURN server credentials for WebRTC fallback.

### `get-peer-profile/index.ts`

Returns sanitized profile for matched user.

---

## Routes & Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/vibez/where` | `Where.tsx` | Landing page |
| `/vibez/where/register` | `WhereRegister.tsx` | Registration flow |
| `/vibez/where/login` | `WhereLogin.tsx` | Authentication |
| `/vibez/where/dashboard` | `WhereDashboard.tsx` | User home |
| `/vibez/where/chat` | `WhereChat.tsx` | 1:1 video matching |
| `/vibez/where/rooms` | `WhereGroupRooms.tsx` | Group room browser |
| `/vibez/where/rooms/:roomId` | `WhereGroupChat.tsx` | Group video chat |
| `/vibez/where/profile` | `WhereProfile.tsx` | Profile settings |
| `/vibez/where/admin` | `WhereAdmin.tsx` | Admin dashboard |

---

## Component Library

### Core Components (shadcn/ui based)

Located in `src/components/vibez/ui/`:

- Button, Input, Label, Textarea
- Dialog, Sheet, Modal
- Select, Checkbox, Switch
- Card, Badge, Avatar
- Tabs, Accordion, Collapsible
- Toast, Sonner (notifications)
- Form (react-hook-form integration)

### Where-Specific Components

Located in `src/components/vibez/where/`:

| Component | Purpose |
|-----------|---------|
| `WhereHeader` | App navigation bar |
| `VideoChat` | Video display with controls |
| `GroupVideoGrid` | Multi-participant video layout |
| `RoomCard` | Room preview in browser |
| `CreateRoomModal` | Room creation form |
| `RandomMatcher` | Match finding UI |
| `MatchPreferences` | Preference settings |
| `ReportModal` | User reporting |

---

## Security

### Row Level Security (RLS)

All tables have RLS enabled. Key principles:

1. **Simple policies** - Use `auth.uid() = user_id` directly
2. **No self-referencing** - Never query the same table in a policy
3. **Use helper functions** - For complex logic, use `SECURITY DEFINER` functions

### Data Protection

- Passwords hashed by Supabase Auth
- JWT tokens for API authentication
- HTTPS only in production
- No PII in client logs

### Safety Features

- Report button in all video chats
- Three-strike moderation system
- Block user functionality
- Estate verification

---

## Known Issues & Solutions

### Issue: RLS Infinite Recursion

**Symptom:** 500 error with message `infinite recursion detected in policy`

**Cause:** RLS policy contains subquery referencing the same table

**Solution:** Use `migrations/20260130_fix_group_room_participants_rls.sql`

```sql
-- BAD: Causes recursion
USING (EXISTS (SELECT 1 FROM group_room_participants WHERE user_id = auth.uid()))

-- GOOD: Direct comparison
USING (auth.uid() = user_id)
```

### Issue: Rooms Disappear on Refresh

**Symptom:** Created rooms vanish after page refresh

**Cause:** Auto-deactivation when participant count hits zero

**Solution:** Removed auto-deactivation from `manage-room` edge function. Rooms now persist until creator explicitly closes them.

### Issue: Audio Not Playing When Video Off

**Symptom:** Can't hear remote participant when their video is disabled

**Cause:** Video element not rendered when `isVideoOff = true`

**Solution:** Hidden audio element always rendered for remote streams:

```tsx
{stream && !isLocal && isVideoOff && (
  <video ref={audioRef} autoPlay playsInline className="hidden" />
)}
```

---

## Deployment

### Environment Variables

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### Edge Function Secrets

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
TWILIO_ACCOUNT_SID (for TURN)
TWILIO_AUTH_TOKEN (for TURN)
```

### Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production
npm run preview
```

### Deployment Platforms

- **Frontend:** Vercel, Netlify, or Lovable
- **Backend:** Supabase (managed)
- **Edge Functions:** Supabase Edge (Deno)

---

## Migration Files

| File | Purpose |
|------|---------|
| `20251209_create_mtaaloop_tables.sql` | Initial schema |
| `20251211090000_update_user_preferences_rls.sql` | Open preferences for matching |
| `20251211100000_migrate_profiles_to_preferences.sql` | Data migration |
| `20251211110000_create_matches_table.sql` | Match records |
| `20251212_fix_where_profiles_rls.sql` | Profile RLS fixes |
| `20260130_create_group_rooms.sql` | Group rooms schema |
| `20260130_fix_group_room_participants_rls.sql` | Fix RLS recursion |

---

## Contact & Support

- **Repository:** Lovable Project
- **Published URL:** https://where-com.lovable.app
- **Preview URL:** https://id-preview--25050cdd-c2d0-443b-9174-d337a8f2ea3c.lovable.app

---

*Documentation generated: January 30, 2026*
