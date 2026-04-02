import React from 'react';
import { WifiOff, Wifi, RefreshCw, AlertTriangle } from 'lucide-react';
import type { ConnectionMode } from '@/hooks/useWebRTC';

type Quality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';

interface ConnectionQualityProps {
  quality?: Quality;
  mode?: ConnectionMode;
}

const qualityConfig: Record<Quality, { color: string; bars: number; label: string }> = {
  excellent: { color: 'bg-where-online', bars: 4, label: 'Excellent' },
  good: { color: 'bg-where-online', bars: 3, label: 'Good' },
  fair: { color: 'bg-yellow-500', bars: 2, label: 'Fair' },
  poor: { color: 'bg-destructive', bars: 1, label: 'Poor' },
  disconnected: { color: 'bg-muted-foreground', bars: 0, label: 'Disconnected' },
};

const modeLabels: Record<ConnectionMode, { label: string; icon: React.ReactNode }> = {
  disconnected: { label: 'Offline', icon: <WifiOff className="w-4 h-4 text-muted-foreground" /> },
  connecting: { label: 'Connecting…', icon: <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" /> },
  direct: { label: 'Direct', icon: <Wifi className="w-4 h-4 text-where-online" /> },
  relay: { label: 'Relay', icon: <Wifi className="w-4 h-4 text-where-teal" /> },
  reconnecting: { label: 'Reconnecting…', icon: <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" /> },
  failed: { label: 'Failed', icon: <AlertTriangle className="w-4 h-4 text-destructive" /> },
};

const ConnectionQuality: React.FC<ConnectionQualityProps> = ({ quality, mode }) => {
  // If mode is provided, show mode-based display
  if (mode) {
    const modeInfo = modeLabels[mode];
    return (
      <div className="flex items-center gap-1.5" title={modeInfo.label}>
        {modeInfo.icon}
        <span className={`text-xs ${mode === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {modeInfo.label}
        </span>
      </div>
    );
  }

  // Fallback to quality-based display
  const q = quality || 'disconnected';
  const config = qualityConfig[q];

  if (q === 'disconnected') {
    return (
      <div className="flex items-center gap-1.5" title="Disconnected">
        <WifiOff className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5" title={config.label}>
      <div className="flex items-end gap-[2px] h-4">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-[3px] rounded-full transition-all ${
              bar <= config.bars ? config.color : 'bg-muted'
            }`}
            style={{ height: `${bar * 25}%` }}
          />
        ))}
      </div>
      <span className={`text-xs ${q === 'poor' ? 'text-destructive' : 'text-muted-foreground'}`}>
        {config.label}
      </span>
    </div>
  );
};

export default ConnectionQuality;

export function getConnectionQuality(pc: RTCPeerConnection | null | undefined): Quality {
  if (!pc) return 'disconnected';
  const state = pc.iceConnectionState;
  switch (state) {
    case 'connected':
    case 'completed':
      return 'excellent';
    case 'checking':
      return 'fair';
    case 'disconnected':
      return 'poor';
    case 'failed':
    case 'closed':
      return 'disconnected';
    default:
      return 'good';
  }
}
