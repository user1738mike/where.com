import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Filter } from 'lucide-react'
import WhereHeader from '@/components/vibez/where/WhereHeader'
import { Button } from '@/components/vibez/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/vibez/ui/select'
import RoomCard from '@/components/vibez/where/RoomCard'
import CreateRoomModal from '@/components/vibez/where/CreateRoomModal'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface Room {
  id: string
  name: string
  topic: string
  description: string | null
  max_participants: number
  created_by: string
  participant_count: number
}

const TOPICS = [
  { value: 'all', label: 'All Topics' },
  { value: 'fitness', label: '🏋️ Fitness' },
  { value: 'cooking', label: '🍳 Cooking' },
  { value: 'technology', label: '💻 Technology' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'music', label: '🎵 Music' },
  { value: 'movies', label: '🎬 Movies' },
  { value: 'reading', label: '📚 Reading' },
  { value: 'gardening', label: '🌱 Gardening' },
  { value: 'pets', label: '🐾 Pets' },
  { value: 'parenting', label: '👶 Parenting' },
  { value: 'business', label: '💼 Business' },
  { value: 'art', label: '🎨 Art' },
  { value: 'sports', label: '⚽ Sports' },
  { value: 'general', label: '💬 General Chat' },
]

const ACTIVE_PARTICIPANT_TIMEOUT_MS = 30_000

const WhereGroupRooms = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [topicFilter, setTopicFilter] = useState('all')
  const roomSubscriptionRef = useRef<any>(null)
  const pollingIntervalRef = useRef<number | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)

  const fetchRooms = useCallback(async (suppressLoading = false) => {
    if (!suppressLoading) setLoading(true)
    try {
      const activeSince = new Date(Date.now() - ACTIVE_PARTICIPANT_TIMEOUT_MS).toISOString()

      const { data: roomsData, error } = await supabase
        .from('group_rooms')
        .select('id, name, topic, description, max_participants, created_by')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      const roomsWithCounts = await Promise.all(
        (roomsData || []).map(async (room: Room) => {
          const { count } = await supabase
            .from('group_room_participants')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .eq('participant_status', 'approved')
            .gt('joined_at', activeSince)

          return {
            ...room,
            participant_count: count || 0,
          }
        })
      )

      setRooms(roomsWithCounts.filter(room => room.participant_count > 0))
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
      toast.error('Failed to load rooms')
    } finally {
      if (!suppressLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/vibez/where/login')
      return
    }

    if (user) {
      fetchRooms()
    }
  }, [user, authLoading, navigate, fetchRooms])

  useEffect(() => {
    if (!user) return

    const channel = supabase.channel('room-participant-listener')

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_room_participants' }, async ({ new: newRow }: any) => {
        if (!newRow || newRow.participant_status !== 'approved') return
        await fetchRooms(true)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'group_room_participants' }, async ({ old: oldRow }: any) => {
        if (!oldRow || oldRow.participant_status !== 'approved') return
        await fetchRooms(true)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'group_room_participants' }, async ({ old: oldRow, new: newRow }: any) => {
        if (!oldRow || !newRow) return
        if (oldRow.participant_status !== newRow.participant_status) {
          await fetchRooms(true)
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'group_rooms' }, async ({ new: newRow }: any) => {
        if (!newRow) return
        await fetchRooms(true)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'group_rooms' }, async () => {
        await fetchRooms(true)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          roomSubscriptionRef.current = channel
        }
      })

    return () => {
      if (roomSubscriptionRef.current) {
        supabase.removeChannel(roomSubscriptionRef.current)
        roomSubscriptionRef.current = null
      }
    }
  }, [user, fetchRooms])

  useEffect(() => {
    if (!user) return

    fetchRooms()
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
    pollingIntervalRef.current = window.setInterval(() => {
      fetchRooms()
    }, 30_000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [user, fetchRooms])

  const handleJoinRoom = async (roomId: string) => {
    setJoiningRoomId(roomId)

    try {
      const { data, error } = await supabase.functions.invoke('manage-room', {
        body: { action: 'join', room_id: roomId },
      })

      if (error) {
        console.error('Join room error:', error, JSON.stringify(error))
        throw error
      }

      if (data?.error) {
        const msg = data.error === 'Room is full' ? 'This room is full. Try another room.'
          : data.error === 'Room not found' ? 'This room no longer exists.'
          : data.error === 'Room is not active' ? 'This room is no longer active.'
          : data.error
        toast.error(msg)
        return
      }

      navigate(`/vibez/where/rooms/${roomId}`)
    } catch (error: any) {
      console.error('Failed to join room:', error, JSON.stringify(error))
      toast.error(error?.message || 'Failed to join room. Please try again.')
    } finally {
      setJoiningRoomId(null)
    }
  }

  const handleRoomCreated = (roomId: string) => {
    navigate(`/vibez/where/rooms/${roomId}`)
  }

  const filteredRooms = topicFilter === 'all'
    ? rooms
    : rooms.filter(room => room.topic === topicFilter)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-where-coral border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <WhereHeader />

      <div className="pt-20">
        {/* Header */}
        <div className="glass-strong border-b border-white/10">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">👥 Group Rooms</h1>
                <p className="text-muted-foreground">
                  Join topic-based video rooms with multiple neighbors
                </p>
              </div>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-where-coral to-where-teal text-white hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Room
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by topic" />
              </SelectTrigger>
              <SelectContent>
                {TOPICS.map((topic) => (
                  <SelectItem key={topic.value} value={topic.value}>
                    {topic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Room Grid */}
        <div className="container mx-auto px-4 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-where-coral border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏠</div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No Rooms Yet</h2>
              <p className="text-muted-foreground mb-4">
                {topicFilter === 'all'
                  ? 'Be the first to create a room!'
                  : `No rooms for ${topicFilter} yet. Create one!`}
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-where-coral to-where-teal text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Room
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  id={room.id}
                  name={room.name}
                  topic={room.topic}
                  description={room.description || undefined}
                  participantCount={room.participant_count}
                  maxParticipants={room.max_participants}
                  onJoin={handleJoinRoom}
                  isJoining={joiningRoomId === room.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateRoomModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onRoomCreated={handleRoomCreated}
      />
    </div>
  )
}

export default WhereGroupRooms
