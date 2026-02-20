import { ABILITY_DEFS, ABILITY_KEYS, GAME_BALANCE } from '../shared/constants'
import type { AbilityId } from '../shared/types'
import { useGameStore } from '../game/core/store'
import { getCurrentObjectiveNodeId, getNodeById } from '../game/core/selectors'

interface AbilityButtonProps {
  abilityId: AbilityId
}

const AbilityButton = ({ abilityId }: AbilityButtonProps) => {
  const game = useGameStore((store) => store.game)
  const activateAbility = useGameStore((store) => store.useAbility)

  const runtime = game.abilities[abilityId]
  const cooldownRatio =
    runtime.cooldownRemaining > 0
      ? runtime.cooldownRemaining / ABILITY_DEFS[abilityId].cooldown
      : 0

  const active = runtime.activeRemaining > 0
  const disabled = game.run.status !== 'running' || runtime.cooldownRemaining > 0

  return (
    <button
      className={`ability-button ${active ? 'active' : ''}`}
      disabled={disabled}
      onClick={() => activateAbility(abilityId)}
      type="button"
    >
      <div className="ability-title-row">
        <span className="ability-name">{ABILITY_DEFS[abilityId].label}</span>
        <span className="ability-key">{ABILITY_KEYS[abilityId]}</span>
      </div>
      <span className="ability-description">{ABILITY_DEFS[abilityId].description}</span>
      {cooldownRatio > 0 ? (
        <div className="cooldown-overlay" style={{ transform: `scaleX(${cooldownRatio})` }} />
      ) : null}
      {runtime.cooldownRemaining > 0 ? (
        <span className="cooldown-time">{runtime.cooldownRemaining.toFixed(1)}s</span>
      ) : null}
    </button>
  )
}

const RunSummary = () => {
  const game = useGameStore((store) => store.game)
  const resetRun = useGameStore((store) => store.resetRun)

  if (game.run.status !== 'success' && game.run.status !== 'failed') {
    return null
  }

  const score = game.run.score

  return (
    <div className="run-summary-backdrop">
      <section className="run-summary-card">
        <h2>{game.run.status === 'success' ? 'Route Completed' : 'Packet Dropped'}</h2>
        {score ? (
          <>
            <p className="summary-total">Score {score.total}</p>
            <ul>
              <li>Base: {score.base}</li>
              <li>Time: {score.time}</li>
              <li>Integrity: {score.integrity}</li>
              <li>Tokens: {score.tokens}</li>
              <li>Challenges: {score.challenge}</li>
            </ul>
            <div className="summary-challenges">
              <span className={score.challenges.noDamage ? 'challenge-ok' : ''}>No Damage</span>
              <span className={score.challenges.noReroutes ? 'challenge-ok' : ''}>No Reroutes</span>
              <span className={score.challenges.speedrun ? 'challenge-ok' : ''}>Speedrun</span>
            </div>
          </>
        ) : null}

        {game.run.nextNetworkUnlocked ? (
          <p className="unlock-line">Network 02 Unlocked (placeholder)</p>
        ) : null}

        <button type="button" className="restart-button" onClick={resetRun}>
          Retry Network 01
        </button>
      </section>
    </div>
  )
}

export const GameHud = () => {
  const game = useGameStore((store) => store.game)
  const pauseRun = useGameStore((store) => store.pauseRun)
  const resumeRun = useGameStore((store) => store.resumeRun)

  const objectiveNodeId = getCurrentObjectiveNodeId(game)
  const objectiveNode = getNodeById(game, objectiveNodeId)

  const integrityPercent = (game.packet.integrity / GAME_BALANCE.maxIntegrity) * 100
  const detectionPercent = Math.min(100, (game.world.detectionLevel / 1.5) * 100)
  const checkpointTotal = game.level.requiredCheckpointIds.length

  return (
    <>
      <aside className="hud-panel hud-top-left">
        <h1>Signal Runner</h1>
        <p className="status-line">Network 01 | {game.level.name}</p>
        <p className="objective-line">
          Objective: {objectiveNode ? objectiveNode.label : 'Unknown'}
        </p>
        <p className="objective-subline">
          {objectiveNode?.type === 'goal'
            ? 'Reach target server'
            : 'Route through required checkpoints'}
        </p>

        <div className="meter-wrap">
          <div className="meter-label-row">
            <span>Integrity</span>
            <span>{Math.round(game.packet.integrity)}%</span>
          </div>
          <div className="meter">
            <div className="meter-fill integrity" style={{ width: `${integrityPercent}%` }} />
          </div>
        </div>

        <div className="meter-wrap">
          <div className="meter-label-row">
            <span>Detection</span>
            <span>{Math.round(detectionPercent)}%</span>
          </div>
          <div className="meter">
            <div className="meter-fill detection" style={{ width: `${detectionPercent}%` }} />
          </div>
        </div>

        <div className="stats-grid">
          <span>Time</span>
          <span>{game.run.elapsedSeconds.toFixed(1)}s</span>
          <span>Latency Penalty</span>
          <span>{game.run.latencyPenalty.toFixed(1)}</span>
          <span>Checkpoints</span>
          <span>
            {game.world.visitedCheckpointIds.length}/{checkpointTotal}
          </span>
          <span>Tokens</span>
          <span>
            {game.world.collectedTokenNodeIds.length}/{game.level.collectibleNodeIds.length}
          </span>
          <span>Reroutes</span>
          <span>{game.run.rerouteCount}</span>
        </div>
      </aside>

      <aside className="hud-panel hud-top-right">
        <h2>Controls</h2>
        <ul>
          <li>Click node: set destination</li>
          <li>Click link: pin/unpin preferred route</li>
          <li>Q/W/E: trigger abilities</li>
          <li>Space: pause or resume</li>
        </ul>

        <button
          type="button"
          className="pause-button"
          onClick={game.run.status === 'paused' ? resumeRun : pauseRun}
        >
          {game.run.status === 'paused' ? 'Resume Run' : 'Pause Run'}
        </button>
      </aside>

      <section className="ability-tray">
        <AbilityButton abilityId="encrypt" />
        <AbilityButton abilityId="decoy" />
        <AbilityButton abilityId="burst" />
      </section>

      <RunSummary />
    </>
  )
}
