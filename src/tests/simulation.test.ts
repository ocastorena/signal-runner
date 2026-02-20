import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game/core/state'
import { stepSimulation } from '../game/core/simulation'
import type { GameState } from '../shared/types'

const stepForSeconds = (state: GameState, seconds: number) => {
  const dt = 1 / 60
  const steps = Math.ceil(seconds / dt)
  for (let index = 0; index < steps; index += 1) {
    stepSimulation(state, dt)
  }
}

describe('runner controls', () => {
  it('moves between lanes with left/right commands', () => {
    const state = createInitialGameState()

    state.commandQueue.push({ type: 'MoveRight' })
    stepSimulation(state, 1 / 60)
    expect(state.player.laneTarget).toBe(1)

    state.commandQueue.push({ type: 'MoveLeft' })
    stepSimulation(state, 1 / 60)
    expect(state.player.laneTarget).toBe(0)
  })

  it('handles jump arc and returns to ground', () => {
    const state = createInitialGameState()

    state.commandQueue.push({ type: 'Jump' })
    stepSimulation(state, 1 / 60)
    expect(state.player.height).toBeGreaterThan(0)

    stepForSeconds(state, 1.2)
    expect(state.player.height).toBe(0)
    expect(state.player.verticalVelocity).toBe(0)
  })

  it('fails when required turn is missed', () => {
    const state = createInitialGameState()

    state.track.tiles = [
      {
        id: 0,
        start: [0, 0, 0],
        heading: 0,
        length: 2,
        requiredTurn: 1,
      },
      {
        id: 1,
        start: [0, 0, 2],
        heading: 1,
        length: 2,
        requiredTurn: null,
      },
    ]
    state.track.currentTileIndex = 0
    state.track.distanceInTile = 1.92
    state.run.speed = 10

    stepSimulation(state, 0.1)

    expect(state.run.status).toBe('failed')
    expect(state.run.failureReason).toContain('Missed the junction turn')
  })

  it('survives a required turn when queued in time', () => {
    const state = createInitialGameState()

    state.track.tiles = [
      {
        id: 0,
        start: [0, 0, 0],
        heading: 0,
        length: 2,
        requiredTurn: -1,
      },
      {
        id: 1,
        start: [0, 0, 2],
        heading: 3,
        length: 2,
        requiredTurn: null,
      },
    ]
    state.track.currentTileIndex = 0
    state.track.distanceInTile = 1.92
    state.run.speed = 10

    state.commandQueue.push({ type: 'MoveLeft' })
    stepSimulation(state, 0.1)

    expect(state.run.status).toBe('running')
    expect(state.track.currentTileIndex).toBe(1)
  })
})

describe('runner interactions', () => {
  it('collects tokens and adds score', () => {
    const state = createInitialGameState()

    state.tokens = [
      {
        id: 1,
        tileIndex: state.track.currentTileIndex,
        lane: 0,
        offset: state.track.distanceInTile + 0.08,
        collected: false,
      },
    ]

    const scoreBefore = state.run.score
    stepSimulation(state, 1 / 60)

    expect(state.run.tokens).toBe(1)
    expect(state.run.score).toBeGreaterThan(scoreBefore)
  })

  it('reduces integrity when hitting congestion obstacle', () => {
    const state = createInitialGameState()

    state.obstacles = [
      {
        id: 1,
        tileIndex: state.track.currentTileIndex,
        lane: 0,
        offset: state.track.distanceInTile + 0.06,
        type: 'congestion',
        resolved: false,
      },
    ]

    stepSimulation(state, 1 / 60)

    expect(state.player.integrity).toBe(2)
    expect(state.run.collisions).toBe(1)
  })
})
