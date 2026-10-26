import type { Block } from 'foldkit'

import { SliderBlock } from '@foldkit/ui'

import {
  FLOW_STRENGTH_MAX,
  FLOW_STRENGTH_MIN,
  FLOW_STRENGTH_STEP,
  NOISE_SCALE_MAX_DIVISOR,
  NOISE_SCALE_MIN_DIVISOR,
  NOISE_SCALE_STEP,
} from './constant'
import { ApplicationDefinition, makeFieldsStep } from './definition'
export const FlowStrengthSliderBinding = ApplicationDefinition.makeBinding(
  SliderBlock,
  {
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
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(SliderBlock, {
    ChangedValue: ({ value }) =>
      makeFieldsStep(() => ({
        flowStrength: () => value,
      })),
  }),
})

export const NoiseScaleSliderBinding = ApplicationDefinition.makeBinding(
  SliderBlock,
  {
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
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(SliderBlock, {
    ChangedValue: ({ value }) =>
      makeFieldsStep(() => ({ noiseScale: () => value })),
  }),
})

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [FlowStrengthSliderBinding, NoiseScaleSliderBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
