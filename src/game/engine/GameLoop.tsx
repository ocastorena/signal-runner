import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RUNNER_BALANCE } from '@/shared/constants'
import { useGameStore } from './store'

export const GameLoop = (): null => {
  const step = useGameStore((store) => store.step)
  const accumulatorRef = useRef(0)

  useFrame((_state, deltaSeconds) => {
    accumulatorRef.current += Math.min(deltaSeconds, RUNNER_BALANCE.maxFrameSeconds)

    while (accumulatorRef.current >= RUNNER_BALANCE.fixedStepSeconds) {
      step(RUNNER_BALANCE.fixedStepSeconds)
      accumulatorRef.current -= RUNNER_BALANCE.fixedStepSeconds
    }
  })

  return null
}
