export type Vector3Tuple = [number, number, number]

export type Heading = 0 | 1 | 2 | 3

export type Lane = -1 | 0 | 1

export type TurnDirection = -1 | 1

export type RunnerStatus = 'running' | 'paused' | 'failed'

export type ObstacleType = 'firewall' | 'sniffer' | 'congestion'

export type RunnerEventType =
  | 'token'
  | 'collision'
  | 'jump'
  | 'slide'
  | 'turn'
  | 'lane'
  | 'gameover'

export interface RunnerTile {
  id: number
  start: Vector3Tuple
  heading: Heading
  length: number
  requiredTurn: TurnDirection | null
}

export interface RunnerObstacle {
  id: number
  tileIndex: number
  lane: Lane
  offset: number
  type: ObstacleType
  resolved: boolean
}

export interface RunnerToken {
  id: number
  tileIndex: number
  lane: Lane
  offset: number
  collected: boolean
}

export interface PlayerState {
  laneTarget: Lane
  lanePosition: number
  height: number
  verticalVelocity: number
  slideRemaining: number
  integrity: number
  invulnerableRemaining: number
}

export interface TrackState {
  tiles: RunnerTile[]
  currentTileIndex: number
  distanceInTile: number
  queuedTurn: TurnDirection | 0
  decisionOpen: boolean
  seed: number
  nextTileId: number
  nextObstacleId: number
  nextTokenId: number
  nextTurnIn: number
  generationCursor: Vector3Tuple
  generationHeading: Heading
}

export interface RunState {
  status: RunnerStatus
  elapsedSeconds: number
  distance: number
  speed: number
  score: number
  tokens: number
  collisions: number
  topSpeed: number
  failureReason: string | null
}

export interface RunnerEvent {
  id: number
  at: number
  type: RunnerEventType
}

export interface GameState {
  player: PlayerState
  track: TrackState
  obstacles: RunnerObstacle[]
  tokens: RunnerToken[]
  run: RunState
  timeSeconds: number
  events: RunnerEvent[]
  nextEventId: number
  commandQueue: GameCommand[]
}

export type GameCommand =
  | {
      type: 'MoveLeft'
    }
  | {
      type: 'MoveRight'
    }
  | {
      type: 'Jump'
    }
  | {
      type: 'Slide'
    }
  | {
      type: 'PauseRun'
    }
  | {
      type: 'ResumeRun'
    }
