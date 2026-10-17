import { FetchPeople, PushSearchUrl } from './command'
import { PeopleComposition } from './definition'
import { informRouteChanged, init, update } from './update'
import { view } from './view'

export const EffectsLayer = Layer.mergeAll(
  PushSearchUrl.layer,
  FetchPeople.layer,
)

export const block = PeopleComposition.makeBlock({
  init,
  update,
  view,
  EffectsLayer,
  expose: { informRouteChanged },
})
import { Layer } from 'effect'
