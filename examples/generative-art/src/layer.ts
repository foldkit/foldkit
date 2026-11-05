import { Effect, Layer } from 'effect'

import { layer as SliderLayer } from '@foldkit/ui/slider'

import { ApplicationBlock } from './block'
import {
  FlowStrengthSliderBinding,
  NoiseScaleSliderBinding,
} from './composition'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
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
