import { Effect, Layer } from 'effect'

import { layer as SliderLayer } from '@foldkit/ui/slider'

import {
  FlowStrengthSliderBinding,
  NoiseScaleSliderBinding,
} from './composition'
import { ApplicationBlock } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
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
).pipe(Layer.provide(Layer.mergeAll(SliderLayer)))

export { ApplicationBlock } from './definition'
