import {
  Array,
  Effect,
  Number,
  Option,
  Random,
  Result,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { Block, Canvas, Command, Dom } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Controls } from './controls'

// CONSTANTS

const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 600

const MS_PER_SECOND = 1000
const TWO_PI = Math.PI * 2
const HALF_PI = Math.PI / 2

export const DELTA_SECONDS_CAP = 0.05

const TARGET_PARTICLE_COUNT = 55
const INITIAL_PARTICLE_COUNT = 45
const BURST_PARTICLE_COUNT = 22

const TRAIL_LENGTH = 36
const PARTICLE_LIFESPAN_MIN_MS = 4500
const PARTICLE_LIFESPAN_MAX_MS = 9000
const PARTICLE_SPEED_MIN = 60
const PARTICLE_SPEED_MAX = 140

const HUE_MIN = 0
const HUE_MAX = 360
const HUE_DRIFT_MIN = -45
const HUE_DRIFT_MAX = 45
const SATURATION_PERCENT = 90
const CORE_LIGHTNESS_PERCENT = 78
const GLOW_LIGHTNESS_PERCENT = 60
const CORE_ALPHA_BASE = 0.85
const GLOW_ALPHA_BASE = 0.18

const FADE_IN_MS = 350
const FADE_OUT_MS = 900

const NOISE_SPATIAL_SCALE = 0.0028
const NOISE_TIME_SCALE = 0.085
const NOISE_DRIFT_X = 12
const NOISE_DRIFT_Y = 7
const FLOW_OCTAVES = 3
const FLOW_PERSISTENCE = 0.5
const FLOW_LACUNARITY = 2.0

const MOUSE_INFLUENCE_RADIUS = 130
const MOUSE_VORTEX_WEIGHT = 1
const MOUSE_RADIAL_BIAS = -0.4

const BURST_BOOST_DURATION_MS = 700
const BURST_HUE_ANCHOR_DRIFT_DEG_PER_SECOND = 35
export const SPAWN_PER_FRAME_MAX = 3

const CORE_LINE_WIDTH = 1.4
const GLOW_LINE_WIDTH = 5

const HEAD_RADIUS = 2.4
const HEAD_LIGHTNESS_PERCENT = 92
const HEAD_ALPHA = 0.95

const BACKGROUND_COLOR_TOP = '#04030a'
const VIGNETTE_ALPHA = 0.55

const SETTLE_BAND_PX = 80

// MODEL

const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number })
type Point = typeof Point.Type

export const Particle = Schema.Struct({
  id: Schema.Number,
  trail: Schema.Array(Point),
  baseHue: Schema.Number,
  hueDriftPerSecond: Schema.Number,
  ageMs: Schema.Number,
  lifespanMs: Schema.Number,
  speed: Schema.Number,
  bornAtSeconds: Schema.Number,
  initialAngle: Schema.Option(Schema.Number),
  initialSpeedScale: Schema.Number,
})
export type Particle = typeof Particle.Type

export const Model = Schema.Struct({
  particles: Schema.Array(Particle),
  nextId: Schema.Number,
  elapsedSeconds: Schema.Number,
  maybeMousePosition: Schema.Option(Point),
  isRunning: Schema.Boolean,
  controls: Controls,
})
export type Model = typeof Model.Type

// MESSAGE

const generatedParticleFields = {
  x: Schema.Number,
  y: Schema.Number,
  baseHue: Schema.Number,
  hueDriftPerSecond: Schema.Number,
  lifespanMs: Schema.Number,
  speed: Schema.Number,
  initialAngle: Schema.Option(Schema.Number),
  initialSpeedScale: Schema.Number,
}

export const Message = defineMessageUnion({
  TickedFrame: { deltaTimeMs: Schema.Number },
  CompletedGenerateAmbientParticle: generatedParticleFields,
  CompletedGenerateBurstParticle: generatedParticleFields,
  PressedCanvas: {
    x: Schema.Number,
    y: Schema.Number,
  },
  MovedPointer: {
    x: Schema.Number,
    y: Schema.Number,
  },
})
export type Message = typeof Message.Type

// COMMAND

export const GenerateAmbientParticle = Command.define(
  'GenerateAmbientParticle',
  {
    messages: [Message.CompletedGenerateAmbientParticle],
  },
)

