import { produce } from 'immer'
import { create } from 'zustand'
import { createInitialGameState } from './state'
import { stepSimulation } from './simulation'
import type { GameCommand, GameState } from '../../shared/types'

interface GameStore {
  game: GameState
  enqueueCommand: (command: GameCommand) => void
  moveLeft: () => void
  moveRight: () => void
  jump: () => void
  slide: () => void
  pauseRun: () => void
  resumeRun: () => void
  resetRun: () => void
  step: (dtSeconds: number) => void
}

const pushCommand = (store: GameStore, command: GameCommand) => {
  store.game.commandQueue.push(command)
}

export const useGameStore = create<GameStore>((set) => ({
  game: createInitialGameState(),
  enqueueCommand: (command) => {
    set(
      produce((store: GameStore) => {
        pushCommand(store, command)
      }),
    )
  },
  moveLeft: () => {
    set(
      produce((store: GameStore) => {
        pushCommand(store, { type: 'MoveLeft' })
      }),
    )
  },
  moveRight: () => {
    set(
      produce((store: GameStore) => {
        pushCommand(store, { type: 'MoveRight' })
      }),
    )
  },
  jump: () => {
    set(
      produce((store: GameStore) => {
        pushCommand(store, { type: 'Jump' })
      }),
    )
  },
  slide: () => {
    set(
      produce((store: GameStore) => {
        pushCommand(store, { type: 'Slide' })
      }),
    )
  },
  pauseRun: () => {
    set(
      produce((store: GameStore) => {
        pushCommand(store, { type: 'PauseRun' })
      }),
    )
  },
  resumeRun: () => {
    set(
      produce((store: GameStore) => {
        pushCommand(store, { type: 'ResumeRun' })
      }),
    )
  },
  resetRun: () => {
    set(() => ({ game: createInitialGameState() }))
  },
  step: (dtSeconds) => {
    set(
      produce((store: GameStore) => {
        stepSimulation(store.game, dtSeconds)
      }),
    )
  },
}))
