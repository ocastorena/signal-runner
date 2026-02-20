import { ABILITY_DEFS, GAME_BALANCE } from '../../shared/constants'
import { clamp, distance3 } from '../../shared/math'
import type { AbilityId, GameCommand, GameState, ScoreBreakdown } from '../../shared/types'
import { findRoute } from '../graph/pathfinding'
import {
  getEdgeById,
  getNodeById,
  getPacketWorldPosition,
  hasAllRequiredCheckpoints,
  isAbilityActive,
} from './selectors'

const pushEvent = (
  state: GameState,
  type: 'ability' | 'reroute' | 'pin' | 'token' | 'success' | 'failure',
  abilityId?: AbilityId,
): void => {
  state.events.push({
    id: state.nextEventId,
    at: state.timeSeconds,
    type,
    abilityId,
  })
  state.nextEventId += 1

  if (state.events.length > GAME_BALANCE.eventBufferSize) {
    state.events.splice(0, state.events.length - GAME_BALANCE.eventBufferSize)
  }
}

export const computeScore = (
  state: Pick<GameState, 'run' | 'world' | 'packet' | 'level'>,
  completed: boolean,
): ScoreBreakdown => {
  const noDamage = !state.run.tookDamage
  const noReroutes = state.run.rerouteCount === 0
  const speedrun = completed && state.run.elapsedSeconds <= state.level.speedrunTargetSeconds

  const base = completed
    ? GAME_BALANCE.baseCompletionScore
    : Math.round(GAME_BALANCE.baseCompletionScore * 0.25)

  const timePenalty = state.run.elapsedSeconds * 18 + state.run.latencyPenalty * 30
  const time = Math.max(0, Math.round(GAME_BALANCE.baseTimeScoreBudget - timePenalty))
  const integrity = Math.max(0, Math.round(state.packet.integrity * 12))
  const tokens = state.world.collectedTokenNodeIds.length * GAME_BALANCE.tokenScore

  let challenge = 0
  if (noDamage) {
    challenge += GAME_BALANCE.noDamageBonus
  }
  if (noReroutes) {
    challenge += GAME_BALANCE.noRerouteBonus
  }
  if (speedrun) {
    challenge += GAME_BALANCE.speedrunBonus
  }

  const total = Math.max(0, base + time + integrity + tokens + challenge)

  return {
    base,
    time,
    integrity,
    tokens,
    challenge,
    total,
    challenges: {
      noDamage,
      noReroutes,
      speedrun,
    },
  }
}

const applyDamage = (state: GameState, amount: number): void => {
  if (state.run.status !== 'running' || amount <= 0) {
    return
  }

  const mitigated = isAbilityActive(state, 'encrypt')
    ? amount * GAME_BALANCE.encryptDamageMultiplier
    : amount

  if (mitigated > 0) {
    state.run.tookDamage = true
    state.packet.integrity = clamp(
      state.packet.integrity - mitigated,
      0,
      GAME_BALANCE.maxIntegrity,
    )
  }

  if (state.packet.integrity <= 0 && state.run.status === 'running') {
    state.run.status = 'failed'
    state.run.score = computeScore(state, false)
    pushEvent(state, 'failure')
  }
}

const resolveRouteAnchorNodeId = (state: GameState): string =>
  state.packet.traversal ? state.packet.traversal.toNodeId : state.packet.currentNodeId

const recalculateRoute = (state: GameState): void => {
  if (!state.routing.destinationNodeId) {
    state.routing.routeNodeIds = [resolveRouteAnchorNodeId(state)]
    state.routing.routeEdgeIds = []
    return
  }

  const anchorNodeId = resolveRouteAnchorNodeId(state)
  const result = findRoute(state.level, anchorNodeId, state.routing.destinationNodeId, {
    pinnedEdgeIds: new Set(state.routing.pinnedEdgeIds),
    congestionByEdgeId: state.world.congestionByEdgeId,
  })

  if (!result) {
    state.routing.routeNodeIds = [anchorNodeId]
    state.routing.routeEdgeIds = []
    return
  }

  state.routing.routeNodeIds = result.nodeIds
  state.routing.routeEdgeIds = result.edgeIds
}

