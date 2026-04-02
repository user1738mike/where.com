# Where — User Guide

Welcome to Where — a neighborhood-first social app connecting neighbors by text and optional group video.

This guide walks through how the app behaves, how rooms and meetings are managed, common gotchas (including why rooms may disappear after a meet)
**Quick Start**
- **Create account:** Register from the homepage and complete the multi-step flow: basic info, location verification, profile, and preferences.
- **Verify location:** Use `Use Current Location` to auto-detect your estate/neighborhood (requires granting location permission). Edit fields manually if needed.
- **Join a room:** From the dashboard, create or join a neighborhood room. If you enabled video, you can join with camera/mic.

**Rooms & Meetings — lifecycle (what to expect)**
- **Room creation:** A room is created when a user creates it in the UI. It's persisted while participants are present or for a short grace period after the last leave.
- **Joining:** When you join a room, the client subscribes to a realtime channel and announces presence. Other participants are notified and an offer/answer WebRTC exchange begins.
- **Active meeting:** While participants are present, the room exists and supports text chat, presence, and group video.
- **Meeting end / room disappearance:** When the last participant leaves, the backend marks the room inactive and may delete it after a short TTL (time-to-live) to reclaim resources and avoid stale rooms. As a result, after a meet ends (everyone leaves), the room can disappear from lists. This is intentional — it's to keep room lists relevant and to limit server-side resource use.
 
**Video & Audio behavior**
- **Permissions:** Browsers require explicit permission for camera and microphone. Allow these when prompted.
- **Autoplay & audio:** Modern browsers block autoplay of unmuted audio. The app attempts staged plays (video muted first, then audio). If the browser blocks audio, you will see an `Unmute` or `Play audio` control on the tile — use that for a user gesture to enable sound.
- **Pinning & layout:** Click a thumbnail to pin a participant to the main view. Thumbnails scale down to save screen space.
- **If you see only yourself:** This is often a signaling timing issue (your client hasn't received peer signals yet) or network/NAT traversal problem (missing TURN). Try rejoining, or ask the other participant to rejoin. If the issue persists, collect logs and share them (see Troubleshooting).

**Common troubleshooting steps**
- **No camera/mic**: Check site permissions in browser settings. Ensure no other app is exclusively using the device.
- **No audio**: Click the tile's `Play audio` or `Unmute` overlay. Check tab mute, system volume, and output device.
- **Cannot see others (initiator-only issue)**:
  - Confirm both participants show `Subscribed` events in the browser console (realtime channel subscription). If not, try refreshing.
  - Verify TURN credentials if behind strict NAT. If TURN is unavailable, peers behind restrictive NATs may not connect.
  - If you still reproduce, capture console logs from both sides for the time around join (see `Debug logs` section below) and share them with support.
- **Rooms disappeared unexpectedly**:
  - Rooms are ephemeral by default and may be removed when empty. Recreate the room if needed or use persistent-room workflow if available.

**Privacy & data**
- **Profile visibility:** Your name, interests, and neighborhood appear to other neighbors for discovery. Unit numbers are stored but not shown publicly.
- **Media:** Video/audio streams are peer-to-peer when possible. The backend facilitates signaling and may broker TURN relays for NAT traversal — media paths are not recorded by default.

**Debug logs to collect when reporting issues**
- **Browser console:** Copy logs around these events: channel subscription, `peer:signal` send/receive, `peer:connect`, `peer:stream`, and `peer:close`.
- **Timeline:** Note the sequence of actions (who created the room, who joined, timestamps).
- **Client build & browser:** Provide app version (commit hash or date), browser name and version, and network context (private home, corporate, mobile tethering).

