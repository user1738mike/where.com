import { Users } from 'lucide-react'
import { Button } from '@/components/vibez/ui/button'
import { Card, CardContent, CardFooter } from '@/components/vibez/ui/card'
import { Badge } from '@/components/vibez/ui/badge'

const TOPIC_EMOJIS: Record<string, string> = {
  fitness: '🏋️',
  cooking: '🍳',
  technology: '💻',
  gaming: '🎮',
  music: '🎵',
  movies: '🎬',
  reading: '📚',
  gardening: '🌱',
  pets: '🐾',
  parenting: '👶',
  business: '💼',
  art: '🎨',
  sports: '⚽',
  general: '💬',
}

interface RoomCardProps {
  id: string
  name: string
  topic: string
  description?: string
  participantCount: number
  maxParticipants: number
  onJoin: (roomId: string) => void
  isJoining?: boolean
}

const RoomCard = ({
  id,
  name,
  topic,
  description,
  participantCount,
  maxParticipants,
  onJoin,
  isJoining,
}: RoomCardProps) => {
  const isFull = participantCount >= maxParticipants
  const emoji = TOPIC_EMOJIS[topic] || '💬'

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{emoji}</span>
              <h3 className="font-bold text-lg text-foreground truncate">{name}</h3>
            </div>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                "{description}"
              </p>
            )}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {topic}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{participantCount}/{maxParticipants}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-gradient-to-r from-where-coral to-where-teal text-white hover:opacity-90"
          onClick={() => onJoin(id)}
          disabled={isFull || isJoining}
        >
          {isJoining ? 'Joining...' : isFull ? 'Room Full' : 'Join Room'}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default RoomCard
