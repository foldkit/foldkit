import { Layer } from 'effect'

import { Slider } from '@foldkit/ui'

import { GenerateAmbientParticle, GenerateBurstParticle } from './command'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  Slider.EffectsLayer,
  GenerateAmbientParticle.layer,
  GenerateBurstParticle.layer,
  subscriptions.animationFrameTicks.layer,
)
