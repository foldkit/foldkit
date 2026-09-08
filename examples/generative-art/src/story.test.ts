import { Array, Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { Slider } from '@foldkit/ui'

import { GenerateAmbientParticle } from './command'
import {
  DELTA_SECONDS_CAP,
  FLOW_STRENGTH_MAX,
  FLOW_STRENGTH_MIN,
  FLOW_STRENGTH_STEP,
  INITIAL_FLOW_STRENGTH,
  INITIAL_NOISE_SCALE,
  NOISE_SCALE_MAX_DIVISOR,
  NOISE_SCALE_MIN_DIVISOR,
  NOISE_SCALE_STEP,
  SPAWN_PER_FRAME_MAX,
} from './constant'
import { Message } from './message'
import { type Model, type Particle } from './model'
import { update } from './update'

const initialModel: Model = {
  particles: [],
  nextId: 0,
  elapsedSeconds: 0,
  maybeMousePosition: Option.none(),
  isRunning: true,
  flowStrength: INITIAL_FLOW_STRENGTH,
  flowStrengthSlider: Slider.init({
    id: 'flow-strength-slider',
    min: FLOW_STRENGTH_MIN,
    max: FLOW_STRENGTH_MAX,
    step: FLOW_STRENGTH_STEP,
  }),
  noiseScale: INITIAL_NOISE_SCALE,
  noiseScaleSlider: Slider.init({
    id: 'noise-scale-slider',
    min: NOISE_SCALE_MIN_DIVISOR,
    max: NOISE_SCALE_MAX_DIVISOR,
    step: NOISE_SCALE_STEP,
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
    story(
      update,
      given(initialModel),
      message(Message.ClickedTogglePlay()),
      model(model => {
        expect(model.isRunning).toBe(false)
      }),
      message(Message.ClickedTogglePlay()),
      model(model => {
        expect(model.isRunning).toBe(true)
      }),
    )
  })

  test('ClickedReset clears particles and the mouse position', () => {
    story(
      update,
      given(
        evo(initialModel, {
          particles: () => [
            makeParticle(0, 100, 100),
            makeParticle(1, 200, 200),
          ],
          maybeMousePosition: () => Option.some({ x: 300, y: 300 }),
        }),
      ),
      message(Message.ClickedReset()),
      model(model => {
        expect(model.particles).toHaveLength(0)
        expect(Option.isNone(model.maybeMousePosition)).toBe(true)
      }),
    )
  })

  test('MovedPointer sets maybeMousePosition to the new coordinates', () => {
    story(
      update,
      given(initialModel),
      message(Message.MovedPointer({ x: 250, y: 175 })),
      model(model => {
        expect(Option.getOrThrow(model.maybeMousePosition)).toEqual({
          x: 250,
          y: 175,
        })
      }),
    )
  })

  test('CompletedGenerateAmbientParticle appends a particle and increments nextId', () => {
    story(
      update,
      given(initialModel),
      message(
        Message.CompletedGenerateAmbientParticle({
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
      model(model => {
        expect(model.particles).toHaveLength(1)
        const particle = Option.getOrThrow(Array.head(model.particles))
        expect(particle.trail).toEqual([{ x: 50, y: 75 }])
        expect(particle.baseHue).toBe(120)
        expect(model.nextId).toBe(1)
      }),
    )
  })

  test('TickedFrame advances existing particles, ages them, and dispatches ambient spawn Commands that append new particles', () => {
    const startingParticles = [makeParticle(0, 200, 200)]
    const startingParticleCount = startingParticles.length

    story(
      update,
      given(
        evo(initialModel, {
          particles: () => startingParticles,
          nextId: () => startingParticleCount,
        }),
      ),
      message(Message.TickedFrame({ deltaTimeMs: 16 })),
      model(model => {
        expect(model.elapsedSeconds).toBeGreaterThan(0)
        expect(model.elapsedSeconds).toBeLessThanOrEqual(DELTA_SECONDS_CAP)
        const advanced = Option.getOrThrow(Array.head(model.particles))
        expect(advanced.trail.length).toBe(2)
        expect(advanced.ageMs).toBeGreaterThan(0)
        expect(model.particles).toHaveLength(startingParticleCount)
      }),
      Command.resolveAll(
        ...Array.makeBy(
          SPAWN_PER_FRAME_MAX,
          () =>
            [
              GenerateAmbientParticle,
              Message.CompletedGenerateAmbientParticle({
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
      model(model => {
        expect(model.particles).toHaveLength(
          startingParticleCount + SPAWN_PER_FRAME_MAX,
        )
        expect(model.nextId).toBe(startingParticleCount + SPAWN_PER_FRAME_MAX)
      }),
    )
  })

  test('CompletedGenerateBurstParticle appends a particle with its initial angle preserved', () => {
    story(
      update,
      given(initialModel),
      message(
        Message.CompletedGenerateBurstParticle({
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
      model(model => {
        expect(model.particles).toHaveLength(1)
        const particle = Option.getOrThrow(Array.head(model.particles))
        expect(Option.getOrThrow(particle.initialAngle)).toBe(1.5)
        expect(particle.initialSpeedScale).toBe(1.8)
      }),
    )
  })
})
