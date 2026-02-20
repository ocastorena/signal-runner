import { RUNNER_BALANCE } from '@/shared/constants'
import { clamp, lerp } from '@/shared/math'
import type {
  GameCommand,
  GameState,
  Lane,
  ObstacleType,
  RunnerEventType,
  TurnDirection,
} from '@/shared/types'
import { ensureTrackAhead } from './generation'
import { getCurrentTile } from './selectors'

const pushEvent = (state: GameState, type: RunnerEventType): void => {
  state.events.push({
    id: state.nextEventId,
    at: state.timeSeconds,
    type,
  })
  state.nextEventId += 1

  if (state.events.length > RUNNER_BALANCE.eventBufferSize) {
    state.events.splice(0, state.events.length - RUNNER_BALANCE.eventBufferSize)
  }
}

const toLane = (value: number): Lane => {
  if (value <= -1) {
    return -1
  }
  if (value >= 1) {
    return 1
  }
  return 0
}

const failRun = (state: GameState, reason: string): void => {
  if (state.run.status !== 'running') {
    return
  }

  state.run.status = 'failed'
  state.run.failureReason = reason
  state.run.score = Math.floor(state.run.score)
  pushEvent(state, 'gameover')
}

const isTurnWindowOpen = (state: GameState): boolean => {
  const tile = getCurrentTile(state)
  if (!tile.requiredTurn) {
    return false
  }

  return state.track.distanceInTile >= tile.length - RUNNER_BALANCE.turnDecisionWindow
}

const queueTurn = (state: GameState, turn: TurnDirection): void => {
  state.track.queuedTurn = turn
}

const processCommand = (state: GameState, command: GameCommand): void => {
  switch (command.type) {
    case 'MoveLeft': {
      if (state.run.status !== 'running') {
        return
      }

      if (isTurnWindowOpen(state)) {
        queueTurn(state, -1)
        return
      }

      const nextLane = toLane(state.player.laneTarget - 1)
      if (nextLane !== state.player.laneTarget) {
        state.player.laneTarget = nextLane
        pushEvent(state, 'lane')
      }
      return
    }

    case 'MoveRight': {
      if (state.run.status !== 'running') {
        return
      }

      if (isTurnWindowOpen(state)) {
        queueTurn(state, 1)
        return
      }

      const nextLane = toLane(state.player.laneTarget + 1)
      if (nextLane !== state.player.laneTarget) {
        state.player.laneTarget = nextLane
        pushEvent(state, 'lane')
      }
      return
    }

    case 'Jump': {
      if (state.run.status !== 'running') {
        return
      }

      const grounded = state.player.height <= 0.01
      if (grounded && state.player.slideRemaining <= 0) {
        state.player.verticalVelocity = RUNNER_BALANCE.jumpVelocity
        pushEvent(state, 'jump')
      }
      return
    }

    case 'Slide': {
      if (state.run.status !== 'running') {
        return
      }

      const grounded = state.player.height <= 0.1
      if (grounded && state.player.slideRemaining <= 0) {
        state.player.slideRemaining = RUNNER_BALANCE.slideDuration
        pushEvent(state, 'slide')
      }
      return
    }

    case 'PauseRun': {
      if (state.run.status === 'running') {
        state.run.status = 'paused'
      }
      return
    }

    case 'ResumeRun': {
      if (state.run.status === 'paused') {
        state.run.status = 'running'
      }
      return
    }

    default:
      return
  }
}

const processCommands = (state: GameState): void => {
  const commands = [...state.commandQueue]
  state.commandQueue = []

  for (const command of commands) {
    processCommand(state, command)
  }
}

const tickPlayerMotion = (state: GameState, dt: number): void => {
  state.player.lanePosition = lerp(
    state.player.lanePosition,
    state.player.laneTarget,
    Math.min(1, dt * 12),
  )

  state.player.invulnerableRemaining = Math.max(
    0,
    state.player.invulnerableRemaining - dt,
  )
  state.player.slideRemaining = Math.max(0, state.player.slideRemaining - dt)

  state.player.verticalVelocity += RUNNER_BALANCE.gravity * dt
  state.player.height += state.player.verticalVelocity * dt

  if (state.player.height <= 0) {
    state.player.height = 0
    if (state.player.verticalVelocity < 0) {
      state.player.verticalVelocity = 0
    }
  }
}

