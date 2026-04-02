import { useState, useEffect, useRef, useCallback } from 'react';
import { playMatchSound } from '@/lib/matchSound';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  SkipForward,
  X,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '../../components/vibez/ui/button';
import VideoChat from '../../components/vibez/where/VideoChat';
import ChatSidebar from '../../components/vibez/where/ChatSidebar';
import ReportModal from '../../components/vibez/where/ReportModal';
import RandomMatcher from '../../components/vibez/where/RandomMatcher';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useKarma } from '@/hooks/useKarma';
import { supabase } from '@/integrations/supabase/client';

type MatchedUser = {
  name: string;
  age: number | null;
  interests: string[];
  estate: string;
};

const WhereChat: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  const [isMatching, setIsMatching] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(600);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [matchStartTime, setMatchStartTime] = useState<number | null>(null);

  const [matchedUser, setMatchedUser] = useState<MatchedUser | null>(null);

  const matcherRef = useRef<any>(null);

  const effectiveUserId = user?.id || null;
  const { karma, onChatCompleted, onReported, onSkippedEarly } = useKarma(effectiveUserId);

  const {
    localStream,
    remoteStream,
    startCall,
    answerCall,
    hangup,
    initLocalStream,
    connectionMode,
  } = useWebRTC(effectiveUserId);

  // --- init media on mount ---
  useEffect(() => {
    if (!effectiveUserId) return;
    initLocalStream().catch(() => {
      toast({ title: 'Camera access denied', description: 'Please allow camera + mic access.', variant: 'destructive' });
    });
    return () => { hangup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUserId]);

  // --- mute toggle handler ---
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (localStream) {
        localStream.getAudioTracks().forEach((t) => { t.enabled = !next; });
      }
      return next;
    });
  }, [localStream]);

  // --- video toggle handler ---
  const toggleVideo = useCallback(() => {
    setIsVideoOff((prev) => {
      const next = !prev;
      if (localStream) {
        localStream.getVideoTracks().forEach((t) => { t.enabled = !next; });
      }
      return next;
    });
  }, [localStream]);

  // --- timer ---
  useEffect(() => {
    if (isMatching || timeRemaining <= 0) return;
    const t = setInterval(() => setTimeRemaining((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [isMatching, timeRemaining]);

  // --- timer expired = chat completed (karma reward) ---
  useEffect(() => {
    if (timeRemaining <= 0 && !isMatching) {
      onChatCompleted();
      toast({ title: 'Time is up!', description: `+2 karma! You are now a ${karma.badge} ${karma.level}` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  // --- redirect if not authenticated ---
  useEffect(() => {
    if (!loading && !user) navigate('/vibez/where/login');
  }, [loading, user, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEnd = useCallback(() => {
    // Karma: if chat lasted > 2 minutes, reward
    if (matchStartTime && Date.now() - matchStartTime > 120_000) {
      onChatCompleted();
    }
    hangup();
    if (matcherRef.current) matcherRef.current.stopSearch();
    navigate('/vibez/where/dashboard');
  }, [hangup, navigate, matchStartTime, onChatCompleted]);

  const handleNext = useCallback(() => {
    // Karma: penalize if skipped within 30 seconds
    if (matchStartTime && Date.now() - matchStartTime < 30_000) {
      onSkippedEarly();
    } else if (matchStartTime && Date.now() - matchStartTime > 120_000) {
      onChatCompleted();
    }
    hangup();
    setMatchedUser(null);
    setCurrentMatchId(null);
    setMatchStartTime(null);
    setIsMatching(true);
    setTimeRemaining(600);
    setTimeout(() => { matcherRef.current?.startSearch?.(); }, 350);
  }, [hangup, matchStartTime, onSkippedEarly, onChatCompleted]);

  const handleMatched = useCallback(
    async (matchId: string) => {
      let currentUserId = effectiveUserId;
      if (!currentUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        currentUserId = session.user.id;
      }
      if (!matchId) return;

      setCurrentMatchId(matchId);
      setIsMatching(false);
      setMatchStartTime(Date.now());

      try {
        const { data: matchRecords, error } = await supabase.from('matches').select('*').eq('match_id', matchId);
        if (error || !matchRecords?.length) {
          toast({ title: 'Match error', description: 'Could not load match details.', variant: 'destructive' });
          setIsMatching(true);
          return;
        }

        const myRecord = matchRecords.find((r: any) => r.initiator_user_id === currentUserId)
          || matchRecords.find((r: any) => r.peer_user_id === currentUserId);
        if (!myRecord) { setIsMatching(true); return; }

        const peerUserId = myRecord.initiator_user_id === currentUserId ? myRecord.peer_user_id : myRecord.initiator_user_id;
        const iAmInitiator = currentUserId < peerUserId;
        if (!peerUserId || peerUserId === currentUserId) { handleNext(); return; }

        if (iAmInitiator) await startCall(matchId);
        else await answerCall(matchId);

        const { data: profileResult, error: profileError } = await supabase.functions.invoke('get-peer-profile', { body: { peerUserId } });
        if (profileError || !profileResult?.profile) setMatchedUser(null);
        else setMatchedUser(profileResult.profile);

        playMatchSound();
        toast({ title: '🎉 Match found!', description: 'Say hi to your neighbor 👋' });
      } catch (err) {
        console.error('Failed to start call:', err);
        toast({ title: 'Connection failed', description: 'Could not establish connection.', variant: 'destructive' });
        setIsMatching(true);
      }
    },
    [effectiveUserId, startCall, answerCall, toast, handleNext]
  );

  const handleReport = (_reason: string, _details: string) => {
    onReported(); // Karma penalty for being in a reported situation (will be refined with moderation)
    toast({ title: 'Report submitted', description: 'Thank you for keeping our community safe.' });
    setShowReport(false);
    handleEnd();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-where-coral border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Matching Overlay */}
      {isMatching && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center glass p-8 rounded-2xl max-w-md mx-4">
            <div className="w-24 h-24 bg-gradient-to-br from-where-coral to-where-teal rounded-full animate-pulse mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-foreground mb-2">Finding a neighbor...</h2>
            <p className="text-muted-foreground text-lg">Looking for someone nearby</p>
            <RandomMatcher ref={matcherRef} onMatched={handleMatched} />
            <Button variant="ghost" className="mt-6" onClick={() => {
              matcherRef.current?.stopSearch?.();
              hangup();
              navigate('/vibez/where/dashboard');
            }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-strong border-b border-white/10 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <button onClick={handleEnd} className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-card-foreground">Where Connect</h1>
            {matchedUser && (
              <p className="text-sm text-muted-foreground">
                {matchedUser.name}{matchedUser.age ? `, ${matchedUser.age}` : ''}{' '}
                {matchedUser.interests.length ? `- ${matchedUser.interests.join(', ')}` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Karma badge */}
            <div className="flex items-center gap-1 bg-muted rounded-full px-2.5 py-1" title={`${karma.level} - ${karma.score} karma`}>
              <span className="text-sm">{karma.badge}</span>
              <span className="text-xs font-medium text-muted-foreground">{karma.score}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">⏱</span>
              <span className="text-lg font-mono font-bold text-where-coral">{formatTime(timeRemaining)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Chat Area */}
      <div className="container mx-auto px-4 py-4">
        <div className="relative">
          <VideoChat
            localStream={localStream}
            remoteStream={remoteStream}
            isLocalVideoOff={isVideoOff}
            matchId={currentMatchId ?? undefined}
            userId={effectiveUserId ?? undefined}
            matchedUser={matchedUser ? { name: matchedUser.name, age: matchedUser.age, interests: matchedUser.interests } : undefined}
            connectionMode={connectionMode}
          />

          {/* Chat sidebar overlay */}
          {showChat && (
            <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-30 bg-background/80 backdrop-blur-sm sm:bg-transparent">
              <div className="h-full flex flex-col p-4 pt-16">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowChat(false)}
                  className="absolute top-4 right-4 z-40"
                >
                  <X className="w-4 h-4 mr-1" /> Close
                </Button>
                <ChatSidebar matchId={currentMatchId ?? undefined} userId={effectiveUserId ?? undefined} />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 glass rounded-2xl p-4">
          <Button size="lg" variant={isMuted ? 'destructive' : 'secondary'} onClick={toggleMute} className="rounded-full">
            {isMuted ? <MicOff className="w-5 h-5 mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>

          <Button size="lg" variant={isVideoOff ? 'destructive' : 'secondary'} onClick={toggleVideo} className="rounded-full">
            {isVideoOff ? <VideoOff className="w-5 h-5 mr-2" /> : <Video className="w-5 h-5 mr-2" />}
            {isVideoOff ? 'Turn On' : 'Turn Off'}
          </Button>

          <Button size="lg" variant="secondary" onClick={() => setShowChat((v) => !v)} className="rounded-full">
            <MessageSquare className="w-5 h-5 mr-2" /> Chat
          </Button>

          <Button size="lg" variant="secondary" onClick={handleNext} className="rounded-full">
            <SkipForward className="w-5 h-5 mr-2" /> Next
          </Button>

          <Button size="lg" variant="destructive" onClick={handleEnd} className="rounded-full">
            <X className="w-5 h-5 mr-2" /> End
          </Button>

          <Button size="lg" variant="outline" onClick={() => setShowReport(true)} className="rounded-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
            <AlertTriangle className="w-5 h-5 mr-2" /> Report
          </Button>
        </div>
      </div>

      <ReportModal isOpen={showReport} onClose={() => setShowReport(false)} onSubmit={handleReport} />
    </div>
  );
};

export default WhereChat;
