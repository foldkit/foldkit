import { ApiReferenceComposition } from './definition'
import { init, loadInitialData } from './init'
import { EffectsLayer, informRouteChanged, update } from './update'
import { view } from './view'

export const block = ApiReferenceComposition.makeBlock({
  init,
  update,
  view,
  expose: { loadInitialData, informRouteChanged },
  EffectsLayer,
})
