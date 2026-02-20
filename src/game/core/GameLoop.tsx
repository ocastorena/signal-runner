import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { GAME_BALANCE } from '../../shared/constants'
import { useGameStore } from './store'

export const GameLoop = (): null => {
  const step = useGameStore((store) => store.step)
  const accumulatorRef = useRef(0)

  useFrame((_state, deltaSeconds) => {
    accumulatorRef.current += Math.min(deltaSeconds, GAME_BALANCE.maxFrameSeconds)

    while (accumulatorRef.current >= GAME_BALANCE.fixedStepSeconds) {
      step(GAME_BALANCE.fixedStepSeconds)
      accumulatorRef.current -= GAME_BALANCE.fixedStepSeconds
    }
  })

  return null
}
