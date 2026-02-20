import { RUNNER_BALANCE } from '../../shared/constants'
import type {
  GameState,
  RunnerObstacle,
  RunnerTile,
  RunnerToken,
  Vector3Tuple,
} from '../../shared/types'
import { headingToForward, headingToRight } from './generation'

export const getCurrentTile = (state: GameState): RunnerTile =>
  state.track.tiles[state.track.currentTileIndex]

export const getPlayerWorldPosition = (state: GameState): Vector3Tuple => {
  const tile = getCurrentTile(state)
  const forward = headingToForward(tile.heading)
  const right = headingToRight(tile.heading)

  return [
    tile.start[0] +
      forward[0] * state.track.distanceInTile +
      right[0] * state.player.lanePosition * RUNNER_BALANCE.laneWidth,
    0.42 + state.player.height,
    tile.start[2] +
      forward[2] * state.track.distanceInTile +
      right[2] * state.player.lanePosition * RUNNER_BALANCE.laneWidth,
  ]
}

export const isSliding = (state: GameState): boolean => state.player.slideRemaining > 0

export const getTurnPrompt = (state: GameState): string | null => {
  const tile = getCurrentTile(state)
  if (!tile.requiredTurn) {
    return null
  }

  if (!state.track.decisionOpen) {
    return null
  }

  return tile.requiredTurn === -1 ? 'TURN LEFT' : 'TURN RIGHT'
}

export const getVisibleTiles = (
  state: GameState,
  behind: number,
  ahead: number,
): RunnerTile[] => {
  const start = Math.max(0, state.track.currentTileIndex - behind)
  const end = Math.min(state.track.tiles.length, state.track.currentTileIndex + ahead)
  return state.track.tiles.slice(start, end)
}

export const getVisibleObstacles = (
  state: GameState,
  behind: number,
  ahead: number,
): RunnerObstacle[] => {
  const minIndex = Math.max(0, state.track.currentTileIndex - behind)
  const maxIndex = state.track.currentTileIndex + ahead
  return state.obstacles.filter(
    (obstacle) =>
      !obstacle.resolved &&
      obstacle.tileIndex >= minIndex &&
      obstacle.tileIndex <= maxIndex,
  )
}

export const getVisibleTokens = (
  state: GameState,
  behind: number,
  ahead: number,
): RunnerToken[] => {
  const minIndex = Math.max(0, state.track.currentTileIndex - behind)
  const maxIndex = state.track.currentTileIndex + ahead
  return state.tokens.filter(
    (token) =>
      !token.collected && token.tileIndex >= minIndex && token.tileIndex <= maxIndex,
  )
}
