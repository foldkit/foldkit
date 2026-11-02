import { AnimationComposition } from './composition.js'
import { makeInitialModel } from './schema.js'

/** @internal Deferred Animation initialization plan. */
export const init = AnimationComposition.makeInit(config => ({
  model: makeInitialModel(config),
}))
