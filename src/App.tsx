import { Suspense, lazy } from 'react'
import './App.css'
const GameView = lazy(async () => {
  const module = await import('@/game/GameView')
  return { default: module.GameView }
})

const App = () => (
  <Suspense fallback={<div className="app-loading">Loading Signal Runner...</div>}>
    <GameView />
  </Suspense>
)

export default App
