import React, { useRef, useEffect, useState } from "react";
import { MicOff, VideoOff, User, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/vibez/ui/avatar";

interface Participant {
  id: string;
  user_id: string;
  is_muted: boolean;
  is_video_off: boolean;
  name?: string;
  avatar_url?: string;
}

interface GroupVideoGridProps {
  localStream: MediaStream | null;
  peerStreams: Map<string, MediaStream>;
  participants: Participant[];
  currentUserId: string;
  roomCreatorId: string;
  isMuted: boolean;
  isVideoOff: boolean;
  activeSpeakerId?: string | null;
}

const VideoTile: React.FC<{
  stream: MediaStream | null;
  name: string;
  avatarUrl?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isLocal: boolean;
  isRoomOwner: boolean;
  participantCount: number;
  onClick?: () => void;
  isPinned?: boolean;
}> = ({
  stream,
  name,
  avatarUrl,
  isMuted,
  isVideoOff,
  isLocal,
  isRoomOwner,
  participantCount,
  onClick,
  isPinned,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!stream) return;

    if (videoRef.current) {
      const videoEl = videoRef.current;
      videoEl.srcObject = stream;

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const attemptPlay = async (muted = false) => {
        try {
          if (muted) videoEl.muted = true;
          await videoEl.play();
          if (muted && !isIOS)
            setTimeout(() => {
              try {
                videoEl.muted = false;
              } catch {}
            }, 800);
        } catch (err: any) {
          if (!muted && err?.name === "NotAllowedError")
            setTimeout(() => attemptPlay(true), 100);
        }
      };

      try {
        if (videoEl.readyState >= 1) attemptPlay();
      } catch {}
      const onLoaded = () => {
        videoEl.removeEventListener("loadedmetadata", onLoaded);
        attemptPlay();
      };
      videoEl.addEventListener("loadedmetadata", onLoaded);
      setTimeout(() => {
        if (videoEl.paused && videoEl.readyState >= 1) attemptPlay(true);
      }, 1000);
      setTimeout(() => {
        if (videoEl.paused && videoEl.readyState >= 1) attemptPlay(true);
      }, 2000);

      // Stream retry: if no video frames after 3s, re-assign srcObject
      if (!isLocal) {
        const retryTimer = setTimeout(() => {
          if (videoEl.paused || videoEl.videoWidth === 0) {
            console.log("🔄 Re-attaching stream for retry");
            videoEl.srcObject = null;
            videoEl.srcObject = stream;
            attemptPlay(true);
          }
        }, 3000);
        return () => clearTimeout(retryTimer);
      }
    }

    if (audioRef.current && !isLocal) {
      audioRef.current.srcObject = stream;
      try {
        audioRef.current.muted = false;
        audioRef.current.play();
      } catch (err) {
        console.warn("Audio play failed for remote stream", err);
      }
    }
  }, [stream, isLocal]);

  const getTileClass = () => {
    const base = "relative overflow-hidden rounded-lg bg-muted";
    if (participantCount === 1) return `${base} w-full max-h-[65vh]`;
    if (participantCount === 2) return `${base} w-full h-64 md:h-96`;
    if (participantCount <= 4) return `${base} h-48 md:h-56`;
    if (participantCount <= 6) return `${base} h-40 md:h-48`;
    return `${base} h-36 md:h-44`;
  };

  const showVideo = stream && !isVideoOff;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={cn(
        getTileClass(),
        onClick ? "cursor-pointer hover:scale-[1.02] transition-transform" : "",
      )}
      aria-pressed={isPinned}
      style={{
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
      }}
    >
      {/* Separate audio element for remote streams */}
      {stream && !isLocal && (
        <audio ref={audioRef} autoPlay playsInline className="hidden" />
      )}

      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          {avatarUrl ? (
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback>
                <User className="w-10 h-10 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted-foreground/20 flex items-center justify-center">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

      {isRoomOwner && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-amber-500/90 text-white text-xs flex items-center gap-1">
          <Crown className="w-3 h-3" />
          Host
        </div>
      )}

      {/* Bottom overlay: avatar + name + status icons */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {avatarUrl && (
            <Avatar className="w-6 h-6 border border-white/50">
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback className="text-[10px]">
                {(name || "?")[0]}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="text-white text-sm font-medium truncate">
            {isLocal ? `${name} (You)` : name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isMuted && (
            <div className="p-1 rounded-full bg-destructive/80">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
          {isVideoOff && (
            <div className="p-1 rounded-full bg-destructive/80">
              <VideoOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const GroupVideoGrid: React.FC<GroupVideoGridProps> = ({
  localStream,
  peerStreams,
  participants,
  currentUserId,
  roomCreatorId,
  isMuted,
  isVideoOff,
  activeSpeakerId,
}) => {
  const hasLocalParticipant = currentUserId
    ? participants.some((p) => p.user_id === currentUserId)
    : false;
  const displayParticipants =
    localStream && currentUserId && !hasLocalParticipant
      ? [
          {
            id: currentUserId,
            user_id: currentUserId,
            is_muted: isMuted,
            is_video_off: isVideoOff,
            name: "You",
            avatar_url: undefined,
          },
          ...participants,
        ]
      : participants;

  const totalTiles = displayParticipants.length || 1;
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const manualPinnedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!manualPinnedRef.current) setPinnedId(activeSpeakerId || null);
  }, [activeSpeakerId]);

  const getGridClass = () => {
    if (totalTiles === 1) return "grid-cols-1";
    if (totalTiles === 2) return "grid-cols-1 md:grid-cols-2";
    if (totalTiles <= 4) return "grid-cols-2";
    if (totalTiles <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-2 md:grid-cols-4";
  };

  const isRoomOwner = (userId: string) => userId === roomCreatorId;

  const renderTile = (participant: Participant, countOverride?: number) => {
    const isLocal = participant.user_id === currentUserId;
    const stream = isLocal ? localStream : peerStreams.get(participant.user_id);
    const handleToggle = () => {
      setPinnedId((prev) => {
        const next = prev === participant.user_id ? null : participant.user_id;
        manualPinnedRef.current = next !== null;
        return next;
      });
    };

    return (
      <VideoTile
        key={participant.user_id}
        stream={stream || null}
        name={participant.name || (isLocal ? "You" : "Unknown")}
        avatarUrl={participant.avatar_url}
        isMuted={isLocal ? isMuted : participant.is_muted}
        isVideoOff={isLocal ? isVideoOff : participant.is_video_off}
        isLocal={isLocal}
        isRoomOwner={isRoomOwner(participant.user_id)}
        participantCount={countOverride ?? totalTiles}
        onClick={handleToggle}
        isPinned={pinnedId === participant.user_id}
      />
    );
  };

  const pinnedParticipant = pinnedId
    ? displayParticipants.find((p) => p.user_id === pinnedId)
    : null;

  if (pinnedParticipant) {
    return (
      <div className="w-full h-full flex flex-col gap-2">
        <div className="w-full flex items-center justify-center max-h-[65vh]">
          {renderTile(pinnedParticipant, 1)}
        </div>
        <div className="w-full grid grid-cols-3 md:grid-cols-6 gap-2 overflow-y-hidden p-1 h-28 md:h-36">
          {displayParticipants
            .filter((p) => p.user_id !== pinnedParticipant.user_id)
            .map((p) => renderTile(p, Math.max(2, totalTiles)))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-2 w-full h-full bg-background p-2 auto-rows-fr",
        getGridClass(),
      )}
    >
      {displayParticipants.map((p) => renderTile(p))}
    </div>
  );
};

export default GroupVideoGrid;
