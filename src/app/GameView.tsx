import { useEffect } from 'react'
import { useGameStore } from '../game/core/store'
import { GameCanvas } from '../rendering/GameCanvas'
import { GameHud } from '../ui/GameHud'
import { useAudioDirector } from '../audio/useAudioDirector'

export const GameView = () => {
  const runStatus = useGameStore((store) => store.game.run.status)
  const triggerAbility = useGameStore((store) => store.useAbility)
  const pauseRun = useGameStore((store) => store.pauseRun)
  const resumeRun = useGameStore((store) => store.resumeRun)

  useAudioDirector()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 'q') {
        triggerAbility('encrypt')
      }
      if (key === 'w') {
        triggerAbility('decoy')
      }
      if (key === 'e') {
        triggerAbility('burst')
      }
      if (key === ' ') {
        event.preventDefault()
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
  }, [pauseRun, resumeRun, runStatus, triggerAbility])

  return (
    <div className="app-shell">
      <div className="canvas-shell">
        <GameCanvas />
      </div>
      <GameHud />
    </div>
  )
}
