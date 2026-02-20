import { useEffect, useRef } from 'react'
import { useGameStore } from '../game/core/store'

const safeResume = async (context: AudioContext) => {
  if (context.state === 'suspended') {
    await context.resume()
  }
}

const createEnvelope = (
  context: AudioContext,
  frequency: number,
  durationSeconds: number,
  volume: number,
  type: OscillatorType,
) => {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = type
  oscillator.frequency.value = frequency

  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + durationSeconds)

  oscillator.connect(gain)
  gain.connect(context.destination)

  oscillator.start()
  oscillator.stop(context.currentTime + durationSeconds)
}

export const useAudioDirector = (): void => {
  const events = useGameStore((store) => store.game.events)
  const status = useGameStore((store) => store.game.run.status)

  const audioContextRef = useRef<AudioContext | null>(null)
  const ambientOscillatorRef = useRef<OscillatorNode | null>(null)
  const ambientGainRef = useRef<GainNode | null>(null)
  const lastEventIdRef = useRef(0)

  useEffect(() => {
    const unlockAudio = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      await safeResume(audioContextRef.current)
    }

    window.addEventListener('pointerdown', unlockAudio, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlockAudio)
    }
  }, [])

  useEffect(() => {
    const context = audioContextRef.current
    if (!context) {
      return
    }

    const ensureAmbient = async () => {
      await safeResume(context)

      if (status === 'running' && !ambientOscillatorRef.current) {
        const oscillator = context.createOscillator()
        const gain = context.createGain()

        oscillator.type = 'triangle'
        oscillator.frequency.value = 63
        gain.gain.value = 0.012

        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start()

        ambientOscillatorRef.current = oscillator
        ambientGainRef.current = gain
      }

      if (status !== 'running' && ambientOscillatorRef.current) {
        ambientOscillatorRef.current.stop()
        ambientOscillatorRef.current.disconnect()
        ambientGainRef.current?.disconnect()
        ambientOscillatorRef.current = null
        ambientGainRef.current = null
      }
    }

    void ensureAmbient()
  }, [status])

  useEffect(() => {
    const context = audioContextRef.current
    if (!context) {
      return
    }

    const nextEvents = events.filter((event) => event.id > lastEventIdRef.current)
    if (nextEvents.length < 1) {
      return
    }

    const playEvents = async () => {
      await safeResume(context)

      for (const event of nextEvents) {
        switch (event.type) {
          case 'ability':
            createEnvelope(context, 520, 0.16, 0.07, 'square')
            break
          case 'reroute':
            createEnvelope(context, 330, 0.12, 0.06, 'sawtooth')
            break
          case 'pin':
            createEnvelope(context, 260, 0.1, 0.045, 'triangle')
            break
          case 'token':
            createEnvelope(context, 700, 0.24, 0.08, 'sine')
            break
          case 'success':
            createEnvelope(context, 760, 0.38, 0.11, 'triangle')
            break
          case 'failure':
            createEnvelope(context, 110, 0.44, 0.1, 'sawtooth')
            break
          default:
            break
        }

        lastEventIdRef.current = event.id
      }
    }

    void playEvents()
  }, [events])

  useEffect(
    () => () => {
      ambientOscillatorRef.current?.stop()
      ambientOscillatorRef.current?.disconnect()
      ambientGainRef.current?.disconnect()
      void audioContextRef.current?.close()
      ambientOscillatorRef.current = null
      ambientGainRef.current = null
      audioContextRef.current = null
    },
    [],
  )
}
