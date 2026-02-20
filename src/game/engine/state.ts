import { RUNNER_BALANCE } from '@/shared/constants'
import type { GameState } from '@/shared/types'
import { bootstrapTrack } from './generation'

export const createInitialGameState = (): GameState => {
  const state: GameState = {
    player: {
      laneTarget: 0,
      lanePosition: 0,
      height: 0,
      verticalVelocity: 0,
      slideRemaining: 0,
      integrity: RUNNER_BALANCE.maxIntegrity,
      invulnerableRemaining: 0,
    },
    track: {
      tiles: [],
      currentTileIndex: 0,
      distanceInTile: 0,
      queuedTurn: 0,
      decisionOpen: false,
      seed: 1337,
      nextTileId: 0,
      nextObstacleId: 0,
      nextTokenId: 0,
      nextTurnIn: 8,
      generationCursor: [0, 0, 0],
      generationHeading: 0,
    },
    obstacles: [],
    tokens: [],
    run: {
      status: 'running',
      elapsedSeconds: 0,
      distance: 0,
      speed: RUNNER_BALANCE.baseSpeed,
      score: 0,
      tokens: 0,
      collisions: 0,
      topSpeed: RUNNER_BALANCE.baseSpeed,
      failureReason: null,
    },
    timeSeconds: 0,
    events: [],
    nextEventId: 1,
    commandQueue: [],
  }

  bootstrapTrack(state)
  return state
}
