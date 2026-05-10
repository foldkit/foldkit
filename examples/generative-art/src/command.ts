import { Effect, Option, Random, Schema as S } from 'effect'
import { Command } from 'foldkit'

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  HUE_DRIFT_MAX,
  HUE_DRIFT_MIN,
  HUE_MAX,
  HUE_MIN,
  PARTICLE_LIFESPAN_MAX_MS,
  PARTICLE_LIFESPAN_MIN_MS,
  PARTICLE_SPEED_MAX,
  PARTICLE_SPEED_MIN,
  SETTLE_BAND_PX,
} from './constant'
import { SpawnedAmbientParticle, SpawnedBurstParticle } from './message'

export const SpawnAmbientParticle = Command.define(
  'SpawnAmbientParticle',
  SpawnedAmbientParticle,
)(
  Effect.gen(function* () {
    const x = yield* Random.nextBetween(
      SETTLE_BAND_PX,
      CANVAS_WIDTH - SETTLE_BAND_PX,
    )
    const y = yield* Random.nextBetween(
      SETTLE_BAND_PX,
      CANVAS_HEIGHT - SETTLE_BAND_PX,
    )
    const baseHue = yield* Random.nextBetween(HUE_MIN, HUE_MAX)
    const hueDriftPerSecond = yield* Random.nextBetween(
      HUE_DRIFT_MIN,
      HUE_DRIFT_MAX,
    )
    const lifespanMs = yield* Random.nextBetween(
      PARTICLE_LIFESPAN_MIN_MS,
      PARTICLE_LIFESPAN_MAX_MS,
    )
    const speed = yield* Random.nextBetween(
      PARTICLE_SPEED_MIN,
      PARTICLE_SPEED_MAX,
    )
    return SpawnedAmbientParticle({
      x,
      y,
      baseHue,
      hueDriftPerSecond,
      lifespanMs,
      speed,
      initialAngle: Option.none(),
      initialSpeedScale: 1,
    })
  }),
)

const BURST_POSITION_JITTER_PX = 6
const BURST_LIFESPAN_FACTOR = 0.85
const BURST_INITIAL_SPEED_SCALE_MIN = 1.4
const BURST_INITIAL_SPEED_SCALE_MAX = 2.2
const BURST_HUE_JITTER_DEGREES = 30

export const SpawnBurstParticle = Command.define(
  'SpawnBurstParticle',
  { x: S.Number, y: S.Number, angle: S.Number, hueAnchor: S.Number },
  SpawnedBurstParticle,
)(({ x, y, angle, hueAnchor }) =>
  Effect.gen(function* () {
    const jitterX = yield* Random.nextBetween(
      -BURST_POSITION_JITTER_PX,
      BURST_POSITION_JITTER_PX,
    )
    const jitterY = yield* Random.nextBetween(
      -BURST_POSITION_JITTER_PX,
      BURST_POSITION_JITTER_PX,
    )
    const hueOffset = yield* Random.nextBetween(
      -BURST_HUE_JITTER_DEGREES,
      BURST_HUE_JITTER_DEGREES,
    )
    const hueDriftPerSecond = yield* Random.nextBetween(
      HUE_DRIFT_MIN,
      HUE_DRIFT_MAX,
    )
    const lifespanMs = yield* Random.nextBetween(
      PARTICLE_LIFESPAN_MIN_MS * BURST_LIFESPAN_FACTOR,
      PARTICLE_LIFESPAN_MAX_MS * BURST_LIFESPAN_FACTOR,
    )
    const speed = yield* Random.nextBetween(
      PARTICLE_SPEED_MIN,
      PARTICLE_SPEED_MAX,
    )
    const initialSpeedScale = yield* Random.nextBetween(
      BURST_INITIAL_SPEED_SCALE_MIN,
      BURST_INITIAL_SPEED_SCALE_MAX,
    )
    return SpawnedBurstParticle({
      x: x + jitterX,
      y: y + jitterY,
      baseHue: (hueAnchor + hueOffset + HUE_MAX) % HUE_MAX,
      hueDriftPerSecond,
      lifespanMs,
      speed,
      initialAngle: Option.some(angle),
      initialSpeedScale,
    })
  }),
)
