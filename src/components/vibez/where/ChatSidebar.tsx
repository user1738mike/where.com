import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/vibez/ui/button';
import { Input } from '@/components/vibez/ui/input';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  sender: 'me' | 'them';
  text: string;
  timestamp: Date;
}

interface ChatSidebarProps {
  matchId?: string;
  userId?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ matchId, userId }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up Supabase Realtime channel for chat
  useEffect(() => {
    if (!matchId || !userId) return;

    const channelName = `chat:${matchId}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'chat_message' }, (payload: any) => {
        const { senderId, text, messageId } = payload.payload;
        if (senderId !== userId) {
          setMessages((prev) => [
            ...prev,
            {
              id: messageId,
              sender: 'them',
              text,
              timestamp: new Date(),
            },
          ]);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [matchId, userId]);

  const handleSend = () => {
    if (!message.trim()) return;

    const messageId = crypto.randomUUID();
    const text = message.trim();

    // Add to local state immediately
    setMessages((prev) => [
      ...prev,
      { id: messageId, sender: 'me', text, timestamp: new Date() },
    ]);
    setMessage('');

    // Broadcast via Supabase Realtime
    if (channelRef.current && matchId && userId) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: { senderId: userId, text, messageId },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-card-foreground">Chat Messages</h3>
        {!matchId && (
          <p className="text-xs text-muted-foreground mt-1">
            Messages will appear once you're matched
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-8">
            No messages yet. Say hi! 👋
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.sender === 'me'
                  ? 'bg-where-coral text-where-coral-foreground'
                  : 'bg-muted text-card-foreground'
              }`}
            >
              <p className="text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={matchId ? 'Type a message...' : 'Waiting for match...'}
            disabled={!matchId}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={!matchId || !message.trim()}
            className="bg-where-coral text-where-coral-foreground hover:bg-where-coral/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
