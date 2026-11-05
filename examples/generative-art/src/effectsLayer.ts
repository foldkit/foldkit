import { Layer } from 'effect'

import { GenerateAmbientParticle, GenerateBurstParticle } from './command'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  GenerateAmbientParticle.layer,
  GenerateBurstParticle.layer,
  subscriptions.layer,
)
