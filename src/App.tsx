import { Suspense, lazy, useState } from "react"
import "./App.css"
import { MainMenu } from "@/game/MainMenu"

const GameView = lazy(async () => {
  const module = await import("@/game/GameView")
  return { default: module.GameView }
})

type Screen = "menu" | "game"

const App = () => {
  const [screen, setScreen] = useState<Screen>("menu")

  if (screen === "menu") {
    return <MainMenu onStart={() => setScreen("game")} />
  }

  return (
    <Suspense
      fallback={<div className="app-loading">Loading Signal Runner...</div>}>
      <GameView />
    </Suspense>
  )
}

export default App
