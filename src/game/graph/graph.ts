import type { LevelDefinition, LevelEdge, LevelNode } from '../../shared/types'

export const makeNodeMap = (level: LevelDefinition): Map<string, LevelNode> =>
  new Map(level.nodes.map((node) => [node.id, node]))

export const makeEdgeMap = (level: LevelDefinition): Map<string, LevelEdge> =>
  new Map(level.edges.map((edge) => [edge.id, edge]))

export const getEdgeBetween = (
  level: LevelDefinition,
  a: string,
  b: string,
): LevelEdge | undefined =>
  level.edges.find(
    (edge) =>
      (edge.from === a && edge.to === b) || (edge.from === b && edge.to === a),
  )

export interface AdjacentEdge {
  edge: LevelEdge
  nextNodeId: string
}

export const getAdjacentEdges = (
  level: LevelDefinition,
  nodeId: string,
): AdjacentEdge[] => {
  const output: AdjacentEdge[] = []
  for (const edge of level.edges) {
    if (edge.from === nodeId) {
      output.push({ edge, nextNodeId: edge.to })
      continue
    }
    if (edge.to === nodeId) {
      output.push({ edge, nextNodeId: edge.from })
    }
  }
  return output
}
