import { useEffect, useState } from "react"

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`
}

const IntegrityDots = ({ count }: { count: number }) => {
  const dots = [0, 1, 2]

  return (
    <div className="integrity-dots">
      {dots.map((dot) => (
        <span key={dot} className={dot < count ? "dot active" : "dot"} />
      ))}
    </div>
  )
}

export const GameView = () => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) {
      return
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((previous) => previous + 1)
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [paused])

  const score = elapsedSeconds * 42
  const distance = elapsedSeconds * 9
  const speed = (9 + elapsedSeconds * 0.1).toFixed(1)
  const tokens = Math.floor(elapsedSeconds / 3)

  return (
    <div className="app-shell">
      <div className="canvas-shell">
        <div className="mock-stage">
          <div className="mock-stage-grid" />
          <div className="mock-stage-horizon" />
          <div className="mock-stage-runner" />
        </div>
      </div>

      <aside className="hud-panel hud-top-left">
        <h1>Signal Runner</h1>
        <p className="status-line">Neon route sync active. Keep the packet in lane.</p>
        <div className="stats-grid">
          <span>Score</span>
          <span>{score}</span>
          <span>Distance</span>
          <span>{distance}m</span>
          <span>Speed</span>
          <span>{speed}</span>
          <span>Tokens</span>
          <span>{tokens}</span>
          <span>Integrity</span>
          <span>
            <IntegrityDots count={3} />
          </span>
          <span>Uptime</span>
          <span>{formatTime(elapsedSeconds)}</span>
        </div>
      </aside>

      <aside className="hud-panel hud-top-right">
        <h2>Controls</h2>
        <ul>
          <li>A / Left Arrow: move left</li>
          <li>D / Right Arrow: move right</li>
          <li>W / Up / Space: jump</li>
          <li>S / Down: slide</li>
          <li>P / Esc: pause</li>
        </ul>

        <button
          type="button"
          className="pause-button"
          onClick={() => setPaused((previous) => !previous)}
        >
          {paused ? "Resume" : "Pause"}
        </button>
      </aside>

      {paused ? <div className="turn-prompt">Paused</div> : null}
    </div>
  )
}
