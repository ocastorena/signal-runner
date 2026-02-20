import { network01 } from '../levels/network01'
import { GAME_BALANCE } from '../../shared/constants'
import type {
  AbilityState,
  GameState,
  LevelDefinition,
  RoutingState,
  RunState,
  WorldState,
} from '../../shared/types'

const makeInitialAbilities = (): AbilityState => ({
  encrypt: { cooldownRemaining: 0, activeRemaining: 0 },
  decoy: { cooldownRemaining: 0, activeRemaining: 0 },
  burst: { cooldownRemaining: 0, activeRemaining: 0 },
})

const makeInitialRouting = (level: LevelDefinition): RoutingState => ({
  destinationNodeId: null,
  routeNodeIds: [level.startNodeId],
  routeEdgeIds: [],
  pinnedEdgeIds: [],
})

const makeInitialWorld = (level: LevelDefinition): WorldState => {
  const congestionByEdgeId: Record<string, number> = {}

  for (const edge of level.edges) {
    if (edge.tags.includes('congestion')) {
      congestionByEdgeId[edge.id] = 0
    }
  }

  return {
    congestionByEdgeId,
    detectionLevel: 0,
    pursuersActive: false,
    visitedCheckpointIds: [],
    collectedTokenNodeIds: [],
  }
}

const makeInitialRun = (): RunState => ({
  status: 'running',
  elapsedSeconds: 0,
  latencyPenalty: 0,
  rerouteCount: 0,
  destinationSetCount: 0,
  tookDamage: false,
  nextNetworkUnlocked: false,
  score: null,
})

export const createInitialGameState = (
  level: LevelDefinition = network01,
): GameState => ({
  level,
  packet: {
    currentNodeId: level.startNodeId,
    traversal: null,
    integrity: GAME_BALANCE.maxIntegrity,
  },
  routing: makeInitialRouting(level),
  world: makeInitialWorld(level),
  abilities: makeInitialAbilities(),
  run: makeInitialRun(),
  timeSeconds: 0,
  events: [],
  nextEventId: 1,
  commandQueue: [],
})