const GenerateBurstParticle = Command.define('GenerateBurstParticle', {
  args: {
    x: Schema.Number,
    y: Schema.Number,
    angle: Schema.Number,
    hueAnchor: Schema.Number,
  },
  messages: [Message.CompletedGenerateBurstParticle],
})

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
  Command: [GenerateAmbientParticle, GenerateBurstParticle],
}) {}

// LIVE

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const controls = yield* new Controls('controls')

    return {
      model: {
        particles: [],
        nextId: 0,
        elapsedSeconds: 0,
        maybeMousePosition: Option.none(),
        isRunning: true,
        controls,
      },

      start: Array.makeBy(INITIAL_PARTICLE_COUNT, () =>
        GenerateAmbientParticle(),
      ),

      update: {
        TickedFrame: (model, { deltaTimeMs }) => {
          const deltaSeconds = cappedDeltaSeconds(deltaTimeMs)
          const nextElapsedSeconds = model.elapsedSeconds + deltaSeconds
          const { flowStrength, noiseScale } = model.controls.model
          const advancedParticles = Array.filterMap(
            model.particles,
            advanceParticle(
              deltaSeconds,
              nextElapsedSeconds,
              flowStrength,
              noiseScale,
              model.maybeMousePosition,
            ),
          )
          const nextModel = modifyFields(model, {
            particles: () => advancedParticles,
            elapsedSeconds: () => nextElapsedSeconds,
          })
          return {
            model: nextModel,
            commands: spawnAmbientParticles(advancedParticles.length),
          }
        },

        CompletedGenerateAmbientParticle: appendGeneratedParticle,

        CompletedGenerateBurstParticle: appendGeneratedParticle,

        PressedCanvas: (model, { x, y }) => ({
          model,
          commands: spawnBurstParticles(
            x,
            y,
            computeBurstHueAnchor(model.elapsedSeconds),
          ),
        }),

        MovedPointer: (model, { x, y }) => ({
          model: modifyFields(model, {
            maybeMousePosition: () => Option.some(Point.make({ x, y })),
          }),
        }),

        ...controls.on({
          RequestedTogglePlay: (model: Model) => ({
            model: modifyFields(model, { isRunning: isRunning => !isRunning }),
          }),
          RequestedReset: (model: Model) => ({
            model: modifyFields(model, {
              particles: () => [],
              maybeMousePosition: () => Option.none(),
            }),
          }),
        }),
      },

      commands: {
        GenerateAmbientParticle: generateAmbientParticle,
        GenerateBurstParticle: generateBurstParticle,
      },

      subscriptions: {
        animationFrameTicks: {
          dependencies: model => model.isRunning,
          stream: (isRunning: boolean) =>
            isRunning
              ? Dom.animationFrameTicks.pipe(
                  Stream.map(deltaTimeMs =>
                    Message.TickedFrame({ deltaTimeMs }),
                  ),
                )
              : Stream.empty,
        },
      },

      view: (model, h) => ({
        title: `Prism Field · ${model.particles.length} particles`,
        body: h.div(
          [
            h.Class(
              'flex flex-col items-center justify-center min-h-screen p-8 ' +
                'bg-[radial-gradient(ellipse_at_top,_#1a0a2c_0%,_#04010a_55%,_#000_100%)] ' +
                'text-white font-mono select-none',
            ),
          ],
          [
            headerView(h),
            Canvas.view(
              {
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                shapes: sceneShapes(model),
                className:
                  'rounded-2xl shadow-[0_0_120px_rgba(80,30,140,0.35)] ' +
                  'border border-white/10 cursor-crosshair',
                onPointerDown: ({ x, y }) => Message.PressedCanvas({ x, y }),
                onPointerMove: ({ x, y }) => Message.MovedPointer({ x, y }),
              },
              h,
            ),
            model.controls.view({
              isRunning: model.isRunning,
              particleCount: model.particles.length,
            }),
          ],
        ),
      }),
    }
  }),
)

type ApplicationViewBuilder = HtmlBuilder<Message>

// NOISE

const FADE_QUINTIC_COEFFICIENT = 6
const FADE_QUARTIC_COEFFICIENT = 15
const FADE_CUBIC_COEFFICIENT = 10

