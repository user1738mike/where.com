import { supabase } from "@/integrations/supabase/client";

const STUN_FALLBACK: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const TURN_FALLBACK: RTCIceServer[] = [
  { urls: "turn:openrelay.metered.ca:443?transport=tcp" },
  { urls: "turn:openrelay.metered.ca:443?transport=udp" },
];

function dedupeServers(servers: RTCIceServer[]): RTCIceServer[] {
  const seen = new Set<string>();
  const result: RTCIceServer[] = [];
  for (const server of servers) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    const newUrls = urls.filter((u) => !seen.has(u));
    newUrls.forEach((u) => seen.add(u));
    if (newUrls.length > 0) {
      result.push({
        ...server,
        urls: newUrls.length === 1 ? newUrls[0] : newUrls,
      });
    }
  }
  return result;
}

export async function getIceServers(matchId?: string): Promise<RTCIceServer[]> {
  if (!matchId) {
    console.warn(
      "getIceServers called without matchId — STUN fallback with public relay support",
    );
    return [...STUN_FALLBACK, ...TURN_FALLBACK];
  }

  try {
    console.log("Fetching TURN credentials…", matchId);

    const turnPromise = supabase.functions.invoke("get-turn-credentials", {
      body: { matchId },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TURN timeout")), 8000),
    );

    const { data, error } = (await Promise.race([
      turnPromise,
      timeoutPromise,
    ])) as any;

    if (!error && data?.iceServers) {
      const servers = Array.isArray(data.iceServers) ? data.iceServers : [];
      if (servers.length > 0) {
        const processed = servers.map((s: any) => ({
          urls: s.urls,
          ...(s.username ? { username: s.username } : {}),
          ...(s.credential ? { credential: s.credential } : {}),
        }));
        const final = dedupeServers(processed);
        console.log("✅ ICE servers from Metered:", final.length);
        return final;
      }
    }

    console.warn("No ICE servers from edge function, using STUN fallback");
  } catch (err: any) {
    console.warn("TURN fetch failed:", err.message);
  }

  return [...STUN_FALLBACK, ...TURN_FALLBACK];
}

export default getIceServers;
