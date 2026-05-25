import { Array, Match as M, Number, Option, Result } from 'effect'
import { Command, Ui } from 'foldkit'
import { evo } from 'foldkit/struct'

import { SpawnAmbientParticle, SpawnBurstParticle } from './command'
import {
  BURST_BOOST_DURATION_MS,
  BURST_HUE_ANCHOR_DRIFT_DEG_PER_SECOND,
  BURST_PARTICLE_COUNT,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DELTA_SECONDS_CAP,
  FLOW_LACUNARITY,
  FLOW_OCTAVES,
  FLOW_PERSISTENCE,
  HALF_PI,
  HUE_MAX,
  MOUSE_INFLUENCE_RADIUS,
  MOUSE_RADIAL_BIAS,
  MOUSE_VORTEX_WEIGHT,
  MS_PER_SECOND,
  NOISE_DRIFT_X,
  NOISE_DRIFT_Y,
  NOISE_SPATIAL_SCALE,
  NOISE_TIME_SCALE,
  SETTLE_BAND_PX,
  SPAWN_PER_FRAME_MAX,
  TARGET_PARTICLE_COUNT,
  TRAIL_LENGTH,
  TWO_PI,
} from './constant'
import {
  GotFlowStrengthSliderMessage,
  GotNoiseScaleSliderMessage,
  Message,
  SpawnedAmbientParticle,
  SpawnedBurstParticle,
} from './message'
import { Model, Particle, Point } from './model'
import { fractalNoise } from './noise'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

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
          evo(particle, {
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

const spawnBurstParticles = (
  x: number,
  y: number,
  hueAnchor: number,
): ReadonlyArray<Command.Command<Message>> =>
  Array.makeBy(BURST_PARTICLE_COUNT, index =>
    SpawnBurstParticle({
      x,
      y,
      angle: burstAngleAt(index),
      hueAnchor,
    }),
  )

const spawnAmbientParticles = (
  particleCount: number,
): ReadonlyArray<Command.Command<Message>> => {
  const missing = TARGET_PARTICLE_COUNT - particleCount
  const clamped = Math.max(0, Math.min(missing, SPAWN_PER_FRAME_MAX))
  return Array.makeBy(clamped, () => SpawnAmbientParticle())
}

const appendSpawnedParticle =
  (model: Model) =>
  (
    spawn:
      | typeof SpawnedAmbientParticle.Type
      | typeof SpawnedBurstParticle.Type,
  ): UpdateReturn => {
    const newParticle: Particle = {
      id: model.nextId,
      trail: [{ x: spawn.x, y: spawn.y }],
      baseHue: spawn.baseHue,
      hueDriftPerSecond: spawn.hueDriftPerSecond,
      ageMs: 0,
      lifespanMs: spawn.lifespanMs,
      speed: spawn.speed,
      bornAtSeconds: model.elapsedSeconds,
      initialAngle: spawn.initialAngle,
      initialSpeedScale: spawn.initialSpeedScale,
    }
    return [
      evo(model, {
        particles: Array.append(newParticle),
        nextId: Number.increment,
      }),
      [],
    ]
  }

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      TickedFrame: ({ deltaTimeMs }) => {
        const deltaSeconds = cappedDeltaSeconds(deltaTimeMs)
        const nextElapsedSeconds = model.elapsedSeconds + deltaSeconds
        const advancedParticles = Array.filterMap(
          model.particles,
          advanceParticle(
            deltaSeconds,
            nextElapsedSeconds,
            model.flowStrengthSlider.value,
            model.noiseScaleSlider.value,
            model.maybeMousePosition,
          ),
        )
        const nextModel = evo(model, {
          particles: () => advancedParticles,
          elapsedSeconds: () => nextElapsedSeconds,
        })
        return [nextModel, spawnAmbientParticles(advancedParticles.length)]
      },

      SpawnedAmbientParticle: appendSpawnedParticle(model),

      SpawnedBurstParticle: appendSpawnedParticle(model),

      PressedCanvas: ({ x, y }) => [
        model,
        spawnBurstParticles(x, y, computeBurstHueAnchor(model.elapsedSeconds)),
      ],

      MovedPointer: ({ x, y }) => [
        evo(model, {
          maybeMousePosition: () => Option.some(Point.make({ x, y })),
        }),
        [],
      ],

      ClickedTogglePlay: () => [
        evo(model, { isRunning: running => !running }),
        [],
      ],

      ClickedReset: () => [
        evo(model, {
          particles: () => [],
          maybeMousePosition: () => Option.none(),
        }),
        [],
      ],

      GotFlowStrengthSliderMessage: ({ message }) => {
        const [nextSlider, sliderCommands] = Ui.Slider.update(
          model.flowStrengthSlider,
          message,
        )
        return [
          evo(model, { flowStrengthSlider: () => nextSlider }),
          Command.mapMessages(sliderCommands, message =>
            GotFlowStrengthSliderMessage({ message }),
          ),
        ]
      },

      GotNoiseScaleSliderMessage: ({ message }) => {
        const [nextSlider, sliderCommands] = Ui.Slider.update(
          model.noiseScaleSlider,
          message,
        )
        return [
          evo(model, { noiseScaleSlider: () => nextSlider }),
          Command.mapMessages(sliderCommands, message =>
            GotNoiseScaleSliderMessage({ message }),
          ),
        ]
      },
    }),
  )
