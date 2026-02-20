import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  Html,
  Line,
  OrbitControls,
  PerspectiveCamera,
  Sparkles,
  Trail,
} from '@react-three/drei'
import { Bloom, ChromaticAberration, EffectComposer, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2, Quaternion, Vector3 } from 'three'
import { GameLoop } from '../game/core/GameLoop'
import { useGameStore } from '../game/core/store'
import {
  getCurrentObjectiveNodeId,
  getNodeById,
  getPacketWorldPosition,
  getRoutePolyline,
  hasAllRequiredCheckpoints,
  isAbilityActive,
} from '../game/core/selectors'
import type { LevelEdge, LevelNode, Vector3Tuple } from '../shared/types'

const EDGE_COLORS = {
  normal: '#3d7af5',
  firewall: '#ff6f4d',
  latency: '#ffcc62',
  congestion: '#ff4a5f',
  route: '#78f5ff',
  pinned: '#75ffb2',
}

const NODE_COLORS: Record<LevelNode['type'], string> = {
  start: '#52d9ff',
  checkpoint: '#ffd87f',
  goal: '#ff6ba4',
  normal: '#64a3ff',
}

interface EdgeMeshProps {
  edge: LevelEdge
  fromPosition: Vector3Tuple
  toPosition: Vector3Tuple
  timeSeconds: number
  congestionValue: number
  isPinned: boolean
  isRoute: boolean
  onTogglePin: (edgeId: string) => void
}

const EdgeMesh = ({
  edge,
  fromPosition,
  toPosition,
  timeSeconds,
  congestionValue,
  isPinned,
  isRoute,
  onTogglePin,
}: EdgeMeshProps) => {
  const { midpoint, quaternion, length } = useMemo(() => {
    const from = new Vector3(...fromPosition)
    const to = new Vector3(...toPosition)
    const direction = to.clone().sub(from)
    const midpointValue = from.clone().add(to).multiplyScalar(0.5)
    const base = new Vector3(0, 1, 0)
    const normalizedDirection = direction.clone().normalize()

    return {
      midpoint: midpointValue,
      quaternion: new Quaternion().setFromUnitVectors(base, normalizedDirection),
      length: direction.length(),
    }
  }, [fromPosition, toPosition])

  const taggedColor = edge.tags.includes('firewall')
    ? EDGE_COLORS.firewall
    : edge.tags.includes('latency')
      ? EDGE_COLORS.latency
      : edge.tags.includes('congestion')
        ? EDGE_COLORS.congestion
        : EDGE_COLORS.normal

  const color = isPinned
    ? EDGE_COLORS.pinned
    : isRoute
      ? EDGE_COLORS.route
      : taggedColor

  const pulse = 0.35 + Math.sin(timeSeconds * 2.6 + length) * 0.16 + congestionValue * 0.22

  return (
    <mesh
      position={midpoint}
      quaternion={quaternion}
      onClick={(event) => {
        event.stopPropagation()
        onTogglePin(edge.id)
      }}
    >
      <cylinderGeometry args={[0.07, 0.07, Math.max(length, 0.001), 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={Math.max(0.15, pulse)}
        roughness={0.35}
        metalness={0.25}
      />
    </mesh>
  )
}

interface NodeMeshProps {
  node: LevelNode
  isDestination: boolean
  isObjective: boolean
  hasToken: boolean
  tokenCollected: boolean
  checkpointVisited: boolean
  onSelectDestination: (nodeId: string) => void
}

const NodeMesh = ({
  node,
  isDestination,
  isObjective,
  hasToken,
  tokenCollected,
  checkpointVisited,
  onSelectDestination,
}: NodeMeshProps) => {
  const baseColor = checkpointVisited ? '#68ffa8' : NODE_COLORS[node.type]
  const emissive = isDestination ? '#c9ffff' : baseColor

  return (
    <group position={node.position}>
      <mesh
        onClick={(event) => {
          event.stopPropagation()
          onSelectDestination(node.id)
        }}
      >
        <icosahedronGeometry args={[isDestination ? 0.48 : 0.4, 0]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissive}
          emissiveIntensity={isDestination ? 1.2 : 0.55}
          roughness={0.45}
          metalness={0.2}
        />
      </mesh>

      {isObjective ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.56, 0.68, 24]} />
          <meshBasicMaterial color="#c0fbff" transparent opacity={0.7} />
        </mesh>
      ) : null}

      {hasToken && !tokenCollected ? (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.42, 0]}>
          <torusGeometry args={[0.2, 0.045, 10, 20]} />
          <meshStandardMaterial color="#ffee7d" emissive="#ffee7d" emissiveIntensity={0.8} />
        </mesh>
      ) : null}

      {isDestination ? (
        <Html distanceFactor={14} position={[0, 0.9, 0]}>
          <span className="node-label">DEST</span>
        </Html>
      ) : null}
    </group>
  )
}

