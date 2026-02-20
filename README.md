# Signal Runner

Signal Runner is a single-player browser game where you pilot a data packet through a hostile 3D network. You do not steer with WASD; you manage the route in real time.

## Core Gameplay

1. Click a node to set destination.
2. The packet moves automatically along the computed route.
3. Hazards activate (firewalls, sniffers, latency zones, congestion).
4. Reroute or pin safer links while using abilities.
5. Reach the target server with high integrity and low latency.

## Abilities

- `Encrypt (Q)`: temporary damage reduction and safer firewall traversal.
- `Decoy (W)`: lowers scanner pressure and detection gain.
- `Burst (E)`: short speed boost with higher detection risk.

## Hazards

- Firewalls: damage packet traversal unless mitigated.
- Sniffers: scan nearby space and increase detection.
- Latency links: slow movement and increase time penalty.
- Congestion links: dynamic cost growth over time.

## Scoring

Run score combines:

- Completion base score
- Time/latency performance
- Remaining packet integrity
- Collected tokens
- Challenge bonuses (`no damage`, `no reroutes`, `speedrun`)

## Tech Stack

- React 19 + TypeScript + Vite
- Three.js with React Three Fiber (`@react-three/fiber`, `@react-three/drei`)
- Postprocessing FX (`@react-three/postprocessing`)
- Zustand + Immer for simulation/state updates
- Vitest + Testing Library for unit/integration tests
- Playwright for browser smoke tests

## Project Scripts

- `npm run dev`: start local dev server
- `npm run lint`: run ESLint
- `npm run test`: run Vitest in watch mode
- `npm run test:run`: run Vitest once
- `npm run typecheck`: run TypeScript project checks
- `npm run build`: typecheck + production build
- `npm run preview`: preview production build
- `npm run e2e`: run Playwright smoke test

## Running Locally

```bash
npm install
npm run dev
```

Open the local Vite URL printed in the terminal.

## Current Status

Vertical-slice foundation is implemented:

- Playable Network 01 level
- Real-time routing + link pinning
- Hazards and ability cooldown systems
- HUD, scoring, run summary
- Deterministic simulation core with tests

## License

No license file is currently defined for this repository.
