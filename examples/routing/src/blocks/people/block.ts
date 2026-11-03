import { Effect, Layer } from 'effect'

import { FetchPeople, PushSearchUrl } from './command'
import { PeopleDefinition } from './definition'
import { receive } from './receive'
import { init, update } from './update'
import { view } from './view'

const EffectsLayer = Layer.mergeAll(PushSearchUrl.layer, FetchPeople.layer)

export const PeopleBlock = PeopleDefinition.contract

export const layer = PeopleDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      receive,
      view,
      EffectsLayer,
    }
  }),
).layer