const beginNextTraversal = (state: GameState): void => {
  if (state.run.status !== 'running' || state.packet.traversal) {
    return
  }

  if (state.routing.routeNodeIds.length < 2 || state.routing.routeEdgeIds.length < 1) {
    return
  }

  const fromNodeId = state.routing.routeNodeIds[0]
  const toNodeId = state.routing.routeNodeIds[1]
  const edgeId = state.routing.routeEdgeIds[0]

  if (state.packet.currentNodeId !== fromNodeId) {
    return
  }

  state.packet.traversal = {
    edgeId,
    fromNodeId,
    toNodeId,
    progress: 0,
  }

  state.routing.routeNodeIds = state.routing.routeNodeIds.slice(1)
  state.routing.routeEdgeIds = state.routing.routeEdgeIds.slice(1)
}

const activateAbility = (state: GameState, abilityId: AbilityId): void => {
  const runtime = state.abilities[abilityId]

  if (runtime.cooldownRemaining > 0 || state.run.status !== 'running') {
    return
  }

  runtime.cooldownRemaining = ABILITY_DEFS[abilityId].cooldown
  runtime.activeRemaining = ABILITY_DEFS[abilityId].duration
  pushEvent(state, 'ability', abilityId)
}

const processCommand = (state: GameState, command: GameCommand): void => {
  switch (command.type) {
    case 'SetDestination': {
      const nodeExists = Boolean(getNodeById(state, command.nodeId))
      if (!nodeExists || state.run.status === 'failed' || state.run.status === 'success') {
        return
      }

      const previousDestinationId = state.routing.destinationNodeId
      if (previousDestinationId && previousDestinationId !== command.nodeId) {
        state.run.rerouteCount += 1
        pushEvent(state, 'reroute')
      }

      if (previousDestinationId !== command.nodeId) {
        state.run.destinationSetCount += 1
      }

      state.routing.destinationNodeId = command.nodeId
      recalculateRoute(state)
      beginNextTraversal(state)
      return
    }

    case 'TogglePin': {
      if (state.run.status === 'failed' || state.run.status === 'success') {
        return
      }

      const edgeIndex = state.routing.pinnedEdgeIds.indexOf(command.edgeId)
      if (edgeIndex >= 0) {
        state.routing.pinnedEdgeIds.splice(edgeIndex, 1)
      } else {
        state.routing.pinnedEdgeIds.push(command.edgeId)
      }

      pushEvent(state, 'pin')
      recalculateRoute(state)
      beginNextTraversal(state)
      return
    }

    case 'UseAbility': {
      activateAbility(state, command.abilityId)
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

const tickAbilityTimers = (state: GameState, dt: number): void => {
  for (const key of Object.keys(state.abilities) as AbilityId[]) {
    const ability = state.abilities[key]
    ability.cooldownRemaining = Math.max(0, ability.cooldownRemaining - dt)
    ability.activeRemaining = Math.max(0, ability.activeRemaining - dt)
  }
}

const tickCongestion = (state: GameState, dt: number): void => {
  for (const edge of state.level.edges) {
    if (!edge.tags.includes('congestion')) {
      continue
    }

    const current = state.world.congestionByEdgeId[edge.id] ?? 0
    const movingOnThisEdge = state.packet.traversal?.edgeId === edge.id

    const next = clamp(
      current +
        GAME_BALANCE.congestionGlobalGrowthPerSecond * dt +
        (movingOnThisEdge ? GAME_BALANCE.congestionTravelGrowthPerSecond * dt : 0) -
        GAME_BALANCE.congestionDecayPerSecond * dt,
      0,
      2.4,
    )

    state.world.congestionByEdgeId[edge.id] = next
  }
}

const updateDetection = (state: GameState, dt: number): void => {
  const packetPosition = getPacketWorldPosition(state)

  state.world.detectionLevel = Math.max(
    0,
    state.world.detectionLevel - GAME_BALANCE.detectionDecayPerSecond * dt,
  )

  for (const sniffer of state.level.sniffers) {
    const snifferNode = getNodeById(state, sniffer.nodeId)
    if (!snifferNode) {
      continue
    }

    const distance = distance3(packetPosition, snifferNode.position)
    if (distance > sniffer.radius) {
      continue
    }

    const phase = state.timeSeconds * sniffer.sweepSpeed + sniffer.phaseOffset
    const activity = (Math.sin(phase) + 1) / 2
    if (activity < 0.45) {
      continue
    }

    let gain = GAME_BALANCE.detectionGainPerSecond * activity
    if (isAbilityActive(state, 'decoy')) {
      gain *= GAME_BALANCE.decoyDetectionMultiplier
    }
    if (isAbilityActive(state, 'burst')) {
      gain *= GAME_BALANCE.burstDetectionMultiplier
    }

    const distanceFactor = clamp(1 - distance / sniffer.radius, 0.2, 1)
    state.world.detectionLevel = clamp(
      state.world.detectionLevel + gain * distanceFactor * dt,
      0,
      1.5,
    )
  }

  state.world.pursuersActive = state.world.detectionLevel >= GAME_BALANCE.pursuerThreshold

  if (state.world.pursuersActive) {
    applyDamage(
      state,
      GAME_BALANCE.pursuerDamagePerSecond * state.world.detectionLevel * dt,
    )
  }
}

const handleArrival = (state: GameState, nodeId: string): void => {
  const node = getNodeById(state, nodeId)
  if (!node) {
    return
  }

  if (
    node.type === 'checkpoint' &&
    !state.world.visitedCheckpointIds.includes(nodeId)
  ) {
    state.world.visitedCheckpointIds.push(nodeId)
  }

  if (
    state.level.collectibleNodeIds.includes(nodeId) &&
    !state.world.collectedTokenNodeIds.includes(nodeId)
  ) {
    state.world.collectedTokenNodeIds.push(nodeId)
    pushEvent(state, 'token')
  }

  if (nodeId === state.routing.destinationNodeId && state.routing.routeEdgeIds.length === 0) {
    state.routing.destinationNodeId = null
  }

  if (nodeId === state.level.goalNodeId && hasAllRequiredCheckpoints(state)) {
    state.run.status = 'success'
    state.run.nextNetworkUnlocked = true
    state.run.score = computeScore(state, true)
    pushEvent(state, 'success')
    return
  }

  // Keep path fresh after checkpoints alter objective urgency.
  if (state.routing.destinationNodeId) {
    recalculateRoute(state)
  }
}

const tickTraversal = (state: GameState, dt: number): void => {
  const traversal = state.packet.traversal
  if (!traversal) {
    return
  }

  const edge = getEdgeById(state, traversal.edgeId)
  if (!edge) {
    state.packet.traversal = null
    return
  }

  let speedMultiplier = 1
  if (isAbilityActive(state, 'burst')) {
    speedMultiplier *= GAME_BALANCE.burstSpeedMultiplier
  }
  if (edge.tags.includes('latency')) {
    speedMultiplier *= GAME_BALANCE.latencySpeedMultiplier
    state.run.latencyPenalty += dt * 2.4
  }
  if (edge.tags.includes('congestion')) {
    const congestion = state.world.congestionByEdgeId[edge.id] ?? 0
    speedMultiplier *= 1 / (1 + congestion * GAME_BALANCE.congestionTravelSlowdown)
    state.run.latencyPenalty += dt * (1 + congestion * 1.3)
  }

  if (edge.tags.includes('firewall') && !isAbilityActive(state, 'encrypt')) {
    applyDamage(state, GAME_BALANCE.firewallDamagePerSecond * dt)
  }

  const traversalDuration = Math.max(0.05, edge.baseCost / Math.max(0.2, speedMultiplier))
  traversal.progress += dt / traversalDuration

  if (traversal.progress < 1) {
    return
  }

  state.packet.currentNodeId = traversal.toNodeId
  state.packet.traversal = null

  handleArrival(state, traversal.toNodeId)
  beginNextTraversal(state)
}

export const stepSimulation = (state: GameState, dtSeconds: number): void => {
  const dt = clamp(dtSeconds, 0, GAME_BALANCE.maxFrameSeconds)

  processCommands(state)

  if (state.run.status === 'running') {
    state.timeSeconds += dt
    state.run.elapsedSeconds += dt

    tickAbilityTimers(state, dt)
    tickCongestion(state, dt)
    tickTraversal(state, dt)
    beginNextTraversal(state)
    updateDetection(state, dt)
  }

  if (state.run.status === 'failed') {
    state.routing.destinationNodeId = null
    state.routing.routeNodeIds = [state.packet.currentNodeId]
    state.routing.routeEdgeIds = []
  }
}
