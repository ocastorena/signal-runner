import type { AbilityId, GameState, LevelNode, Vector3Tuple } from '../../shared/types'
import { mixVec3 } from '../../shared/math'

export const getNodeById = (
  state: GameState,
  nodeId: string,
): LevelNode | undefined => state.level.nodes.find((node) => node.id === nodeId)

export const getEdgeById = (state: GameState, edgeId: string) =>
  state.level.edges.find((edge) => edge.id === edgeId)

export const getPacketWorldPosition = (state: GameState): Vector3Tuple => {
  const traversal = state.packet.traversal
  if (!traversal) {
    return getNodeById(state, state.packet.currentNodeId)?.position ?? [0, 0, 0]
  }

  const fromPosition = getNodeById(state, traversal.fromNodeId)?.position
  const toPosition = getNodeById(state, traversal.toNodeId)?.position

  if (!fromPosition || !toPosition) {
    return [0, 0, 0]
  }

  return mixVec3(fromPosition, toPosition, traversal.progress)
}

export const getCurrentObjectiveNodeId = (state: GameState): string => {
  const outstandingCheckpointId = state.level.requiredCheckpointIds.find(
    (checkpointId) => !state.world.visitedCheckpointIds.includes(checkpointId),
  )

  return outstandingCheckpointId ?? state.level.goalNodeId
}

export const hasAllRequiredCheckpoints = (state: GameState): boolean =>
  state.level.requiredCheckpointIds.every((checkpointId) =>
    state.world.visitedCheckpointIds.includes(checkpointId),
  )

export const getRoutePolyline = (state: GameState): Vector3Tuple[] => {
  if (state.routing.routeNodeIds.length < 2 && !state.packet.traversal) {
    return []
  }

  const points: Vector3Tuple[] = []

  if (state.packet.traversal) {
    points.push(getPacketWorldPosition(state))

    const toNode = getNodeById(state, state.packet.traversal.toNodeId)
    if (toNode) {
      points.push(toNode.position)
    }

    for (let index = 1; index < state.routing.routeNodeIds.length; index += 1) {
      const node = getNodeById(state, state.routing.routeNodeIds[index])
      if (node) {
        points.push(node.position)
      }
    }

    return points
  }

  for (const nodeId of state.routing.routeNodeIds) {
    const node = getNodeById(state, nodeId)
    if (node) {
      points.push(node.position)
    }
  }

  return points
}

export const isAbilityReady = (state: GameState, abilityId: AbilityId): boolean =>
  state.abilities[abilityId].cooldownRemaining <= 0

export const isAbilityActive = (state: GameState, abilityId: AbilityId): boolean =>
  state.abilities[abilityId].activeRemaining > 0
