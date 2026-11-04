import { Effect, Layer } from 'effect'

import { FetchPeople, PushSearchUrl } from './command'
import { PeopleBlock } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init, update } from './update'
import { view } from './view'

const EffectsLayer = Layer.mergeAll(PushSearchUrl.layer, FetchPeople.layer)

export const layer = PeopleBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer,
    }
  }),
)

export { PeopleBlock } from './definition'