const applyCollision = (state: GameState): void => {
  if (state.player.invulnerableRemaining > 0) {
    return
  }

  state.player.integrity = Math.max(0, state.player.integrity - 1)
  state.player.invulnerableRemaining = RUNNER_BALANCE.collisionInvulnerability
  state.run.collisions += 1
  pushEvent(state, 'collision')

  if (state.player.integrity <= 0) {
    failRun(state, 'Packet integrity collapsed under network pressure.')
  }
}

const canBypassObstacle = (state: GameState, type: ObstacleType): boolean => {
  if (type === 'firewall') {
    return state.player.height > RUNNER_BALANCE.firewallClearHeight
  }

  if (type === 'sniffer') {
    return state.player.slideRemaining > 0
  }

  return false
}

const resolveTokens = (state: GameState): void => {
  for (const token of state.tokens) {
    if (token.collected) {
      continue
    }

    if (token.tileIndex < state.track.currentTileIndex) {
      token.collected = true
      continue
    }

    if (token.tileIndex !== state.track.currentTileIndex) {
      continue
    }

    const laneAligned =
      Math.abs(state.player.lanePosition - token.lane) <= RUNNER_BALANCE.laneTolerance
    const distanceDelta = Math.abs(token.offset - state.track.distanceInTile)

    if (laneAligned && distanceDelta <= RUNNER_BALANCE.tokenPickupWindow) {
      token.collected = true
      state.run.tokens += 1
      state.run.score += RUNNER_BALANCE.tokenScore
      pushEvent(state, 'token')
    }
  }
}

const resolveObstacles = (state: GameState): void => {
  for (const obstacle of state.obstacles) {
    if (obstacle.resolved) {
      continue
    }

    if (obstacle.tileIndex < state.track.currentTileIndex) {
      obstacle.resolved = true
      continue
    }

    if (obstacle.tileIndex !== state.track.currentTileIndex) {
      continue
    }

    const laneAligned =
      Math.abs(state.player.lanePosition - obstacle.lane) <= RUNNER_BALANCE.laneTolerance
    if (!laneAligned) {
      continue
    }

    const distanceDelta = obstacle.offset - state.track.distanceInTile

    if (distanceDelta < -RUNNER_BALANCE.obstacleHitWindow) {
      obstacle.resolved = true
      continue
    }

    if (Math.abs(distanceDelta) <= RUNNER_BALANCE.obstacleHitWindow) {
      obstacle.resolved = true
      if (!canBypassObstacle(state, obstacle.type)) {
        applyCollision(state)
      }
    }
  }
}

const advanceTrack = (state: GameState, distance: number): void => {
  let remaining = distance

  while (remaining > 0 && state.run.status === 'running') {
    const tile = getCurrentTile(state)
    const distanceToBoundary = tile.length - state.track.distanceInTile

    if (remaining < distanceToBoundary) {
      state.track.distanceInTile += remaining
      remaining = 0
      continue
    }

    state.track.distanceInTile = tile.length
    remaining -= distanceToBoundary

    if (tile.requiredTurn) {
      if (state.track.queuedTurn !== tile.requiredTurn) {
        failRun(state, 'Missed the junction turn. Packet dropped into a dead route.')
        return
      }

      state.run.score += RUNNER_BALANCE.turnScore
      pushEvent(state, 'turn')
      state.track.queuedTurn = 0
    }

    state.track.currentTileIndex += 1
    state.track.distanceInTile = 0
    ensureTrackAhead(state)
  }
}

export const stepSimulation = (state: GameState, dtSeconds: number): void => {
  const dt = clamp(dtSeconds, 0, RUNNER_BALANCE.maxFrameSeconds)

  processCommands(state)

  if (state.run.status !== 'running') {
    state.track.decisionOpen = false
    return
  }

  state.timeSeconds += dt
  state.run.elapsedSeconds += dt

  tickPlayerMotion(state, dt)

  state.run.speed = Math.min(
    RUNNER_BALANCE.maxSpeed,
    RUNNER_BALANCE.baseSpeed + state.run.elapsedSeconds * RUNNER_BALANCE.speedAcceleration,
  )
  state.run.topSpeed = Math.max(state.run.topSpeed, state.run.speed)

  const distanceStep = state.run.speed * dt
  state.run.distance += distanceStep
  state.run.score += distanceStep * RUNNER_BALANCE.distanceScoreRate

  advanceTrack(state, distanceStep)

  if (state.run.status !== 'running') {
    state.track.decisionOpen = false
    return
  }

  state.track.decisionOpen = isTurnWindowOpen(state)

  resolveTokens(state)
  resolveObstacles(state)

  state.run.score = Math.max(0, state.run.score)
}
