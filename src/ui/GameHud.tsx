import { useGameStore } from '../game/core/store'
import { getTurnPrompt } from '../game/core/selectors'

const IntegrityDots = ({ count }: { count: number }) => {
  const dots = [0, 1, 2]

  return (
    <div className="integrity-dots">
      {dots.map((dot) => (
        <span key={dot} className={dot < count ? 'dot active' : 'dot'} />
      ))}
    </div>
  )
}

const SummaryOverlay = () => {
  const game = useGameStore((store) => store.game)
  const resetRun = useGameStore((store) => store.resetRun)

  if (game.run.status !== 'failed') {
    return null
  }

  return (
    <div className="run-summary-backdrop">
      <section className="run-summary-card">
        <h2>Packet Lost</h2>
        <p className="summary-reason">
          {game.run.failureReason ?? 'The network collapsed around your route.'}
        </p>
        <p className="summary-total">Score {Math.floor(game.run.score)}</p>
        <ul>
          <li>Distance: {Math.floor(game.run.distance)}m</li>
          <li>Tokens: {game.run.tokens}</li>
          <li>Top Speed: {game.run.topSpeed.toFixed(1)}</li>
          <li>Collisions: {game.run.collisions}</li>
        </ul>
        <button type="button" className="restart-button" onClick={resetRun}>
          Run Again
        </button>
      </section>
    </div>
  )
}

export const GameHud = () => {
  const game = useGameStore((store) => store.game)
  const pauseRun = useGameStore((store) => store.pauseRun)
  const resumeRun = useGameStore((store) => store.resumeRun)

  const turnPrompt = getTurnPrompt(game)

  return (
    <>
      <aside className="hud-panel hud-top-left">
        <h1>Signal Runner</h1>
        <p className="status-line">Temple-run style packet escape through a live network.</p>

        <div className="stats-grid">
          <span>Score</span>
          <span>{Math.floor(game.run.score)}</span>
          <span>Distance</span>
          <span>{Math.floor(game.run.distance)}m</span>
          <span>Speed</span>
          <span>{game.run.speed.toFixed(1)}</span>
          <span>Tokens</span>
          <span>{game.run.tokens}</span>
          <span>Integrity</span>
          <span>
            <IntegrityDots count={game.player.integrity} />
          </span>
        </div>
      </aside>

      <aside className="hud-panel hud-top-right">
        <h2>Controls</h2>
        <ul>
          <li>Left / Right: lane change or turn at junction</li>
          <li>Up / Space: jump over firewall gates</li>
          <li>Down: slide under sniffer beams</li>
          <li>P or Esc: pause/resume</li>
          <li>Touch: swipe controls supported</li>
        </ul>

        <button
          type="button"
          className="pause-button"
          onClick={game.run.status === 'paused' ? resumeRun : pauseRun}
        >
          {game.run.status === 'paused' ? 'Resume' : 'Pause'}
        </button>
      </aside>

      {turnPrompt ? <div className="turn-prompt">{turnPrompt}</div> : null}

      <SummaryOverlay />
    </>
  )
}
