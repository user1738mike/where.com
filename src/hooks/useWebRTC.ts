import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { getIceServers } from '@/lib/webrtc/iceServers'
import SimplePeer from 'simple-peer'

type PeerInstance = any

export type ConnectionMode = 'disconnected' | 'connecting' | 'direct' | 'relay' | 'reconnecting' | 'failed'

interface DeviceInfo {
  deviceId: string
  label: string
  kind: 'audioinput' | 'videoinput' | 'audiooutput'
}

interface PeerState {
  makingOffer: boolean
  ignoreOffer: boolean
  isSettingRemoteAnswerPending: boolean
}

export function useWebRTC(userId: string | null) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null)
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('disconnected')

  // Device management
  const [audioInputs, setAudioInputs] = useState<DeviceInfo[]>([])
  const [videoInputs, setVideoInputs] = useState<DeviceInfo[]>([])
  const [audioOutputs, setAudioOutputs] = useState<DeviceInfo[]>([])
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('default')
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('default')
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('default')
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  const peerRef = useRef<PeerInstance | null>(null)
  const channelRef = useRef<any | null>(null)
  const userIdRef = useRef<string | null>(userId)
  const matchIdRef = useRef<string | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const pendingSignalsRef = useRef<any[]>([])
  const processedSignalsRef = useRef<Set<string>>(new Set()) // Signal deduplication
  const reconnectAttemptsRef = useRef(0)
  const peerReadyRef = useRef(false)
  const readyResolverRef = useRef<(() => void) | null>(null)
  const forceRelayRef = useRef(false)
  const iceRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const peerStateRef = useRef<PeerState>({
    makingOffer: false,
    ignoreOffer: false,
    isSettingRemoteAnswerPending: false,
  })
  const maxReconnectAttempts = 3
  const createPeerRef = useRef<(initiator: boolean, matchId: string) => Promise<PeerInstance>>(() => Promise.resolve(null))

  useEffect(() => { userIdRef.current = userId }, [userId])

  useEffect(() => {
    getIceServers().catch(() => null)
    return () => hangup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* -------------------- DEVICE MANAGEMENT -------------------- */

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter(d => d.kind === 'audioinput').map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${Math.random()}`,
        kind: 'audioinput' as const,
      }))
      const videoInputs = devices.filter(d => d.kind === 'videoinput').map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${Math.random()}`,
        kind: 'videoinput' as const,
      }))
      const audioOutputs = devices.filter(d => d.kind === 'audiooutput').map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Speaker ${Math.random()}`,
        kind: 'audiooutput' as const,
      }))
      setAudioInputs(audioInputs)
      setVideoInputs(videoInputs)
      setAudioOutputs(audioOutputs)
    } catch (err) {
      console.warn('Failed to enumerate devices:', err)
    }
  }, [])

  useEffect(() => {
    enumerateDevices()
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices)
  }, [enumerateDevices])

  const replaceTrack = useCallback(async (kind: 'audio' | 'video', newDeviceId: string) => {
    if (!localStreamRef.current || !peerRef.current) {
      console.warn(`Cannot replace ${kind} track: stream or peer not ready`)
      return
    }

    try {
      const constraints: any = kind === 'audio'
        ? { audio: { deviceId: { exact: newDeviceId } } }
        : { video: { deviceId: { exact: newDeviceId } } }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      const newTrack = newStream[kind === 'audio' ? 'getAudioTracks' : 'getVideoTracks']()[0]

      if (!newTrack) {
        console.warn(`No ${kind} track in new stream`)
        return
      }

      // Replace track in local stream
      const oldTracks = localStreamRef.current[kind === 'audio' ? 'getAudioTracks' : 'getVideoTracks']()
      if (oldTracks.length > 0) {
        localStreamRef.current.removeTrack(oldTracks[0])
        oldTracks[0].stop()
      }
      localStreamRef.current.addTrack(newTrack)

      // Replace track in peer connection
      try {
        const pc = (peerRef.current as any)._pc as RTCPeerConnection | undefined
        if (pc) {
          const sender = pc.getSenders().find(s => s.track?.kind === kind)
          if (sender) {
            await sender.replaceTrack(newTrack)
            console.log(`🔄 Replaced ${kind} track`)
          }
        }
      } catch (err) {
        console.warn(`Failed to replace ${kind} track in peer connection:`, err)
      }

      setLocalStream(new MediaStream(localStreamRef.current.getTracks()))
      console.log(`✅ ${kind} device switched successfully`)
    } catch (err) {
      console.error(`Failed to switch ${kind} device:`, err)
    }
  }, [])

  const selectAudioInput = useCallback(async (deviceId: string) => {
    setSelectedAudioInput(deviceId)
    await replaceTrack('audio', deviceId)
  }, [replaceTrack])

  const selectVideoInput = useCallback(async (deviceId: string) => {
    setSelectedVideoInput(deviceId)
    await replaceTrack('video', deviceId)
  }, [replaceTrack])

  const selectAudioOutput = useCallback(async (deviceId: string) => {
    setSelectedAudioOutput(deviceId)
  }, [])

  const toggleMute = useCallback((): boolean => {
    if (!localStreamRef.current) return isMuted

    const audioTrack = localStreamRef.current.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      const newMuted = !audioTrack.enabled
      setIsMuted(newMuted)
      return newMuted
    }
    return isMuted
  }, [isMuted])

  const toggleVideo = useCallback((): boolean => {
    if (!localStreamRef.current) return isVideoOff

    const videoTrack = localStreamRef.current.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      const newVideoOff = !videoTrack.enabled
      setIsVideoOff(newVideoOff)
      return newVideoOff
    }
    return isVideoOff
  }, [isVideoOff])

  /* -------------------- MEDIA -------------------- */

  const initLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    const constraints: MediaStreamConstraints = {
      video: isMobile
        ? {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 15, max: 30 },
            facingMode: { ideal: 'user' },
            deviceId: selectedVideoInput !== 'default' ? { exact: selectedVideoInput } : undefined,
          }
        : {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            deviceId: selectedVideoInput !== 'default' ? { exact: selectedVideoInput } : undefined,
          },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        deviceId: selectedAudioInput !== 'default' ? { exact: selectedAudioInput } : undefined,
      },
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      setLocalStream(stream)
      return stream
    } catch (error) {
      if (isMobile) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: selectedAudioInput !== 'default' ? { exact: selectedAudioInput } : undefined,
            },
          })
          localStreamRef.current = audioStream
          setLocalStream(audioStream)
          return audioStream
        } catch (audioError) {
          throw audioError
        }
      }
      throw error
    }
  }, [selectedAudioInput, selectedVideoInput])

  /* -------------------- DIAGNOSTICS -------------------- */

  const logCandidatePair = useCallback(async (pc: RTCPeerConnection) => {
    try {
      const stats = await pc.getStats()
      stats.forEach((report: any) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          let localType = 'unknown'
          let remoteType = 'unknown'
          let protocol = 'unknown'
          stats.forEach((s: any) => {
            if (s.id === report.localCandidateId) {
              localType = s.candidateType || 'unknown'
              protocol = s.protocol || 'unknown'
            }
            if (s.id === report.remoteCandidateId) {
              remoteType = s.candidateType || 'unknown'
            }
          })
          const isRelay = localType === 'relay' || remoteType === 'relay'
          console.log(
            `📊 ICE pair: local=${localType} remote=${remoteType} proto=${protocol} relay=${isRelay}`
          )
          setConnectionMode(isRelay ? 'relay' : 'direct')
        }
      })
    } catch (e) {
      console.log('Stats error:', e)
    }
  }, [])

  /* -------------------- CHANNEL -------------------- */

  const ensureSubscribed = (chan: any, timeout = 10000) =>
    new Promise<void>((resolve) => {
      let done = false
      const t = setTimeout(() => resolve(), timeout)
      chan.subscribe((status: string) => {
        if (status === 'SUBSCRIBED' && !done) {
          done = true
          clearTimeout(t)
          resolve()
        }
      })
    })

  const joinMatchChannel = useCallback(async (matchId: string) => {
    if (channelRef.current && matchIdRef.current === matchId) return channelRef.current
    if (channelRef.current) {
      try {
        await supabase.removeChannel(channelRef.current)
      } catch {}
      channelRef.current = null
    }

    const chan = supabase.channel(`where:match:${matchId}`)
    channelRef.current = chan

    chan.on('broadcast', { event: 'signal' }, async ({ payload }: any) => {
      if (!payload || payload.from === userIdRef.current || payload.matchId !== matchIdRef.current) return
      const data = payload.data
      const messageId = payload.messageId
      if (!data) return

      // Deduplicate signals
      if (messageId) {
        if (processedSignalsRef.current.has(messageId)) {
          console.log(`⏭️ Ignoring duplicate signal ${messageId}`)
          return
        }
        processedSignalsRef.current.add(messageId)
        // Prevent memory leak by clearing old entries
        if (processedSignalsRef.current.size > 1000) {
          const arr = Array.from(processedSignalsRef.current)
          for (let i = 0; i < 500; i++) {
            processedSignalsRef.current.delete(arr[i])
          }
        }
      }

      if (!peerRef.current) {
        if (data.type === 'offer') {
          try {
            const peer = await createPeerRef.current(false, matchIdRef.current!)
            peer.signal(data)
            const buffered = pendingSignalsRef.current.filter((s) => s.type !== 'offer')
            buffered.forEach((c) => peer.signal(c))
            pendingSignalsRef.current = []
          } catch (err) {
            console.error('Failed to handle incoming offer:', err)
          }
        } else {
          pendingSignalsRef.current.push(data)
        }
        return
      }

      if (peerRef.current.destroyed) return

      // Handle signal based on type with proper state validation
      const pc = (peerRef.current as any)._pc as RTCPeerConnection | undefined
      if (!pc) return

      try {
        if (data.type === 'offer') {
          // Perfect negotiation pattern: ignore offer if we're making offer (polite side loses)
          if (peerStateRef.current.makingOffer || pc.signalingState !== 'stable') {
            console.log(
              `⏭️ Ignoring offer: makingOffer=${peerStateRef.current.makingOffer}, state=${pc.signalingState}`
            )
            peerStateRef.current.ignoreOffer = true
            return
          }
          peerStateRef.current.ignoreOffer = false
          console.log(`📥 Setting remote offer, current state: ${pc.signalingState}`)
          peerRef.current.signal(data)
        } else if (data.type === 'answer') {
          // Only accept answer in have-local-offer state
          if (pc.signalingState !== 'have-local-offer') {
            console.warn(
              `⏭️ Ignoring answer: not in have-local-offer state (state: ${pc.signalingState})`
            )
            return
          }
          console.log(`📥 Setting remote answer, current state: ${pc.signalingState}`)
          peerStateRef.current.isSettingRemoteAnswerPending = false
          peerRef.current.signal(data)
        } else if (data.type === 'candidate') {
          // Only add ICE candidates when remote description exists
          if (!pc.remoteDescription) {
            console.log(`🧊 Buffering ICE candidate: no remote description yet`)
            pendingSignalsRef.current.push(data)
            return
          }
          peerRef.current.signal(data)
        }
      } catch (err) {
        console.error('Error handling signal:', err)
      }
    })

    chan.on('broadcast', { event: 'message' }, ({ payload }: any) => {
      if (!payload || payload.from === userIdRef.current || payload.matchId !== matchIdRef.current) return
      setMessages((p) => [
        ...p,
        { id: Date.now() + Math.random(), ...payload, sender: 'them', timestamp: new Date() },
      ])
    })

    chan.on('broadcast', { event: 'ready' }, ({ payload }: any) => {
      if (!payload || payload.from === userIdRef.current) return
      console.log('🤝 Received peer ready signal from:', payload.from)
      peerReadyRef.current = true
      readyResolverRef.current?.()
      readyResolverRef.current = null
    })

    await ensureSubscribed(chan)
    return chan
  }, [])

  const broadcastReady = useCallback(async (matchId: string) => {
    if (!channelRef.current) return
    console.log('📡 Broadcasting ready signal for match:', matchId)
    await channelRef.current.send({
      type: 'broadcast',
      event: 'ready',
      payload: { from: userIdRef.current, matchId, ts: new Date().toISOString() },
    })
  }, [])

  const waitForPeerReady = useCallback((timeoutMs = 5000): Promise<boolean> => {
    if (peerReadyRef.current) return Promise.resolve(true)
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        readyResolverRef.current = null
        resolve(false)
      }, timeoutMs)
      readyResolverRef.current = () => {
        clearTimeout(t)
        resolve(true)
      }
    })
  }, [])

  const sendSignal = useCallback(async (matchId: string, data: any) => {
    if (!channelRef.current) return
    const messageId = `${matchId}-${data.type}-${Date.now()}-${Math.random()}`
    await channelRef.current.send({
      type: 'broadcast',
      event: 'signal',
      payload: {
        from: userIdRef.current,
        matchId,
        data,
        messageId,
        ts: new Date().toISOString(),
      },
    })
  }, [])

  /* -------------------- PEER -------------------- */

  const createPeer = useCallback(
    async (initiator: boolean, matchId: string) => {
      const stream = await initLocalStream()
      if (!matchId) throw new Error('Invalid matchId')

      const iceServers = await getIceServers(matchId)
      const transportPolicy = forceRelayRef.current ? 'relay' : 'all'
      console.log(
        `🔧 Creating peer: initiator=${initiator}, transport=${transportPolicy}, forceRelay=${forceRelayRef.current}`
      )

      setConnectionMode('connecting')

      let peer: any
      try {
        peer = new SimplePeer({
          initiator,
          trickle: true,
          stream,
          config: { iceServers, iceTransportPolicy: transportPolicy },
        })
      } catch {
        peer = new SimplePeer({
          initiator,
          trickle: true,
          config: { iceServers, iceTransportPolicy: transportPolicy },
        })
        if (stream) peer.addStream(stream)
      }

      // Initialize peer negotiation state
      peerStateRef.current = {
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false,
      }

      peer.on('signal', (data: any) => sendSignal(matchId, data))

      peer.on('stream', (rs: MediaStream) => {
        console.log(
          '🎥 Remote stream received, tracks:',
          rs.getTracks().map((t) => `${t.kind}:${t.readyState}`)
        )
        setRemoteStream(rs)
      })

      peer.on('connect', () => {
        console.log('🎉 WEBRTC CONNECTED')
        reconnectAttemptsRef.current = 0
        if (peer._pc) logCandidatePair(peer._pc)
      })

      peer.on('error', (e: any) => {
        console.error('💥 Peer error:', e?.message || e)
        handleReconnect(matchId, initiator)
      })

      peer.on('close', () => {
        console.log('Peer closed')
        peerRef.current = null
        handleReconnect(matchId, initiator)
      })

      // Enhanced ICE diagnostics
      if (peer._pc) {
        const pc = peer._pc as RTCPeerConnection

        pc.addEventListener('negotiationneeded', async () => {
          try {
            if (peerStateRef.current.makingOffer || pc.signalingState !== 'stable') {
              console.log(
                `⏭️ Ignoring negotiationneeded: makingOffer=${peerStateRef.current.makingOffer}, state=${pc.signalingState}`
              )
              return
            }

            peerStateRef.current.makingOffer = true
            const offer = await pc.createOffer()
            if (pc.signalingState !== 'stable') {
              console.log(`Offer created but signaling state changed: ${pc.signalingState}`)
            }
            await pc.setLocalDescription(offer)
            console.log(`📤 Sending offer, state: ${pc.signalingState}`)
          } catch (err) {
            console.error('Failed to handle negotiationneeded:', err)
          } finally {
            peerStateRef.current.makingOffer = false
          }
        })

        pc.addEventListener('icecandidateerror', (ev: any) => {
          const ignorableErrors = [701, 702, 703, 768]
          if (ignorableErrors.includes(ev.errorCode)) {
            console.log(`🧊⚠️ ICE candidate transient error: ${ev.errorCode} ${ev.errorText}`)
          } else {
            console.warn(
              `🧊❌ ICE candidate error: ${ev.errorCode} ${ev.errorText} ${ev.url || ''}`
            )
          }
        })

        pc.addEventListener('iceconnectionstatechange', () => {
          const state = pc.iceConnectionState
          console.log(`🧊 ICE connection state: ${state}`)

          if (state === 'connected' || state === 'completed') {
            if (iceRestartTimerRef.current) {
              clearTimeout(iceRestartTimerRef.current)
              iceRestartTimerRef.current = null
            }
            forceRelayRef.current = false
            reconnectAttemptsRef.current = 0
          }

          if (state === 'disconnected') {
            console.log('🧊 ICE disconnected, scheduling check')
            if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current)
            iceRestartTimerRef.current = setTimeout(() => {
              const iceState = peerRef.current?._pc?.iceConnectionState
              if (iceState === 'disconnected' || iceState === 'failed') {
                console.log('🧊 ICE still disconnected, attempting reconnect')
                handleReconnect(matchId, initiator)
              }
            }, 5000)
          }
        })

        pc.addEventListener('connectionstatechange', () => {
          console.log(`🔌 Connection state: ${pc.connectionState}`)
        })

        pc.addEventListener('signalingstatechange', () => {
          console.log(`📡 Signaling state: ${pc.signalingState}`)
        })
      }

      peer.on('iceStateChange', (state: string) => {
        console.log('🧊 ICE:', state)
        if (state === 'connected' || state === 'completed') {
          if (peer._pc) logCandidatePair(peer._pc)
        }
        if (state === 'disconnected') {
          console.log('⚠️ ICE disconnected – will attempt reconnect if it persists')
          if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current)
          iceRestartTimerRef.current = setTimeout(() => {
            const iceState = peerRef.current?._pc?.iceConnectionState
            if (iceState === 'disconnected' || iceState === 'failed') {
              handleReconnect(matchId, initiator)
            }
          }, 5000)
        }
      })

      peerRef.current = peer
      return peer
    },
    [initLocalStream, sendSignal, logCandidatePair]
  )

  // Keep createPeerRef in sync
  useEffect(() => {
    createPeerRef.current = createPeer
  }, [createPeer])

  /* -------------------- AUTO-RECONNECT -------------------- */

  const handleReconnect = useCallback(async (matchId: string, initiator: boolean) => {
    if (!matchIdRef.current || matchIdRef.current !== matchId) return
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('❌ Max reconnect attempts reached')
      setConnectionMode('failed')
      return
    }

    reconnectAttemptsRef.current++
    const attempt = reconnectAttemptsRef.current
    console.log(`🔄 Auto-reconnect attempt ${attempt}/${maxReconnectAttempts}`)
    setConnectionMode('reconnecting')

    // On 2nd attempt, force relay to bypass NAT issues
    if (attempt >= 2 && !forceRelayRef.current) {
      console.log('🔄 Forcing relay-only transport for this attempt')
      forceRelayRef.current = true
    }

    try {
      peerRef.current?.destroy()
    } catch {}
    peerRef.current = null
    setRemoteStream(null)
    pendingSignalsRef.current = []

    await new Promise((r) => setTimeout(r, 1500 * attempt))

    if (!matchIdRef.current || matchIdRef.current !== matchId) return

    try {
      // Full renegotiation: rebroadcast ready and wait for peer
      peerReadyRef.current = false
      await broadcastReady(matchId)

      if (initiator) {
        const peerReady = await waitForPeerReady(4000)
        if (!peerReady) {
          console.log('⚠️ Reconnect: peer not ready, sending offer anyway')
        }
        await new Promise((r) => setTimeout(r, 300))
      }

      await createPeer(initiator, matchId)
      console.log('✅ Reconnect peer created (attempt', attempt, ')')
    } catch (err) {
      console.error('❌ Reconnect failed:', err)
    }
  }, [broadcastReady, waitForPeerReady, createPeer])

  /* -------------------- PUBLIC API -------------------- */

  const startCall = useCallback(async (matchId: string) => {
    softReset(false)
    matchIdRef.current = matchId
    setCurrentMatchId(matchId)
    pendingSignalsRef.current = []
    processedSignalsRef.current.clear()
    reconnectAttemptsRef.current = 0
    peerReadyRef.current = false
    forceRelayRef.current = false
    setConnectionMode('connecting')

    await joinMatchChannel(matchId)
    await initLocalStream()

    await broadcastReady(matchId)

    console.log('⏳ Initiator waiting for peer ready…')
    let peerReady = await waitForPeerReady(5000)

    if (!peerReady) {
      console.log('⏳ Peer not ready yet, re-broadcasting and waiting again…')
      await broadcastReady(matchId)
      peerReady = await waitForPeerReady(5000)
    }

    if (!peerReady) {
      console.log('⚠️ Peer ready timeout — sending offer anyway')
    } else {
      console.log('✅ Peer ready confirmed — sending offer')
    }

    await new Promise((r) => setTimeout(r, 300))
    await createPeer(true, matchId)
  }, [joinMatchChannel, initLocalStream, broadcastReady, waitForPeerReady, createPeer])

  const answerCall = useCallback(async (matchId: string) => {
    softReset(false)
    matchIdRef.current = matchId
    setCurrentMatchId(matchId)
    pendingSignalsRef.current = []
    processedSignalsRef.current.clear()
    reconnectAttemptsRef.current = 0
    peerReadyRef.current = false
    forceRelayRef.current = false
    setConnectionMode('connecting')

    await joinMatchChannel(matchId)
    await initLocalStream()

    await broadcastReady(matchId)
    console.log('📡 Responder ready — waiting for offer')
  }, [joinMatchChannel, initLocalStream, broadcastReady])

  const softReset = (stopMedia: boolean) => {
    try {
      peerRef.current?.destroy()
    } catch {}
    peerRef.current = null
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current)
      } catch {}
      channelRef.current = null
    }
    setRemoteStream(null)
    if (stopMedia && localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
      setLocalStream(null)
    }
    setMessages([])
    peerReadyRef.current = false
    readyResolverRef.current = null
    setConnectionMode('disconnected')
  }

  const hangup = useCallback(() => {
    console.log('📞 Hanging up call')
    
    // Clear ICE restart timer
    if (iceRestartTimerRef.current) {
      clearTimeout(iceRestartTimerRef.current)
      iceRestartTimerRef.current = null
    }

    // Full cleanup
    softReset(true)
    matchIdRef.current = null
    setCurrentMatchId(null)
    reconnectAttemptsRef.current = 0
    forceRelayRef.current = false
    processedSignalsRef.current.clear()
    peerStateRef.current = {
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemoteAnswerPending: false,
    }
  }, [])

  return {
    // Media streams
    localStream,
    remoteStream,
    messages,
    
    // Connection state
    currentMatchId,
    connectionMode,
    
    // Device management
    audioInputs,
    videoInputs,
    audioOutputs,
    selectedAudioInput,
    selectedVideoInput,
    selectedAudioOutput,
    isMuted,
    isVideoOff,
    
    // Device selection
    selectAudioInput,
    selectVideoInput,
    selectAudioOutput,
    enumerateDevices,
    
    // Media control
    toggleMute,
    toggleVideo,
    initLocalStream,
    
    // Call control
    startCall,
    answerCall,
    hangup,
  }
}

export default useWebRTC
