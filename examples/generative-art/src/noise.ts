import { Array } from 'effect'

const FADE_QUINTIC_COEFFICIENT = 6
const FADE_QUARTIC_COEFFICIENT = 15
const FADE_CUBIC_COEFFICIENT = 10

const HASH_PRIME_X = 374761393
const HASH_PRIME_Y = 668265263
const HASH_PRIME_FINAL = 1274126177
const HASH_SHIFT_INTERMIX = 13
const HASH_SHIFT_AVALANCHE = 16
const UINT32_RANGE = 0x100000000

const TWO_PI = Math.PI * 2

const fade = (t: number): number =>
  t *
  t *
  t *
  (t * (t * FADE_QUINTIC_COEFFICIENT - FADE_QUARTIC_COEFFICIENT) +
    FADE_CUBIC_COEFFICIENT)

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const gradientAngle = (ix: number, iy: number): number => {
  const seeded = (ix * HASH_PRIME_X + iy * HASH_PRIME_Y) | 0
  const mixed =
    ((seeded ^ (seeded >>> HASH_SHIFT_INTERMIX)) * HASH_PRIME_FINAL) | 0
  const avalanched = (mixed ^ (mixed >>> HASH_SHIFT_AVALANCHE)) >>> 0
  return (avalanched / UINT32_RANGE) * TWO_PI
}

const dotGradient = (
  ix: number,
  iy: number,
  dx: number,
  dy: number,
): number => {
  const angle = gradientAngle(ix, iy)
  return Math.cos(angle) * dx + Math.sin(angle) * dy
}

/**
 * 2D Perlin noise. Returns a smooth pseudo-random value in roughly [-1, 1] for
 * any real-valued `(x, y)`. The same input always produces the same output;
 * neighbouring inputs produce smoothly varying outputs. Use small fractional
 * scales (e.g. multiply coordinates by 0.005) to get broad organic gradients.
 */
export const perlin2 = (x: number, y: number): number => {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = x0 + 1
  const y1 = y0 + 1
  const fx = x - x0
  const fy = y - y0
  const u = fade(fx)
  const v = fade(fy)
  const n00 = dotGradient(x0, y0, fx, fy)
  const n10 = dotGradient(x1, y0, fx - 1, fy)
  const n01 = dotGradient(x0, y1, fx, fy - 1)
  const n11 = dotGradient(x1, y1, fx - 1, fy - 1)
  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v)
}

/**
 * Sum several octaves of `perlin2` into fractal Brownian motion. Higher
 * `octaves` add finer detail; `persistence` (0..1) controls how quickly
 * higher octaves fade, and `lacunarity` (>1) controls how much frequency
 * each octave adds. The result is normalised back to roughly [-1, 1].
 */
export const fractalNoise = (
  x: number,
  y: number,
  octaves: number,
  persistence: number,
  lacunarity: number,
): number => {
  const seed = { total: 0, weight: 0, amplitude: 1, frequency: 1 }
  const accumulated = Array.reduce(
    Array.makeBy(octaves, octaveIndex => octaveIndex),
    seed,
    accumulator => ({
      total:
        accumulator.total +
        perlin2(x * accumulator.frequency, y * accumulator.frequency) *
          accumulator.amplitude,
      weight: accumulator.weight + accumulator.amplitude,
      amplitude: accumulator.amplitude * persistence,
      frequency: accumulator.frequency * lacunarity,
    }),
  )
  return accumulated.total / accumulated.weight
}
