import { PlaygroundComposition } from './composition'
import {
  EffectsLayer,
  informSupport,
  init,
  managedResources,
  update,
  view,
} from './playground'

export const block = PlaygroundComposition.makeBlock({
  init,
  update,
  view,
  managedResources,
  EffectsLayer,
  expose: { informSupport },
})
