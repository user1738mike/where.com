import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Video, VideoOff, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/vibez/ui/button';
import ConnectionQuality from './ConnectionQuality';
import EmojiReactions from './EmojiReactions';
import type { ConnectionMode } from '@/hooks/useWebRTC';

interface VideoChatProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isLocalVideoOff: boolean;
  matchId?: string;
  userId?: string;
  connectionMode?: ConnectionMode;
  matchedUser?: {
    name: string;
    age: number | null | undefined;
    interests: string[];
  };
}

const VideoChat: React.FC<VideoChatProps> = ({
  localStream,
  remoteStream,
  isLocalVideoOff,
  matchId,
  userId,
  matchedUser,
  connectionMode,
}) => {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pipPos, setPipPos] = useState({ x: 16, y: 16 });
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'disconnected'>('disconnected');
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Attach local stream (video track enabled/disabled by parent)
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream with autoplay handling
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteStream.getAudioTracks().forEach((t) => (t.enabled = true));
      remoteStream.getVideoTracks().forEach((t) => (t.enabled = true));

      const videoEl = remoteVideoRef.current;
      const attemptPlay = async (muted = false) => {
        try {
          if (muted) videoEl.muted = true;
          await videoEl.play();
          if (muted) setTimeout(() => { try { videoEl.muted = false; } catch {} }, 1000);
        } catch (err: any) {
          if (!muted && err.name === 'NotAllowedError') setTimeout(() => attemptPlay(true), 100);
        }
      };
      if (videoEl.readyState >= 1) attemptPlay();
      videoEl.addEventListener('loadedmetadata', () => attemptPlay(), { once: true });
      setTimeout(() => { if (videoEl.paused) attemptPlay(true); }, 2000);
    } else if (remoteVideoRef.current && !remoteStream) {
      remoteVideoRef.current.srcObject = null;
    }
  }, [remoteStream]);

  // Monitor connection quality
  useEffect(() => {
    if (!remoteStream) {
      setConnectionQuality('disconnected');
      return;
    }
    // Poll ICE state every 3 seconds (we'd need access to the peer connection)
    // For now, derive from stream presence
    setConnectionQuality(remoteStream.active ? 'good' : 'poor');

    const interval = setInterval(() => {
      if (!remoteStream.active) {
        setConnectionQuality('poor');
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [remoteStream]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Draggable PiP
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    const rect = pipRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const pipEl = pipRef.current;
    if (!pipEl) return;

    let x = e.clientX - container.left - dragOffset.current.x;
    let y = e.clientY - container.top - dragOffset.current.y;
    x = Math.max(8, Math.min(container.width - pipEl.offsetWidth - 8, x));
    y = Math.max(8, Math.min(container.height - pipEl.offsetHeight - 8, y));
    setPipPos({ x, y });
  }, []);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0;

  return (
    <div ref={containerRef} className={`relative ${isFullscreen ? 'bg-black' : ''}`}>
      {/* Remote Video */}
      <div className="relative bg-card border border-border rounded-2xl overflow-hidden aspect-video">
        {!remoteStream || !hasRemoteVideo ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-where-coral to-where-teal">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Video className="w-12 h-12 text-white" />
            </div>
            <p className="text-white text-lg font-medium">
              {remoteStream ? "Neighbor's camera is off" : 'Connecting...'}
            </p>
            {!remoteStream && (
              <div className="mt-4 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        )}

        {/* Floating emoji reactions layer */}
        <EmojiReactions matchId={matchId} userId={userId} />

        {/* Top bar: connection quality + fullscreen */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <ConnectionQuality quality={connectionQuality} mode={connectionMode} />
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFullscreen}
            className="bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* Neighbor Info Overlay */}
        {matchedUser && (
          <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 z-10">
            <p className="text-white font-medium">
              {matchedUser.name}{matchedUser.age ? `, ${matchedUser.age}` : ''}
            </p>
            <p className="text-white/80 text-sm">{matchedUser.interests.join(', ')}</p>
          </div>
        )}

        {/* Emoji bar at bottom center */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
          {/* Emoji bar is rendered inside EmojiReactions */}
        </div>

        {/* Draggable Local Video PiP */}
        <div
          ref={pipRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="absolute w-36 h-28 md:w-48 md:h-36 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ left: pipPos.x, top: pipPos.y, zIndex: 15 }}
        >
          {isLocalVideoOff || !localStream ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-where-teal to-where-coral">
              <VideoOff className="w-6 h-6 text-white mb-1" />
              <p className="text-white text-xs font-medium">Camera off</p>
            </div>
          ) : (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          )}
          <div className="absolute bottom-1 left-1 right-1 bg-black/50 backdrop-blur-sm rounded px-1.5 py-0.5">
            <p className="text-white text-[10px] font-medium">You</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;