const HASH_PRIME_X = 374761393
const HASH_PRIME_Y = 668265263
const HASH_PRIME_FINAL = 1274126177
const HASH_SHIFT_INTERMIX = 13
const HASH_SHIFT_AVALANCHE = 16
const UINT32_RANGE = 0x100000000

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

const perlin2 = (x: number, y: number): number => {
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

const fractalNoise = (
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

// SIMULATION

const computeFieldAngle = (
  point: Point,
  elapsedSeconds: number,
  flowStrength: number,
  noiseScaleMultiplier: number,
): number => {
  const effectiveScale = NOISE_SPATIAL_SCALE * noiseScaleMultiplier
  const noiseX = (point.x + elapsedSeconds * NOISE_DRIFT_X) * effectiveScale
  const noiseY = (point.y + elapsedSeconds * NOISE_DRIFT_Y) * effectiveScale
  const noise = fractalNoise(
    noiseX + elapsedSeconds * NOISE_TIME_SCALE,
    noiseY,
    FLOW_OCTAVES,
    FLOW_PERSISTENCE,
    FLOW_LACUNARITY,
  )
  return noise * TWO_PI * flowStrength
}

const blendAnglesByVector = (a: number, b: number, t: number): number => {
  const ax = Math.cos(a)
  const ay = Math.sin(a)
  const bx = Math.cos(b)
  const by = Math.sin(b)
  const cx = ax + (bx - ax) * t
  const cy = ay + (by - ay) * t
  return Math.atan2(cy, cx)
}

const applyMouseInfluence = (
  baseAngle: number,
  point: Point,
  maybeMousePosition: Option.Option<Point>,
): number =>
  Option.match(maybeMousePosition, {
    onNone: () => baseAngle,
    onSome: mouse => {
      const dx = point.x - mouse.x
      const dy = point.y - mouse.y
      const distance = Math.hypot(dx, dy)
      if (distance > MOUSE_INFLUENCE_RADIUS) {
        return baseAngle
      }
      const proximity = 1 - distance / MOUSE_INFLUENCE_RADIUS
      const strength = proximity * MOUSE_VORTEX_WEIGHT
      const tangentialAngle = Math.atan2(dy, dx) + HALF_PI
      const radialAngle = Math.atan2(dy, dx)
      const swirl = blendAnglesByVector(
        tangentialAngle,
        radialAngle,
        MOUSE_RADIAL_BIAS,
      )
      return blendAnglesByVector(baseAngle, swirl, strength)
    },
  })

const boostFactor = (ageMs: number): number =>
  Math.max(0, 1 - ageMs / BURST_BOOST_DURATION_MS)

const blendWithInitialAngle = (
  particle: Particle,
  fieldAngle: number,
): number =>
  Option.match(particle.initialAngle, {
    onNone: () => fieldAngle,
    onSome: initialAngle => {
      const fieldWeight = 1 - boostFactor(particle.ageMs)
      return blendAnglesByVector(initialAngle, fieldAngle, fieldWeight)
    },
  })

const computeSpeed = (particle: Particle): number => {
  const boost = boostFactor(particle.ageMs)
  const scale = 1 + (particle.initialSpeedScale - 1) * boost
  return particle.speed * scale
}

const isOutsideCanvas = (point: Point): boolean =>
  point.x < -SETTLE_BAND_PX ||
  point.x > CANVAS_WIDTH + SETTLE_BAND_PX ||
  point.y < -SETTLE_BAND_PX ||
  point.y > CANVAS_HEIGHT + SETTLE_BAND_PX

const advanceParticle =
  (
    deltaSeconds: number,
    elapsedSeconds: number,
    flowStrength: number,
    noiseScaleMultiplier: number,
    maybeMousePosition: Option.Option<Point>,
  ) =>
  (particle: Particle): Result.Result<Particle, void> =>
    Option.match(Array.last(particle.trail), {
      onNone: () => Result.failVoid,
      onSome: currentPosition => {
        const fieldAngle = computeFieldAngle(
          currentPosition,
          elapsedSeconds,
          flowStrength,
          noiseScaleMultiplier,
        )
        const angleWithMouse = applyMouseInfluence(
          fieldAngle,
          currentPosition,
          maybeMousePosition,
        )
        const angle = blendWithInitialAngle(particle, angleWithMouse)
        const speed = computeSpeed(particle)
        const nextX = currentPosition.x + Math.cos(angle) * speed * deltaSeconds
        const nextY = currentPosition.y + Math.sin(angle) * speed * deltaSeconds
        const nextPosition: Point = { x: nextX, y: nextY }
        const nextAgeMs = particle.ageMs + deltaSeconds * MS_PER_SECOND
        if (nextAgeMs >= particle.lifespanMs || isOutsideCanvas(nextPosition)) {
          return Result.failVoid
        }
        const appendedTrail = Array.append(particle.trail, nextPosition)
        const trimmedTrail = Array.takeRight(appendedTrail, TRAIL_LENGTH)
        return Result.succeed(
          modifyFields(particle, {
            trail: () => trimmedTrail,
            ageMs: () => nextAgeMs,
          }),
        )
      },
    })

const cappedDeltaSeconds = (deltaTimeMs: number): number =>
  Math.min(deltaTimeMs / MS_PER_SECOND, DELTA_SECONDS_CAP)

const computeBurstHueAnchor = (elapsedSeconds: number): number =>
  (((elapsedSeconds * BURST_HUE_ANCHOR_DRIFT_DEG_PER_SECOND) % HUE_MAX) +
    HUE_MAX) %
  HUE_MAX

const burstAngleAt = (index: number): number =>
  (index / BURST_PARTICLE_COUNT) * TWO_PI

const spawnBurstParticles = (x: number, y: number, hueAnchor: number) =>
  Array.makeBy(BURST_PARTICLE_COUNT, index =>
    GenerateBurstParticle({
      x,
      y,
      angle: burstAngleAt(index),
      hueAnchor,
    }),
  )

const spawnAmbientParticles = (particleCount: number) => {
  const missing = TARGET_PARTICLE_COUNT - particleCount
  const clamped = Math.max(0, Math.min(missing, SPAWN_PER_FRAME_MAX))
  return Array.makeBy(clamped, () => GenerateAmbientParticle())
}

const appendGeneratedParticle = (
  model: Model,
  generatedParticle:
    | typeof Message.CompletedGenerateAmbientParticle.Type
    | typeof Message.CompletedGenerateBurstParticle.Type,
) => {
  const newParticle: Particle = {
    id: model.nextId,
    trail: [{ x: generatedParticle.x, y: generatedParticle.y }],
    baseHue: generatedParticle.baseHue,
    hueDriftPerSecond: generatedParticle.hueDriftPerSecond,
    ageMs: 0,
    lifespanMs: generatedParticle.lifespanMs,
    speed: generatedParticle.speed,
    bornAtSeconds: model.elapsedSeconds,
    initialAngle: generatedParticle.initialAngle,
    initialSpeedScale: generatedParticle.initialSpeedScale,
  }

  return {
    model: modifyFields(model, {
      particles: Array.append(newParticle),
      nextId: Number.increment,
    }),
  }
}

// COMMAND HANDLERS

const generateAmbientParticle = () =>
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
    return Message.CompletedGenerateAmbientParticle({
      x,
      y,
      baseHue,
      hueDriftPerSecond,
      lifespanMs,
      speed,
      initialAngle: Option.none(),
      initialSpeedScale: 1,
    })
  })

