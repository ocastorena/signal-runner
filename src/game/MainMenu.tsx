type MainMenuProps = {
  onStart: () => void
}

export const MainMenu = ({ onStart }: MainMenuProps) => {
  return (
    <main className="main-menu">
      <div className="main-menu-grid" aria-hidden="true" />
      <section className="main-menu-card">
        <p className="main-menu-kicker">Neon Protocol</p>
        <h1 className="main-menu-title">Signal Runner</h1>
        <p className="main-menu-copy">
          Temple-run style packet escape through a live network.
        </p>
        <button type="button" className="start-button" onClick={onStart}>
          Start Run
        </button>
      </section>
    </main>
  )
}
