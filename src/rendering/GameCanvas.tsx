import { useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, PerspectiveCamera, Sparkles, Trail } from '@react-three/drei'
import { Bloom, ChromaticAberration, EffectComposer, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2, Vector3 } from 'three'
import { GameLoop } from '../game/core/GameLoop'
import { headingToForward, headingToRight } from '../game/core/generation'
import {
  getCurrentTile,
  getPlayerWorldPosition,
  getVisibleObstacles,
  getVisibleTiles,
  getVisibleTokens,
  isSliding,
} from '../game/core/selectors'
import { useGameStore } from '../game/core/store'
import { RUNNER_BALANCE } from '../shared/constants'
import type { Heading, RunnerObstacle, RunnerTile, RunnerToken, Vector3Tuple } from '../shared/types'

const headingToYaw = (heading: Heading): number => {
  switch (heading) {
    case 0:
      return 0
    case 1:
      return -Math.PI / 2
    case 2:
      return Math.PI
    case 3:
      return Math.PI / 2
    default:
      return 0
  }
}

const getTileCenter = (tile: RunnerTile): Vector3Tuple => {
  const forward = headingToForward(tile.heading)
  return [
    tile.start[0] + forward[0] * (tile.length / 2),
    0,
    tile.start[2] + forward[2] * (tile.length / 2),
  ]
}

const getLanePosition = (
  tile: RunnerTile,
  lane: number,
  offset: number,
  height: number,
): Vector3Tuple => {
  const forward = headingToForward(tile.heading)
  const right = headingToRight(tile.heading)

  return [
    tile.start[0] + forward[0] * offset + right[0] * lane * RUNNER_BALANCE.laneWidth,
    height,
    tile.start[2] + forward[2] * offset + right[2] * lane * RUNNER_BALANCE.laneWidth,
  ]
}

const TileMesh = ({ tile }: { tile: RunnerTile }) => {
  const center = getTileCenter(tile)
  const right = headingToRight(tile.heading)
  const yaw = headingToYaw(tile.heading)

  const turnBeaconPosition = tile.requiredTurn
    ? getLanePosition(
        tile,
        tile.requiredTurn,
        tile.length - 1.1,
        0.8,
      )
    : null

  return (
    <group>
      <mesh position={center} rotation={[0, yaw, 0]}>
        <boxGeometry args={[RUNNER_BALANCE.trackWidth, 0.12, tile.length]} />
        <meshStandardMaterial
          color="#12253b"
          emissive="#1f4b75"
          emissiveIntensity={0.42}
          roughness={0.4}
          metalness={0.25}
        />
      </mesh>

      <Line
        points={[
          getLanePosition(tile, -1, 0.3, 0.09),
          getLanePosition(tile, -1, tile.length - 0.3, 0.09),
        ]}
        color="#275c88"
        lineWidth={1}
      />
      <Line
        points={[
          getLanePosition(tile, 1, 0.3, 0.09),
          getLanePosition(tile, 1, tile.length - 0.3, 0.09),
        ]}
        color="#275c88"
        lineWidth={1}
      />

      {turnBeaconPosition ? (
        <mesh position={turnBeaconPosition} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.45, 20]} />
          <meshBasicMaterial color="#9cf8ff" transparent opacity={0.85} />
        </mesh>
      ) : null}

      <mesh
        position={[
          center[0] + right[0] * (RUNNER_BALANCE.trackWidth / 2 + 0.9),
          1.15,
          center[2] + right[2] * (RUNNER_BALANCE.trackWidth / 2 + 0.9),
        ]}
        rotation={[0, yaw, 0]}
      >
        <boxGeometry args={[0.55, 2.3 + ((tile.id * 0.7) % 2.2), tile.length * 0.9]} />
        <meshStandardMaterial color="#0d1b2c" emissive="#153049" emissiveIntensity={0.2} />
      </mesh>
      <mesh
        position={[
          center[0] - right[0] * (RUNNER_BALANCE.trackWidth / 2 + 0.9),
          1.15,
          center[2] - right[2] * (RUNNER_BALANCE.trackWidth / 2 + 0.9),
        ]}
        rotation={[0, yaw, 0]}
      >
        <boxGeometry args={[0.55, 2.3 + ((tile.id * 1.13) % 2.2), tile.length * 0.9]} />
        <meshStandardMaterial color="#0d1b2c" emissive="#153049" emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}

const ObstacleMesh = ({
  obstacle,
  tile,
}: {
  obstacle: RunnerObstacle
  tile: RunnerTile
}) => {
  const position = getLanePosition(tile, obstacle.lane, obstacle.offset, 0.45)
  const yaw = headingToYaw(tile.heading)

  if (obstacle.type === 'firewall') {
    return (
      <mesh position={position} rotation={[0, yaw, 0]}>
        <boxGeometry args={[1.2, 0.9, 0.55]} />
        <meshStandardMaterial
          color="#ff8a57"
          emissive="#ff8a57"
          emissiveIntensity={0.6}
          roughness={0.45}
        />
      </mesh>
    )
  }

  if (obstacle.type === 'sniffer') {
    return (
      <group position={position} rotation={[0, yaw, 0]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[1.2, 0.13, 0.4]} />
          <meshStandardMaterial color="#76f4ff" emissive="#76f4ff" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-0.58, 0.2, 0]}>
          <boxGeometry args={[0.1, 0.52, 0.1]} />
          <meshStandardMaterial color="#2f6a8e" emissive="#3e90b6" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[0.58, 0.2, 0]}>
          <boxGeometry args={[0.1, 0.52, 0.1]} />
          <meshStandardMaterial color="#2f6a8e" emissive="#3e90b6" emissiveIntensity={0.2} />
        </mesh>
      </group>
    )
  }

  return (
    <mesh position={[position[0], 0.88, position[2]]} rotation={[0, yaw, 0]}>
      <boxGeometry args={[1.08, 1.75, 0.8]} />
      <meshStandardMaterial
        color="#ff4f68"
        emissive="#ff4f68"
        emissiveIntensity={0.48}
        roughness={0.4}
      />
    </mesh>
  )
}

