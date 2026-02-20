import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game/core/state'
import { computeScore, stepSimulation } from '../game/core/simulation'
import type { GameState } from '../shared/types'

const runForSeconds = (state: GameState, seconds: number) => {
  const dt = 1 / 60
  const steps = Math.ceil(seconds / dt)
  for (let step = 0; step < steps; step += 1) {
    stepSimulation(state, dt)
  }
}

describe('simulation abilities and hazards', () => {
  it('enforces ability cooldown lifecycle', () => {
    const state = createInitialGameState()

    state.commandQueue.push({ type: 'UseAbility', abilityId: 'encrypt' })
    stepSimulation(state, 1 / 60)

    expect(state.abilities.encrypt.activeRemaining).toBeGreaterThan(3.8)
    expect(state.abilities.encrypt.cooldownRemaining).toBeGreaterThan(13)

    runForSeconds(state, 4.5)
    expect(state.abilities.encrypt.activeRemaining).toBe(0)
    expect(state.abilities.encrypt.cooldownRemaining).toBeGreaterThan(0)

    state.commandQueue.push({ type: 'UseAbility', abilityId: 'encrypt' })
    stepSimulation(state, 1 / 60)
    expect(state.abilities.encrypt.activeRemaining).toBe(0)

    runForSeconds(state, 10)
    state.commandQueue.push({ type: 'UseAbility', abilityId: 'encrypt' })
    stepSimulation(state, 1 / 60)
    expect(state.abilities.encrypt.activeRemaining).toBeGreaterThan(3.8)
  })

  it('reduces firewall damage while encrypt is active', () => {
    const baseline = createInitialGameState()
    baseline.packet.currentNodeId = 'n_a'
    baseline.packet.traversal = {
      edgeId: 'e_a_b',
      fromNodeId: 'n_a',
      toNodeId: 'n_b',
      progress: 0.1,
    }

    const encrypted = createInitialGameState()
    encrypted.packet.currentNodeId = 'n_a'
    encrypted.packet.traversal = {
      edgeId: 'e_a_b',
      fromNodeId: 'n_a',
      toNodeId: 'n_b',
      progress: 0.1,
    }
    encrypted.abilities.encrypt.activeRemaining = 2
    encrypted.abilities.encrypt.cooldownRemaining = 8

    runForSeconds(baseline, 0.8)
    runForSeconds(encrypted, 0.8)

    const baselineDamage = 100 - baseline.packet.integrity
    const encryptedDamage = 100 - encrypted.packet.integrity

    expect(baselineDamage).toBeGreaterThan(5)
    expect(encryptedDamage).toBeLessThan(baselineDamage * 0.5)
  })

  it('updates destination and reroute stats during live run', () => {
    const state = createInitialGameState()

    state.commandQueue.push({ type: 'SetDestination', nodeId: 'n_c' })
    stepSimulation(state, 1 / 60)

    expect(state.routing.destinationNodeId).toBe('n_c')
    expect(state.run.rerouteCount).toBe(0)

    runForSeconds(state, 0.5)
    state.commandQueue.push({ type: 'SetDestination', nodeId: 'n_i' })
    stepSimulation(state, 1 / 60)

    expect(state.routing.destinationNodeId).toBe('n_i')
    expect(state.run.rerouteCount).toBe(1)
    expect(state.routing.routeNodeIds.length).toBeGreaterThan(0)
  })
})

describe('scoring', () => {
  it('is deterministic for identical run data', () => {
    const state = createInitialGameState()
    state.run.elapsedSeconds = 47.5
    state.run.latencyPenalty = 9.2
    state.run.rerouteCount = 0
    state.run.tookDamage = false
    state.world.collectedTokenNodeIds = ['n_f', 'n_i']
    state.packet.integrity = 78

    const scoreA = computeScore(state, true)
    const scoreB = computeScore(state, true)

    expect(scoreA).toEqual(scoreB)
    expect(scoreA.challenges.speedrun).toBe(true)
  })
})