interface SnifferProps {
  position: Vector3Tuple
  radius: number
  sweepSpeed: number
  phaseOffset: number
  timeSeconds: number
}

const Sniffer = ({
  position,
  radius,
  sweepSpeed,
  phaseOffset,
  timeSeconds,
}: SnifferProps) => {
  const activity = (Math.sin(timeSeconds * sweepSpeed + phaseOffset) + 1) / 2
  const scale = 0.75 + activity * 0.4

  return (
    <group position={[position[0], 0.02, position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale, scale]}>
        <ringGeometry args={[radius * 0.65, radius, 40]} />
        <meshBasicMaterial
          color={activity > 0.5 ? '#6cf3ff' : '#2b5b71'}
          transparent
          opacity={0.33 + activity * 0.25}
        />
      </mesh>
      <mesh rotation={[0, timeSeconds * sweepSpeed, 0]}>
        <coneGeometry args={[radius * 0.36, 1.5, 16, 1, true]} />
        <meshBasicMaterial
          color="#9bf7ff"
          transparent
          opacity={0.09 + activity * 0.1}
          side={2}
        />
      </mesh>
    </group>
  )
}

const Packet = ({ position }: { position: Vector3Tuple }) => {
  const encryptActive = useGameStore((store) => isAbilityActive(store.game, 'encrypt'))

  return (
    <Trail width={1.1} length={8} color="#7bf0ff" attenuation={(t) => t * t}>
      <group position={position}>
        <mesh>
          <icosahedronGeometry args={[0.24, 1]} />
          <meshStandardMaterial
            color="#8af5ff"
            emissive="#8af5ff"
            emissiveIntensity={1.35}
            roughness={0.25}
            metalness={0.2}
          />
        </mesh>

        {encryptActive ? (
          <mesh>
            <sphereGeometry args={[0.36, 18, 18]} />
            <meshBasicMaterial color="#afffff" wireframe transparent opacity={0.6} />
          </mesh>
        ) : null}
      </group>
    </Trail>
  )
}

const CityBackdrop = () => {
  const blockTransforms = useMemo(
    () =>
      Array.from({ length: 74 }, (_value, index) => {
        const x = ((index * 2.47) % 30) - 15
        const z = ((Math.floor(index * 1.7) * 2.31) % 28) - 14
        const height = 0.5 + ((index * 1.37) % 4)
        const width = 0.26 + ((index * 0.47) % 0.6)
        return { x, z, height, width }
      }),
    [],
  )

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <planeGeometry args={[42, 42]} />
        <meshStandardMaterial color="#091322" emissive="#050b14" roughness={0.92} />
      </mesh>

      {blockTransforms.map((block, index) => (
        <mesh key={`${block.x}-${block.z}-${index}`} position={[block.x, block.height / 2 - 0.06, block.z]}>
          <boxGeometry args={[block.width, block.height, block.width]} />
          <meshStandardMaterial
            color="#12253a"
            emissive="#163145"
            emissiveIntensity={0.16}
            roughness={0.88}
          />
        </mesh>
      ))}
    </group>
  )
}