const TokenMesh = ({ token, tile }: { token: RunnerToken; tile: RunnerTile }) => {
  const position = getLanePosition(tile, token.lane, token.offset, 0.9)
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.22, 0.05, 12, 20]} />
      <meshStandardMaterial color="#ffe26f" emissive="#ffe26f" emissiveIntensity={0.8} />
    </mesh>
  )
}

const PacketMesh = ({ position }: { position: Vector3Tuple }) => {
  const sliding = useGameStore((store) => isSliding(store.game))

  return (
    <Trail width={1} length={8} color="#86f2ff" attenuation={(value) => value * value}>
      <group position={position} scale={sliding ? [1.2, 0.55, 1.2] : [1, 1, 1]}>
        <mesh>
          <icosahedronGeometry args={[0.34, 1]} />
          <meshStandardMaterial
            color="#9af6ff"
            emissive="#9af6ff"
            emissiveIntensity={1.35}
            roughness={0.2}
            metalness={0.25}
          />
        </mesh>
      </group>
    </Trail>
  )
}

const Background = () => {
  const pulseLines = useMemo(
    () => Array.from({ length: 24 }, (_unused, index) => -160 + index * 14),
    [],
  )

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]}>
        <planeGeometry args={[520, 520]} />
        <meshStandardMaterial color="#060d19" emissive="#070d1b" roughness={0.95} />
      </mesh>

      {pulseLines.map((lineX) => (
        <mesh key={lineX} position={[lineX, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 520]} />
          <meshBasicMaterial color="#0f2740" transparent opacity={0.28} />
        </mesh>
      ))}
    </group>
  )
}

const CameraRig = () => {
  const game = useGameStore((store) => store.game)
  const { camera } = useThree()
  const tempVector = useMemo(() => new Vector3(), [])

  useFrame((_state, delta) => {
    const playerPosition = getPlayerWorldPosition(game)
    const tile = getCurrentTile(game)
    const forward = headingToForward(tile.heading)
    const right = headingToRight(tile.heading)

    const desiredPosition: Vector3Tuple = [
      playerPosition[0] - forward[0] * 7 + right[0] * game.player.lanePosition * 0.35,
      playerPosition[1] + 3.1,
      playerPosition[2] - forward[2] * 7 + right[2] * game.player.lanePosition * 0.35,
    ]

    const target: Vector3Tuple = [
      playerPosition[0] + forward[0] * 1.5,
      playerPosition[1] + 0.7,
      playerPosition[2] + forward[2] * 1.5,
    ]

    camera.position.lerp(tempVector.set(...desiredPosition), 1 - Math.exp(-delta * 7))
    camera.lookAt(...target)
  })

  return null
}

const SceneContent = () => {
  const game = useGameStore((store) => store.game)

  const visibleTiles = getVisibleTiles(game, 2, 32)
  const visibleObstacles = getVisibleObstacles(game, 1, 26)
  const visibleTokens = getVisibleTokens(game, 0, 24)
  const packetPosition = getPlayerWorldPosition(game)

  return (
    <>
      <color attach="background" args={['#050a14']} />
      <fog attach="fog" args={['#081423', 16, 92]} />

      <ambientLight intensity={0.48} />
      <directionalLight position={[4, 12, 6]} intensity={1.2} color="#91cfff" />
      <pointLight position={[-9, 5, -6]} intensity={1.15} color="#58e7ff" />

      <Background />

      {visibleTiles.map((tile) => (
        <TileMesh key={tile.id} tile={tile} />
      ))}

      {visibleObstacles.map((obstacle) => {
        const tile = game.track.tiles[obstacle.tileIndex]
        if (!tile) {
          return null
        }
        return <ObstacleMesh key={obstacle.id} obstacle={obstacle} tile={tile} />
      })}

      {visibleTokens.map((token) => {
        const tile = game.track.tiles[token.tileIndex]
        if (!tile) {
          return null
        }
        return <TokenMesh key={token.id} token={token} tile={tile} />
      })}

      <PacketMesh position={packetPosition} />

      <Sparkles
        count={180}
        speed={0.17}
        size={2.1}
        color="#84deff"
        position={[0, 5, 0]}
        scale={[160, 12, 160]}
      />

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.82} luminanceThreshold={0.24} luminanceSmoothing={0.32} mipmapBlur />
        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new Vector2(0.0005, 0.0005)} />
        <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>

      <CameraRig />
      <GameLoop />
    </>
  )
}

export const GameCanvas = () => (
  <Canvas dpr={[1, 2]} shadows gl={{ antialias: true }}>
    <PerspectiveCamera makeDefault position={[0, 4, -8]} fov={62} />
    <SceneContent />
  </Canvas>
)