const BURST_POSITION_JITTER_PX = 6
const BURST_LIFESPAN_FACTOR = 0.85
const BURST_INITIAL_SPEED_SCALE_MIN = 1.4
const BURST_INITIAL_SPEED_SCALE_MAX = 2.2
const BURST_HUE_JITTER_DEGREES = 30

const generateBurstParticle = ({
  x,
  y,
  angle,
  hueAnchor,
}: Readonly<{ x: number; y: number; angle: number; hueAnchor: number }>) =>
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
    return Message.CompletedGenerateBurstParticle({
      x: x + jitterX,
      y: y + jitterY,
      baseHue: (hueAnchor + hueOffset + HUE_MAX) % HUE_MAX,
      hueDriftPerSecond,
      lifespanMs,
      speed,
      initialAngle: Option.some(angle),
      initialSpeedScale,
    })
  })

// VIEW

const fadeAlpha = (particle: Particle): number => {
  const remainingMs = particle.lifespanMs - particle.ageMs
  const fadeIn = Math.min(1, particle.ageMs / FADE_IN_MS)
  const fadeOut = Math.min(1, remainingMs / FADE_OUT_MS)
  return Math.max(0, Math.min(fadeIn, fadeOut))
}

const currentHue = (particle: Particle, elapsedSeconds: number): number => {
  const drift =
    particle.hueDriftPerSecond * (elapsedSeconds - particle.bornAtSeconds)
  const raw = particle.baseHue + drift
  return ((raw % HUE_MAX) + HUE_MAX) % HUE_MAX
}