const SceneContent = () => {
  const game = useGameStore((store) => store.game)
  const setDestination = useGameStore((store) => store.setDestination)
  const togglePin = useGameStore((store) => store.togglePin)

  const nodeMap = useMemo(
    () => new Map(game.level.nodes.map((node) => [node.id, node])),
    [game.level.nodes],
  )

  const packetPosition = getPacketWorldPosition(game)
  const routePoints = getRoutePolyline(game)
  const objectiveNodeId = getCurrentObjectiveNodeId(game)
  const allCheckpointsVisited = hasAllRequiredCheckpoints(game)

  const routeEdges = useMemo(() => {
    const edges = new Set(game.routing.routeEdgeIds)
    if (game.packet.traversal) {
      edges.add(game.packet.traversal.edgeId)
    }
    return edges
  }, [game.packet.traversal, game.routing.routeEdgeIds])

  const pinnedEdges = useMemo(
    () => new Set(game.routing.pinnedEdgeIds),
    [game.routing.pinnedEdgeIds],
  )

  return (
    <>
      <color attach="background" args={[game.level.theme.background]} />
      <fog attach="fog" args={[game.level.theme.fog, 15, 44]} />

      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 12, 6]} intensity={1.15} color="#89c8ff" />
      <pointLight position={[-8, 4, -4]} intensity={1.2} color="#4de8ff" />

      <CityBackdrop />

      {game.level.edges.map((edge) => {
        const fromNode = nodeMap.get(edge.from)
        const toNode = nodeMap.get(edge.to)
        if (!fromNode || !toNode) {
          return null
        }

        return (
          <EdgeMesh
            key={edge.id}
            edge={edge}
            fromPosition={fromNode.position}
            toPosition={toNode.position}
            timeSeconds={game.timeSeconds}
            congestionValue={game.world.congestionByEdgeId[edge.id] ?? 0}
            isPinned={pinnedEdges.has(edge.id)}
            isRoute={routeEdges.has(edge.id)}
            onTogglePin={togglePin}
          />
        )
      })}

      {routePoints.length >= 2 ? (
        <Line points={routePoints} color={game.level.theme.route} lineWidth={2.8} transparent opacity={0.9} />
      ) : null}

      {game.level.nodes.map((node) => (
        <NodeMesh
          key={node.id}
          node={node}
          isDestination={node.id === game.routing.destinationNodeId}
          isObjective={node.id === objectiveNodeId}
          hasToken={game.level.collectibleNodeIds.includes(node.id)}
          tokenCollected={game.world.collectedTokenNodeIds.includes(node.id)}
          checkpointVisited={game.world.visitedCheckpointIds.includes(node.id)}
          onSelectDestination={setDestination}
        />
      ))}

      {game.level.sniffers.map((sniffer) => {
        const node = getNodeById(game, sniffer.nodeId)
        if (!node) {
          return null
        }

        return (
          <Sniffer
            key={sniffer.id}
            position={node.position}
            radius={sniffer.radius}
            sweepSpeed={sniffer.sweepSpeed}
            phaseOffset={sniffer.phaseOffset}
            timeSeconds={game.timeSeconds}
          />
        )
      })}

      <Packet position={packetPosition} />

      <Sparkles
        count={130}
        speed={0.12}
        size={1.8}
        color={allCheckpointsVisited ? '#ffe6f2' : '#8de7ff'}
        position={[0, 5, 0]}
        scale={[34, 10, 34]}
      />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.78}
          luminanceThreshold={0.18}
          luminanceSmoothing={0.32}
          mipmapBlur
        />
        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new Vector2(0.00045, 0.00045)} />
        <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>

      <GameLoop />
    </>
  )
}

export const GameCanvas = () => (
  <Canvas dpr={[1, 2]} shadows gl={{ antialias: true }}>
    <PerspectiveCamera makeDefault position={[0, 13.5, 17.5]} fov={46} />
    <OrbitControls
      enablePan={false}
      minDistance={12}
      maxDistance={28}
      minPolarAngle={0.55}
      maxPolarAngle={1.35}
      target={[0, 0, 0]}
    />
    <SceneContent />
  </Canvas>
)
