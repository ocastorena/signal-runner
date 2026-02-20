# Signal Runner

Signal Runner is a single-player browser game inspired by Temple Run, re-themed as a packet escaping through a hostile 3D network.

## Gameplay

- Continuous forward movement through a procedural network corridor
- 3-lane runner controls with forced turn junctions
- High-speed risk management with reactive movement

Core actions:

- Left / Right: lane shift or junction turn
- Up / Space: jump firewall gates
- Down: slide under sniffer beams

## Hazards and Rewards

Hazards:

- Firewall gates (jump)
- Sniffer beams (slide)
- Congestion blocks (lane avoid)

Rewards:

- Token pickups
- Distance survival scoring
- Turn execution bonuses

## Tech Stack

- React 19 + TypeScript + Vite
- Three.js + React Three Fiber + Drei
- Postprocessing FX (`@react-three/postprocessing`)
- Zustand + Immer for deterministic game-state updates
- Vitest for gameplay logic tests
- Playwright smoke test scaffold

## Scripts

- `npm run dev` - start development server
- `npm run lint` - run ESLint
- `npm run test` - run Vitest watch mode
- `npm run test:run` - run Vitest once
- `npm run typecheck` - run TypeScript checks
- `npm run build` - create production build
- `npm run preview` - preview production build
- `npm run e2e` - run Playwright smoke test

## Run Locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in terminal output.
