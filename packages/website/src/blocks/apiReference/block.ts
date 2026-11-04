import { Effect } from 'effect'

import { LoadApiData } from './command'
import { ApiReferenceBlock } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

const EffectsLayer = LoadApiData.layer

export const layer = ApiReferenceBlock.makeLayer(
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

export { ApiReferenceBlock }
