import { Layer } from 'effect'

import * as UI from '@foldkit/ui'

import { GenerateAmbientParticle, GenerateBurstParticle } from './command'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  UI.EffectsLayer,
  GenerateAmbientParticle.layer,
  GenerateBurstParticle.layer,
  subscriptions.animationFrameTicks.layer,
)
