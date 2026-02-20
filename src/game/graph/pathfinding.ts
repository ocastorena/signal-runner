import { GAME_BALANCE } from '../../shared/constants'
import type { LevelDefinition, LevelEdge } from '../../shared/types'
import { getAdjacentEdges } from './graph'

export interface RouteResult {
  nodeIds: string[]
  edgeIds: string[]
  totalCost: number
}

interface RouteOptions {
  pinnedEdgeIds: Set<string>
  congestionByEdgeId: Record<string, number>
}

export const computeTraversalCost = (
  edge: LevelEdge,
  options: RouteOptions,
): number => {
  let cost = edge.baseCost

  if (edge.tags.includes('firewall')) {
    cost += GAME_BALANCE.firewallCostPenalty
  }
  if (edge.tags.includes('latency')) {
    cost += GAME_BALANCE.latencyCostPenalty
  }
  if (edge.tags.includes('congestion')) {
    const congestion = options.congestionByEdgeId[edge.id] ?? 0
    cost *= 1 + congestion * GAME_BALANCE.congestionCostWeight
  }
  if (options.pinnedEdgeIds.has(edge.id)) {
    cost *= GAME_BALANCE.pinCostMultiplier
  }

  return Math.max(0.05, cost)
}

export const findRoute = (
  level: LevelDefinition,
  startNodeId: string,
  destinationNodeId: string,
  options: RouteOptions,
): RouteResult | null => {
  if (startNodeId === destinationNodeId) {
    return {
      nodeIds: [startNodeId],
      edgeIds: [],
      totalCost: 0,
    }
  }

  const nodeIds = level.nodes.map((node) => node.id)
  const unvisited = new Set(nodeIds)
  const distances = new Map(nodeIds.map((nodeId) => [nodeId, Number.POSITIVE_INFINITY]))
  const previousNode = new Map<string, string>()
  const previousEdge = new Map<string, string>()

  distances.set(startNodeId, 0)

  while (unvisited.size > 0) {
    let currentNodeId: string | null = null
    let currentDistance = Number.POSITIVE_INFINITY

    for (const nodeId of unvisited) {
      const candidateDistance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY
      if (candidateDistance < currentDistance) {
        currentDistance = candidateDistance
        currentNodeId = nodeId
      }
    }

    if (currentNodeId === null || currentDistance === Number.POSITIVE_INFINITY) {
      break
    }

    unvisited.delete(currentNodeId)

    if (currentNodeId === destinationNodeId) {
      break
    }

    for (const { edge, nextNodeId } of getAdjacentEdges(level, currentNodeId)) {
      if (!unvisited.has(nextNodeId)) {
        continue
      }

      const pathCost = computeTraversalCost(edge, options)
      const candidateDistance = currentDistance + pathCost

      if (candidateDistance < (distances.get(nextNodeId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(nextNodeId, candidateDistance)
        previousNode.set(nextNodeId, currentNodeId)
        previousEdge.set(nextNodeId, edge.id)
      }
    }
  }

  if (!previousNode.has(destinationNodeId)) {
    return null
  }

  const pathNodeIds: string[] = [destinationNodeId]
  const pathEdgeIds: string[] = []

  let cursor = destinationNodeId
  while (cursor !== startNodeId) {
    const parentNodeId = previousNode.get(cursor)
    const edgeId = previousEdge.get(cursor)

    if (!parentNodeId || !edgeId) {
      return null
    }

    pathNodeIds.push(parentNodeId)
    pathEdgeIds.push(edgeId)
    cursor = parentNodeId
  }

  pathNodeIds.reverse()
  pathEdgeIds.reverse()

  return {
    nodeIds: pathNodeIds,
    edgeIds: pathEdgeIds,
    totalCost: distances.get(destinationNodeId) ?? Number.POSITIVE_INFINITY,
  }
}
