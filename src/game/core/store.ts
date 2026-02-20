import { produce } from 'immer'
import { create } from 'zustand'
import { createInitialGameState } from './state'
import { stepSimulation } from './simulation'
import type { AbilityId, GameCommand, GameState } from '../../shared/types'

interface GameStore {
  game: GameState
  enqueueCommand: (command: GameCommand) => void
  setDestination: (nodeId: string) => void
  togglePin: (edgeId: string) => void
  useAbility: (abilityId: AbilityId) => void
  pauseRun: () => void
  resumeRun: () => void
  resetRun: () => void
  step: (dtSeconds: number) => void
}

export const useGameStore = create<GameStore>((set) => ({
  game: createInitialGameState(),
  enqueueCommand: (command) => {
    set(
      produce((store: GameStore) => {
        store.game.commandQueue.push(command)
      }),
    )
  },
  setDestination: (nodeId) => {
    set(
      produce((store: GameStore) => {
        store.game.commandQueue.push({ type: 'SetDestination', nodeId })
      }),
    )
  },
  togglePin: (edgeId) => {
    set(
      produce((store: GameStore) => {
        store.game.commandQueue.push({ type: 'TogglePin', edgeId })
      }),
    )
  },
  useAbility: (abilityId) => {
    set(
      produce((store: GameStore) => {
        store.game.commandQueue.push({ type: 'UseAbility', abilityId })
      }),
    )
  },
  pauseRun: () => {
    set(
      produce((store: GameStore) => {
        store.game.commandQueue.push({ type: 'PauseRun' })
      }),
    )
  },
  resumeRun: () => {
    set(
      produce((store: GameStore) => {
        store.game.commandQueue.push({ type: 'ResumeRun' })
      }),
    )
  },
  resetRun: () => {
    set(() => ({
      game: createInitialGameState(),
    }))
  },
  step: (dtSeconds) => {
    set(
      produce((store: GameStore) => {
        stepSimulation(store.game, dtSeconds)
      }),
    )
  },
}))
