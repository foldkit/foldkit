import { Effect, Layer } from 'effect'

import { Slider } from '@foldkit/ui'

import {
  FlowStrengthSliderBinding,
  NoiseScaleSliderBinding,
} from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const flowStrengthSlider = yield* FlowStrengthSliderBinding
    const noiseScaleSlider = yield* NoiseScaleSliderBinding
    return {
      children: [flowStrengthSlider, noiseScaleSlider],
      init,
      update,
      view,
      subscriptions,
      EffectsLayer,
    }
  }),
).provide(Layer.mergeAll(Slider.layer))
