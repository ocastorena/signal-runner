export type NodeType = 'start' | 'checkpoint' | 'goal' | 'normal'

export type EdgeTag = 'firewall' | 'latency' | 'congestion'

export type AbilityId = 'encrypt' | 'decoy' | 'burst'

export type GameStatus = 'running' | 'paused' | 'success' | 'failed'

export type GameEventType =
  | 'damage'
  | 'ability'
  | 'reroute'
  | 'pin'
  | 'token'
  | 'success'
  | 'failure'

export type Vector3Tuple = readonly [number, number, number]

export interface LevelNode {
  id: string
  label: string
  position: Vector3Tuple
  type: NodeType
}

export interface LevelEdge {
  id: string
  from: string
  to: string
  baseCost: number
  tags: EdgeTag[]
}

export interface SnifferHazard {
  id: string
  nodeId: string
  radius: number
  sweepSpeed: number
  phaseOffset: number
}

export interface VisualTheme {
  background: string
  fog: string
  nodeGlow: string
  route: string
}

export interface LevelDefinition {
  id: string
  name: string
  nodes: LevelNode[]
  edges: LevelEdge[]
  sniffers: SnifferHazard[]
  collectibleNodeIds: string[]
  requiredCheckpointIds: string[]
  startNodeId: string
  goalNodeId: string
  speedrunTargetSeconds: number
  theme: VisualTheme
}

export interface PacketTraversal {
  edgeId: string
  fromNodeId: string
  toNodeId: string
  progress: number
}

export interface PacketState {
  currentNodeId: string
  traversal: PacketTraversal | null
  integrity: number
}

export interface RoutingState {
  destinationNodeId: string | null
  routeNodeIds: string[]
  routeEdgeIds: string[]
  pinnedEdgeIds: string[]
}

export interface WorldState {
  congestionByEdgeId: Record<string, number>
  detectionLevel: number
  pursuersActive: boolean
  visitedCheckpointIds: string[]
  collectedTokenNodeIds: string[]
}

export interface AbilityRuntime {
  cooldownRemaining: number
  activeRemaining: number
}

export type AbilityState = Record<AbilityId, AbilityRuntime>

export interface RunState {
  status: GameStatus
  elapsedSeconds: number
  latencyPenalty: number
  rerouteCount: number
  destinationSetCount: number
  tookDamage: boolean
  nextNetworkUnlocked: boolean
  score: ScoreBreakdown | null
}

export interface ScoreBreakdown {
  base: number
  time: number
  integrity: number
  tokens: number
  challenge: number
  total: number
  challenges: {
    noDamage: boolean
    noReroutes: boolean
    speedrun: boolean
  }
}

export interface GameEvent {
  id: number
  at: number
  type: GameEventType
  abilityId?: AbilityId
}

export interface GameState {
  level: LevelDefinition
  packet: PacketState
  routing: RoutingState
  world: WorldState
  abilities: AbilityState
  run: RunState
  timeSeconds: number
  events: GameEvent[]
  nextEventId: number
  commandQueue: GameCommand[]
}

export type GameCommand =
  | {
      type: 'SetDestination'
      nodeId: string
    }
  | {
      type: 'TogglePin'
      edgeId: string
    }
  | {
      type: 'UseAbility'
      abilityId: AbilityId
    }
  | {
      type: 'PauseRun'
    }
  | {
      type: 'ResumeRun'
    }
