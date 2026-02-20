import { RUNNER_BALANCE } from '@/shared/constants'
import type {
  GameState,
  Heading,
  Lane,
  RunnerTile,
  TurnDirection,
  Vector3Tuple,
} from '@/shared/types'

const LANE_VALUES: Lane[] = [-1, 0, 1]

const MODULUS = 2 ** 32

export const headingToForward = (heading: Heading): Vector3Tuple => {
  switch (heading) {
    case 0:
      return [0, 0, 1]
    case 1:
      return [1, 0, 0]
    case 2:
      return [0, 0, -1]
    case 3:
      return [-1, 0, 0]
    default:
      return [0, 0, 1]
  }
}

export const headingToRight = (heading: Heading): Vector3Tuple => {
  switch (heading) {
    case 0:
      return [1, 0, 0]
    case 1:
      return [0, 0, -1]
    case 2:
      return [-1, 0, 0]
    case 3:
      return [0, 0, 1]
    default:
      return [1, 0, 0]
  }
}

export const rotateHeading = (
  heading: Heading,
  turn: TurnDirection,
): Heading => {
  if (turn === -1) {
    return ((heading + 3) % 4) as Heading
  }
  return ((heading + 1) % 4) as Heading
}

const nextRandom = (state: GameState): number => {
  state.track.seed = (state.track.seed * 1664525 + 1013904223) >>> 0
  return state.track.seed / MODULUS
}

const randomIntInclusive = (
  state: GameState,
  min: number,
  max: number,
): number => Math.floor(nextRandom(state) * (max - min + 1)) + min

const randomLane = (state: GameState): Lane =>
  LANE_VALUES[randomIntInclusive(state, 0, LANE_VALUES.length - 1)]

const spawnTileContent = (state: GameState, tileIndex: number): void => {
  const tile = state.track.tiles[tileIndex]
  if (tileIndex < 6 || tile.requiredTurn !== null) {
    return
  }

  const obstacleChance = 0.56
  if (nextRandom(state) < obstacleChance) {
    const roll = nextRandom(state)
    const type = roll < 0.36 ? 'firewall' : roll < 0.72 ? 'sniffer' : 'congestion'
    const offset = 1.9 + nextRandom(state) * (tile.length - 3.1)

    state.obstacles.push({
      id: state.track.nextObstacleId,
      tileIndex,
      lane: randomLane(state),
      offset,
      type,
      resolved: false,
    })
    state.track.nextObstacleId += 1
  }

  const tokenChance = 0.74
  if (nextRandom(state) < tokenChance) {
    const lane = randomLane(state)
    const clusterCount = randomIntInclusive(state, 2, 5)
    const baseOffset = 1.1 + nextRandom(state) * (tile.length - 3.6)

    for (let index = 0; index < clusterCount; index += 1) {
      const offset = baseOffset + index * 1.08
      if (offset >= tile.length - 0.4) {
        break
      }

      state.tokens.push({
        id: state.track.nextTokenId,
        tileIndex,
        lane,
        offset,
        collected: false,
      })
      state.track.nextTokenId += 1
    }
  }
}

const appendTile = (state: GameState): void => {
  const tile: RunnerTile = {
    id: state.track.nextTileId,
    start: [...state.track.generationCursor],
    heading: state.track.generationHeading,
    length: RUNNER_BALANCE.tileLength,
    requiredTurn: null,
  }

  state.track.nextTileId += 1

  state.track.nextTurnIn -= 1
  if (state.track.nextTurnIn <= 0 && state.track.tiles.length > 6) {
    tile.requiredTurn = nextRandom(state) < 0.5 ? -1 : 1
    state.track.nextTurnIn = randomIntInclusive(
      state,
      RUNNER_BALANCE.minTurnInterval,
      RUNNER_BALANCE.maxTurnInterval,
    )
  }

  state.track.tiles.push(tile)
  const tileIndex = state.track.tiles.length - 1
  spawnTileContent(state, tileIndex)

  const forward = headingToForward(tile.heading)
  state.track.generationCursor = [
    tile.start[0] + forward[0] * tile.length,
    0,
    tile.start[2] + forward[2] * tile.length,
  ]

  if (tile.requiredTurn) {
    state.track.generationHeading = rotateHeading(tile.heading, tile.requiredTurn)
  }
}

export const bootstrapTrack = (state: GameState): void => {
  while (state.track.tiles.length < RUNNER_BALANCE.initialTiles) {
    appendTile(state)
  }
}

export const ensureTrackAhead = (state: GameState): void => {
  while (
    state.track.tiles.length - state.track.currentTileIndex <
    RUNNER_BALANCE.tilesAheadTarget
  ) {
    appendTile(state)
  }
}
