import { Option } from 'effect'
import { Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
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
import { ApplicationBlock, layer } from './index'
import { type Model, type Particle } from './model'

const initialModel: Model = {
  particles: [],
  nextId: 0,
  elapsedSeconds: 0,
  maybeMousePosition: Option.none(),
  isRunning: true,
  flowStrength: INITIAL_FLOW_STRENGTH,
  flowStrengthSlider: Slider.SliderBlock.Model.make({
    ...{
      id: 'flow-strength-slider',
      min: FLOW_STRENGTH_MIN,
      max: FLOW_STRENGTH_MAX,
      step: FLOW_STRENGTH_STEP,
    },
    dragState: Slider.SliderBlock.Model.fields.dragState.make({ _tag: 'Idle' }),
  }),
  noiseScale: INITIAL_NOISE_SCALE,
  noiseScaleSlider: Slider.SliderBlock.Model.make({
    ...{
      id: 'noise-scale-slider',
      min: NOISE_SCALE_MIN_DIVISOR,
      max: NOISE_SCALE_MAX_DIVISOR,
      step: NOISE_SCALE_STEP,
    },
    dragState: Slider.SliderBlock.Model.fields.dragState.make({ _tag: 'Idle' }),
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
  modifyFields(initialModel, {
    particles: () =>
      Array.from({ length: count }, (_, index) =>
        makeParticle(index, 100 + index * 5, 100),
      ),
    nextId: () => count,
  })

describe('view', () => {
  it.effect(
    'initial view shows Pause and Reset buttons and a zero particle counter',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.expect(Scene.role('button', { name: 'Pause' })).toExist(),
        Scene.expect(Scene.role('button', { name: 'Reset' })).toExist(),
        Scene.expect(Scene.text('0 particles')).toExist(),
      ),
  )

  it.effect('clicking Pause swaps the toggle to Play', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.click(Scene.role('button', { name: 'Pause' })),
      Scene.expect(Scene.role('button', { name: 'Play' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Pause' })).not.toExist(),
    ),
  )

  it.effect('clicking Reset empties the particles list', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(modelWithParticles(8)),
      Scene.expect(Scene.text('8 particles')).toExist(),
      Scene.click(Scene.role('button', { name: 'Reset' })),
      Scene.expect(Scene.text('0 particles')).toExist(),
    ),
  )

  it.effect('Turbulence and Noise scale sliders are present and labeled', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.expect(Scene.label('Turbulence')).toExist(),
      Scene.expect(Scene.label('Noise scale')).toExist(),
    ),
  )
})
