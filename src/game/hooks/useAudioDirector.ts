import { useEffect, useRef } from 'react'
import { useGameStore } from '@/game/engine/store'

const resumeIfNeeded = async (context: AudioContext) => {
  if (context.state === 'suspended') {
    await context.resume()
  }
}

const playTone = (
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

  const contextRef = useRef<AudioContext | null>(null)
  const ambientOscillatorRef = useRef<OscillatorNode | null>(null)
  const ambientGainRef = useRef<GainNode | null>(null)
  const lastEventIdRef = useRef(0)

  useEffect(() => {
    const unlock = async () => {
      if (!contextRef.current) {
        contextRef.current = new AudioContext()
      }

      await resumeIfNeeded(contextRef.current)
    }

    window.addEventListener('pointerdown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
    }
  }, [])

  useEffect(() => {
    const context = contextRef.current
    if (!context) {
      return
    }

    const syncAmbient = async () => {
      await resumeIfNeeded(context)

      if (status === 'running' && !ambientOscillatorRef.current) {
        const oscillator = context.createOscillator()
        const gain = context.createGain()

        oscillator.type = 'triangle'
        oscillator.frequency.value = 72
        gain.gain.value = 0.011

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

    void syncAmbient()
  }, [status])

  useEffect(() => {
    const context = contextRef.current
    if (!context) {
      return
    }

    const nextEvents = events.filter((event) => event.id > lastEventIdRef.current)
    if (nextEvents.length === 0) {
      return
    }

    const play = async () => {
      await resumeIfNeeded(context)

      for (const event of nextEvents) {
        switch (event.type) {
          case 'token':
            playTone(context, 690, 0.2, 0.08, 'sine')
            break
          case 'collision':
            playTone(context, 140, 0.25, 0.1, 'sawtooth')
            break
          case 'jump':
            playTone(context, 430, 0.11, 0.05, 'triangle')
            break
          case 'slide':
            playTone(context, 270, 0.12, 0.04, 'square')
            break
          case 'turn':
            playTone(context, 520, 0.13, 0.06, 'triangle')
            break
          case 'gameover':
            playTone(context, 120, 0.4, 0.09, 'sawtooth')
            break
          default:
            break
        }

        lastEventIdRef.current = event.id
      }
    }

    void play()
  }, [events])

  useEffect(
    () => () => {
      ambientOscillatorRef.current?.stop()
      ambientOscillatorRef.current?.disconnect()
      ambientGainRef.current?.disconnect()
      void contextRef.current?.close()
      ambientOscillatorRef.current = null
      ambientGainRef.current = null
      contextRef.current = null
    },
    [],
  )
}
