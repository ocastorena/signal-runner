import type { Vector3Tuple } from './types'

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const distance3 = (a: Vector3Tuple, b: Vector3Tuple): number => {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export const mixVec3 = (
  a: Vector3Tuple,
  b: Vector3Tuple,
  t: number,
): Vector3Tuple => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
