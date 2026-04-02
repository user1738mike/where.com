import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, MicOff, Video, VideoOff, LogOut, Users, Settings, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/vibez/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/vibez/ui/drawer'
import GroupVideoGrid from '@/components/vibez/where/GroupVideoGrid'
import DeviceSelectors from '@/components/vibez/where/DeviceSelectors'
import HostControlsPanel from '@/components/vibez/where/HostControlsPanel'
import RoomJoinFlow from '@/components/vibez/where/RoomJoinFlow'
import { useGroupWebRTC } from '@/hooks/useGroupWebRTC'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface RoomInfo {
  id: string
  name: string
  topic: string
  max_participants: number
  created_by: string
}

const WhereGroupChat = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [joinStatus, setJoinStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
  const [showDeviceSettings, setShowDeviceSettings] = useState(false)

  const {
    localStream,
    peerStreams,
    participants,
    isConnecting,
    connectionErrors,
    mediaError,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    activeSpeakerId,
    audioInputs,
    videoInputs,
    audioOutputs,
    selectedAudioInput,
    selectedVideoInput,
    selectedAudioOutput,
    selectAudioInput,
    selectVideoInput,
    selectAudioOutput,
    isMuted: _hookIsMuted,
    isVideoOff: _hookIsVideoOff,
    speakerMuted,
  } = useGroupWebRTC(user?.id || null, roomId || null)
  

  // Fetch room info
  useEffect(() => {
    if (!roomId) return

    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('group_rooms')
        .select('id, name, topic, max_participants, created_by')
        .eq('id', roomId)
        .single()

      if (error || !data) {
        toast.error('Room not found')
        navigate('/vibez/where/rooms')
        return
      }

      setRoomInfo(data)
    }

    fetchRoom()
  }, [roomId, navigate])

  // Check auth
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/vibez/where/login')
    }
  }, [user, authLoading, navigate])

  // Join room when ready
  useEffect(() => {
    if (user && roomId && roomInfo && !hasJoined) {
      setHasJoined(true)
      
      const handleJoin = async () => {
        try {
          // Call the manage-room API to join
          const { data, error } = await supabase.functions.invoke('manage-room', {
            body: {
              action: 'join',
              room_id: roomId,
            },
          })

          if (error) throw error

          const status = data?.status || 'approved'
          setJoinStatus(status)

          // If approved, join the WebRTC room
          if (status === 'approved') {
            joinRoom()
          }
        } catch (error: any) {
          console.error('Failed to join room:', error)
          toast.error('Failed to join room')
          navigate('/vibez/where/rooms')
        }
      }

      handleJoin()
    }
  }, [user, roomId, roomInfo, hasJoined, joinRoom, navigate])

  const handleToggleMute = useCallback(() => {
    const newMuted = toggleMute()
    setIsMuted(newMuted)

    // Update DB status
    if (roomId) {
      supabase.functions.invoke('manage-room', {
        body: { action: 'update_status', room_id: roomId, is_muted: newMuted },
      })
    }
  }, [toggleMute, roomId])

  const handleToggleVideo = useCallback(() => {
    const newVideoOff = toggleVideo()
    setIsVideoOff(newVideoOff)

    // Update DB status
    if (roomId) {
      supabase.functions.invoke('manage-room', {
        body: { action: 'update_status', room_id: roomId, is_video_off: newVideoOff },
      })
    }
  }, [toggleVideo, roomId])

  const handleToggleSpeaker = useCallback(() => {
    toggleSpeaker()
  }, [toggleSpeaker])

  const handleLeave = useCallback(async () => {
    try {
      await supabase.functions.invoke('manage-room', {
        body: { action: 'leave', room_id: roomId },
      })
    } catch (error) {
      console.error('Failed to leave room:', error)
    }

    leaveRoom()
    navigate('/vibez/where/rooms')
  }, [leaveRoom, roomId, navigate])

  if (authLoading || !roomInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-where-coral border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Room Join Flow - Show pending/rejected states */}
      <RoomJoinFlow status={joinStatus} roomName={roomInfo?.name || ''} onLeave={handleLeave} />

      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLeave}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-foreground">{roomInfo.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{participants.length}/{roomInfo.max_participants}</span>
              {isConnecting && (
                <span className="text-where-coral">Connecting...</span>
              )}
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setShowDeviceSettings(true)}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Host Controls Panel - Show pending requests if user is host */}
      {roomInfo && user?.id === roomInfo.created_by && (
        <div className="bg-card border-b border-border px-4 py-3">
          <HostControlsPanel roomId={roomId || ''} isHost={true} />
        </div>
      )}

      {/* Video Grid */}
      <div className="flex-1 relative">
        {connectionErrors.length > 0 && (
          <div className="absolute top-2 left-2 right-2 z-10 bg-destructive/90 text-destructive-foreground p-2 rounded text-sm">
            {connectionErrors[connectionErrors.length - 1]}
          </div>
        )}

        {mediaError && (
          <div className="absolute top-2 left-2 right-2 z-10 bg-amber-500/90 text-white p-2 rounded text-sm text-center">
            ⚠️ {mediaError}
          </div>
        )}

        {joinStatus === 'approved' && (
          <GroupVideoGrid
            localStream={localStream}
            peerStreams={peerStreams}
            participants={participants}
            activeSpeakerId={activeSpeakerId}
            currentUserId={user?.id || ''}
            roomCreatorId={roomInfo.created_by}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
          />
        )}
      </div>

      {/* Controls */}
      {joinStatus === 'approved' && (
        <div className="bg-card border-t border-border p-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isMuted ? 'destructive' : 'secondary'}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={handleToggleMute}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            <Button
              variant={isVideoOff ? 'destructive' : 'secondary'}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={handleToggleVideo}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </Button>

            <Button
              variant={speakerMuted ? 'destructive' : 'secondary'}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={handleToggleSpeaker}
            >
              {speakerMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={handleLeave}
            >
              <LogOut className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}

      {/* Device Settings Drawer */}
      <Drawer open={showDeviceSettings} onOpenChange={setShowDeviceSettings}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Audio & Video Settings</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <DeviceSelectors
              audioInputs={audioInputs}
              videoInputs={videoInputs}
              audioOutputs={audioOutputs}
              selectedAudioInput={selectedAudioInput}
              selectedVideoInput={selectedVideoInput}
              selectedAudioOutput={selectedAudioOutput}
              onAudioInputChange={selectAudioInput}
              onVideoInputChange={selectVideoInput}
              onAudioOutputChange={selectAudioOutput}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

export default WhereGroupChat
