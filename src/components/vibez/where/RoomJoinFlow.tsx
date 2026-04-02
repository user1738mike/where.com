import { Card } from '@/components/vibez/ui/card'
import { Button } from '@/components/vibez/ui/button'
import { AlertCircle, Clock } from 'lucide-react'

interface RoomJoinFlowProps {
  status: 'pending' | 'approved' | 'rejected' | null
  roomName: string
  onLeave: () => void
}

const RoomJoinFlow = ({ status, roomName, onLeave }: RoomJoinFlowProps) => {
  if (status === 'approved') {
    return null // Show normal room interface
  }

  if (status === 'pending') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md p-8 space-y-4">
          <div className="flex justify-center">
            <div className="relative h-16 w-16">
              <Clock className="h-16 w-16 text-where-coral animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Waiting for Approval</h2>
            <p className="text-muted-foreground">
              The host of <span className="font-semibold">{roomName}</span> is reviewing your request to join.
            </p>
            <p className="text-sm text-muted-foreground">This usually takes a few moments.</p>
          </div>
          <Button variant="outline" onClick={onLeave} className="w-full">
            Leave Room
          </Button>
        </Card>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md p-8 space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Request Rejected</h2>
            <p className="text-muted-foreground">
              Unfortunately, the host of <span className="font-semibold">{roomName}</span> has declined your request to join.
            </p>
          </div>
          <Button variant="destructive" onClick={onLeave} className="w-full">
            Return to Rooms
          </Button>
        </Card>
      </div>
    )
  }

  return null
}

export default RoomJoinFlow
