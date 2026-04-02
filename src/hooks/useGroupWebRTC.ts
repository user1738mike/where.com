import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getIceServers } from "@/lib/webrtc/iceServers";
import SimplePeer from "simple-peer";

interface Participant {
  id: string;
  user_id: string;
  is_muted: boolean;
  is_video_off: boolean;
  name?: string;
  avatar_url?: string;
}

// SignalMessage shape used in broadcast payloads
// { from: string, to?: string, data: any, messageId?: string, timestamp?: number }

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "videoinput" | "audiooutput";
}

export function useGroupWebRTC(userId: string | null, roomId: string | null) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerStreams, setPeerStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionErrors, setConnectionErrors] = useState<string[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Device management
  const [audioInputs, setAudioInputs] = useState<DeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<DeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<DeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] =
    useState<string>("default");
  const [selectedVideoInput, setSelectedVideoInput] =
    useState<string>("default");
  const [selectedAudioOutput, setSelectedAudioOutput] =
    useState<string>("default");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);

  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map());
  const channelRef = useRef<any | null>(null);
  const userIdRef = useRef<string | null>(userId);
  const roomIdRef = useRef<string | null>(roomId);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingSignalsRef = useRef<Map<string, any[]>>(new Map());
  const processedSignalsRef = useRef<Set<string>>(new Set()); // Track signal message IDs to prevent duplicates
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());
  const forceRelayRef = useRef<Map<string, boolean>>(new Map());
  const iceRestartTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  const peerStateRef = useRef<
    Map<
      string,
      {
        makingOffer: boolean;
        ignoreOffer: boolean;
        isSettingRemoteAnswerPending: boolean;
      }
    >
  >(new Map());
  const closingPeersRef = useRef<Set<string>>(new Set());

  // Audio analysis for active speaker detection
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const samplingIntervalRef = useRef<number | null>(null);
  const levelsRef = useRef<Map<string, number>>(new Map());
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  // Ref for handleSignal to avoid stale closures
  const setupAnalyserRef = useRef<(id: string, stream: MediaStream) => void>(
    () => {},
  );
  const handleSignalRef =
    useRef<(from: string, data: any, messageId?: string) => Promise<void>>();

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // Enumerate devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${Math.random()}`,
          kind: "audioinput" as const,
        }));
      const videoInputs = devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${Math.random()}`,
          kind: "videoinput" as const,
        }));
      const audioOutputs = devices
        .filter((d) => d.kind === "audiooutput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${Math.random()}`,
          kind: "audiooutput" as const,
        }));
      setAudioInputs(audioInputs);
      setVideoInputs(videoInputs);
      setAudioOutputs(audioOutputs);
    } catch (err) {
      console.warn("Failed to enumerate devices:", err);
    }
  }, []);

  useEffect(() => {
    enumerateDevices();
    navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
    return () =>
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        enumerateDevices,
      );
  }, [enumerateDevices]);

  // Initialize local media stream with device selection
  const initLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;

    const isMobile =
      /Android|webOS|iPhone|iPad|iPok|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    const constraints: MediaStreamConstraints = {
      video: isMobile
        ? {
            width: { ideal: 320, max: 640 },
            height: { ideal: 240, max: 480 },
            frameRate: { ideal: 15, max: 24 },
            facingMode: { ideal: "user" },
            deviceId:
              selectedVideoInput !== "default"
                ? { exact: selectedVideoInput }
                : undefined,
          }
        : {
            width: { ideal: 854 },
            height: { ideal: 480 },
            frameRate: { ideal: 24 },
            deviceId:
              selectedVideoInput !== "default"
                ? { exact: selectedVideoInput }
                : undefined,
          },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        deviceId:
          selectedAudioInput !== "default"
            ? { exact: selectedAudioInput }
            : undefined,
      },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMediaError(null);
      console.log("📹 Group local stream initialized with devices");
      return stream;
    } catch (error) {
      console.error("📹 Failed to get user media:", error);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId:
              selectedAudioInput !== "default"
                ? { exact: selectedAudioInput }
                : undefined,
          },
        });
        localStreamRef.current = audioStream;
        setLocalStream(audioStream);
        setMediaError("Camera access denied — only audio is available.");
        return audioStream;
      } catch (audioError) {
        console.error("📹 Audio-only fallback failed:", audioError);
        const emptyStream = new MediaStream();
        localStreamRef.current = emptyStream;
        setLocalStream(emptyStream);
        setMediaError(
          "Camera and microphone access denied. Other participants won't see or hear you.",
        );
        return emptyStream;
      }
    }
  }, [selectedAudioInput, selectedVideoInput]);

  // Replace a specific track (for device switching)
  const replaceTrack = useCallback(
    async (kind: "audio" | "video", newDeviceId: string) => {
      if (!localStreamRef.current) return;

      try {
        const constraints: any =
          kind === "audio"
            ? { audio: { deviceId: { exact: newDeviceId } } }
            : { video: { deviceId: { exact: newDeviceId } } };

        const newStream =
          await navigator.mediaDevices.getUserMedia(constraints);
        const newTrack =
          newStream[
            kind === "audio" ? "getAudioTracks" : "getVideoTracks"
          ]()[0];

        if (!newTrack) {
          console.warn(`No ${kind} track in new stream`);
          return;
        }

        // Replace track in local stream
        const oldTracks =
          localStreamRef.current[
            kind === "audio" ? "getAudioTracks" : "getVideoTracks"
          ]();
        if (oldTracks.length > 0) {
          localStreamRef.current.removeTrack(oldTracks[0]);
          oldTracks[0].stop();
        }
        localStreamRef.current.addTrack(newTrack);

        // Replace tracks in all peer connections
        peersRef.current.forEach(async (peer, peerId) => {
          try {
            const pc = (peer as any)._pc as RTCPeerConnection | undefined;
            if (!pc) return;

            const sender = pc.getSenders().find((s) => s.track?.kind === kind);
            if (sender) {
              await sender.replaceTrack(newTrack);
              console.log(`🔄 Replaced ${kind} track for peer ${peerId}`);
            }
          } catch (err) {
            console.warn(
              `Failed to replace ${kind} track for peer ${peerId}:`,
              err,
            );
          }
        });

        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        console.log(`✅ ${kind} device switched successfully`);
      } catch (err) {
        console.error(`Failed to switch ${kind} device:`, err);
        setMediaError(`Failed to switch ${kind} device`);
      }
    },
    [],
  );

  // Change device
  const selectAudioInput = useCallback(
    async (deviceId: string) => {
      setSelectedAudioInput(deviceId);
      await replaceTrack("audio", deviceId);
    },
    [replaceTrack],
  );

  const selectVideoInput = useCallback(
    async (deviceId: string) => {
      setSelectedVideoInput(deviceId);
      await replaceTrack("video", deviceId);
    },
    [replaceTrack],
  );

  const selectAudioOutput = useCallback(async (deviceId: string) => {
    setSelectedAudioOutput(deviceId);
  }, []);

  // Reconnection with backoff
  const reconnectPeerWithBackoff = useCallback((peerId: string) => {
    const attempts = reconnectAttemptsRef.current.get(peerId) || 0;
    const maxAttempts = 5;
    if (!roomIdRef.current || !userIdRef.current) return;
    if (attempts >= maxAttempts) {
      console.warn(`Max reconnect attempts reached for ${peerId}`);
      return;
    }

    if (attempts >= 1) {
      forceRelayRef.current.set(peerId, true);
      console.log(`🧊 Will force relay for ${peerId} on next attempt`);
    }

    const delay = Math.min(30000, Math.pow(2, attempts) * 1000);
    reconnectAttemptsRef.current.set(peerId, attempts + 1);
    console.log(
      `Scheduling reconnect to ${peerId} in ${delay}ms (attempt ${attempts + 1})`,
    );

    window.setTimeout(async () => {
      if (peersRef.current.has(peerId)) return;
      try {
        const shouldInitiate = userIdRef.current! < peerId;
        await createPeer(peerId, shouldInitiate);
      } catch (err) {
        console.warn("Reconnect attempt failed for", peerId, err);
        reconnectPeerWithBackoff(peerId);
      }
    }, delay);
  }, []);

  // Create peer connection with perfect negotiation pattern
  const createPeer = useCallback(
    async (
      peerId: string,
      initiator: boolean,
    ): Promise<SimplePeer.Instance> => {
      console.log(
        `🔗 Creating peer connection to ${peerId}, initiator: ${initiator}`,
      );

      const existingPeer = peersRef.current.get(peerId);
      if (existingPeer) {
        closingPeersRef.current.add(peerId);
        try {
          existingPeer.destroy();
        } catch {}
        peersRef.current.delete(peerId);
        window.setTimeout(() => closingPeersRef.current.delete(peerId), 5000);
      }

      const stream = localStreamRef.current || (await initLocalStream());
      const iceServers = await getIceServers(roomIdRef.current || "group");

      const hasTurn = iceServers.some((s) => {
        return Array.isArray(s.urls)
          ? s.urls.some(
              (u: string) => typeof u === "string" && u.startsWith("turn"),
            )
          : typeof s.urls === "string" && s.urls.startsWith("turn");
      });

      const shouldForceRelay = forceRelayRef.current.get(peerId) || false;
      const peerConfig: RTCConfiguration = {
        iceServers,
        iceCandidatePoolSize: 10,
        iceTransportPolicy: shouldForceRelay && hasTurn ? "relay" : "all",
      };

      console.log(
        `🧊 ICE config for ${peerId}: policy=${peerConfig.iceTransportPolicy}, servers=${iceServers.length}, forceRelay=${shouldForceRelay}`,
      );

      const peer = new SimplePeer({
        initiator,
        trickle: true,
        stream,
        config: peerConfig,
      });

      const pc = (peer as any)._pc as RTCPeerConnection | undefined;
      if (pc) {
        pc.addEventListener("icecandidateerror", (ev: any) => {
          const ignorable = [701, 702, 703, 768];
          if (ignorable.includes(ev.errorCode)) {
            console.log(
              `🧊⚠️ ICE candidate transient error for ${peerId}: ${ev.errorCode} ${ev.errorText}`,
            );
          } else {
            console.warn(
              `🧊❌ ICE candidate error for ${peerId}: ${ev.errorCode} ${ev.errorText} ${ev.url || ""}`,
            );
          }
        });

        pc.addEventListener("iceconnectionstatechange", () => {
          const state = pc.iceConnectionState;
          console.log(`🧊 ICE state [${peerId}]: ${state}`);

          if (state === "connected" || state === "completed") {
            const timer = iceRestartTimersRef.current.get(peerId);
            if (timer) {
              clearTimeout(timer);
              iceRestartTimersRef.current.delete(peerId);
            }
            forceRelayRef.current.delete(peerId);
            reconnectAttemptsRef.current.set(peerId, 0);
          }

          if (state === "failed" || state === "disconnected") {
            console.log(
              `🧊 ICE state is ${state} for ${peerId}, scheduling reconnect`,
            );
            const timer = setTimeout(() => {
              reconnectPeerWithBackoff(peerId);
            }, 5000);
            iceRestartTimersRef.current.set(peerId, timer);
          }
        });

        pc.addEventListener("connectionstatechange", () => {
          console.log(`🔌 Connection state [${peerId}]: ${pc.connectionState}`);
        });

        pc.addEventListener("signalingstatechange", () => {
          console.log(`📡 Signaling state [${peerId}]: ${pc.signalingState}`);
        });
      }

      peer.on("signal", (data: any) => {
        console.log(
          `📤 Sending signal to ${peerId}:`,
          (data && data.type) || "candidate",
        );
        try {
          channelRef.current?.send({
            type: "broadcast",
            event: "signal",
            payload: {
              from: userIdRef.current,
              to: peerId,
              data,
              messageId: `${peerId}-${data.type}-${Date.now()}-${Math.random()}`,
              timestamp: Date.now(),
            },
          });
        } catch (err) {
          console.warn("Failed to send signal via channel:", err);
        }
      });

      peer.on("stream", (remoteStream: MediaStream) => {
        console.log(
          `🎥 Received stream from ${peerId}, tracks: ${remoteStream
            .getTracks()
            .map((t) => `${t.kind}:${t.readyState}`)
            .join(", ")}`,
        );
        setPeerStreams((prev) => {
          const newMap = new Map(prev);
          newMap.set(peerId, remoteStream);
          return newMap;
        });
        try {
          setupAnalyserRef.current(peerId, remoteStream);
        } catch (err) {
          console.warn("Failed to setup analyser for", peerId, err);
        }
      });

      peer.on("connect", () => {
        console.log(`🎉 Connected to peer ${peerId}`);
        setConnectionErrors((prev) => prev.filter((e) => !e.includes(peerId)));
      });

      peer.on("error", (err: any) => {
        console.error(`💥 Peer error with ${peerId}:`, err?.message || err);
        setConnectionErrors((prev) => [
          ...prev.filter((e) => !e.includes(peerId)),
          `Connection error with ${peerId}`,
        ]);
      });

      peer.on("close", () => {
        console.log(`👋 Peer ${peerId} disconnected`);
        if (closingPeersRef.current.has(peerId)) {
          closingPeersRef.current.delete(peerId);
          return;
        }

        peersRef.current.delete(peerId);
        peerStateRef.current.delete(peerId);

        const timer = iceRestartTimersRef.current.get(peerId);
        if (timer) {
          clearTimeout(timer);
          iceRestartTimersRef.current.delete(peerId);
        }

        setPeerStreams((prev) => {
          const newMap = new Map(prev);
          newMap.delete(peerId);
          return newMap;
        });
        analysersRef.current.delete(peerId);
        reconnectPeerWithBackoff(peerId);
      });

      peersRef.current.set(peerId, peer);

      const buffered = pendingSignalsRef.current.get(peerId) || [];
      for (const signal of buffered) {
        try {
          peer.signal(signal);
        } catch (err) {
          console.warn(`Failed to apply buffered signal for ${peerId}:`, err);
        }
      }
      pendingSignalsRef.current.delete(peerId);

      return peer;
    },
    [initLocalStream, reconnectPeerWithBackoff],
  );

  // Setup analyser for remote streams
  const setupAnalyserForStream = useCallback(
    (id: string, stream: MediaStream) => {
      try {
        if (!audioCtxRef.current) {
          const Ctor =
            (window as any).AudioContext || (window as any).webkitAudioContext;
          audioCtxRef.current = new Ctor();
        }

        const audioCtx = audioCtxRef.current!;
        const src = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        analysersRef.current.set(id, analyser);

        if (!samplingIntervalRef.current) {
          samplingIntervalRef.current = window.setInterval(() => {
            try {
              const levels: Array<{ id: string; level: number }> = [];
              analysersRef.current.forEach((analyserNode, pid) => {
                const data = new Uint8Array(analyserNode.frequencyBinCount);
                analyserNode.getByteTimeDomainData(data);
                let sum = 0;
                for (let i = 0; i < data.length; i++) {
                  const v = (data[i] - 128) / 128;
                  sum += v * v;
                }
                const rms = Math.sqrt(sum / data.length);
                const prev = levelsRef.current.get(pid) || 0;
                const smooth = prev * 0.7 + rms * 0.3;
                levelsRef.current.set(pid, smooth);
                levels.push({ id: pid, level: smooth });
              });

              if (levels.length > 0) {
                levels.sort((a, b) => b.level - a.level);
                const top = levels[0];
                const threshold = 0.02;
                if (top.level > threshold) {
                  if (activeSpeakerId !== top.id) setActiveSpeakerId(top.id);
                } else {
                  if (activeSpeakerId !== null) setActiveSpeakerId(null);
                }
              }
            } catch (err) {
              console.warn("Audio sampling loop error", err);
            }
          }, 200) as unknown as number;
        }
      } catch (err) {
        console.warn("Failed to create analyser for stream", err);
      }
    },
    [activeSpeakerId],
  );

  // Keep ref in sync
  useEffect(() => {
    setupAnalyserRef.current = setupAnalyserForStream;
  }, [setupAnalyserForStream]);

  // Handle incoming signals with deduplication and proper state validation
  const handleSignal = useCallback(
    async (from: string, data: any, messageId?: string) => {
      if (messageId) {
        if (processedSignalsRef.current.has(messageId)) {
          console.log(`⏭️ Ignoring duplicate signal ${messageId}`);
          return;
        }
        processedSignalsRef.current.add(messageId);
        if (processedSignalsRef.current.size > 1000) {
          const arr = Array.from(processedSignalsRef.current);
          for (let i = 0; i < 500; i++) {
            processedSignalsRef.current.delete(arr[i]);
          }
        }
      }

      let peer = peersRef.current.get(from);
      if (!peer) {
        if (data.type === "offer") {
          peer = await createPeer(from, false);
        } else {
          const buffered = pendingSignalsRef.current.get(from) || [];
          buffered.push(data);
          pendingSignalsRef.current.set(from, buffered);
          return;
        }
      }

      if (!peer || peer.destroyed) {
        console.warn(`Peer ${from} is destroyed or null`);
        return;
      }

      try {
        peer.signal(data);
      } catch (err) {
        console.warn(`Failed to signal peer ${from}:`, err);
      }
    },
    [createPeer],
  );

  // Keep handleSignalRef in sync
  useEffect(() => {
    handleSignalRef.current = handleSignal;
  }, [handleSignal]);

  // Fetch participants list
  const fetchParticipants = useCallback(async () => {
    if (!roomId) return;

    const { data } = await supabase
      .from("group_room_participants")
      .select(
        `
        id,
        user_id,
        is_muted,
        is_video_off
      `,
      )
      .eq("room_id", roomId);

    if (data) {
      const userIds = data.map((p: { user_id: string }) => p.user_id);
      const { data: profiles } = await supabase
        .from("where_profiles")
        .select("user_id, full_name, profile_photo_url")
        .in("user_id", userIds);

      const profileMap = new Map<string, { name: string; avatar_url?: string }>(
        profiles?.map(
          (p: {
            user_id: string;
            full_name: string;
            profile_photo_url?: string;
          }) =>
            [
              p.user_id,
              { name: p.full_name, avatar_url: p.profile_photo_url },
            ] as [string, { name: string; avatar_url?: string }],
        ) || [],
      );

      setParticipants(
        data.map(
          (p: {
            id: string;
            user_id: string;
            is_muted: boolean;
            is_video_off: boolean;
          }) => {
            const profile = profileMap.get(p.user_id);
            return {
              ...p,
              name: profile?.name || "Unknown",
              avatar_url: profile?.avatar_url || undefined,
            };
          },
        ),
      );
    }
  }, [roomId]);

  // Join room and setup signaling
  const joinRoom = useCallback(async () => {
    if (!userId || !roomId) return;

    setIsConnecting(true);
    setMediaError(null);
    console.log(`🚪 Joining room ${roomId}`);

    // Stage 1: Media access
    try {
      await initLocalStream();
    } catch (mediaErr: any) {
      console.warn(
        "📹 Media access failed, continuing without media:",
        mediaErr,
      );
      const emptyStream = new MediaStream();
      localStreamRef.current = emptyStream;
      setLocalStream(emptyStream);
      setMediaError("Camera and microphone access denied.");
    }

    // Stage 2: Channel setup
    try {
      const channel = supabase.channel(`group:room:${roomId}`);
      channelRef.current = channel;

      // Handle incoming signals
      channel.on("broadcast", { event: "signal" }, async ({ payload }: any) => {
        if (!payload || payload.from === userIdRef.current) return;
        if (payload.to && payload.to !== userIdRef.current) return;

        console.log(
          `📨 Received signal from ${payload.from}: ${payload.data?.type || "candidate"}`,
        );
        await handleSignalRef.current?.(
          payload.from,
          payload.data,
          payload.messageId,
        );
      });

      // Handle join announcements
      channel.on("broadcast", { event: "join" }, async ({ payload }: any) => {
        if (!payload || payload.user_id === userIdRef.current) return;

        console.log(`👋 User ${payload.user_id} joined`);

        setParticipants((prev) => {
          if (prev.some((p) => p.user_id === payload.user_id)) return prev;
          return [
            ...prev,
            {
              id: payload.user_id,
              user_id: payload.user_id,
              is_muted: false,
              is_video_off: false,
              name: payload.name || "Unknown",
              avatar_url: payload.avatar_url || undefined,
            },
          ];
        });

        setTimeout(() => fetchParticipants(), 500);

        const shouldInitiate = userIdRef.current! < payload.user_id;
        if (shouldInitiate && !peersRef.current.has(payload.user_id)) {
          console.log(`🔗 Creating peer to ${payload.user_id}`);
          try {
            await createPeer(payload.user_id, true);
          } catch (e) {
            console.warn("Peer creation failed:", e);
            reconnectPeerWithBackoff(payload.user_id);
          }
        }
      });

      // Handle status updates
      channel.on(
        "broadcast",
        { event: "status_update" },
        ({ payload }: any) => {
          if (!payload || payload.user_id === userIdRef.current) return;
          setParticipants((prev) =>
            prev.map((p) =>
              p.user_id === payload.user_id
                ? {
                    ...p,
                    is_muted: payload.is_muted,
                    is_video_off: payload.is_video_off,
                  }
                : p,
            ),
          );
        },
      );

      // Handle leave announcements
      channel.on("broadcast", { event: "leave" }, ({ payload }: any) => {
        if (!payload) return;

        console.log(`👋 User ${payload.user_id} left`);
        cleanupPeer(payload.user_id);
        setParticipants((prev) =>
          prev.filter((p) => p.user_id !== payload.user_id),
        );
        setTimeout(() => fetchParticipants(), 500);
      });

      // Subscribe to channel
      await new Promise<void>((resolve) => {
        channel.subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            console.log("✅ Subscribed to room channel");
            resolve();
          }
        });
      });

      // Fetch own profile
      let myName = "You";
      let myAvatar: string | undefined;
      try {
        const { data: myProfile } = await supabase
          .from("where_profiles")
          .select("full_name, profile_photo_url")
          .eq("user_id", userId)
          .maybeSingle();
        if (myProfile) {
          myName = myProfile.full_name || "You";
          myAvatar = myProfile.profile_photo_url || undefined;
        }
      } catch {}

      // Announce join
      await channel.send({
        type: "broadcast",
        event: "join",
        payload: { user_id: userId, name: myName, avatar_url: myAvatar },
      });

      // Immediately add local participant for live room display
      setParticipants((prev) => {
        if (prev.some((p) => p.user_id === userId)) return prev;
        return [
          ...prev,
          {
            id: userId,
            user_id: userId,
            is_muted: false,
            is_video_off: false,
            name: myName,
            avatar_url: myAvatar,
          },
        ];
      });

      // Fetch existing participants
      let existingParticipants: any[] | null = null;
      try {
        const res = await supabase
          .from("group_room_participants")
          .select("user_id")
          .eq("room_id", roomId)
          .eq("participant_status", "approved")
          .neq("user_id", userId);
        existingParticipants = res.data || null;
      } catch (err) {
        console.warn("Failed to fetch existing participants", err);
        existingParticipants = null;
      }

      if (existingParticipants) {
        for (const p of existingParticipants) {
          try {
            if (userId < p.user_id && !peersRef.current.has(p.user_id)) {
              console.log(
                `🔗 Creating peer to existing participant ${p.user_id}`,
              );
              await createPeer(p.user_id, true);
            }
          } catch (e) {
            console.warn("Failed to initiate with", p.user_id, e);
            reconnectPeerWithBackoff(p.user_id);
          }
        }
      }

      // Subscribe to participant changes
      supabase
        .channel(`participants:${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "group_room_participants",
            filter: `room_id=eq.${roomId}`,
          },
          async () => {
            await fetchParticipants();
          },
        )
        .subscribe();

      await fetchParticipants();
      setIsConnecting(false);
    } catch (error: any) {
      console.error("❌ Failed to join room:", error);
      setIsConnecting(false);
      const msg = error?.message || "Failed to connect to room signaling";
      setConnectionErrors((prev) => [...prev, msg]);
    }
  }, [
    userId,
    roomId,
    initLocalStream,
    createPeer,
    fetchParticipants,
    reconnectPeerWithBackoff,
  ]);

  // Clean up a single peer
  const cleanupPeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      closingPeersRef.current.add(peerId);
      try {
        peer.destroy();
      } catch {}
      peersRef.current.delete(peerId);
      window.setTimeout(() => closingPeersRef.current.delete(peerId), 5000);
    }

    peerStateRef.current.delete(peerId);

    const timer = iceRestartTimersRef.current.get(peerId);
    if (timer) {
      clearTimeout(timer);
      iceRestartTimersRef.current.delete(peerId);
    }

    reconnectAttemptsRef.current.delete(peerId);
    forceRelayRef.current.delete(peerId);

    setPeerStreams((prev) => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });

    analysersRef.current.delete(peerId);
  }, []);

  // Leave room
  const leaveRoom = useCallback(async () => {
    console.log("🚪 Leaving room");

    if (channelRef.current && userIdRef.current && roomIdRef.current) {
      try {
        await supabase.functions.invoke("manage-room", {
          body: {
            action: "leave",
            room_id: roomIdRef.current,
          },
        });
      } catch (err) {
        console.warn("Failed to call leave action:", err);
      }

      await channelRef.current.send({
        type: "broadcast",
        event: "leave",
        payload: { user_id: userIdRef.current },
      });
    }

    // Clear all timers
    iceRestartTimersRef.current.forEach((timer) => clearTimeout(timer));
    iceRestartTimersRef.current.clear();

    // Destroy all peers cleanly
    peersRef.current.forEach((peer, peerId) => {
      closingPeersRef.current.add(peerId);
      try {
        peer.destroy();
      } catch {}
    });
    peersRef.current.clear();
    peerStateRef.current.clear();

    reconnectAttemptsRef.current.clear();
    forceRelayRef.current.clear();
    processedSignalsRef.current.clear();

    if (samplingIntervalRef.current) {
      clearInterval(samplingIntervalRef.current);
      samplingIntervalRef.current = null;
    }

    analysersRef.current.clear();
    try {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch {}

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    setPeerStreams(new Map());
    setParticipants([]);
    setConnectionErrors([]);
  }, []);

  // Broadcast status update
  const broadcastStatus = useCallback(
    (isMuted: boolean, isVideoOff: boolean) => {
      if (channelRef.current && userIdRef.current && roomIdRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "status_update",
          payload: {
            user_id: userIdRef.current,
            is_muted: isMuted,
            is_video_off: isVideoOff,
          },
        });

        supabase.functions
          .invoke("manage-room", {
            body: {
              action: "update_status",
              room_id: roomIdRef.current,
              is_muted: isMuted,
              is_video_off: isVideoOff,
            },
          })
          .catch((err: any) =>
            console.warn("Failed to update status in backend:", err),
          );
      }
    },
    [],
  );

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return false;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const newMuted = !audioTrack.enabled;
      setIsMuted(newMuted);
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      broadcastStatus(newMuted, videoTrack ? !videoTrack.enabled : false);
      return newMuted;
    }
    return false;
  }, [broadcastStatus]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return false;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const newVideoOff = !videoTrack.enabled;
      setIsVideoOff(newVideoOff);
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      broadcastStatus(audioTrack ? !audioTrack.enabled : false, newVideoOff);
      return newVideoOff;
    }
    return false;
  }, [broadcastStatus]);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setSpeakerMuted((prev) => !prev);
    console.log(`🔊 Speaker ${speakerMuted ? "unmuted" : "muted"}`);
    return !speakerMuted;
  }, [speakerMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  return {
    // Media streams
    localStream,
    peerStreams,
    // Device management
    audioInputs,
    videoInputs,
    audioOutputs,
    selectedAudioInput,
    selectedVideoInput,
    selectedAudioOutput,
    selectAudioInput,
    selectVideoInput,
    selectAudioOutput,
    // Media state
    isMuted,
    isVideoOff,
    speakerMuted,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    // Room state
    participants,
    isConnecting,
    connectionErrors,
    mediaError,
    // Room management
    joinRoom,
    leaveRoom,
    // Utilities
    initLocalStream,
    activeSpeakerId,
  };
}

export default useGroupWebRTC;
