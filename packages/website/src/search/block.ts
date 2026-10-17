import { SearchComposition } from './composition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { informRouteChanged, open, update } from './update'
import { view } from './view'

export const block = SearchComposition.makeBlock({
  init,
  update,
  view,
  expose: { informRouteChanged, open },
  EffectsLayer,
})
