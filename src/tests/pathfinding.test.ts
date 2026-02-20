import { describe, expect, it } from 'vitest'
import { network01 } from '../game/levels/network01'
import { computeTraversalCost, findRoute } from '../game/graph/pathfinding'

describe('pathfinding', () => {
  it('increases traversal cost for congested links', () => {
    const edge = network01.edges.find((candidate) => candidate.id === 'e_c_d')
    expect(edge).toBeDefined()

    const baseCost = computeTraversalCost(edge!, {
      pinnedEdgeIds: new Set(),
      congestionByEdgeId: { e_c_d: 0 },
    })
    const inflatedCost = computeTraversalCost(edge!, {
      pinnedEdgeIds: new Set(),
      congestionByEdgeId: { e_c_d: 2.2 },
    })

    expect(inflatedCost).toBeGreaterThan(baseCost)
  })

  it('prefers pinned links when they are toggled on', () => {
    const withoutPin = findRoute(network01, 'n_start', 'n_goal', {
      pinnedEdgeIds: new Set(),
      congestionByEdgeId: {},
    })

    const withPin = findRoute(network01, 'n_start', 'n_goal', {
      pinnedEdgeIds: new Set(['e_a_e', 'e_e_f', 'e_f_j', 'e_j_k', 'e_k_goal']),
      congestionByEdgeId: {},
    })

    expect(withoutPin).not.toBeNull()
    expect(withPin).not.toBeNull()
    expect(withPin?.edgeIds).toContain('e_a_e')
    expect(withPin?.totalCost).toBeLessThan(withoutPin?.totalCost ?? Number.POSITIVE_INFINITY)
  })
})
