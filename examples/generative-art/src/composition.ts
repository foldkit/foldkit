import type { Block } from 'foldkit'

import { Slider } from '@foldkit/ui'

import {
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
} from './block'
import {
  FLOW_STRENGTH_MAX,
  FLOW_STRENGTH_MIN,
  FLOW_STRENGTH_STEP,
  NOISE_SCALE_MAX_DIVISOR,
  NOISE_SCALE_MIN_DIVISOR,
  NOISE_SCALE_STEP,
} from './constant'
export const FlowStrengthSliderBinding = makeBinding(Slider.SliderBlock, {
  field: 'flowStrengthSlider',
  init: {
    contextToArgs: () => [
      {
        id: 'flow-strength-slider',
        min: FLOW_STRENGTH_MIN,
        max: FLOW_STRENGTH_MAX,
        step: FLOW_STRENGTH_STEP,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Slider.SliderBlock, {
    ChangedValue: ({ value }) =>
      makeFieldsStep(() => ({
        flowStrength: () => value,
      })),
  }),
})

export const NoiseScaleSliderBinding = makeBinding(Slider.SliderBlock, {
  field: 'noiseScaleSlider',
  init: {
    contextToArgs: () => [
      {
        id: 'noise-scale-slider',
        min: NOISE_SCALE_MIN_DIVISOR,
        max: NOISE_SCALE_MAX_DIVISOR,
        step: NOISE_SCALE_STEP,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Slider.SliderBlock, {
    ChangedValue: ({ value }) =>
      makeFieldsStep(() => ({ noiseScale: () => value })),
  }),
})

export const ApplicationComposition = makeComposition({
  bindings: [FlowStrengthSliderBinding, NoiseScaleSliderBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
