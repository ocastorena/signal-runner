import { useEffect, useRef } from 'react'
import { useGameStore } from '../game/core/store'
import { GameCanvas } from '../rendering/GameCanvas'
import { GameHud } from '../ui/GameHud'
import { useAudioDirector } from '../audio/useAudioDirector'

export const GameView = () => {
  const runStatus = useGameStore((store) => store.game.run.status)
  const moveLeft = useGameStore((store) => store.moveLeft)
  const moveRight = useGameStore((store) => store.moveRight)
  const jump = useGameStore((store) => store.jump)
  const slide = useGameStore((store) => store.slide)
  const pauseRun = useGameStore((store) => store.pauseRun)
  const resumeRun = useGameStore((store) => store.resumeRun)

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)

  useAudioDirector()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 'arrowleft' || key === 'a') {
        moveLeft()
        return
      }

      if (key === 'arrowright' || key === 'd') {
        moveRight()
        return
      }

      if (key === 'arrowup' || key === 'w' || key === ' ') {
        event.preventDefault()
        jump()
        return
      }

      if (key === 'arrowdown' || key === 's') {
        slide()
        return
      }

      if (key === 'p' || key === 'escape') {
        if (runStatus === 'paused') {
          resumeRun()
        } else if (runStatus === 'running') {
          pauseRun()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [jump, moveLeft, moveRight, pauseRun, resumeRun, runStatus, slide])

  return (
    <div
      className="app-shell"
      onPointerDown={(event) => {
        pointerStartRef.current = {
          x: event.clientX,
          y: event.clientY,
        }
      }}
      onPointerUp={(event) => {
        const start = pointerStartRef.current
        pointerStartRef.current = null
        if (!start) {
          return
        }

        const dx = event.clientX - start.x
        const dy = event.clientY - start.y

        if (Math.abs(dx) < 32 && Math.abs(dy) < 32) {
          return
        }

        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) {
            moveLeft()
          } else {
            moveRight()
          }
          return
        }

        if (dy < 0) {
          jump()
        } else {
          slide()
        }
      }}
    >
      <div className="canvas-shell">
        <GameCanvas />
      </div>
      <GameHud />
    </div>
  )
}