const trailToInstructions = (
  trail: ReadonlyArray<Point>,
): ReadonlyArray<Canvas.PathInstruction> =>
  Array.matchLeft(trail, {
    onEmpty: () => [],
    onNonEmpty: (head, tail) => [
      Canvas.MoveTo({ x: head.x, y: head.y }),
      ...Array.map(tail, segment =>
        Canvas.LineTo({ x: segment.x, y: segment.y }),
      ),
    ],
  })

const ALPHA_VISIBILITY_EPSILON = 0.01

const particleShapes = (
  particle: Particle,
  elapsedSeconds: number,
): ReadonlyArray<Canvas.Shape> => {
  if (particle.trail.length < 2) {
    return []
  }
  const fade = fadeAlpha(particle)
  if (fade < ALPHA_VISIBILITY_EPSILON) {
    return []
  }
  const instructions = trailToInstructions(particle.trail)
  const hue = currentHue(particle, elapsedSeconds)
  const glowColor = `hsla(${hue}, ${SATURATION_PERCENT}%, ${GLOW_LIGHTNESS_PERCENT}%, ${
    GLOW_ALPHA_BASE * fade
  })`
  const coreColor = `hsla(${hue}, ${SATURATION_PERCENT}%, ${CORE_LIGHTNESS_PERCENT}%, ${
    CORE_ALPHA_BASE * fade
  })`
  return [
    Canvas.Path({
      instructions,
      stroke: glowColor,
      lineWidth: GLOW_LINE_WIDTH,
      lineCap: 'Round',
      lineJoin: 'Round',
    }),
    Canvas.Path({
      instructions,
      stroke: coreColor,
      lineWidth: CORE_LINE_WIDTH,
      lineCap: 'Round',
      lineJoin: 'Round',
    }),
  ]
}

const NEBULA_GLOW_COUNT = 3
const NEBULA_GLOW_RADIUS = 280
const NEBULA_DRIFT_SPEEDS = [0.11, 0.07, 0.13]
const NEBULA_OFFSETS_X = [0.3, 0.72, 0.52]
const NEBULA_OFFSETS_Y = [0.4, 0.62, 0.28]
const NEBULA_DRIFT_AMPLITUDES_X = [80, 100, 60]
const NEBULA_DRIFT_AMPLITUDES_Y = [50, 60, 80]
const NEBULA_COLORS: ReadonlyArray<string> = [
  'rgba(120, 35, 200, 0.18)',
  'rgba(28, 90, 200, 0.16)',
  'rgba(220, 30, 140, 0.13)',
]
const NEBULA_FALLBACK_COLOR = 'rgba(80, 40, 120, 0.12)'

const nebulaGlowAt = (index: number, elapsedSeconds: number): Canvas.Shape => {
  const fallbackZero = 0
  const fallbackHalf = 0.5
  const driftSpeed = pipe(
    NEBULA_DRIFT_SPEEDS,
    Array.get(index),
    Option.getOrElse(() => fallbackZero),
  )
  const offsetX = pipe(
    NEBULA_OFFSETS_X,
    Array.get(index),
    Option.getOrElse(() => fallbackHalf),
  )
  const offsetY = pipe(
    NEBULA_OFFSETS_Y,
    Array.get(index),
    Option.getOrElse(() => fallbackHalf),
  )
  const amplitudeX = pipe(
    NEBULA_DRIFT_AMPLITUDES_X,
    Array.get(index),
    Option.getOrElse(() => fallbackZero),
  )
  const amplitudeY = pipe(
    NEBULA_DRIFT_AMPLITUDES_Y,
    Array.get(index),
    Option.getOrElse(() => fallbackZero),
  )
  const color = pipe(
    NEBULA_COLORS,
    Array.get(index),
    Option.getOrElse(() => NEBULA_FALLBACK_COLOR),
  )
  const phase = (index / NEBULA_GLOW_COUNT) * TWO_PI
  return Canvas.Circle({
    x:
      CANVAS_WIDTH * offsetX +
      Math.sin(elapsedSeconds * driftSpeed + phase) * amplitudeX,
    y:
      CANVAS_HEIGHT * offsetY +
      Math.cos(elapsedSeconds * driftSpeed + phase) * amplitudeY,
    radius: NEBULA_GLOW_RADIUS,
    fill: color,
  })
}

