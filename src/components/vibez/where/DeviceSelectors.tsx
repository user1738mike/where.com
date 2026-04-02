import { Label } from '@/components/vibez/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/vibez/ui/select'

interface DeviceSelectorsProps {
  audioInputs: Array<{ deviceId: string; label: string; kind: string }>
  videoInputs: Array<{ deviceId: string; label: string; kind: string }>
  audioOutputs: Array<{ deviceId: string; label: string; kind: string }>
  selectedAudioInput: string
  selectedVideoInput: string
  selectedAudioOutput: string
  onAudioInputChange: (deviceId: string) => void
  onVideoInputChange: (deviceId: string) => void
  onAudioOutputChange: (deviceId: string) => void
}

const DeviceSelectors = ({
  audioInputs,
  videoInputs,
  audioOutputs,
  selectedAudioInput,
  selectedVideoInput,
  selectedAudioOutput,
  onAudioInputChange,
  onVideoInputChange,
  onAudioOutputChange,
}: DeviceSelectorsProps) => {
  return (
    <div className="space-y-4">
      {/* Microphone Selection */}
      {audioInputs.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="audio-input">Microphone</Label>
          <Select value={selectedAudioInput} onValueChange={onAudioInputChange}>
            <SelectTrigger id="audio-input">
              <SelectValue placeholder="Select microphone" />
            </SelectTrigger>
            <SelectContent>
              {audioInputs.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Camera Selection */}
      {videoInputs.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="video-input">Camera</Label>
          <Select value={selectedVideoInput} onValueChange={onVideoInputChange}>
            <SelectTrigger id="video-input">
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              {videoInputs.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Speaker Selection */}
      {audioOutputs.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="audio-output">Speaker</Label>
          <Select value={selectedAudioOutput} onValueChange={onAudioOutputChange}>
            <SelectTrigger id="audio-output">
              <SelectValue placeholder="Select speaker" />
            </SelectTrigger>
            <SelectContent>
              {audioOutputs.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

export default DeviceSelectors
