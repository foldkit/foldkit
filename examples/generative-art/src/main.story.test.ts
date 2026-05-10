import { Array, Option } from 'effect'
import { Story, Ui } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { SpawnAmbientParticle } from './command'
import {
  DELTA_SECONDS_CAP,
  FLOW_STRENGTH_MAX,
  FLOW_STRENGTH_MIN,
  NOISE_SCALE_MAX_DIVISOR,
  NOISE_SCALE_MIN_DIVISOR,
  SPAWN_PER_FRAME_MAX,
} from './constant'
import {
  ClickedReset,
  ClickedTogglePlay,
  MovedPointer,
  SpawnedAmbientParticle,
  SpawnedBurstParticle,
  TickedFrame,
} from './message'
import { type Model, type Particle } from './model'
import { update } from './update'

const initialModel: Model = {
  particles: [],
  nextId: 0,
  elapsedSeconds: 0,
  maybeMousePosition: Option.none(),
  isRunning: true,
  flowStrengthSlider: Ui.Slider.init({
    id: 'flow-strength-slider',
    min: FLOW_STRENGTH_MIN,
    max: FLOW_STRENGTH_MAX,
    step: 0.05,
    initialValue: 1.4,
  }),
  noiseScaleSlider: Ui.Slider.init({
    id: 'noise-scale-slider',
    min: NOISE_SCALE_MIN_DIVISOR,
    max: NOISE_SCALE_MAX_DIVISOR,
    step: 0.05,
    initialValue: 1,
  }),
}

const makeParticle = (id: number, x: number, y: number): Particle => ({
  id,
  trail: [{ x, y }],
  baseHue: 200,
  hueDriftPerSecond: 10,
  ageMs: 0,
  lifespanMs: 5000,
  speed: 100,
  bornAtSeconds: 0,
  initialAngle: Option.none(),
  initialSpeedScale: 1,
})

describe('update', () => {
  test('ClickedTogglePlay flips isRunning', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedTogglePlay()),
      Story.model(model => {
        expect(model.isRunning).toBe(false)
      }),
      Story.message(ClickedTogglePlay()),
      Story.model(model => {
        expect(model.isRunning).toBe(true)
      }),
    )
  })

  test('ClickedReset clears particles and the mouse position', () => {
    Story.story(
      update,
      Story.with({
        ...initialModel,
        particles: [makeParticle(0, 100, 100), makeParticle(1, 200, 200)],
        maybeMousePosition: Option.some({ x: 300, y: 300 }),
      }),
      Story.message(ClickedReset()),
      Story.model(model => {
        expect(model.particles).toHaveLength(0)
        expect(Option.isNone(model.maybeMousePosition)).toBe(true)
      }),
    )
  })

  test('MovedPointer sets maybeMousePosition to the new coordinates', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(MovedPointer({ x: 250, y: 175 })),
      Story.model(model => {
        expect(Option.getOrThrow(model.maybeMousePosition)).toEqual({
          x: 250,
          y: 175,
        })
      }),
    )
  })

  test('SpawnedAmbientParticle appends a particle and increments nextId', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(
        SpawnedAmbientParticle({
          x: 50,
          y: 75,
          baseHue: 120,
          hueDriftPerSecond: 5,
          lifespanMs: 6000,
          speed: 90,
          initialAngle: Option.none(),
          initialSpeedScale: 1,
        }),
      ),
      Story.model(model => {
        expect(model.particles).toHaveLength(1)
        expect(model.particles[0]?.trail).toEqual([{ x: 50, y: 75 }])
        expect(model.particles[0]?.baseHue).toBe(120)
        expect(model.nextId).toBe(1)
      }),
    )
  })

  test('TickedFrame advances existing particles, ages them, and dispatches ambient spawn Commands that append new particles', () => {
    const startingParticles = [makeParticle(0, 200, 200)]
    const startingParticleCount = startingParticles.length

    Story.story(
      update,
      Story.with({
        ...initialModel,
        particles: startingParticles,
        nextId: startingParticleCount,
      }),
      Story.message(TickedFrame({ deltaTimeMs: 16 })),
      Story.model(model => {
        expect(model.elapsedSeconds).toBeGreaterThan(0)
        expect(model.elapsedSeconds).toBeLessThanOrEqual(DELTA_SECONDS_CAP)
        const advanced = model.particles[0]
        expect(advanced?.trail.length).toBe(2)
        expect(advanced?.ageMs).toBeGreaterThan(0)
        expect(model.particles).toHaveLength(startingParticleCount)
      }),
      Story.Command.resolveAll(
        ...Array.makeBy(
          SPAWN_PER_FRAME_MAX,
          () =>
            [
              SpawnAmbientParticle,
              SpawnedAmbientParticle({
                x: 50,
                y: 50,
                baseHue: 0,
                hueDriftPerSecond: 0,
                lifespanMs: 5000,
                speed: 100,
                initialAngle: Option.none(),
                initialSpeedScale: 1,
              }),
            ] as const,
        ),
      ),
      Story.model(model => {
        expect(model.particles).toHaveLength(
          startingParticleCount + SPAWN_PER_FRAME_MAX,
        )
        expect(model.nextId).toBe(startingParticleCount + SPAWN_PER_FRAME_MAX)
      }),
    )
  })

  test('SpawnedBurstParticle appends a particle with its initial angle preserved', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(
        SpawnedBurstParticle({
          x: 100,
          y: 100,
          baseHue: 200,
          hueDriftPerSecond: 0,
          lifespanMs: 4000,
          speed: 120,
          initialAngle: Option.some(1.5),
          initialSpeedScale: 1.8,
        }),
      ),
      Story.model(model => {
        expect(model.particles).toHaveLength(1)
        expect(Option.getOrThrow(model.particles[0]!.initialAngle)).toBe(1.5)
        expect(model.particles[0]?.initialSpeedScale).toBe(1.8)
      }),
    )
  })
})
