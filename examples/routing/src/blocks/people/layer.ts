import { Layer } from 'effect'

import { PeopleBlock } from './block'
import { FetchPeople, PushSearchUrl } from './command'
import { inMessageUpdate } from './inMessageUpdate'
import { init, update } from './update'
import { view } from './view'

const EffectsLayer = Layer.mergeAll(PushSearchUrl.layer, FetchPeople.layer)

export const layer = PeopleBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer,
})
