import { Option } from 'effect'
import { click, expect, given, label, role, scene, text } from 'foldkit/scene'
import { evo } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { Slider } from '@foldkit/ui'

import {
  FLOW_STRENGTH_MAX,
  FLOW_STRENGTH_MIN,
  FLOW_STRENGTH_STEP,
  INITIAL_FLOW_STRENGTH,
  INITIAL_NOISE_SCALE,
  NOISE_SCALE_MAX_DIVISOR,
  NOISE_SCALE_MIN_DIVISOR,
  NOISE_SCALE_STEP,
} from './constant'
import { type Model, type Particle } from './model'
import { update } from './update'
import { view } from './view'

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

const modelWithParticles = (count: number): Model =>
  evo(initialModel, {
    particles: () =>
      Array.from({ length: count }, (_, index) =>
        makeParticle(index, 100 + index * 5, 100),
      ),
    nextId: () => count,
  })

describe('view', () => {
  test('initial view shows Pause and Reset buttons and a zero particle counter', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(role('button', { name: 'Pause' })).toExist(),
      expect(role('button', { name: 'Reset' })).toExist(),
      expect(text('0 particles')).toExist(),
    )
  })

  test('clicking Pause swaps the toggle to Play', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: 'Pause' })),
      expect(role('button', { name: 'Play' })).toExist(),
      expect(role('button', { name: 'Pause' })).not.toExist(),
    )
  })

  test('clicking Reset empties the particles list', () => {
    scene(
      { update, view },
      given(modelWithParticles(8)),
      expect(text('8 particles')).toExist(),
      click(role('button', { name: 'Reset' })),
      expect(text('0 particles')).toExist(),
    )
  })

  test('Turbulence and Noise scale sliders are present and labeled', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(label('Turbulence')).toExist(),
      expect(label('Noise scale')).toExist(),
    )
  })
})