const nebulaShapes = (elapsedSeconds: number): ReadonlyArray<Canvas.Shape> =>
  Array.makeBy(NEBULA_GLOW_COUNT, index => nebulaGlowAt(index, elapsedSeconds))

const backgroundShape = Canvas.Rect({
  x: 0,
  y: 0,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  fill: BACKGROUND_COLOR_TOP,
})

const VIGNETTE_INSET = 1
const VIGNETTE_STRIP_WIDTH = 80
const VIGNETTE_STEPS = 4
const VIGNETTE_ALPHA_PER_STEP = VIGNETTE_ALPHA / VIGNETTE_STEPS

const vignetteStrips: ReadonlyArray<Canvas.Shape> = Array.flatMap(
  Array.makeBy(VIGNETTE_STEPS, step => step),
  step => {
    const stripWidth = VIGNETTE_STRIP_WIDTH * (1 - step / VIGNETTE_STEPS)
    if (stripWidth <= VIGNETTE_INSET) {
      return []
    }
    const fill = `rgba(2, 1, 8, ${VIGNETTE_ALPHA_PER_STEP})`
    return [
      Canvas.Rect({
        x: 0,
        y: 0,
        width: CANVAS_WIDTH,
        height: stripWidth,
        fill,
      }),
      Canvas.Rect({
        x: 0,
        y: CANVAS_HEIGHT - stripWidth,
        width: CANVAS_WIDTH,
        height: stripWidth,
        fill,
      }),
      Canvas.Rect({
        x: 0,
        y: 0,
        width: stripWidth,
        height: CANVAS_HEIGHT,
        fill,
      }),
      Canvas.Rect({
        x: CANVAS_WIDTH - stripWidth,
        y: 0,
        width: stripWidth,
        height: CANVAS_HEIGHT,
        fill,
      }),
    ]
  },
)

const particleHeadShape = (
  particle: Particle,
  elapsedSeconds: number,
): Option.Option<Canvas.Shape> =>
  Option.map(Array.last(particle.trail), head => {
    const hue = currentHue(particle, elapsedSeconds)
    const fade = fadeAlpha(particle)
    return Canvas.Circle({
      x: head.x,
      y: head.y,
      radius: HEAD_RADIUS,
      fill: `hsla(${hue}, ${SATURATION_PERCENT}%, ${HEAD_LIGHTNESS_PERCENT}%, ${
        HEAD_ALPHA * fade
      })`,
    })
  })

const mouseIndicator = (
  maybeMousePosition: Option.Option<Point>,
): ReadonlyArray<Canvas.Shape> =>
  Option.match(maybeMousePosition, {
    onNone: () => [],
    onSome: position => [
      Canvas.Circle({
        x: position.x,
        y: position.y,
        radius: MOUSE_INFLUENCE_RADIUS,
        fill: 'rgba(255, 255, 255, 0.04)',
      }),
    ],
  })

const sceneShapes = (model: Model): ReadonlyArray<Canvas.Shape> => [
  backgroundShape,
  ...nebulaShapes(model.elapsedSeconds),
  ...Array.flatMap(model.particles, particle =>
    particleShapes(particle, model.elapsedSeconds),
  ),
  ...Array.flatMap(model.particles, particle =>
    Option.toArray(particleHeadShape(particle, model.elapsedSeconds)),
  ),
  ...vignetteStrips,
  ...mouseIndicator(model.maybeMousePosition),
]

const headerView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('flex flex-col items-center mb-6 text-center')],
    [
      h.h1(
        [
          h.Class(
            'text-3xl font-light tracking-[0.3em] uppercase ' +
              'bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-amber-200 ' +
              'bg-clip-text text-transparent',
          ),
        ],
        ['Prism Field'],
      ),
      h.p(
        [h.Class('mt-2 text-xs tracking-widest text-white/40 uppercase')],
        ['Move to stir. Click to bloom.'],
      ),
    ],
  )
