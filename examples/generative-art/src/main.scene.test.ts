import { Option } from 'effect'
import { Scene, Ui } from 'foldkit'
import { describe, test } from 'vitest'

import {
  FLOW_STRENGTH_MAX,
  FLOW_STRENGTH_MIN,
  NOISE_SCALE_MAX_DIVISOR,
  NOISE_SCALE_MIN_DIVISOR,
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

const modelWithParticles = (count: number): Model => ({
  ...initialModel,
  particles: Array.from({ length: count }, (_, index) =>
    makeParticle(index, 100 + index * 5, 100),
  ),
  nextId: count,
})

describe('scene', () => {
  test('initial view shows Pause and Reset buttons and a zero particle counter', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('button', { name: 'Pause' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Reset' })).toExist(),
      Scene.expect(Scene.text('0 particles')).toExist(),
    )
  })

  test('clicking Pause swaps the toggle to Play', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.role('button', { name: 'Pause' })),
      Scene.expect(Scene.role('button', { name: 'Play' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Pause' })).not.toExist(),
    )
  })

  test('clicking Reset empties the particles list', () => {
    Scene.scene(
      { update, view },
      Scene.with(modelWithParticles(8)),
      Scene.expect(Scene.text('8 particles')).toExist(),
      Scene.click(Scene.role('button', { name: 'Reset' })),
      Scene.expect(Scene.text('0 particles')).toExist(),
    )
  })

  test('Turbulence and Noise scale sliders are present and labeled', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.label('Turbulence')).toExist(),
      Scene.expect(Scene.label('Noise scale')).toExist(),
    )
  })
})
