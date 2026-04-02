import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const EMOJIS = ['👋', '😂', '❤️', '🔥', '👏', '😍'];

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
}

interface EmojiReactionsProps {
  matchId?: string;
  userId?: string;
}

const EmojiReactions: React.FC<EmojiReactionsProps> = ({ matchId, userId }) => {
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const channelRef = React.useRef<any>(null);

  // Subscribe to emoji broadcast
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase.channel(`emoji:${matchId}`);
    channel
      .on('broadcast', { event: 'emoji_reaction' }, ({ payload }: any) => {
        if (payload?.senderId !== userId) {
          spawnFloating(payload.emoji);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [matchId, userId]);

  const spawnFloating = useCallback((emoji: string) => {
    const id = crypto.randomUUID();
    const x = 20 + Math.random() * 60; // 20-80% from left
    setFloating((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloating((prev) => prev.filter((f) => f.id !== id));
    }, 2000);
  }, []);

  const sendEmoji = useCallback((emoji: string) => {
    spawnFloating(emoji);
    if (channelRef.current && matchId && userId) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'emoji_reaction',
        payload: { senderId: userId, emoji },
      });
    }
  }, [matchId, userId, spawnFloating]);

  return (
    <>
      {/* Floating emojis */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
        {floating.map((f) => (
          <div
            key={f.id}
            className="absolute text-4xl animate-emoji-float"
            style={{ left: `${f.x}%`, bottom: '10%' }}
          >
            {f.emoji}
          </div>
        ))}
      </div>

      {/* Emoji bar */}
      <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => sendEmoji(emoji)}
            disabled={!matchId}
            className="text-xl hover:scale-125 transition-transform active:scale-90 disabled:opacity-50 p-1"
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
};

export default EmojiReactions;
